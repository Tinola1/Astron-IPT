// Inventory / installation / service reports and the customer records view.
// Mounted at /api/admin, so auth is applied per route (not router.use), like adminReports.js.
const router = require('express').Router();
const mongoose = require('mongoose');
const { User, Order, Product, Inventory, Unit, Installation, ServiceRequest, Warranty } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const { parseRange, dayStart, dayEnd, round2 } = require('../utils/reports');
const { asyncHandler: h, httpError } = require('../utils/http');

const adminOnly = [protect, authorize('admin')];
const staffUp = [protect, authorize('admin', 'staff')];
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const DAY = 86400000;

// CSV cell: quotes it, and stops spreadsheet formulas (= + - @) from running when the file is opened
const cell = (v) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};
const toCsv = (rows) => `\uFEFF${rows.map((r) => r.map(cell).join(',')).join('\r\n')}\r\n`;
const sendCsv = (res, name, rows) =>
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}.csv"` }).send(toCsv(rows));
const inRange = ({ from, to }) => ({ $gte: dayStart(from), $lte: dayEnd(to) });
const days = (ms) => (ms == null ? null : round2(ms / DAY));
const nameMap = async (ids) => {
  const users = await User.find({ _id: { $in: ids.filter(Boolean) } }).select('name').lean();
  return Object.fromEntries(users.map((u) => [String(u._id), u.name]));
};

// ---------------- inventory report ----------------
async function inventoryReport() {
  const [products, inv, unitRows] = await Promise.all([
    Product.find({ isDeleted: false }).select('name modelNumber').sort({ name: 1, _id: 1 }).lean(),
    Inventory.find().lean(),
    Unit.aggregate([{ $group: { _id: { product: '$product', status: '$status' }, n: { $sum: 1 } } }]),
  ]);
  const invBy = Object.fromEntries(inv.map((i) => [String(i.product), i]));
  const unitsBy = {};
  for (const u of unitRows) (unitsBy[String(u._id.product)] ||= {})[u._id.status] = u.n;

  const rows = products.map((p) => {
    const i = invBy[String(p._id)];
    const online = i?.onlineStock ?? 0;
    const showroom = i?.showroomStock ?? 0;
    const threshold = i?.lowStockThreshold ?? 5;
    const u = unitsBy[String(p._id)] || {};
    return {
      _id: p._id, name: p.name, modelNumber: p.modelNumber, onlineStock: online, showroomStock: showroom,
      total: online + showroom, threshold, isLow: online + showroom <= threshold,
      units: { in_stock: u.in_stock || 0, sold: u.sold || 0, damaged: u.damaged || 0, returned: u.returned || 0, reserved: u.reserved || 0 },
    };
  });
  return {
    totals: {
      products: rows.length,
      units: rows.reduce((s, r) => s + r.total, 0),
      low: rows.filter((r) => r.isLow && r.total > 0).length,
      out: rows.filter((r) => r.total === 0).length,
    },
    rows,
  };
}
router.get('/reports/inventory', ...adminOnly, h(async (req, res) => res.json(await inventoryReport())));
router.get('/reports/inventory/export', ...adminOnly, h(async (req, res) => {
  const r = await inventoryReport();
  sendCsv(res, 'inventory', [
    ['Product', 'Model', 'Online stock', 'Showroom stock', 'Total', 'Low-stock level', 'Status', 'Serials in stock', 'Serials sold', 'Serials damaged'],
    ...r.rows.map((x) => [x.name, x.modelNumber, x.onlineStock, x.showroomStock, x.total, x.threshold,
      x.total === 0 ? 'Out of stock' : x.isLow ? 'Low stock' : 'OK', x.units.in_stock, x.units.sold, x.units.damaged]),
  ]);
}));

// ---------------- installation report ----------------
async function installationReport(range) {
  const match = { $match: { createdAt: inRange(range) } };
  const [byStatus, byTech, timing] = await Promise.all([
    Installation.aggregate([match, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Installation.aggregate([
      match,
      { $group: { _id: '$technician', assigned: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
      { $sort: { assigned: -1 } },
    ]),
    Installation.aggregate([
      match,
      { $match: { status: 'completed', completedAt: { $exists: true } } },
      { $group: { _id: null, avgMs: { $avg: { $subtract: ['$completedAt', '$createdAt'] } } } },
    ]),
  ]);
  const names = await nameMap(byTech.map((t) => t._id));
  const status = Object.fromEntries(byStatus.map((s) => [s._id, s.n]));
  return {
    range,
    totals: { all: byStatus.reduce((s, x) => s + x.n, 0), completed: status.completed || 0, cancelled: status.cancelled || 0, avgDaysToComplete: days(timing[0]?.avgMs) },
    byStatus: status,
    byTechnician: byTech.map((t) => ({ technician: t._id ? names[String(t._id)] || 'Removed user' : 'Unassigned', assigned: t.assigned, completed: t.completed })),
  };
}
router.get('/reports/installations', ...adminOnly, h(async (req, res) => res.json(await installationReport(parseRange(req.query)))));
router.get('/reports/installations/export', ...adminOnly, h(async (req, res) => {
  const r = await installationReport(parseRange(req.query));
  sendCsv(res, `installations-${r.range.from}_to_${r.range.to}`, [
    ['Technician', 'Jobs', 'Completed'],
    ...r.byTechnician.map((t) => [t.technician, t.assigned, t.completed]),
    [], ['Status', 'Count'], ...Object.entries(r.byStatus).map(([k, v]) => [k, v]),
  ]);
}));

// ---------------- service report ----------------
async function serviceReport(range) {
  const match = { $match: { createdAt: inRange(range) } };
  const [byType, byStatus, byStaff, timing] = await Promise.all([
    ServiceRequest.aggregate([match, { $group: { _id: '$type', n: { $sum: 1 } } }]),
    ServiceRequest.aggregate([match, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    ServiceRequest.aggregate([
      match,
      { $group: { _id: '$assignedTo', handled: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
      { $sort: { handled: -1 } },
    ]),
    ServiceRequest.aggregate([
      match,
      { $match: { status: 'completed', resolvedAt: { $exists: true } } },
      { $group: { _id: null, avgMs: { $avg: { $subtract: ['$resolvedAt', '$createdAt'] } } } },
    ]),
  ]);
  const names = await nameMap(byStaff.map((t) => t._id));
  const status = Object.fromEntries(byStatus.map((s) => [s._id, s.n]));
  return {
    range,
    totals: { all: byStatus.reduce((s, x) => s + x.n, 0), completed: status.completed || 0, rejected: status.rejected || 0, avgDaysToResolve: days(timing[0]?.avgMs) },
    byType: Object.fromEntries(byType.map((s) => [s._id, s.n])),
    byStatus: status,
    byStaff: byStaff.map((t) => ({ name: t._id ? names[String(t._id)] || 'Removed user' : 'Not assigned', handled: t.handled, completed: t.completed })),
  };
}
router.get('/reports/service', ...adminOnly, h(async (req, res) => res.json(await serviceReport(parseRange(req.query)))));
router.get('/reports/service/export', ...adminOnly, h(async (req, res) => {
  const r = await serviceReport(parseRange(req.query));
  sendCsv(res, `service-${r.range.from}_to_${r.range.to}`, [
    ['Type', 'Requests'], ...Object.entries(r.byType).map(([k, v]) => [k, v]),
    [], ['Status', 'Requests'], ...Object.entries(r.byStatus).map(([k, v]) => [k, v]),
    [], ['Handled by', 'Requests', 'Completed'], ...r.byStaff.map((t) => [t.name, t.handled, t.completed]),
  ]);
}));

// ---------------- customer records ----------------
// GET /api/admin/customers?q&page&limit
router.get('/customers', ...staffUp, h(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
  const where = { role: 'customer' };
  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    const re = new RegExp(escapeRegex(req.query.q.trim().slice(0, 60)), 'i');
    where.$or = [{ name: re }, { email: re }];
  }
  const [total, users] = await Promise.all([
    User.countDocuments(where),
    User.find(where).select('name email phone isActive createdAt').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
  ]);
  const spent = await Order.aggregate([
    { $match: { user: { $in: users.map((u) => u._id) }, status: { $ne: 'cancelled' } } },
    { $group: { _id: '$user', orders: { $sum: 1 }, spent: { $sum: '$grandTotal' } } },
  ]);
  const by = Object.fromEntries(spent.map((s) => [String(s._id), s]));
  res.json({
    total,
    rows: users.map((u) => ({
      _id: u._id, name: u.name, email: u.email, phone: u.phone || '', isActive: u.isActive, joined: u.createdAt,
      orders: by[String(u._id)]?.orders || 0, spent: round2(by[String(u._id)]?.spent || 0),
    })),
  });
}));

// GET /api/admin/customers/:id  -> profile with purchase, installation, service and warranty history
router.get('/customers/:id', ...staffUp, h(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(404, 'Customer not found');
  const c = await User.findOne({ _id: req.params.id, role: 'customer' }).select('name email phone isActive createdAt addresses').lean();
  if (!c) throw httpError(404, 'Customer not found');
  const [orders, installations, requests, warranties] = await Promise.all([
    Order.find({ user: c._id }).sort({ createdAt: -1 }).limit(20).select('orderNumber status grandTotal createdAt').lean(),
    Installation.find({ customer: c._id }).sort({ createdAt: -1 }).limit(20).populate('technician', 'name').lean(),
    ServiceRequest.find({ customer: c._id }).sort({ createdAt: -1 }).limit(20).lean(),
    Warranty.find({ customer: c._id }).sort({ purchaseDate: -1 }).limit(20).populate('product', 'name').lean(),
  ]);
  res.json({
    customer: {
      _id: c._id, name: c.name, email: c.email, phone: c.phone || '', isActive: c.isActive, joined: c.createdAt,
      addresses: (c.addresses || []).map((a) => ({ label: a.label, street: a.street, barangay: a.barangay, city: a.city, province: a.province })),
    },
    orders: orders.map((o) => ({ _id: o._id, orderNumber: o.orderNumber, status: o.status, total: o.grandTotal, createdAt: o.createdAt })),
    installations: installations.map((i) => ({ _id: i._id, status: i.status, scheduledDate: i.scheduledDate, technician: i.technician?.name || null })),
    serviceRequests: requests.map((r) => ({ _id: r._id, type: r.type, status: r.status, createdAt: r.createdAt, scheduledDate: r.scheduledDate })),
    warranties: warranties.map((w) => ({ _id: w._id, product: w.product?.name || '', serialNumber: w.serialNumber, expiryDate: w.expiryDate, status: w.status })),
  });
}));

module.exports = router;