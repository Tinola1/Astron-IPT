const mongoose = require('mongoose');

const serviceRequestSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
    warranty: { type: mongoose.Schema.Types.ObjectId, ref: 'Warranty' },
    type: {
      type: String,
      enum: ['repair', 'cleaning', 'maintenance', 'warranty_claim'],
      required: true,
    },
    description: { type: String, required: true },
    photos: [{ url: String, publicId: String }],
    preferredDate: Date,
    scheduledDate: Date,
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'approved', 'rejected', 'scheduled', 'in_progress', 'completed'],
      default: 'submitted',
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    staffNotes: String,
    resolvedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);
