const { Inventory, Installation, Promotion } = require('../models');
const { checkLowStock } = require('./stock');

// Side effects of a cancellation (used by both customer and admin cancel):
// put stock back, cancel the installation job, release the promo use, refund a paid payment.
async function finalizeCancellation(order) {
  await Promise.all(
    order.items.map((it) => Inventory.updateOne({ product: it.product }, { $inc: { onlineStock: it.quantity } }))
  );
  await checkLowStock(order.items.map((it) => it.product)).catch((e) => console.error('Low-stock check failed:', e.message));
  await Installation.updateMany({ order: order._id }, { status: 'cancelled' });
  if (order.promotion) await Promotion.updateOne({ _id: order.promotion }, { $inc: { usedCount: -1 } });
  if (order.payment.status === 'paid') {
    order.payment.status = 'refunded';
    await order.save();
  }
  return order;
}

module.exports = { finalizeCancellation };