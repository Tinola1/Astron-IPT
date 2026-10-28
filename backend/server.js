const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

// refuse to start with missing security settings
for (const key of ['MONGODB_URI', 'JWT_SECRET', 'CLIENT_URL']) {
  if (!String(process.env[key] || '').trim()) {
    console.error(`Missing ${key} in backend/.env`);
    process.exit(1);
  }
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be at least 32 characters');
  process.exit(1);
}

const app = express();
const CLIENT_URL = process.env.CLIENT_URL.trim().replace(/\/$/, '');

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1); // real client IP behind a host's proxy

app.use(helmet());
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '20kb' }));
app.use(cookieParser());

app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin && origin.replace(/\/$/, '') !== CLIENT_URL)
    return res.status(403).json({ message: 'Request blocked: untrusted origin' });
  next();
});

// brute-force and flood protection
const limiterMessage = { message: 'Too many requests. Please wait a few minutes and try again.' };
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false, message: limiterMessage }));
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  skipSuccessfulRequests: true, // only failed attempts count
  standardHeaders: true,
  legacyHeaders: false,
  message: limiterMessage,
});
app.use(
  ['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/firebase'],
  authLimiter
);

app.get('/', (req, res) => res.send('Astron API running'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/auth', require('./routes/socialAuth'));
app.use('/api/account', require('./routes/account'));
app.use('/api/admin/users', require('./routes/adminUsers'));
app.use('/api/admin/products', require('./routes/adminProducts'));
app.use('/api/admin/orders', require('./routes/adminOrders'));
app.use('/api/admin', require('./routes/adminReports'));
app.use('/api', require('./routes/reviews'));
app.use('/api', require('./routes/public'));

// last resort: never send stack traces or internal messages to the browser
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request is too large' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON' });
  console.error(err);
  res.status(500).json({ message: 'Something went wrong' });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});