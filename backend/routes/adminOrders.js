const router = require('express').Router();
const mongoose = require('mongoose');
const { Order, User, Installation } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const { finalizeCancellation } = require('../utils/orderService');
const { sendOrderStatusUpdate } = require('../utils/orderEmail');
const { buildReceiptPdf } = require('../utils/receiptPdf');
const { asyncHandler: h, httpError } = require('../utils/http');

router.use(protect, authorize('admin')); // use authorize('admin', 'staff') to let staff manage orders too

const STATUSES = ['pending', 'processing', 'out_for_delivery', 'delivered', 'installed', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];
const SORTABLE = { createdAt: 'createdAt', grandTotal: 'grandTotal', orderNumber: 'orderNumber', status: 'status' };
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The allowed status flow (the server is the single source of truth; the UI just renders this list)
function allowedNext(order) {
  switch (order.status) {
    case 'pending': return ['processing', 'cancelled'];
    case 'processing': return order.fulfillment === 'pickup' ? ['delivered', 'cancelled'] : ['out_for_delivery', 'cancelled'];
    case 'out_for_delivery': return ['delivered'];
    case 'delivered': return order.installation?.requested ? ['installed'] : [];
    default: return [];
  }
}

const POPULATE = [
  { path: 'user', select: 'name email phone' },
  { path: 'statusHistory.changedBy', select: 'name' },
];

async function loadOrder(id) {
  const order = mongoose.isValidObjectId(id) ? await Order.findById(id).populate(POPULATE) : null;
  if (!order) throw httpError(404, 'Order not found');
  return order;
}
const view = (order) => ({ ...order.toObject(), nextStatuses: allowedNext(order) });

// GET /api/admin/orders?page&limit&status&q&sortField&sortOrder
router.get('/', h(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const where = {};
  if (STATUSES.includes(req.query.status)) where.status = req.query.status;
  if (req.query.q) {
    const re = new RegExp(escapeRegex(String(req.query.q)), 'i');
    const users = await User.find({ $or: [{ name: re }, { email: re }] }).select('_id').limit(200);
    where.$or = [{ orderNumber: re }, { user: { $in: users.map((u) => u._id) } }];
  }
  const sortField = SORTABLE[req.query.sortField] || 'createdAt';
  const dir = req.query.sortOrder === 'asc' ? 1 : -1;

  const total = await Order.countDocuments(where);
  const orders = await Order.find(where)
    .populate('user', 'name email')
    .sort({ [sortField]: dir, _id: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  res.json({
    total,
    rows: orders.map((o) => ({
      _id: o._id,
      orderNumber: o.orderNumber,
      customer: { name: o.user?.name || 'Deleted user', email: o.user?.email || '' },
      itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
      grandTotal: o.grandTotal,
      status: o.status,
      fulfillment: o.fulfillment,
      paymentMethod: o.payment.method,
      paymentStatus: o.payment.status,
      createdAt: o.createdAt,
    })),
  });
}));

// GET /api/admin/orders/:id
router.get('/:id', h(async (req, res) => res.json(view(await loadOrder(req.params.id)))));

// GET /api/admin/orders/:id/receipt  -> PDF download
router.get('/:id/receipt', h(async (req, res) => {
  const order = await loadOrder(req.params.id);
  const pdf = await buildReceiptPdf(order.toObject(), order.user);
  res
    .set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="Receipt-${order.orderNumber}.pdf"` })
    .send(pdf);
}));

// PUT /api/admin/orders/:id/status  { status?, paymentStatus?, note?, notify? }
router.put('/:id/status', h(async (req, res) => {
  const order = await loadOrder(req.params.id);
  const { status, paymentStatus, notify = true } = req.body;
  const note = String(req.body.note || '').trim().slice(0, 300);

  const $set = {};
  let statusChanged = false;
  let paymentChanged = false;

  if (status && status !== order.status) {
    if (!STATUSES.includes(status) || !allowedNext(order).includes(status))
      throw httpError(400, `An order that is "${order.status}" cannot be changed to "${status}"`);
    $set.status = status;
    statusChanged = true;
    if (status === 'delivered') $set.deliveredAt = new Date();
    if (status === 'cancelled') {
      $set.cancelledAt = new Date();
      $set.cancelReason = note;
    }
  }

  if (paymentStatus && paymentStatus !== order.payment.status) {
    if (!PAYMENT_STATUSES.includes(paymentStatus)) throw httpError(400, 'Invalid payment status');
    $set['payment.status'] = paymentStatus;
    if (paymentStatus === 'paid') $set['payment.paidAt'] = new Date();
    paymentChanged = true;
  }

  // cash is collected when the order is delivered / picked up
  if ($set.status === 'delivered' && order.payment.method === 'cod' && order.payment.status === 'pending' && !paymentChanged) {
    $set['payment.status'] = 'paid';
    $set['payment.paidAt'] = new Date();
    paymentChanged = true;
  }

  if (!statusChanged && !paymentChanged) throw httpError(400, 'There are no changes to apply');

  const noteParts = [];
  if (note) noteParts.push(note);
  if (paymentChanged) noteParts.push(`Payment ${$set['payment.status']}`);
  const entry = {
    status: $set.status || order.status,
    note: noteParts.join(' · '),
    changedBy: req.user._id,
    changedAt: new Date(),
  };

  // only applies if nobody changed the status in the meantime
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: order.status },
    { $set, $push: { statusHistory: entry } },
    { new: true }
  ).populate(POPULATE);
  if (!updated) throw httpError(409, 'This order was just updated by someone else. Reload and try again.');

  if ($set.status === 'cancelled') await finalizeCancellation(updated);
  if ($set.status === 'installed')
    await Installation.updateMany({ order: updated._id }, { status: 'completed', completedAt: new Date() });

  // email the customer the itemized details + PDF receipt
  let email = { skipped: true };
  if (notify !== false) {
    try {
      await sendOrderStatusUpdate(updated, updated.user, { note, paymentChanged });
      email = { sent: true };
    } catch (e) {
      console.error('Status email failed:', e.message);
      email = { sent: false, error: e.message };
    }
  }

  res.json({ order: view(updated), email });
}));

module.exports = router;