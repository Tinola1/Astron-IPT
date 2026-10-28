const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const mongoose = require('mongoose');
const { Category, Brand, Product, Inventory, StoreInfo, User, AddOn, DeliveryZone, Promotion } = require('./models');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const cats = {}, brands = {};
  for (const n of ['Window', 'Split', 'Portable', 'Floor-standing', 'Ceiling cassette'])
    cats[n] = await Category.findOneAndUpdate({ name: n }, { name: n }, { upsert: true, new: true });
  for (const n of ['Astron', 'CoolMate', 'Frostline'])
    brands[n] = await Brand.findOneAndUpdate({ name: n }, { name: n }, { upsert: true, new: true });

  // [model, name, category, brand, price, BTU, HP, inverter, rating, stock]
  const rows = [
    ['AX-W06', 'AX-W06 Window', 'Window', 'Astron', 14500, 6000, 0.6, false, '3', 12],
    ['AX-W10', 'AX-W10 Window', 'Window', 'Astron', 21900, 9000, 1, true, '4', 8],
    ['CM-S09', 'CoolMate S09', 'Split', 'CoolMate', 29900, 9000, 1, true, '5', 15],
    ['CM-S12', 'CoolMate S12', 'Split', 'CoolMate', 36900, 12000, 1.5, true, '5', 6],
    ['AX-S18', 'AX-S18 Split', 'Split', 'Astron', 52500, 18000, 2, true, '4', 3],
    ['FL-P09', 'Frostline P09', 'Portable', 'Frostline', 24800, 9000, 1, false, '3', 0],
    ['FL-F24', 'Frostline F24', 'Floor-standing', 'Frostline', 78900, 24000, 2.5, true, '4', 2],
    ['AX-C36', 'AX-C36 Cassette', 'Ceiling cassette', 'Astron', 119000, 36000, 4, true, '5', 4],
  ];
  for (const [modelNumber, name, c, b, price, btu, hp, inv, rating, stock] of rows) {
    const p = await Product.findOneAndUpdate({ modelNumber }, {
      modelNumber, name, price, category: cats[c]._id, brand: brands[b]._id,
      specs: { capacityBTU: btu, capacityHP: hp, isInverter: inv, energyRating: rating, warrantyMonths: 12 },
    }, { upsert: true, new: true });
    await Inventory.findOneAndUpdate({ product: p._id }, { product: p._id, onlineStock: stock }, { upsert: true });
  }
  if (!(await StoreInfo.findOne()))
    await StoreInfo.create({ address: '123 Sample Street, Quezon City', phone: '(02) 8123 4567',
      email: 'support@astron.example', businessHours: 'Mon-Sat, 9:00 AM-6:00 PM' });

  const adminEmail = 'admin@astron.example';
  if (!(await User.findOne({ email: adminEmail }))) {
    const pw = process.env.SEED_ADMIN_PASSWORD || require('crypto').randomBytes(9).toString('base64url');
    await User.create({ name: 'Admin', email: adminEmail, password: pw, role: 'admin' });
    console.log(`Admin created: ${adminEmail} / ${pw}`);
  }
  
    const addOns = [
    ['Standard installation', 'installation', 2500, 'Mounting and setup, up to 3m of piping'],
    ['Extended warranty (+1 year)', 'extended_warranty', 2500, 'One extra year of parts and labor'],
    ['Mounting bracket', 'mounting_bracket', 1200, 'Heavy-duty outdoor unit bracket'],
    ['Piping kit', 'piping_kit', 1800, 'Copper piping, insulation and cabling'],
  ];
  for (const [name, type, price, description] of addOns)
    await AddOn.findOneAndUpdate({ name }, { name, type, price, description, isActive: true }, { upsert: true });

  await DeliveryZone.findOneAndUpdate({ name: 'Metro Manila' }, {
    name: 'Metro Manila', fee: 500, isActive: true, provinces: ['Metro Manila', 'NCR'],
    cities: ['Quezon City', 'Manila', 'Makati', 'Pasig', 'Taguig', 'Mandaluyong', 'Marikina', 'Pasay',
      'Caloocan', 'Paranaque', 'Las Pinas', 'Muntinlupa', 'San Juan', 'Valenzuela', 'Malabon', 'Navotas', 'Pateros'],
  }, { upsert: true });
  await DeliveryZone.findOneAndUpdate({ name: 'Greater Manila' }, {
    name: 'Greater Manila', fee: 1200, isActive: true, cities: [], provinces: ['Cavite', 'Laguna', 'Rizal', 'Bulacan'],
  }, { upsert: true });

  await Promotion.findOneAndUpdate({ code: 'WELCOME10' }, {
    title: 'Welcome 10% off', code: 'WELCOME10', discountType: 'percent', discountValue: 10,
    minOrderAmount: 10000, usageLimit: 100, isActive: true }, { upsert: true });
  await Promotion.findOneAndUpdate({ code: 'SAVE1000' }, {
    title: 'P1,000 off big orders', code: 'SAVE1000', discountType: 'fixed', discountValue: 1000,
    minOrderAmount: 30000, isActive: true }, { upsert: true });

  console.log('Seeded.'); process.exit(0);
})();