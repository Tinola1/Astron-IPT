// Customer side of warranty and after-sales service. Mounted at /api/after-sales
const router = require('express').Router();
const mongoose = require('mongoose');
const { Warranty, ServiceRequest, Installation } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const { ensureWarranties, warrantyState } = require('../utils/warranty');
const { dayStart, todayManila, addDays } = require('../utils/reports');
const { asyncHandler: h, httpError } = require('../utils/http');

router.use(protect, authorize('customer'));

const TYPES = ['repair', 'cleaning', 'maintenance', 'warranty_claim'];
const OPEN_LIMIT = 5; // open requests per customer
const DAY_MS = 86400000;

const warrantyView = (w) => ({
  _id: w._id,
  product: { name: w.product?.name || 'Air conditioner', modelNumber: w.product?.modelNumber, image: w.product?.images?.[0]?.url || null },
  serialNumber: w.serialNumber,
  purchaseDate: w.purchaseDate,
  expiryDate: w.expiryDate,
  state: warrantyState(w),
  daysLeft: Math.max(Math.ceil((new Date(w.expiryDate) - Date.now()) / DAY_MS), 0),
  nextMaintenanceDate: w.nextMaintenanceDate,
});

const requestView = (r) => ({
  _id: r._id,
  type: r.type,
  description: r.description,
  status: r.status,
  preferredDate: r.preferredDate,
  scheduledDate: r.scheduledDate,
  note: r.staffNotes || '', // the message staff left for the customer
  product: r.warranty?.product?.name || null,
  serialNumber: r.warranty?.serialNumber || null,
  createdAt: r.createdAt,
  resolvedAt: r.resolvedAt,
});

// GET /api/after-sales/warranties
router.get('/warranties', h(async (req, res) => {
  await ensureWarranties(req.user._id).catch((e) => console.error('Warranty check failed:', e.message));
  const list = await Warranty.find({ customer: req.user._id })
    .populate('product', 'name modelNumber images')
    .sort('-purchaseDate')
    .limit(200)
    .lean();
  res.json(list.map(warrantyView));
}));

// GET /api/after-sales/service-requests  (my history)
router.get('/service-requests', h(async (req, res) => {
  const list = await ServiceRequest.find({ customer: req.user._id })
    .populate({ path: 'warranty', select: 'serialNumber product', populate: { path: 'product', select: 'name' } })
    .sort('-createdAt')
    .limit(100)
    .lean();
  res.json(list.map(requestView));
}));

// POST /api/after-sales/service-requests  { type, description, warranty?, preferredDate? }
router.post('/service-requests', h(async (req, res) => {
  const { type, warranty: warrantyId, preferredDate } = req.body;
  if (!TYPES.includes(type)) throw httpError(400, 'Choose a request type');

  const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
  if (description.length < 10 || description.length > 1000)
    throw httpError(400, 'Describe the problem or service in 10 to 1000 characters');

  let date;
  if (preferredDate !== undefined && preferredDate !== '') {
    const today = todayManila();
    if (typeof preferredDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) throw httpError(400, 'Choose a valid date');
    if (preferredDate < today || preferredDate > addDays(today, 365)) throw httpError(400, 'Choose a date within the next year');
    date = dayStart(preferredDate);
  }

  // the unit must be the customer's own
  let warranty = null;
  if (warrantyId !== undefined && warrantyId !== '' && warrantyId !== null) {
    if (!mongoose.isValidObjectId(warrantyId)) throw httpError(400, 'Choose one of your units');
    warranty = await Warranty.findOne({ _id: warrantyId, customer: req.user._id });
    if (!warranty) throw httpError(400, 'Choose one of your units');
  }

  if (type === 'warranty_claim') {
    if (!warranty) throw httpError(400, 'Choose the unit you are claiming for');
    if (warrantyState(warranty) !== 'active') throw httpError(400, 'This unit is no longer under warranty');
    if (await ServiceRequest.exists({ warranty: warranty._id, type: 'warranty_claim', status: { $nin: ['completed', 'rejected'] } }))
      throw httpError(409, 'You already have an open warranty claim for this unit');
  }

  const open = await ServiceRequest.countDocuments({ customer: req.user._id, status: { $nin: ['completed', 'rejected'] } });
  if (open >= OPEN_LIMIT) throw httpError(409, `You can have up to ${OPEN_LIMIT} open requests. Please wait for some to be completed.`);

  const created = await ServiceRequest.create({
    customer: req.user._id,
    unit: warranty?.unit,
    warranty: warranty?._id,
    type,
    description,
    preferredDate: date,
  });
  res.status(201).json({ _id: created._id, status: created.status });
}));

// GET /api/after-sales/appointments -> my installation and service visits, newest first
router.get('/appointments', h(async (req, res) => {
  const [installs, visits] = await Promise.all([
    Installation.find({ customer: req.user._id }).populate('technician', 'name').populate('order', 'orderNumber').sort({ createdAt: -1 }).limit(50).lean(),
    ServiceRequest.find({ customer: req.user._id, status: { $in: ['scheduled', 'in_progress', 'completed'] } }).populate('assignedTo', 'name').sort({ createdAt: -1 }).limit(50).lean(),
  ]);
  const rows = [
    ...installs.map((i) => ({
      _id: i._id, kind: 'installation', title: `Installation for order ${i.order?.orderNumber || ''}`.trim(),
      status: i.status, date: i.scheduledDate || null, staff: i.technician?.name || null, createdAt: i.createdAt,
    })),
    ...visits.map((r) => ({
      _id: r._id, kind: 'service', title: `${String(r.type).replace(/_/g, ' ')} visit`,
      status: r.status, date: r.scheduledDate || null, staff: r.assignedTo?.name || null, createdAt: r.createdAt,
    })),
  ].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  res.json(rows);
}));

module.exports = router;