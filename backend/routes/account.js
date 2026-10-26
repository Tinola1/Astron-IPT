const router = require('express').Router();
const { User } = require('../models');
const { protect } = require('../middleware/auth');
const { cleanProfile, cleanAddress, cleanPasswordChange } = require('../utils/accountValidation');
const book = require('../utils/addressBook');
const { publicUser } = require('../utils/session');
const { asyncHandler: h, httpError } = require('../utils/http');

router.use(protect); // any logged-in user manages their own account

const addressesOf = (u) => u.addresses.map((a) => a.toObject());
const profileView = (u) => ({
  ...publicUser(u),
  authProvider: u.authProvider || 'local',
  passwordSet: u.passwordSet !== false,
  addresses: addressesOf(u),
});

// GET /api/account
router.get('/', h(async (req, res) => res.json({ user: profileView(req.user) })));

// PUT /api/account/profile  { name, phone }
router.put('/profile', h(async (req, res) => {
  const { name, phone } = cleanProfile(req.body);
  req.user.name = name;
  req.user.phone = phone;
  await req.user.save();
  res.json({ user: profileView(req.user) });
}));

// PUT /api/account/password  { currentPassword?, newPassword }
// Accounts created through Google have no password yet, so they can set one without a current password.
router.put('/password', h(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  const requireCurrent = user.passwordSet !== false;
  const { currentPassword, newPassword } = cleanPasswordChange(req.body, { requireCurrent });
  if (requireCurrent && !(await user.comparePassword(currentPassword)))
    throw httpError(400, 'Your current password is incorrect');
  user.password = newPassword;
  user.passwordSet = true;
  await user.save();
  res.json({ message: 'Password updated', passwordSet: true });
}));

// ---- saved addresses (every route answers with the whole updated list) ----
router.post('/addresses', h(async (req, res) => {
  book.addAddress(req.user, cleanAddress(req.body));
  await req.user.save();
  res.status(201).json({ addresses: addressesOf(req.user) });
}));

router.put('/addresses/:id', h(async (req, res) => {
  book.updateAddress(req.user, req.params.id, cleanAddress(req.body));
  await req.user.save();
  res.json({ addresses: addressesOf(req.user) });
}));

router.put('/addresses/:id/default', h(async (req, res) => {
  book.findAddress(req.user, req.params.id); // 404 if it isn't theirs
  book.setDefault(req.user, req.params.id);
  await req.user.save();
  res.json({ addresses: addressesOf(req.user) });
}));

router.delete('/addresses/:id', h(async (req, res) => {
  book.removeAddress(req.user, req.params.id);
  await req.user.save();
  res.json({ addresses: addressesOf(req.user) });
}));

module.exports = router;