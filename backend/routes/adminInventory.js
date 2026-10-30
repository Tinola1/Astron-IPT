// Stock levels, adjustments and serial numbers. Mounted at /api/admin/inventory (admin only)
const router = require('express').Router();
const mongoose = require('mongoose');
const { Product, Inventory, Unit } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const { checkLowStock } = require('../utils/stock');
const { asyncHandler: h, httpError } = require('../utils/http');

router.use(protect, authorize('admin'));

const STOCK_TYPES = { online: 'onlineStock', showroom: 'showroomStock' };
const UNIT_STATUSES = ['in_stock', 'reserved', 'sold', 'returned', 'damaged'];
const MAX_QTY = 100000;
const MAX_SERIALS = 200;
const SERIAL_RE = /^[A-Za-z0-9][A-Za-z0-9._\/-]{2,59}$/;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const assertId = (id, msg = 'Product not found') => {
  if (!mongoose.isValidObjectId(id)) throw httpError(404, msg);
};
async function loadProduct(id) {
  assertId(id);
  const p = await Product.findOne({ _id: id, isDeleted: false }).select('name modelNumber').lean();
  if (!p) throw httpError(404, 'Product not found');
  return p;
}
const getOrCreateInventory = async (productId) =>
  (await Inventory.findOne({ product: productId })) || (await Inventory.create({ product: productId }));

const invView = (p, inv) => {
  const online = inv?.onlineStock ?? 0;
  const showroom = inv?.showroomStock ?? 0;
  const threshold = inv?.lowStockThreshold ?? 5;
  return {
    product: { _id: p._id, name: p.name, modelNumber: p.modelNumber },
    onlineStock: online,
    showroomStock: showroom,
    total: online + showroom,
    threshold,
    isLow: online + showroom <= threshold,
  };
};

// GET /api/admin/inventory?page&limit&q&low=true
router.get('/', h(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
  const where = { isDeleted: false };
  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    const re = new RegExp(escapeRegex(req.query.q.trim().slice(0, 60)), 'i');
    where.$or = [{ name: re }, { modelNumber: re }];
  }
  if (req.query.low === 'true') {
    const lowRows = await Inventory.find({
      $expr: { $lte: [{ $add: ['$onlineStock', '$showroomStock'] }, '$lowStockThreshold'] },
    }).select('product').lean();
    where._id = { $in: lowRows.map((r) => r.product) };
  }

  const total = await Product.countDocuments(where);
  const products = await Product.find(where).select('name modelNumber').sort({ name: 1, _id: 1 }).skip((page - 1) * limit).limit(limit).lean();
  const inv = await Inventory.find({ product: { $in: products.map((p) => p._id) } }).lean();
  const byProduct = Object.fromEntries(inv.map((i) => [String(i.product), i]));
  res.json({ total, rows: products.map((p) => invView(p, byProduct[String(p._id)])) });
}));

// PUT /api/admin/inventory/units/:unitId/damaged  -> take a unit out of stock
router.put('/units/:unitId/damaged', h(async (req, res) => {
  assertId(req.params.unitId, 'Unit not found');
  const unit = await Unit.findOneAndUpdate({ _id: req.params.unitId, status: 'in_stock' }, { status: 'damaged' }, { new: true });
  if (!unit) throw httpError(409, 'Only units that are in stock can be marked damaged');

  const field = STOCK_TYPES[unit.stockType] || 'onlineStock';
  await Inventory.updateOne(
    { product: unit.product, [field]: { $gte: 1 } },
    {
      $inc: { [field]: -1 },
      $push: { adjustments: { $each: [{ stockType: unit.stockType, change: -1, reason: `Unit ${unit.serialNumber} marked damaged`, by: req.user._id }], $slice: -200 } },
    }
  );
  await checkLowStock([unit.product]);
  res.json({ _id: unit._id, status: unit.status });
}));

// GET /api/admin/inventory/:productId  -> levels + recent history + serial counts
router.get('/:productId', h(async (req, res) => {
  const p = await loadProduct(req.params.productId);
  const inv = await Inventory.findOne({ product: p._id }).populate('adjustments.by', 'name').lean();
  const counts = await Unit.aggregate([{ $match: { product: p._id } }, { $group: { _id: '$status', n: { $sum: 1 } } }]);
  res.json({
    ...invView(p, inv),
    history: (inv?.adjustments || [])
      .slice(-50)
      .reverse()
      .map((a) => ({ stockType: a.stockType, change: a.change, reason: a.reason, by: a.by?.name || 'Unknown', at: a.at })),
    unitCounts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
  });
}));

// PUT /api/admin/inventory/:productId/adjust  { stockType: 'online'|'showroom', mode: 'add'|'remove'|'set', quantity, reason }
router.put('/:productId/adjust', h(async (req, res) => {
  const p = await loadProduct(req.params.productId);
  const { stockType, mode } = req.body;
  const field = STOCK_TYPES[stockType];
  if (!field) throw httpError(400, 'Choose online or showroom stock');
  if (!['add', 'remove', 'set'].includes(mode)) throw httpError(400, 'Choose add, remove or set');
  const qty = req.body.quantity;
  if (!Number.isInteger(qty) || qty < 0 || qty > MAX_QTY) throw httpError(400, `Quantity must be a whole number from 0 to ${MAX_QTY}`);
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
  if (reason.length < 3 || reason.length > 200) throw httpError(400, 'Give a reason (3 to 200 characters)');

  const inv = await getOrCreateInventory(p._id);
  const current = inv[field];
  const delta = mode === 'add' ? qty : mode === 'remove' ? -qty : qty - current;
  if (delta === 0) throw httpError(400, 'That would not change the stock');
  if (current + delta < 0) throw httpError(409, `Only ${current} in stock, so ${qty} cannot be removed`);

  // the filter makes each mode safe against a customer order landing at the same moment
  const filter = { _id: inv._id };
  if (mode === 'remove') filter[field] = { $gte: qty };
  if (mode === 'set') filter[field] = current;

  const updated = await Inventory.findOneAndUpdate(
    filter,
    {
      $inc: { [field]: delta },
      $push: { adjustments: { $each: [{ stockType, change: delta, reason, by: req.user._id }], $slice: -200 } },
    },
    { new: true }
  ).lean();
  if (!updated) throw httpError(409, 'The stock changed while you were editing. Reload and try again.');

  await checkLowStock([p._id]);
  res.json(invView(p, updated));
}));

// PUT /api/admin/inventory/:productId/threshold  { threshold }
router.put('/:productId/threshold', h(async (req, res) => {
  const p = await loadProduct(req.params.productId);
  const t = req.body.threshold;
  if (!Number.isInteger(t) || t < 0 || t > 1000) throw httpError(400, 'The low-stock level must be a whole number from 0 to 1000');
  await getOrCreateInventory(p._id);
  const updated = await Inventory.findOneAndUpdate({ product: p._id }, { lowStockThreshold: t }, { new: true }).lean();
  await checkLowStock([p._id]);
  res.json(invView(p, updated));
}));

// GET /api/admin/inventory/:productId/units?status&q&page&limit
router.get('/:productId/units', h(async (req, res) => {
  const p = await loadProduct(req.params.productId);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
  const where = { product: p._id };
  if (UNIT_STATUSES.includes(req.query.status)) where.status = req.query.status;
  if (typeof req.query.q === 'string' && req.query.q.trim())
    where.serialNumber = new RegExp(escapeRegex(req.query.q.trim().slice(0, 60)), 'i');

  const [total, units] = await Promise.all([
    Unit.countDocuments(where),
    Unit.find(where).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).populate('order', 'orderNumber').lean(),
  ]);
  res.json({
    total,
    rows: units.map((u) => ({
      _id: u._id, serialNumber: u.serialNumber, stockType: u.stockType, status: u.status,
      order: u.order?.orderNumber || null, soldAt: u.soldAt, createdAt: u.createdAt,
    })),
  });
}));

// POST /api/admin/inventory/:productId/units  { stockType, serials: [..] }
// Receiving units: registers each serial number and adds the same number to that stock count.
router.post('/:productId/units', h(async (req, res) => {
  const p = await loadProduct(req.params.productId);
  const field = STOCK_TYPES[req.body.stockType];
  if (!field) throw httpError(400, 'Choose online or showroom stock');
  if (!Array.isArray(req.body.serials) || !req.body.serials.length) throw httpError(400, 'Enter at least one serial number');
  if (req.body.serials.length > MAX_SERIALS) throw httpError(400, `Add at most ${MAX_SERIALS} serial numbers at a time`);

  const serials = [];
  for (const raw of req.body.serials) {
    const s = typeof raw === 'string' ? raw.trim() : '';
    if (!SERIAL_RE.test(s)) throw httpError(400, `"${String(raw).slice(0, 40)}" is not a valid serial number (3 to 60 letters, numbers, . _ / -)`);
    serials.push(s);
  }
  if (new Set(serials).size !== serials.length) throw httpError(400, 'The list has the same serial number more than once');

  const taken = await Unit.find({ serialNumber: { $in: serials } }).select('serialNumber').lean();
  if (taken.length) throw httpError(409, `Already registered: ${taken.slice(0, 5).map((t) => t.serialNumber).join(', ')}${taken.length > 5 ? '…' : ''}`);

  // one by one, so a clash that slips through only skips that serial and the stock count matches what was saved
  const added = [];
  for (const serialNumber of serials) {
    try {
      await Unit.create({ product: p._id, serialNumber, stockType: req.body.stockType, status: 'in_stock' });
      added.push(serialNumber);
    } catch (e) {
      if (e.code !== 11000) throw e;
    }
  }
  if (added.length) {
    await getOrCreateInventory(p._id);
    await Inventory.updateOne(
      { product: p._id },
      {
        $inc: { [field]: added.length },
        $push: { adjustments: { $each: [{ stockType: req.body.stockType, change: added.length, reason: `Received ${added.length} unit${added.length === 1 ? '' : 's'} with serial numbers`, by: req.user._id }], $slice: -200 } },
      }
    );
    await checkLowStock([p._id]);
  }
  res.status(201).json({ added: added.length, skipped: serials.length - added.length });
}));

module.exports = router;