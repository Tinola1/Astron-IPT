const router = require('express').Router();
const { Order, Inventory, Installation } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const {
  parseRange, salesReport, salesCsv, totalsFor, todayManila, addDays, dayStart, dayEnd,
} = require('../utils/reports');
const { asyncHandler: h } = require('../utils/http');

// NOTE: this router is mounted at /api/admin, so auth is applied per route (not router.use)
// to avoid intercepting the other /api/admin/* routers.

// GET /api/admin/reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD&groupBy=day|week|month
router.get('/reports/sales', protect, authorize('admin'), h(async (req, res) => {
  res.json(await salesReport(parseRange(req.query)));
}));

// GET /api/admin/reports/sales/export  -> CSV download of the same report
router.get('/reports/sales/export', protect, authorize('admin'), h(async (req, res) => {
  const report = await salesReport(parseRange(req.query));
  const { from, to } = report.range;
  res
    .set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="sales-${from}_to_${to}.csv"`,
    })
    .send(salesCsv(report));
}));

// GET /api/admin/dashboard  (summary cards + short lists; sales figures are admin-only)
router.get('/dashboard', protect, authorize('admin', 'staff'), h(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const today = todayManila();
  const monthStart = `${today.slice(0, 8)}01`;
  const lowStockExpr = { $lte: [{ $add: ['$onlineStock', '$showroomStock'] }, '$lowStockThreshold'] };
  const upcomingFilter = {
    status: { $in: ['pending', 'scheduled', 'in_progress'] },
    scheduledDate: { $gte: dayStart(today), $lte: dayEnd(addDays(today, 14)) },
  };

  const [pending, processing, outForDelivery, stockRows, installCount, unassigned, upcoming, salesToday, salesMonth] =
    await Promise.all([
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'processing' }),
      Order.countDocuments({ status: 'out_for_delivery' }),
      Inventory.find({ $expr: lowStockExpr })
        .populate({ path: 'product', select: 'name modelNumber isDeleted' })
        .lean(),
      Installation.countDocuments(upcomingFilter),
      Installation.countDocuments({ ...upcomingFilter, technician: { $exists: false } }),
      Installation.find(upcomingFilter)
        .sort('scheduledDate')
        .limit(5)
        .populate('customer', 'name')
        .populate('technician', 'name')
        .lean(),
      isAdmin ? totalsFor(today, today) : null,
      isAdmin ? totalsFor(monthStart, today) : null,
    ]);

  // inventory rows whose product was deleted don't count
  const low = stockRows
    .filter((r) => r.product && !r.product.isDeleted)
    .map((r) => ({
      _id: r.product._id,
      name: r.product.name,
      modelNumber: r.product.modelNumber,
      stock: r.onlineStock + r.showroomStock,
      threshold: r.lowStockThreshold,
    }))
    .sort((a, b) => a.stock - b.stock);

  res.json({
    sales: isAdmin ? { today: salesToday, month: salesMonth } : null,
    orders: { pending, processing, outForDelivery },
    lowStock: { count: low.length, items: low.slice(0, 5) },
    installations: {
      count: installCount,
      unassigned,
      upcoming: upcoming.map((i) => ({
        _id: i._id,
        scheduledDate: i.scheduledDate,
        status: i.status,
        customer: i.customer?.name || 'Customer',
        city: i.address?.city || '',
        technician: i.technician?.name || null,
      })),
    },
  });
}));

module.exports = router;