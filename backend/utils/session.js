const jwt = require('jsonwebtoken');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

// what the frontend keeps in its auth store
const publicUser = (u) => ({
  _id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone, avatar: u.avatar,
});

module.exports = { signToken, cookieOptions, publicUser };