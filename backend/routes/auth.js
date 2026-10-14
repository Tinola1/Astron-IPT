const router = require('express').Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const { User } = require('../models');
const { protect } = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

const sendToken = (user, status, res) => {
  const token = signToken(user._id);
  res.cookie('token', token, cookieOptions()).status(status).json({
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatar: user.avatar,
    },
  });
};

// POST /api/auth/register  (always creates a customer)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });
    if (!email || !validator.isEmail(email))
      return res.status(400).json({ message: 'A valid email is required' });
    if (!password || password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    if (await User.findOne({ email: email.toLowerCase() }))
      return res.status(409).json({ message: 'Email is already registered' });

    const user = await User.create({ name, email, password, phone, role: 'customer' });
    sendToken(user, 201, res);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' });
    if (!user.isActive) return res.status(403).json({ message: 'Account is deactivated' });

    sendToken(user, 200, res);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  res
    .cookie('token', '', { ...cookieOptions(), maxAge: 0 })
    .json({ message: 'Logged out' });
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => res.json({ user: req.user }));

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const generic = { message: 'If that email exists, a reset link has been sent' };
  try {
    const user = await User.findOne({ email: (req.body.email || '').toLowerCase() });
    if (!user) return res.json(generic);

    const token = user.createResetToken();
    await user.save({ validateBeforeSave: false });

    const url = `${process.env.CLIENT_URL}/reset-password/${token}`;
    try {
      await sendEmail({
        to: user.email,
        subject: 'Astron - Password reset',
        html: `<p>Hi ${user.name},</p>
               <p>Click the link below to reset your password. It expires in 15 minutes.</p>
               <p><a href="${url}">${url}</a></p>`,
      });
    } catch (mailErr) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ message: 'Email could not be sent' });
    }
    res.json(generic);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PUT /api/auth/reset-password/:token
router.put('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpire: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: 'Token is invalid or has expired' });

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    sendToken(user, 200, res);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;