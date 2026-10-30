const { Inventory, User } = require('../models');
const { notifyUser } = require('./notify');

// Looks at the given products after any stock change.
//  - stock at or below the low-stock level (and nobody told yet): tell every admin once
//  - stock back above the level: re-arm, so the next drop tells them again
// The "already told" flag is claimed atomically, so two requests can't send the same alert.
async function checkLowStock(productIds) {
  const ids = [...new Set((productIds || []).map(String))];
  if (!ids.length) return;
  const rows = await Inventory.find({ product: { $in: ids } }).populate('product', 'name modelNumber isDeleted');

  for (const r of rows) {
    const total = r.onlineStock + r.showroomStock;
    const low = total <= r.lowStockThreshold;
    if (low && !r.lowStockNotified && r.product && !r.product.isDeleted) {
      const claimed = await Inventory.findOneAndUpdate({ _id: r._id, lowStockNotified: { $ne: true } }, { lowStockNotified: true });
      if (!claimed) continue;
      const admins = await User.find({ role: 'admin', isActive: true }).select('_id').lean();
      await Promise.all(
        admins.map((a) =>
          notifyUser(a._id, {
            type: 'low_stock',
            title: `Low stock: ${r.product.name}`,
            message: `${r.product.name} (${r.product.modelNumber}) is down to ${total} unit${total === 1 ? '' : 's'} (online ${r.onlineStock}, showroom ${r.showroomStock}). The low-stock level is ${r.lowStockThreshold}.`,
            link: `/admin/inventory/${r.product._id}`,
          })
        )
      );
    } else if (!low && r.lowStockNotified) {
      await Inventory.updateOne({ _id: r._id, lowStockNotified: true }, { lowStockNotified: false });
    }
  }
}

module.exports = { checkLowStock };