const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

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

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});