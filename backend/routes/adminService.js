// Staff side of after-sales service. Mounted at /api/admin/service-requests
const router = require('express').Router();
const mongoose = require('mongoose');
const { ServiceRequest, Warranty } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const { addMonths, reminderMonths } = require('../utils/warranty');
const { runMaintenanceReminders } = require('../utils/maintenance');
const { notifyUser } = require('../utils/notify');
const { dayStart, todayManila } = require('../utils/reports');
const { asyncHandler: h, httpError } = require('../utils/http');

router.use(protect);
const STAFF = authorize('admin', 'staff');

const TYPES = ['repair', 'cleaning', 'maintenance', 'warranty_claim'];
const STATUSES = ['submitted', 'under_review', 'approved', 'rejected', 'scheduled', 'in_progress', 'completed'];
// the allowed next steps; "rejected" and "completed" are final
const FLOW = {
  submitted: ['under_review', 'approved', 'rejected'],
  under_review: ['approved', 'rejected'],
  approved: ['scheduled', 'in_progress'],
  scheduled: ['in_progress'],
  in_progress: ['completed'],
};
const label = (s) => String(s).replace(/_/g, ' ');

const view = (r) => ({
  _id: r._id,
  type: r.type,
  description: r.description,
  status: r.status,
  nextStatuses: FLOW[r.status] || [],
  preferredDate: r.preferredDate,
  scheduledDate: r.scheduledDate,
  staffNotes: r.staffNotes || '',
  customer: { name: r.customer?.name || 'Customer', email: r.customer?.email || '', phone: r.customer?.phone || '' },
  product: r.warranty?.product?.name || null,
  serialNumber: r.warranty?.serialNumber || null,
  warrantyExpiry: r.warranty?.expiryDate || null,
  createdAt: r.createdAt,
  resolvedAt: r.resolvedAt,
});

// GET /api/admin/service-requests?status&type&page&limit
router.get('/', STAFF, h(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
  const where = {};
  if (STATUSES.includes(req.query.status)) where.status = req.query.status;
  if (TYPES.includes(req.query.type)) where.type = req.query.type;

  const [total, rows] = await Promise.all([
    ServiceRequest.countDocuments(where),
    ServiceRequest.find(where)
      .populate('customer', 'name email phone')
      .populate({ path: 'warranty', select: 'serialNumber expiryDate product', populate: { path: 'product', select: 'name' } })
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);
  res.json({ total, rows: rows.map(view) });
}));

// POST /api/admin/service-requests/maintenance/run  (admin) -> send due cleaning reminders now
router.post('/maintenance/run', authorize('admin'), h(async (_req, res) => {
  res.json(await runMaintenanceReminders());
}));

// PUT /api/admin/service-requests/:id  { status?, staffNotes?, scheduledDate? }
// staffNotes is shown to the customer as "a note from Astron".
router.put('/:id', STAFF, h(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(404, 'Request not found');
  const sr = await ServiceRequest.findById(req.params.id);
  if (!sr) throw httpError(404, 'Request not found');

  const { status, scheduledDate } = req.body;
  const note = typeof req.body.staffNotes === 'string' ? req.body.staffNotes.trim().slice(0, 1000) : undefined;
  const $set = {};
  let statusChanged = false;

  if (!FLOW[sr.status]) throw httpError(409, 'This request is closed and can no longer be changed');
  if (note !== undefined) $set.staffNotes = note;

  if (status !== undefined && status !== sr.status) {
    if (typeof status !== 'string' || !FLOW[sr.status].includes(status))
      throw httpError(400, `A request that is "${label(sr.status)}" cannot be changed to "${label(String(status))}"`);
    if (status === 'rejected' && !(note || sr.staffNotes)) throw httpError(400, 'Add a note that explains why it was rejected');
    if (status === 'scheduled') {
      if (typeof scheduledDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate) || scheduledDate < todayManila())
        throw httpError(400, 'Choose a service date that is today or later');
      $set.scheduledDate = dayStart(scheduledDate);
    }
    if (status === 'completed') $set.resolvedAt = new Date();
    $set.status = status;
    statusChanged = true;
  }
  if (!Object.keys($set).length) throw httpError(400, 'There are no changes to apply');

  // only applies if nobody changed the request in the meantime
  const updated = await ServiceRequest.findOneAndUpdate({ _id: sr._id, status: sr.status }, { $set }, { new: true });
  if (!updated) throw httpError(409, 'This request was just updated by someone else. Reload and try again.');

  // a finished cleaning or maintenance visit restarts that unit's reminder clock
  if (statusChanged && $set.status === 'completed' && updated.warranty && ['cleaning', 'maintenance'].includes(updated.type))
    await Warranty.updateOne({ _id: updated.warranty }, { nextMaintenanceDate: addMonths(new Date(), await reminderMonths()) });

  if (statusChanged) {
    const when = updated.scheduledDate
      ? ` It is scheduled for ${new Date(updated.scheduledDate).toLocaleDateString('en-PH', { dateStyle: 'long', timeZone: 'Asia/Manila' })}.`
      : '';
    await notifyUser(updated.customer, {
      type: 'service_update',
      title: 'Your service request was updated',
      message: `Your ${label(updated.type)} request is now "${label(updated.status)}".${when}${updated.staffNotes ? ` Note from Astron: ${updated.staffNotes}` : ''}`,
      link: '/account/service-requests',
    });
  }
  res.json({ _id: updated._id, status: updated.status, nextStatuses: FLOW[updated.status] || [] });
}));

module.exports = router;