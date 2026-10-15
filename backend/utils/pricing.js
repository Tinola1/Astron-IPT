const { Promotion, DeliveryZone } = require('../models');

const DEFAULT_DELIVERY_FEE = Number(process.env.DEFAULT_DELIVERY_FEE) || 2500;
const round2 = (n) => Math.round(n * 100) / 100;
const norm = (s) => (s || '').trim().toLowerCase();

// items: cart items with product + addOns populated.
// Installation add-ons are counted separately from other add-ons.
function priceLines(items) {
  let itemsTotal = 0, addOnsTotal = 0, installationFee = 0;
  const lines = items.map((it) => {
    const base = it.product.price * it.quantity;
    let addOns = 0, install = 0;
    for (const a of it.addOns) {
      if (a.type === 'installation') install += a.price * it.quantity;
      else addOns += a.price * it.quantity;
    }
    itemsTotal += base;
    addOnsTotal += addOns;
    installationFee += install;
    return { lineTotal: base + addOns + install };
  });
  return { lines, itemsTotal, addOnsTotal, installationFee };
}

// Subtotal of a saved order item: (unit price + its add-ons) x quantity
const orderLineSubtotal = (item) =>
  (item.price + (item.addOns || []).reduce((s, a) => s + a.price, 0)) * item.quantity;

async function deliveryFeeFor({ fulfillment, city, province }) {
  if (fulfillment === 'pickup') return { fee: 0, zone: null, pending: false };
  if (!norm(city) && !norm(province)) return { fee: 0, zone: null, pending: true };

  const zones = await DeliveryZone.find({ isActive: true }).lean();
  const zone =
    zones.find((z) => z.cities.some((c) => norm(c) === norm(city))) ||
    zones.find((z) => z.provinces.some((p) => norm(p) === norm(province)));
  return { fee: zone ? zone.fee : DEFAULT_DELIVERY_FEE, zone: zone?.name || null, pending: false };
}

async function evaluatePromo(code, itemsTotal) {
  if (!code || !String(code).trim()) return {};
  const promo = await Promotion.findOne({ code: String(code).trim().toUpperCase(), isActive: true });
  const now = new Date();
  if (!promo) return { error: 'Invalid promo code' };
  if (promo.startDate && promo.startDate > now) return { error: 'This promo is not active yet' };
  if (promo.endDate && promo.endDate < now) return { error: 'This promo has expired' };
  if (promo.usageLimit != null && promo.usedCount >= promo.usageLimit)
    return { error: 'This promo has reached its usage limit' };
  if (itemsTotal < promo.minOrderAmount)
    return { error: `Minimum order of ₱${promo.minOrderAmount.toLocaleString()} required for this code` };

  const raw = promo.discountType === 'percent' ? (itemsTotal * promo.discountValue) / 100 : promo.discountValue;
  return { promo, discount: Math.min(round2(raw), itemsTotal) };
}

async function computeTotals(items, { fulfillment = 'delivery', city, province, promoCode } = {}) {
  const priced = priceLines(items);
  const delivery = await deliveryFeeFor({ fulfillment, city, province });
  const promo = await evaluatePromo(promoCode, priced.itemsTotal);
  const discount = promo.discount || 0;

  const grandTotal = round2(
    priced.itemsTotal + priced.addOnsTotal + priced.installationFee + delivery.fee - discount
  );
  return {
    itemsTotal: priced.itemsTotal,
    addOnsTotal: priced.addOnsTotal,
    installationFee: priced.installationFee,
    deliveryFee: delivery.fee,
    deliveryPending: delivery.pending,
    deliveryZone: delivery.zone,
    discount,
    promo: promo.promo || null,
    promoError: promo.error || null,
    grandTotal,
  };
}

module.exports = { priceLines, orderLineSubtotal, computeTotals };