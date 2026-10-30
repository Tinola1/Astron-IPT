const { Order, Unit, Warranty, Product, AddOn, StoreInfo } = require('../models');

const DEFAULT_WARRANTY_MONTHS = 12;
const EXTENDED_MONTHS = 12; // each "extended warranty" add-on
const DEFAULT_REMINDER_MONTHS = 6;

const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

// how often customers are reminded to clean their unit (set in StoreInfo)
async function reminderMonths() {
  const info = await StoreInfo.findOne().select('maintenanceReminderMonths').lean();
  const m = Number(info?.maintenanceReminderMonths);
  return Number.isInteger(m) && m >= 1 && m <= 36 ? m : DEFAULT_REMINDER_MONTHS;
}

const warrantyState = (w, now = new Date()) => (w.status === 'void' ? 'void' : new Date(w.expiryDate) <= now ? 'expired' : 'active');

// Creates one Unit (serial number) and one Warranty for every unit in a delivered order.
// Safe to run again: units already assigned to the order and warranties already created are reused.
async function registerWarranties(order) {
  const customerId = order.user?._id || order.user;
  const [products, extended, remindEvery] = await Promise.all([
    Product.find({ _id: { $in: order.items.map((i) => i.product) } }).select('specs.warrantyMonths').lean(),
    AddOn.find({ type: 'extended_warranty' }).select('_id').lean(),
    reminderMonths(),
  ]);
  const baseMonths = Object.fromEntries(products.map((p) => [String(p._id), p.specs?.warrantyMonths ?? DEFAULT_WARRANTY_MONTHS]));
  const extendedIds = new Set(extended.map((a) => String(a._id)));
  const purchaseDate = order.createdAt || new Date();

  for (const [i, item] of order.items.entries()) {
    const units = await Unit.find({ order: order._id, product: item.product }).sort('createdAt').lean();
    while (units.length < item.quantity) {
      const slot = units.length + 1;
      // prefer a real serial number the admin already registered for this product; otherwise generate one
      let unit = await Unit.findOneAndUpdate(
        { product: item.product, stockType: 'online', status: 'in_stock' },
        { status: 'sold', order: order._id, soldAt: new Date() },
        { sort: { createdAt: 1 }, new: true }
      ).lean();
      if (!unit) {
        unit = await Unit.findOneAndUpdate(
          { serialNumber: `${item.modelNumber || 'UNIT'}/${order.orderNumber}/${i + 1}-${slot}` },
          { $setOnInsert: { product: item.product, stockType: 'online', status: 'sold', order: order._id, soldAt: new Date() } },
          { upsert: true, new: true }
        ).lean();
      }
      units.push(unit);
    }

    const extendedCount = (item.addOns || []).filter((a) => extendedIds.has(String(a.addOn))).length;
    const months = (baseMonths[String(item.product)] ?? DEFAULT_WARRANTY_MONTHS) + EXTENDED_MONTHS * extendedCount;
    for (const unit of units) {
      await Warranty.updateOne(
        { unit: unit._id },
        {
          $setOnInsert: {
            product: item.product,
            customer: customerId,
            order: order._id,
            serialNumber: unit.serialNumber,
            purchaseDate,
            expiryDate: addMonths(purchaseDate, months),
            status: 'active',
            nextMaintenanceDate: addMonths(purchaseDate, remindEvery),
          },
        },
        { upsert: true }
      );
    }
    await Order.updateOne({ _id: order._id, 'items._id': item._id }, { $addToSet: { 'items.$.units': { $each: units.map((u) => u._id) } } });
  }
}

// Self-heal: registers warranties for delivered orders that don't have them yet
// (orders delivered before this feature existed, or a registration that failed earlier).
async function ensureWarranties(userId) {
  const orders = await Order.find({ user: userId, status: { $in: ['delivered', 'installed'] } }).lean();
  if (!orders.length) return;
  const counts = await Warranty.aggregate([
    { $match: { order: { $in: orders.map((o) => o._id) } } },
    { $group: { _id: '$order', n: { $sum: 1 } } },
  ]);
  const have = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  for (const order of orders) {
    const expected = order.items.reduce((s, i) => s + i.quantity, 0);
    if ((have[String(order._id)] || 0) < expected) await registerWarranties(order);
  }
}

module.exports = { addMonths, reminderMonths, warrantyState, registerWarranties, ensureWarranties };