const router = require('express').Router();
const mongoose = require('mongoose');
const { Installation, Order, User, Notification } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const { dayStart, todayManila } = require('../utils/reports');
const { sendOrderStatusUpdate } = require('../utils/orderEmail');
const sendEmail = require('../utils/sendEmail');
const { asyncHandler: h, httpError } = require('../utils/http');

router.use(protect);

const STAFF = authorize('admin', 'staff');
const TECH = authorize('technician');
const STATUSES = ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'];
const RESCHEDULABLE = ['pending', 'scheduled'];
const NEXT = { scheduled: 'in_progress', in_progress: 'completed' }; // what a technician may do next
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const day = (d) => new Date(d).toLocaleDateString('en-PH', { dateStyle: 'long', timeZone: 'Asia/Manila' });
const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const assertId = (id) => {
  if (!mongoose.isValidObjectId(id)) throw httpError(404, 'Installation job not found');
};

// In-app notification + email. Best effort: a mail problem must never fail the request.
async function notifyCustomer(customerId, orderRef, title, message) {
  try {
    const customer = await User.findById(customerId).select('name email');
    if (!customer) return;
    await Notification.create({
      user: customer._id,
      type: 'installation_schedule',
      title,
      message,
      link: `/account/orders/${orderRef?._id || orderRef}`,
    });
    await sendEmail({
      to: customer.email,
      subject: `Astron: ${title}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px">
        <h2 style="color:#0b5fff">Astron Air Conditioners</h2>
        <p>Hi ${esc(customer.name)},</p><p>${esc(message)}</p>
        ${orderRef?.orderNumber ? `<p><b>Order:</b> ${esc(orderRef.orderNumber)}</p>` : ''}</div>`,
    });
  } catch (e) {
    console.error('Installation notice failed:', e.message);
  }
}

// ---------------------------------------------------------------- admin and staff

// GET /api/installations/technicians  -> people a job can be assigned to
router.get('/technicians', STAFF, h(async (_req, res) => {
  res.json(await User.find({ role: 'technician', isActive: true }).select('name phone').sort('name').lean());
}));

// GET /api/installations?status&page&limit
router.get('/', STAFF, h(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
  const where = {};
  if (STATUSES.includes(req.query.status)) where.status = req.query.status;

  const [total, jobs] = await Promise.all([
    Installation.countDocuments(where),
    Installation.find(where)
      .populate('customer', 'name phone')
      .populate('technician', 'name')
      .populate('order', 'orderNumber status')
      .sort({ scheduledDate: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  res.json({
    total,
    rows: jobs.map((j) => ({
      _id: j._id,
      status: j.status,
      scheduledDate: j.scheduledDate,
      notes: j.notes || '',
      address: j.address,
      customer: { name: j.customer?.name || 'Customer', phone: j.customer?.phone || '' },
      technician: j.technician ? { _id: j.technician._id, name: j.technician.name } : null,
      order: { _id: j.order?._id, orderNumber: j.order?.orderNumber, status: j.order?.status },
      completedAt: j.completedAt,
    })),
  });
}));

// PUT /api/installations/:id/schedule  { technician, scheduledDate: 'YYYY-MM-DD', notes? }
router.put('/:id/schedule', STAFF, h(async (req, res) => {
  assertId(req.params.id);
  const { technician, scheduledDate } = req.body;
  if (!mongoose.isValidObjectId(technician)) throw httpError(400, 'Choose a technician');
  if (typeof scheduledDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate))
    throw httpError(400, 'Choose a valid date');
  if (scheduledDate < todayManila()) throw httpError(400, 'The date cannot be in the past');
  const date = dayStart(scheduledDate);
  if (Number.isNaN(date.getTime())) throw httpError(400, 'Choose a valid date');

  const tech = await User.findOne({ _id: technician, role: 'technician', isActive: true }).select('_id');
  if (!tech) throw httpError(400, 'That technician is not available');

  const job = await Installation.findOneAndUpdate(
    { _id: req.params.id, status: { $in: RESCHEDULABLE } },
    {
      technician: tech._id,
      assignedBy: req.user._id,
      scheduledDate: date,
      status: 'scheduled',
      notes: text(req.body.notes, 500),
    },
    { new: true }
  )
    .populate('technician', 'name')
    .populate('order', 'orderNumber');
  if (!job) throw httpError(409, 'This job is not open for scheduling (it may be started, finished or cancelled)');

  await notifyCustomer(
    job.customer,
    job.order,
    'Your installation is scheduled',
    `Your air conditioner installation is scheduled for ${day(job.scheduledDate)}. Technician: ${job.technician.name}.`
  );
  res.json({ _id: job._id, status: job.status, scheduledDate: job.scheduledDate });
}));

// ---------------------------------------------------------------- technician

// GET /api/installations/mine  -> only jobs assigned to me
router.get('/mine', TECH, h(async (req, res) => {
  const jobs = await Installation.find({
    technician: req.user._id,
    status: { $in: ['scheduled', 'in_progress', 'completed'] },
  })
    .populate('customer', 'name phone')
    .populate('order', 'orderNumber status items.name items.quantity')
    .sort({ scheduledDate: 1, _id: 1 })
    .limit(100)
    .lean();

  res.json(
    jobs.map((j) => ({
      _id: j._id,
      status: j.status,
      scheduledDate: j.scheduledDate,
      notes: j.notes || '',
      address: j.address,
      customer: { name: j.customer?.name || 'Customer', phone: j.customer?.phone || '' },
      order: {
        orderNumber: j.order?.orderNumber,
        status: j.order?.status,
        items: (j.order?.items || []).map((i) => ({ name: i.name, quantity: i.quantity })),
      },
      completedAt: j.completedAt,
    }))
  );
}));

// PUT /api/installations/:id/status  { status: 'in_progress' | 'completed', note? }  (my own jobs only)
router.put('/:id/status', TECH, h(async (req, res) => {
  assertId(req.params.id);
  const status = req.body.status;
  const job = await Installation.findOne({ _id: req.params.id, technician: req.user._id }).populate('order', 'orderNumber status');
  if (!job) throw httpError(404, 'Installation job not found');
  if (NEXT[job.status] !== status) throw httpError(400, `A job that is "${job.status}" cannot be changed to "${status}"`);
  if (job.order?.status !== 'delivered')
    throw httpError(400, 'The order must be delivered before installation work can start or finish');

  const note = text(req.body.note, 300);
  const notes = note ? [job.notes, `Technician: ${note}`].filter(Boolean).join('\n').slice(0, 1500) : job.notes;
  const $set = { status, notes };
  if (status === 'completed') $set.completedAt = new Date();

  // only applies if nobody changed the job in the meantime
  const updated = await Installation.findOneAndUpdate(
    { _id: job._id, technician: req.user._id, status: job.status },
    { $set },
    { new: true }
  );
  if (!updated) throw httpError(409, 'This job was just updated. Reload and try again.');

  if (status === 'completed') {
    const order = await Order.findOneAndUpdate(
      { _id: job.order._id, status: 'delivered' },
      {
        $set: { status: 'installed' },
        $push: { statusHistory: { status: 'installed', note: `Installation completed by ${req.user.name}`, changedBy: req.user._id } },
      },
      { new: true }
    ).populate('user', 'name email');
    if (order) sendOrderStatusUpdate(order, order.user, {}).catch((e) => console.error('Install email failed:', e.message));
  } else {
    await notifyCustomer(job.customer, job.order, 'Your installation has started', 'Our technician has started installing your air conditioner.');
  }
  res.json({ _id: updated._id, status: updated.status, completedAt: updated.completedAt });
}));

module.exports = router;