const { Notification, User } = require('../models');
const sendEmail = require('./sendEmail');

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// In-app notification + email to one user. Best effort: it never throws, so a mail problem can't break the request.
async function notifyUser(userId, { type = 'general', title, message, link }) {
  try {
    const user = await User.findById(userId).select('name email');
    if (!user) return;
    await Notification.create({ user: user._id, type, title, message, link });
    await sendEmail({
      to: user.email,
      subject: `Astron: ${title}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px">
        <h2 style="color:#0b5fff">Astron Air Conditioners</h2>
        <p>Hi ${esc(user.name)},</p><p>${esc(message)}</p></div>`,
    });
  } catch (e) {
    console.error('Notification failed:', e.message);
  }
}

module.exports = { notifyUser };