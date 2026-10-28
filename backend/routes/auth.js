const router = require('express').Router();
const crypto = require('crypto');
const validator = require('validator');
const { User } = require('../models');
const { protect } = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');
const { signToken, cookieOptions, publicUser } = require('../utils/session');
const { PH_PHONE } = require('../utils/accountValidation');

const isText = (v) => typeof v === 'string';
// bcrypt only reads the first 72 bytes, so longer passwords are refused instead of silently cut
const validPassword = (p) => isText(p) && p.length >= 8 && Buffer.byteLength(p) <= 72;
const PASSWORD_MSG = 'Password must be 8 to 72 characters';
const oops = (res) => res.status(500).json({ message: 'Something went wrong' });

const sendSession = (user, status, res) =>
  res.cookie('token', signToken(user._id), cookieOptions()).status(status).json({ user: publicUser(user) });

// POST /api/auth/register  (always creates a customer)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!isText(name) || !name.trim() || name.trim().length > 80)
      return res.status(400).json({ message: 'Name is required (up to 80 characters)' });
    if (!isText(email) || !validator.isEmail(email))
      return res.status(400).json({ message: 'A valid email is required' });
    if (!validPassword(password)) return res.status(400).json({ message: PASSWORD_MSG });
    if (phone !== undefined && phone !== '' && (!isText(phone) || !PH_PHONE.test(phone)))
      return res.status(400).json({ message: 'Enter a valid PH mobile number' });
    if (await User.findOne({ email: email.toLowerCase() }))
      return res.status(409).json({ message: 'Email is already registered' });

    const user = await User.create({ name: name.trim(), email, password, phone: phone || undefined, role: 'customer' });
    sendSession(user, 201, res);
  } catch (e) {
    console.error(e);
    oops(res);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!isText(email) || !isText(password) || !email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' });
    if (!user.isActive) return res.status(403).json({ message: 'Account is deactivated' });

    sendSession(user, 200, res);
  } catch (e) {
    console.error(e);
    oops(res);
  }
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  res.cookie('token', '', { ...cookieOptions(), maxAge: 0 }).json({ message: 'Logged out' });
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => res.json({ user: req.user }));

// POST /api/auth/forgot-password  (same answer whether or not the email exists)
router.post('/forgot-password', async (req, res) => {
  const generic = { message: 'If that email exists, a reset link has been sent' };
  try {
    const email = req.body.email;
    if (!isText(email) || !email) return res.json(generic);
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json(generic);

    const token = user.createResetToken();
    await user.save({ validateBeforeSave: false });

    const url = `${process.env.CLIENT_URL}/reset-password/${token}`;
    try {
      await sendEmail({
        to: user.email,
        subject: 'Astron - Password reset',
        html: `<p>Hi ${validator.escape(user.name)},</p>
               <p>Click the link below to reset your password. It expires in 15 minutes.</p>
               <p><a href="${url}">${url}</a></p>`,
      });
    } catch (mailErr) {
      console.error('Reset email failed:', mailErr.message);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
    }
    res.json(generic);
  } catch (e) {
    console.error(e);
    res.json(generic);
  }
});

// PUT /api/auth/reset-password/:token
router.put('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;
    if (!validPassword(password)) return res.status(400).json({ message: PASSWORD_MSG });

    const hashed = crypto.createHash('sha256').update(String(req.params.token)).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpire: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: 'Token is invalid or has expired' });

    user.password = password;
    user.passwordSet = true;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    sendSession(user, 200, res);
  } catch (e) {
    console.error(e);
    oops(res);
  }
});

module.exports = router;