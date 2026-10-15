export const peso = (n) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(n ?? 0);

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
export const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '-';