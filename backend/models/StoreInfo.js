const mongoose = require('mongoose');

const storeInfoSchema = new mongoose.Schema(
  {
    storeName: { type: String, default: 'Astron Aircon' },
    email: String,
    phone: String,
    address: String,
    businessHours: String,
    logo: { url: String, publicId: String },
    social: { facebook: String, instagram: String },
    maintenanceReminderMonths: { type: Number, default: 6 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StoreInfo', storeInfoSchema);
