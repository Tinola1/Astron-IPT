const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'order_update',
        'delivery_schedule',
        'installation_schedule',
        'maintenance_reminder',
        'low_stock',
        'service_update',
        'general',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: String,
    link: String,
    isRead: { type: Boolean, default: false },
    emailSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
