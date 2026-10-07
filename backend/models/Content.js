const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['banner', 'promotion', 'buying_guide'], required: true },
    title: { type: String, required: true },
    body: String,
    image: { url: String, publicId: String },
    link: String,
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Content', contentSchema);
