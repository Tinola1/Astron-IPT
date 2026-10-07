const mongoose = require('mongoose');

const installationSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    scheduledDate: Date,
    address: {
      street: String,
      barangay: String,
      city: String,
      province: String,
      postalCode: String,
    },
    status: {
      type: String,
      enum: ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    notes: String,
    completionPhotos: [{ url: String, publicId: String }],
    completedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Installation', installationSchema);
