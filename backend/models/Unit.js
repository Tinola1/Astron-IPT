const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    serialNumber: { type: String, required: true, unique: true, trim: true },
    stockType: { type: String, enum: ['online', 'showroom'], default: 'online' },
    status: {
      type: String,
      enum: ['in_stock', 'reserved', 'sold', 'returned', 'damaged'],
      default: 'in_stock',
    },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    soldAt: Date,
  },
  { timestamps: true }
);

unitSchema.index({ product: 1, stockType: 1, status: 1 });

module.exports = mongoose.model('Unit', unitSchema);
