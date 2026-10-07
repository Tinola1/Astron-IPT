const mongoose = require('mongoose');

const addOnSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['installation', 'extended_warranty', 'mounting_bracket', 'piping_kit', 'other'],
      required: true,
    },
    description: String,
    price: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AddOn', addOnSchema);
