const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    modelNumber: { type: String, required: true, unique: true, trim: true },
    description: String,
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
    price: { type: Number, required: true, min: 0 },
    images: [{ url: String, publicId: String }],
    specs: {
      capacityBTU: Number,
      capacityHP: Number,
      isInverter: { type: Boolean, default: false },
      energyRating: String,
      powerConsumptionWatts: Number,
      refrigerantType: String,
      noiseLevelDb: Number,
      dimensions: { width: Number, height: Number, depth: Number },
      warrantyMonths: { type: Number, default: 12 },
    },
    recommendedRoomSize: { minSqm: Number, maxSqm: Number },
    isAvailable: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', modelNumber: 'text' });
productSchema.index({ category: 1, brand: 1, price: 1 });

module.exports = mongoose.model('Product', productSchema);
