// Staff and technician accounts. Mounted at /api/admin/users (admin only)
const router = require('express').Router();
const mongoose = require('mongoose');
const validator = require('validator');
const { User } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const { asyncHandler: h, httpError } = require('../utils/http');

router.use(protect, authorize('admin'));

const TEAM_ROLES = ['staff', 'technician'];
const PASSWORD_MSG = 'Password must be 8 to 72 characters';
const isText = (v) => typeof v === 'string';
const validPassword = (p) => isText(p) && p.length >= 8 && Buffer.byteLength(p) <= 72;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const view = (u) => ({ _id: u._id, name: u.name, email: u.email, phone: u.phone || '', role: u.role, isActive: u.isActive, createdAt: u.createdAt });

const cleanName = (v) => {
  if (!isText(v) || !v.trim() || v.trim().length > 80) throw httpError(400, 'Name is required (up to 80 characters)');
  return v.trim();
};
const cleanPhone = (v) => {
  if (v === undefined || v === null || v === '') return '';
  if (!isText(v) || v.trim().length > 30) throw httpError(400, 'Phone number is too long');
  return v.trim();
};
async function loadTarget(id) {
  if (!mongoose.isValidObjectId(id)) throw httpError(404, 'User not found');
  const u = await User.findById(id);
  if (!u) throw httpError(404, 'User not found');
  return u;
}

// GET /api/admin/users?role=staff|technician|admin&q&page&limit  (customers are on the Customers page)
router.get('/', h(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
  const where = { role: { $in: [...TEAM_ROLES, 'admin'] } };
  if ([...TEAM_ROLES, 'admin'].includes(req.query.role)) where.role = req.query.role;
  if (isText(req.query.q) && req.query.q.trim()) {
    const re = new RegExp(escapeRegex(req.query.q.trim().slice(0, 60)), 'i');
    where.$or = [{ name: re }, { email: re }];
  }
  const [total, users] = await Promise.all([
    User.countDocuments(where),
    User.find(where).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
  ]);
  res.json({ total, rows: users.map(view) });
}));

// POST /api/admin/users  { name, email, password, phone, role: staff|technician }
router.post('/', h(async (req, res) => {
  const { email, password, role } = req.body;
  if (!TEAM_ROLES.includes(role)) throw httpError(400, 'Role must be staff or technician');
  const name = cleanName(req.body.name);
  if (!isText(email) || !validator.isEmail(email.trim())) throw httpError(400, 'A valid email is required');
  if (!validPassword(password)) throw httpError(400, PASSWORD_MSG);
  const phone = cleanPhone(req.body.phone);
  try {
    const user = await User.create({ name, email: email.trim().toLowerCase(), password, phone, role });
    res.status(201).json(view(user));
  } catch (e) {
    if (e.code === 11000) throw httpError(409, 'Email is already registered');
    throw e;
  }
}));

// PUT /api/admin/users/:id  { name, phone, role, isActive }
// Other admins can't be changed here, and roles only switch between staff and technician.
router.put('/:id', h(async (req, res) => {
  const user = await loadTarget(req.params.id);
  const self = String(user._id) === String(req.user._id);
  if (user.role === 'admin') throw httpError(403, 'Admin accounts cannot be changed here');

  const { role, isActive } = req.body;
  if (role !== undefined) {
    if (!TEAM_ROLES.includes(role) || !TEAM_ROLES.includes(user.role)) throw httpError(400, 'Role can only be staff or technician');
    user.role = role;
  }
  if (isActive !== undefined) {
    if (typeof isActive !== 'boolean') throw httpError(400, 'isActive must be true or false');
    if (self && !isActive) throw httpError(400, 'You cannot deactivate yourself');
    user.isActive = isActive;
  }
  if (req.body.name !== undefined) user.name = cleanName(req.body.name);
  if (req.body.phone !== undefined) user.phone = cleanPhone(req.body.phone);
  await user.save();
  res.json(view(user));
}));

// PUT /api/admin/users/:id/password  { password }  -> reset a staff/technician password
router.put('/:id/password', h(async (req, res) => {
  const user = await loadTarget(req.params.id);
  if (!TEAM_ROLES.includes(user.role)) throw httpError(403, 'Only staff and technician passwords can be reset here');
  if (!validPassword(req.body.password)) throw httpError(400, PASSWORD_MSG);
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();
  res.json({ ok: true });
}));

// There is no delete: accounts are deactivated instead, so installation and service history keeps its names.
module.exports = router;