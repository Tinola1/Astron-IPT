export const PRICE_MIN = 0;
export const PRICE_MAX = 150000;
export const PAGE_SIZE = 8;
export const BTU_OPTIONS = [6000, 9000, 12000, 18000, 24000, 36000];

export const DEFAULT_FILTERS = {
  q: '',
  category: '',
  brand: '',
  inverter: '',
  energy: '',
  btu: '',
  minPrice: '',
  maxPrice: '',
  rating: '',
  minReviews: '',
  sort: 'price_asc',
};

export const MAX_CART_QTY = 10;

export const PAYMENT_METHODS = [
  { value: 'cod', label: 'Cash on delivery / pickup' },
  { value: 'card', label: 'Credit / debit card' },
  { value: 'ewallet', label: 'E-wallet (GCash, Maya)' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'installment', label: 'Installment' },
];

export const ORDER_STATUS = {
  pending: { label: 'Pending', color: 'default' },
  processing: { label: 'Processing', color: 'info' },
  out_for_delivery: { label: 'Out for delivery', color: 'warning' },
  delivered: { label: 'Delivered', color: 'success' },
  installed: { label: 'Installed', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'error' },
};

export const PAYMENT_STATUS = {
  pending: { label: 'Pending', color: 'default' },
  paid: { label: 'Paid', color: 'success' },
  failed: { label: 'Failed', color: 'error' },
  refunded: { label: 'Refunded', color: 'info' },
};