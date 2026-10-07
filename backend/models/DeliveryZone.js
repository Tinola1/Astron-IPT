const mongoose = require('mongoose');

const deliveryZoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    cities: [{ type: String, trim: true }],
    provinces: [{ type: String, trim: true }],
    fee: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DeliveryZone', deliveryZoneSchema);
