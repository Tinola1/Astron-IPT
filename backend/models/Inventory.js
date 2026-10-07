const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
    onlineStock: { type: Number, default: 0, min: 0 },
    showroomStock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    lowStockNotified: { type: Boolean, default: false },
    adjustments: [
      {
        stockType: { type: String, enum: ['online', 'showroom'] },
        change: Number,
        reason: String,
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

inventorySchema.virtual('totalStock').get(function () {
  return this.onlineStock + this.showroomStock;
});

inventorySchema.virtual('isLowStock').get(function () {
  return this.onlineStock + this.showroomStock <= this.lowStockThreshold;
});

module.exports = mongoose.model('Inventory', inventorySchema);
