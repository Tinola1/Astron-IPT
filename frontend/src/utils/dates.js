// All dates here are 'YYYY-MM-DD' strings in local time (never toISOString(), which shifts the day by timezone)
export const MAX_RANGE_DAYS = 731;

const pad = (n) => String(n).padStart(2, '0');
const parse = (iso) => new Date(`${iso}T00:00:00`);

export const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISODate(new Date());

export const addDaysISO = (iso, n) => {
  const d = parse(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
};
export const diffDaysISO = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);

export const PRESETS = [
  { key: '7d', label: 'Last 7 days', range: (t) => [addDaysISO(t, -6), t] },
  { key: '30d', label: 'Last 30 days', range: (t) => [addDaysISO(t, -29), t] },
  { key: '90d', label: 'Last 90 days', range: (t) => [addDaysISO(t, -89), t] },
  { key: 'month', label: 'This month', range: (t) => [`${t.slice(0, 8)}01`, t] },
  { key: 'year', label: 'This year', range: (t) => [`${t.slice(0, 4)}-01-01`, t] },
];

// sensible default granularity for a range so the chart never has hundreds of points
export const autoGroupBy = (from, to) => {
  const days = diffDaysISO(from, to) + 1;
  if (days <= 31) return 'day';
  if (days <= 180) return 'week';
  return 'month';
};

// x-axis tick label for a bucket that starts on `key`
export const formatBucket = (key, groupBy) =>
  parse(key).toLocaleDateString('en-PH', groupBy === 'month' ? { month: 'short', year: 'numeric' } : { month: 'short', day: 'numeric' });

// tooltip heading
export const bucketTooltip = (key, groupBy) => {
  const d = parse(key);
  if (groupBy === 'month') return d.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  const full = d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  return groupBy === 'week' ? `Week of ${full}` : full;
};