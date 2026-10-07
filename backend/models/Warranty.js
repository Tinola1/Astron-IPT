const mongoose = require('mongoose');

const warrantySchema = new mongoose.Schema(
  {
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true, unique: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    serialNumber: { type: String, required: true },
    purchaseDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    status: { type: String, enum: ['active', 'expired', 'void'], default: 'active' },
  },
  { timestamps: true }
);

warrantySchema.virtual('isActive').get(function () {
  return this.status === 'active' && this.expiryDate > new Date();
});

module.exports = mongoose.model('Warranty', warrantySchema);
