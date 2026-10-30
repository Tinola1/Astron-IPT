// A user's own notifications. Mounted at /api/notifications
const router = require('express').Router();
const mongoose = require('mongoose');
const { Notification } = require('../models');
const { protect } = require('../middleware/auth');
const { asyncHandler: h, httpError } = require('../utils/http');

router.use(protect);

// GET /api/notifications  -> latest 20 and the unread count
router.get('/', h(async (req, res) => {
  const [items, unread] = await Promise.all([
    Notification.find({ user: req.user._id }).sort({ createdAt: -1, _id: -1 }).limit(20).lean(),
    Notification.countDocuments({ user: req.user._id, isRead: false }),
  ]);
  res.json({
    unread,
    items: items.map((n) => ({ _id: n._id, type: n.type, title: n.title, message: n.message, link: n.link, isRead: n.isRead, createdAt: n.createdAt })),
  });
}));

// PUT /api/notifications/read-all
router.put('/read-all', h(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
  res.json({ ok: true });
}));

// PUT /api/notifications/:id/read  (own notifications only)
router.put('/:id/read', h(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(404, 'Notification not found');
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { isRead: true });
  if (!n) throw httpError(404, 'Notification not found');
  res.json({ ok: true });
}));

module.exports = router;