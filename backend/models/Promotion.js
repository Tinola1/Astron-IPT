const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    code: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    description: String,
    discountType: { type: String, enum: ['percent', 'fixed'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    minOrderAmount: { type: Number, default: 0 },
    usageLimit: Number,
    usedCount: { type: Number, default: 0 },
    startDate: Date,
    endDate: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Promotion', promotionSchema);
