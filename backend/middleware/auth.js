const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Verifies the JWT (cookie or Bearer header) and attaches req.user
const protect = async (req, res, next) => {
  try {
    let token = req.cookies?.token;
    const header = req.headers.authorization;
    if (!token && header?.startsWith('Bearer ')) token = header.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive)
      return res.status(401).json({ message: 'Account not found or deactivated' });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Role-based access control: authorize('admin', 'staff')
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role))
    return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
  next();
};

module.exports = { protect, authorize };