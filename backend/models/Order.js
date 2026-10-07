const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: String,
  modelNumber: String,
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  addOns: [{ addOn: { type: mongoose.Schema.Types.ObjectId, ref: 'AddOn' }, name: String, price: Number }],
  units: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Unit' }],
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [orderItemSchema],
    fulfillment: { type: String, enum: ['delivery', 'pickup'], default: 'delivery' },
    shippingAddress: {
      recipient: String,
      phone: String,
      street: String,
      barangay: String,
      city: String,
      province: String,
      postalCode: String,
    },
    installation: {
      requested: { type: Boolean, default: false },
      preferredDate: Date,
    },
    payment: {
      method: {
        type: String,
        enum: ['card', 'ewallet', 'bank_transfer', 'cod', 'installment'],
        required: true,
      },
      status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
      reference: String,
      paidAt: Date,
    },
    promotion: { type: mongoose.Schema.Types.ObjectId, ref: 'Promotion' },
    itemsTotal: { type: Number, required: true },
    addOnsTotal: { type: Number, default: 0 },
    installationFee: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'out_for_delivery', 'delivered', 'installed', 'cancelled'],
      default: 'pending',
    },
    statusHistory: [
      {
        status: String,
        note: String,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: Date.now },
      },
    ],
    cancelledAt: Date,
    cancelReason: String,
    deliveredAt: Date,
  },
  { timestamps: true }
);

orderSchema.pre('save', function () {
  if (!this.orderNumber) {
    this.orderNumber = `AST-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
});

module.exports = mongoose.model('Order', orderSchema);
