const { Order } = require('../models');
const { httpError } = require('./http');

// Sales are grouped by calendar day in the store's timezone, not UTC,
// so an order placed at 1am in Manila counts for that day.
const TZ = 'Asia/Manila';
const TZ_OFFSET = '+08:00'; // the Philippines has no daylight saving time
const DAY_MS = 86400000;
const MAX_RANGE_DAYS = 731;
const GROUPINGS = ['day', 'week', 'month'];

// ---------- date helpers (YYYY-MM-DD strings; UTC math keeps them timezone-proof) ----------
const isDate = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};
const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
const diffDays = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
const todayManila = () => new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
const dayStart = (day) => new Date(`${day}T00:00:00.000${TZ_OFFSET}`);
const dayEnd = (day) => new Date(`${day}T23:59:59.999${TZ_OFFSET}`);
const round2 = (n) => Math.round(n * 100) / 100;

function parseRange(query) {
  const today = todayManila();
  const from = isDate(query.from) ? query.from : addDays(today, -29);
  const to = isDate(query.to) ? query.to : today;
  if (from > to) throw httpError(400, 'The start date must be on or before the end date');
  if (diffDays(from, to) > MAX_RANGE_DAYS) throw httpError(400, 'Choose a range of at most 2 years');
  const groupBy = GROUPINGS.includes(query.groupBy) ? query.groupBy : 'day';
  return { from, to, groupBy };
}

// ---------- bucketing ----------
// first day of the bucket that `day` belongs to (weeks start on Monday)
function bucketKey(day, groupBy) {
  if (groupBy === 'month') return `${day.slice(0, 7)}-01`;
  if (groupBy === 'week') {
    const dow = new Date(`${day}T00:00:00Z`).getUTCDay(); // 0 = Sunday
    return addDays(day, -((dow + 6) % 7));
  }
  return day;
}

// rows: [{ _id: 'YYYY-MM-DD', revenue, orders, units }] -> continuous series with zero-filled gaps
function bucketSeries(rows, from, to, groupBy) {
  const byDay = new Map(rows.map((r) => [r._id, r]));
  const buckets = new Map();
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const key = bucketKey(d, groupBy);
    if (!buckets.has(key)) buckets.set(key, { date: key, revenue: 0, orders: 0, units: 0 });
    const r = byDay.get(d);
    if (r) {
      const b = buckets.get(key);
      b.revenue += r.revenue;
      b.orders += r.orders;
      b.units += r.units;
    }
  }
  return [...buckets.values()].map((b) => ({ ...b, revenue: round2(b.revenue) }));
}

// ---------- queries ----------
const matchRange = (from, to) => ({
  $match: { status: { $ne: 'cancelled' }, createdAt: { $gte: dayStart(from), $lte: dayEnd(to) } },
});

async function totalsFor(from, to) {
  const [r] = await Order.aggregate([
    matchRange(from, to),
    { $group: { _id: null, revenue: { $sum: '$grandTotal' }, orders: { $sum: 1 } } },
  ]);
  return { revenue: round2(r?.revenue || 0), orders: r?.orders || 0 };
}

async function salesReport({ from, to, groupBy }) {
  const span = diffDays(from, to) + 1;
  const previousTo = addDays(from, -1);
  const previousFrom = addDays(previousTo, -(span - 1));

  const [dayRows, previous, topProducts] = await Promise.all([
    Order.aggregate([
      matchRange(from, to),
      { $addFields: { unitCount: { $sum: '$items.quantity' } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } },
          revenue: { $sum: '$grandTotal' },
          orders: { $sum: 1 },
          units: { $sum: '$unitCount' },
        },
      },
    ]),
    totalsFor(previousFrom, previousTo),
    Order.aggregate([
      matchRange(from, to),
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          units: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }, // unit price x qty, add-ons excluded
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
    ]),
  ]);

  const revenue = round2(dayRows.reduce((s, r) => s + r.revenue, 0));
  const orders = dayRows.reduce((s, r) => s + r.orders, 0);
  const units = dayRows.reduce((s, r) => s + r.units, 0);

  return {
    range: { from, to, groupBy, previousFrom, previousTo },
    series: bucketSeries(dayRows, from, to, groupBy),
    totals: { revenue, orders, units, averageOrderValue: orders ? round2(revenue / orders) : 0 },
    previous,
    topProducts: topProducts.map((p) => ({ _id: p._id, name: p.name, units: p.units, revenue: round2(p.revenue) })),
  };
}

// ---------- CSV ----------
function salesCsv(report) {
  const { series, totals, range } = report;
  const label = { day: 'Date', week: 'Week starting', month: 'Month' }[range.groupBy];
  const rows = [
    [label, 'Orders', 'Units sold', 'Revenue (PHP)'],
    ...series.map((b) => [
      range.groupBy === 'month' ? b.date.slice(0, 7) : b.date,
      b.orders,
      b.units,
      b.revenue.toFixed(2),
    ]),
    ['Total', totals.orders, totals.units, totals.revenue.toFixed(2)],
  ];
  // BOM so Excel opens it as UTF-8; cells are only dates and numbers, so nothing needs escaping
  return `\uFEFF${rows.map((r) => r.join(',')).join('\r\n')}\r\n`;
}

module.exports = {
  TZ, isDate, addDays, diffDays, todayManila, dayStart, dayEnd, round2,
  parseRange, bucketKey, bucketSeries, salesReport, totalsFor, salesCsv,
};