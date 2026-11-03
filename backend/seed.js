/*
 * Astron seeder
 *
 *   npm run seed                 add anything that is missing (safe to re-run)
 *   npm run seed:reset           WIPE every collection first, then seed from scratch
 *   node seed.js --reset --force same, but allowed when NODE_ENV=production
 *
 * What it creates
 *   - Users:     2 admins, 2 staff, 2 technicians, 7 customers (Filipino names)
 *   - Catalog:   5 categories, 5 brands, 50 products, inventory (no images: add them yourself)
 *   - Sales:     ~60 orders spread over the last 30 days (trending up), 2 customers have none
 *   - Everything the orders imply: units, warranties, installations
 *   - A small amount of: reviews, service requests, notifications, wishlists, carts, content
 *
 * Passwords
 *   admin@astron.com          SEED_ADMIN_PASSWORD, or "admin123" when it is not set
 *   every other seeded user   SEED_USER_PASSWORD, or a random one that is printed once
 *
 * Images: nothing is seeded. Add product, banner and guide pictures yourself in the admin pages;
 * re-running the seeder never touches images you added.
 *
 * Re-running without --reset never duplicates anything. The sales data is only generated when the
 * database has no orders yet.
 */
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const crypto = require('crypto');
const mongoose = require('mongoose');
const {
  Category, Brand, Product, Inventory, StoreInfo, User, AddOn, DeliveryZone, Promotion, Content,
  Order, Unit, Warranty, Installation, ServiceRequest, Notification, Review, Wishlist, Cart,
} = require('./models');
const { maskProfanity } = require('./utils/profanity');
const { todayManila, addDays } = require('./utils/reports');

const oid = () => new mongoose.Types.ObjectId();
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const MIN = 60 * 1000;

// ---------------------------------------------------------------- random helpers (seeded)
let rng = Math.random;
function seedRng(seed) {
  let a = seed | 0;
  rng = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const chance = (p) => rng() < p;
const randInt = (a, b) => a + Math.floor(rng() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
function weightedPick(items, weightOf) {
  const w = items.map(weightOf);
  let r = rng() * w.reduce((s, x) => s + x, 0);
  for (let i = 0; i < items.length; i++) {
    r -= w[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}
const round2 = (n) => Math.round(n * 100) / 100;
const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};
const norm = (s) => (s || '').trim().toLowerCase();
const same = (a, b) => String(a) === String(b);

// ---------------------------------------------------------------- static master data
const CATEGORIES = [
  ['Window', 'Compact all-in-one units that fit a window or wall opening.'],
  ['Split', 'Wall-mounted indoor unit with a separate outdoor condenser.'],
  ['Portable', 'Movable units on casters, vented through a window.'],
  ['Floor-standing', 'Tower units that cool large living areas.'],
  ['Ceiling cassette', 'Ceiling-recessed units for offices, shops and big rooms.'],
];
const BRANDS = [['Astron', 'AX'], ['CoolMate', 'CM'], ['Frostline', 'FL'], ['Polarex', 'PX'], ['Aerotech', 'AT']];

const ADD_ONS = [
  ['Standard installation', 'installation', 2500, 'Mounting and setup, up to 3m of piping'],
  ['Extended warranty (+1 year)', 'extended_warranty', 2500, 'One extra year of parts and labor'],
  ['Mounting bracket', 'mounting_bracket', 1200, 'Heavy-duty outdoor unit bracket'],
  ['Piping kit', 'piping_kit', 1800, 'Copper piping, insulation and cabling'],
  ['Aircon general cleaning', 'other', 1500, 'Full indoor and outdoor unit cleaning'],
];

const DELIVERY_ZONES = [
  {
    name: 'Metro Manila', fee: 500, provinces: ['Metro Manila', 'NCR'],
    cities: ['Quezon City', 'Manila', 'Makati', 'Pasig', 'Taguig', 'Mandaluyong', 'Marikina', 'Pasay',
      'Caloocan', 'Paranaque', 'Las Pinas', 'Muntinlupa', 'San Juan', 'Valenzuela', 'Malabon', 'Navotas', 'Pateros'],
  },
  { name: 'Greater Manila', fee: 1200, cities: [], provinces: ['Cavite', 'Laguna', 'Rizal', 'Bulacan'] },
];
const DEFAULT_DELIVERY_FEE = 2500;
function deliveryFee(addr) {
  const zone =
    DELIVERY_ZONES.find((z) => z.cities.some((c) => norm(c) === norm(addr.city))) ||
    DELIVERY_ZONES.find((z) => z.provinces.some((p) => norm(p) === norm(addr.province)));
  return zone ? zone.fee : DEFAULT_DELIVERY_FEE;
}

const PROMOTIONS = [
  { title: 'Welcome 10% off', code: 'WELCOME10', discountType: 'percent', discountValue: 10, minOrderAmount: 10000, usageLimit: 100, isActive: true },
  { title: 'P1,000 off big orders', code: 'SAVE1000', discountType: 'fixed', discountValue: 1000, minOrderAmount: 30000, isActive: true },
  {
    title: 'Summer sale 5%', code: 'SUMMER5', discountType: 'percent', discountValue: 5, minOrderAmount: 5000, isActive: false,
    endDate: new Date(Date.now() - 20 * DAY), description: 'Expired example promo',
  },
];

const CONTENT = [
  { type: 'banner', title: 'Beat the heat with Astron', body: 'Inverter air conditioners from ₱13,900. Pick up at our showroom or have it delivered.', link: '/', order: 1 },
  { type: 'banner', title: 'Add professional installation', body: 'Choose installation at checkout and we will schedule a technician for you.', link: '/', order: 2 },
  { type: 'promotion', title: 'WELCOME10: 10% off', body: 'Minimum purchase of ₱10,000.', link: '/', order: 1 },
  { type: 'promotion', title: 'SAVE1000 on big orders', body: '₱1,000 off orders of ₱30,000 or more.', link: '/', order: 2 },
  {
    type: 'buying_guide', title: 'How many BTU do I need?',
    body: 'Measure your room in square meters. About 12 to 18 sqm needs 9,000 BTU, 18 to 25 sqm needs 12,000 BTU and 25 to 35 sqm needs 18,000 BTU. Go one size up for rooms that get strong afternoon sun.',
    link: '', order: 1,
  },
  {
    type: 'buying_guide', title: 'Inverter vs non-inverter',
    body: 'Inverter units adjust compressor speed instead of switching on and off, so they use less electricity and run quieter. They cost more upfront but usually pay back within a year or two of daily use.',
    link: '', order: 2,
  },
];

// ---------------------------------------------------------------- users
const home = (street, barangay, city, province, postalCode, label = 'Home') => ({ label, street, barangay, city, province, postalCode });
const USER_SPECS = [
  { key: 'admin', name: 'Admin', email: 'admin@astron.com', role: 'admin', phone: '09170000001', daysAgo: 150 },
  { key: 'admin2', name: 'Ricardo Villanueva', email: 'ricardo.villanueva@mail.com', role: 'admin', phone: '09170000002', daysAgo: 140 },
  { key: 'staff1', name: 'Carmela Reyes', email: 'carmela.reyes@mail.com', role: 'staff', phone: '09170000003', daysAgo: 120 },
  { key: 'staff2', name: 'Eduardo Bautista', email: 'eduardo.bautista@mail.com', role: 'staff', phone: '09170000004', daysAgo: 110 },
  { key: 'tech1', name: 'Jose Manalo', email: 'jose.manalo@mail.com', role: 'technician', phone: '09170000005', daysAgo: 100 },
  { key: 'tech2', name: 'Rodel Pascual', email: 'rodel.pascual@mail.com', role: 'technician', phone: '09170000006', daysAgo: 95 },
  {
    key: 'juan', name: 'Juan Dela Cruz', email: 'juan.delacruz@mail.com', role: 'customer', phone: '09171110001', daysAgo: 85,
    addresses: [home('123 Mabini Street', 'Batasan Hills', 'Quezon City', 'Metro Manila', '1126'),
      home('45 Commonwealth Avenue', 'Holy Spirit', 'Quezon City', 'Metro Manila', '1127', 'Office')],
  },
  {
    key: 'maria', name: 'Maria Santos', email: 'maria.santos@mail.com', role: 'customer', phone: '09171110002', daysAgo: 80,
    addresses: [home('88 Jupiter Street', 'Bel-Air', 'Makati', 'Metro Manila', '1209')],
  },
  {
    key: 'pedro', name: 'Pedro Reyes', email: 'pedro.reyes@mail.com', role: 'customer', phone: '09171110003', daysAgo: 70,
    addresses: [home('27 Shaw Boulevard', 'Kapitolyo', 'Pasig', 'Metro Manila', '1603'),
      home('9 Ortigas Avenue', 'San Antonio', 'Pasig', 'Metro Manila', '1605', 'Shop')],
  },
  {
    key: 'ana', name: 'Ana Lorenzo', email: 'ana.lorenzo@mail.com', role: 'customer', phone: '09171110004', daysAgo: 65,
    addresses: [home('15 Aguinaldo Highway', 'Talaba', 'Bacoor', 'Cavite', '4102')],
  },
  {
    key: 'luis', name: 'Luis Garcia', email: 'luis.garcia@mail.com', role: 'customer', phone: '09171110005', daysAgo: 60,
    addresses: [home('62 Rizal Boulevard', 'Tagapo', 'Santa Rosa', 'Laguna', '4026')],
  },
  {
    key: 'carla', name: 'Carla Mendoza', email: 'carla.mendoza@mail.com', role: 'customer', phone: '09171110006', daysAgo: 20,
    addresses: [home('310 Marcos Highway', 'Concepcion Uno', 'Marikina', 'Metro Manila', '1811')],
  },
  {
    key: 'miguel', name: 'Miguel Aquino', email: 'miguel.aquino@mail.com', role: 'customer', phone: '09171110007', daysAgo: 12,
    addresses: [home('71 Boni Avenue', 'Plainview', 'Mandaluyong', 'Metro Manila', '1550')],
  },
];
// the first five customers place orders; Carla and Miguel never do
const BUYER_KEYS = ['juan', 'maria', 'pedro', 'ana', 'luis'];
const BUYER_WEIGHTS = [27, 25, 20, 16, 12];

// ---------------------------------------------------------------- product catalog plan (pure, no DB)
const CAT = {
  W: { name: 'Window', label: 'Window', rate: 2.4, noise: [50, 58], blurb: 'Fits a standard window or wall opening, so there is no outdoor unit to install.',
    dims: (k) => ({ width: Math.round(45 + k * 1.5), height: Math.round(33 + k * 0.6), depth: Math.round(45 + k * 1.1) }) },
  S: { name: 'Split', label: 'Split', rate: 3.3, noise: [24, 40], blurb: 'Wall-mounted indoor unit with a quiet fan and a separate outdoor condenser.',
    dims: (k) => ({ width: Math.round(70 + k * 2.2), height: Math.round(26 + k * 0.15), depth: Math.round(19 + k * 0.12) }) },
  P: { name: 'Portable', label: 'Portable', rate: 2.9, noise: [52, 56], blurb: 'Rolls from room to room on casters. Just vent the hose through a window.',
    dims: (k) => ({ width: Math.round(33 + k * 0.5), height: Math.round(70 + k * 0.9), depth: Math.round(33 + k * 0.4) }) },
  F: { name: 'Floor-standing', label: 'Floor-standing', rate: 3.0, noise: [40, 48], blurb: 'A floor-standing tower that throws cool air far, ideal for wide living areas.',
    dims: (k) => ({ width: Math.round(48 + k * 0.5), height: Math.round(165 + k * 0.3), depth: Math.round(31 + k * 0.2) }) },
  C: { name: 'Ceiling cassette', label: 'Cassette', rate: 3.1, noise: [36, 44], blurb: 'Ceiling-recessed cassette with 4-way airflow for even cooling in offices and shops.',
    dims: (k) => ({ width: Math.round(57 + k * 0.7), height: Math.round(24 + k * 0.1), depth: Math.round(57 + k * 0.7) }) },
};
const BTU_SPEC = {
  6: { hp: 0.6, room: [8, 12] }, 9: { hp: 1, room: [12, 18] }, 12: { hp: 1.5, room: [18, 25] },
  18: { hp: 2, room: [25, 35] }, 24: { hp: 2.5, room: [35, 50] }, 36: { hp: 4, room: [50, 75] }, 48: { hp: 5, room: [70, 100] },
};
const BRAND_MULT = { AX: 1, CM: 0.95, FL: 0.9, PX: 1.05, AT: 1.12 };

// [brand code, category code, kBTU, inverter, energy stars]
const PRODUCT_ROWS = [
  // Window (8)
  ['AX', 'W', 6, 0, 3], ['AX', 'W', 9, 1, 4], ['AX', 'W', 12, 1, 4], ['CM', 'W', 6, 0, 3],
  ['CM', 'W', 9, 0, 3], ['CM', 'W', 12, 1, 5], ['FL', 'W', 9, 0, 3], ['PX', 'W', 18, 1, 4],
  // Split (20)
  ['AX', 'S', 9, 1, 5], ['AX', 'S', 12, 1, 5], ['AX', 'S', 18, 1, 4], ['AX', 'S', 24, 1, 4],
  ['CM', 'S', 9, 1, 5], ['CM', 'S', 12, 1, 5], ['CM', 'S', 18, 0, 3], ['CM', 'S', 24, 1, 4],
  ['FL', 'S', 9, 0, 3], ['FL', 'S', 12, 0, 3], ['FL', 'S', 18, 1, 4], ['FL', 'S', 24, 0, 3],
  ['PX', 'S', 9, 1, 4], ['PX', 'S', 12, 1, 5], ['PX', 'S', 18, 1, 5], ['PX', 'S', 24, 0, 4],
  ['AT', 'S', 9, 1, 5], ['AT', 'S', 12, 1, 5], ['AT', 'S', 18, 1, 5], ['AT', 'S', 24, 1, 5],
  // Portable (7)
  ['CM', 'P', 9, 0, 3], ['CM', 'P', 12, 0, 3], ['FL', 'P', 9, 0, 3], ['FL', 'P', 12, 0, 3],
  ['PX', 'P', 9, 0, 3], ['PX', 'P', 12, 1, 4], ['AX', 'P', 12, 1, 4],
  // Floor-standing (7)
  ['FL', 'F', 24, 1, 4], ['FL', 'F', 36, 1, 4], ['AX', 'F', 24, 1, 4], ['AX', 'F', 36, 1, 5],
  ['CM', 'F', 36, 0, 3], ['CM', 'F', 48, 1, 4], ['AT', 'F', 48, 1, 5],
  // Ceiling cassette (8)
  ['AX', 'C', 18, 1, 4], ['AX', 'C', 24, 1, 5], ['AX', 'C', 36, 1, 5], ['CM', 'C', 24, 1, 4],
  ['CM', 'C', 36, 1, 4], ['PX', 'C', 36, 1, 5], ['PX', 'C', 48, 1, 5], ['AT', 'C', 48, 1, 5],
];
// stock scenarios, by position in PRODUCT_ROWS
const OUT_OF_STOCK = new Set([6, 30, 44]); // 0 online
const LOW_STOCK = new Set([13, 26, 38, 47]); // 1-3 online
const HIDDEN = new Set([20, 49]); // isAvailable = false
function buildCatalogPlan() {
  seedRng(20260101);
  const brandName = Object.fromEntries(BRANDS.map(([n, c]) => [c, n]));
  const seen = new Set();
  return PRODUCT_ROWS.map(([b, c, k, inv, energy], i) => {
    const cat = CAT[c];
    const spec = BTU_SPEC[k];
    const btu = k * 1000;
    const pad = String(k).padStart(2, '0');
    const modelNumber = `${b}-${c}${pad}${inv ? 'I' : ''}`;
    if (seen.has(modelNumber)) throw new Error(`Duplicate model number ${modelNumber}`);
    seen.add(modelNumber);

    const raw = btu * cat.rate * (1 - (0.12 * btu) / 48000) * (inv ? 1.18 : 1) * (1 + 0.03 * (energy - 3)) * BRAND_MULT[b];
    const price = Math.max(Math.round(raw / 1000) * 1000 - 100, 4900);
    const eer = inv ? 12.5 + energy * 0.3 : 9.5 + energy * 0.2;

    let plannedOnline, plannedShowroom;
    if (OUT_OF_STOCK.has(i)) { plannedOnline = 0; plannedShowroom = randInt(0, 2); }
    else if (LOW_STOCK.has(i)) { plannedOnline = randInt(1, 3); plannedShowroom = randInt(0, 1); }
    else { plannedOnline = randInt(6, 28); plannedShowroom = randInt(0, 4); }

    const name = `${brandName[b]} ${c}${pad}${inv ? ' Inverter' : ''} ${cat.label}`;
    return {
      modelNumber,
      name,
      description:
        `${name} (${modelNumber}) is a ${btu.toLocaleString('en-US')} BTU ${cat.label.toLowerCase()} air conditioner` +
        `${inv ? ' with inverter technology for steady cooling and lower electricity bills' : ' with a reliable fixed-speed compressor'}. ` +
        `Suited for rooms of about ${spec.room[0]} to ${spec.room[1]} sqm. ${cat.blurb}`,
      categoryName: cat.name,
      brandName: brandName[b],
      price,
      specs: {
        capacityBTU: btu,
        capacityHP: spec.hp,
        isInverter: Boolean(inv),
        energyRating: String(energy),
        powerConsumptionWatts: Math.round(btu / eer / 10) * 10,
        refrigerantType: inv || energy >= 4 ? 'R32' : 'R410A',
        noiseLevelDb: randInt(cat.noise[0], cat.noise[1]),
        dimensions: cat.dims(k),
        warrantyMonths: inv && energy === 5 ? 24 : 12,
      },
      recommendedRoomSize: { minSqm: spec.room[0], maxSqm: spec.room[1] },
      isAvailable: !HIDDEN.has(i),
      plannedOnline,
      plannedShowroom,
      createdAt: new Date(Date.now() - randInt(35, 90) * DAY - randInt(0, 12) * HOUR), // before the sales window
    };
  });
}

// ---------------------------------------------------------------- transactional data (pure, no DB)
const CANCEL_REASONS = ['Changed my mind', 'Ordered the wrong capacity', 'Found a better price elsewhere', 'Delivery date no longer works for me'];
const STAGE_NOTE = {
  processing: 'Payment verified, preparing your order',
  out_for_delivery: 'Handed over to our delivery team',
  delivered: 'Delivered and received by customer',
  installed: 'Installation completed and tested',
};
const REVIEW_COMMENTS = {
  5: [
    'Sobrang lamig agad! Tahimik pa at tipid sa kuryente.',
    'Maganda ang quality, mabilis ang delivery at maayos ang installation.',
    'Worth every peso. Highly recommended!',
    'Cools our bedroom in minutes and the remote is easy to use.',
  ],
  4: [
    'Good unit overall, cools the room fast. Medyo matagal lang dumating ang installer.',
    'Maganda naman, malamig at hindi maingay.',
    'Solid performance. Sana mas malinaw ang manual.',
  ],
  3: ['Okay lang. Medyo maingay kapag naka-high ang fan.', 'Average cooling for the price, pero maayos ang service.'],
  2: ['Hindi kasing lamig ng inaasahan sa laki ng kwarto namin.'],
  1: ['May depekto ang remote noong dumating. Pinalitan naman nila agad.'],
};
const PROFANE_COMMENT = 'Ang bobo ng packaging ng supplier pero ayos naman ang unit, sobrang lamig!';
const RATING_WEIGHTS = [[5, 45], [4, 30], [3, 12], [2, 8], [1, 5]];
const PAYMENT_WEIGHTS = [['card', 22], ['ewallet', 30], ['bank_transfer', 12], ['cod', 26], ['installment', 10]];
const CAT_WEIGHT = { Window: 2, Split: 3.4, Portable: 1, 'Floor-standing': 0.7, 'Ceiling cassette': 0.6 };
const STATUS_LABEL = (s) => String(s).replace(/_/g, ' ');

/*
 ctx = {
   now: Date,
   users:    { key: { _id, name, email, phone, role, addresses: [...] } },
   products: [{ _id, modelNumber, name, price, categoryName, isAvailable, plannedOnline, plannedShowroom, specs }],
   addOns:   { installation, extended_warranty, mounting_bracket, piping_kit }   (each { _id, name, price })
   promos:   { WELCOME10, SAVE1000 }                                              (each { _id, code })
 }
*/
function buildTransactions(ctx) {
  seedRng(777);
  const now = ctx.now || new Date();
  const today = todayManila();
  const { users, addOns, promos } = ctx;
  const admins = [users.admin, users.admin2];
  const techs = [users.tech1, users.tech2];
  const buyers = BUYER_KEYS.map((k) => users[k]);
  const sellable = ctx.products.filter((p) => p.isAvailable && p.plannedOnline > 0);

  // ---- 1. decide when orders happen: ~1/day a month ago, ~3/day now, busier weekends
  const moments = [];
  for (let a = 29; a >= 0; a--) {
    const day = addDays(today, -a);
    const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
    const lam = (0.9 + ((29 - a) / 29) * 1.9) * (dow === 0 || dow === 6 ? 1.3 : 1);
    let n = Math.max(0, Math.round(lam + (rng() - 0.5) * 2.2));
    if (a <= 1) n = Math.max(n, 1);
    for (let k = 0; k < n; k++) {
      const hh = String(randInt(8, 21)).padStart(2, '0');
      const mm = String(randInt(0, 59)).padStart(2, '0');
      const ss = String(randInt(0, 59)).padStart(2, '0');
      let at = new Date(`${day}T${hh}:${mm}:${ss}+08:00`);
      if (at > now) at = new Date(now.getTime() - randInt(5, 180) * MIN);
      moments.push(at);
    }
  }
  moments.sort((x, y) => x - y);

  const orders = [], units = [], warranties = [], installations = [], notifications = [];
  const usedNumbers = new Set();
  const promoUsage = {};
  const eligible = []; // received purchases that may be reviewed

  moments.forEach((createdAt) => {
    const customer = weightedPick(buyers, (b) => BUYER_WEIGHTS[buyers.indexOf(b)]);
    const addr = customer.addresses[chance(0.2) && customer.addresses.length > 1 ? 1 : 0];
    const fulfillment = chance(0.18) ? 'pickup' : 'delivery';
    const wantsInstall = fulfillment === 'delivery' && chance(0.5);

    // ---- lines
    const nLines = weightedPick([1, 2, 3], (n) => (n === 1 ? 70 : n === 2 ? 25 : 5));
    const chosen = [];
    const items = [];
    for (let i = 0; i < nLines; i++) {
      const product = weightedPick(sellable.filter((p) => !chosen.includes(p)), (p) => CAT_WEIGHT[p.categoryName] || 1);
      chosen.push(product);
      const big = product.categoryName === 'Floor-standing' || product.categoryName === 'Ceiling cassette';
      const quantity = big ? 1 : chance(0.15) ? (chance(0.2) ? 3 : 2) : 1;
      const lineAddOns = [];
      if (wantsInstall) lineAddOns.push(addOns.installation);
      if (chance(0.2)) lineAddOns.push(addOns.extended_warranty);
      if (chance(0.15)) lineAddOns.push(addOns.mounting_bracket);
      if (product.categoryName === 'Split' && chance(0.12)) lineAddOns.push(addOns.piping_kit);
      items.push({
        _id: oid(),
        product: product._id,
        name: product.name,
        modelNumber: product.modelNumber,
        price: product.price,
        quantity,
        addOns: lineAddOns.map((a) => ({ addOn: a._id, name: a.name, price: a.price })),
        units: [],
        _product: product,
      });
    }

    // ---- totals (same rules as utils/pricing.js)
    let itemsTotal = 0, addOnsTotal = 0, installationFee = 0;
    items.forEach((it) => {
      itemsTotal += it.price * it.quantity;
      it.addOns.forEach((a) => {
        if (same(a.addOn, addOns.installation._id)) installationFee += a.price * it.quantity;
        else addOnsTotal += a.price * it.quantity;
      });
    });
    const delivery = fulfillment === 'pickup' ? 0 : deliveryFee(addr);
    let promo = null, discount = 0;
    if (chance(0.28)) {
      if (itemsTotal >= 30000 && chance(0.5)) { promo = promos.SAVE1000; discount = Math.min(1000, itemsTotal); }
      else if (itemsTotal >= 10000) { promo = promos.WELCOME10; discount = round2(Math.min(itemsTotal * 0.1, itemsTotal)); }
    }
    const grandTotal = round2(itemsTotal + addOnsTotal + installationFee + delivery - discount);

    // ---- status timeline
    const stages = fulfillment === 'pickup'
      ? ['pending', 'processing', 'delivered']
      : ['pending', 'processing', 'out_for_delivery', 'delivered', ...(wantsInstall ? ['installed'] : [])];
    const at = { pending: createdAt };
    at.processing = new Date(createdAt.getTime() + randInt(1, 10) * HOUR);
    if (fulfillment === 'pickup') {
      at.delivered = new Date(at.processing.getTime() + randInt(6, 48) * HOUR);
    } else {
      at.out_for_delivery = new Date(at.processing.getTime() + randInt(8, 30) * HOUR);
      at.delivered = new Date(at.out_for_delivery.getTime() + randInt(6, 52) * HOUR);
      at.installed = new Date(at.delivered.getTime() + randInt(20, 72) * HOUR);
    }
    const age = (now - createdAt) / DAY;
    const last = stages.length - 1;
    const cancelled = chance(0.07);
    let idx = 0, cancelStage = 0, cancelledAt = null;
    if (cancelled) {
      cancelStage = at.processing <= now && chance(0.4) ? 1 : 0;
      const base = cancelStage === 1 ? at.processing : createdAt;
      cancelledAt = new Date(Math.min(now.getTime() - MIN, base.getTime() + randInt(1, 12) * HOUR));
      if (cancelledAt <= createdAt) cancelledAt = new Date(createdAt.getTime() + MIN);
    } else {
      if (age >= 14) idx = last;
      else if (age >= 7) idx = chance(0.7) ? last : randInt(1, Math.max(1, last - 1));
      else if (age >= 3) idx = randInt(1, Math.max(1, last - 1));
      else idx = randInt(0, Math.min(2, last));
      while (idx > 0 && at[stages[idx]] > now) idx -= 1; // nothing happens in the future
    }
    const status = cancelled ? 'cancelled' : stages[idx];

    const history = [{ status: 'pending', note: 'Order placed', changedBy: customer._id, changedAt: createdAt }];
    const reached = cancelled ? stages.slice(1, cancelStage + 1) : stages.slice(1, idx + 1);
    reached.forEach((s) => history.push({ status: s, note: STAGE_NOTE[s], changedBy: pick(admins)._id, changedAt: at[s] }));
    const cancelReason = cancelled ? pick(CANCEL_REASONS) : undefined;
    if (cancelled) history.push({ status: 'cancelled', note: cancelReason, changedBy: customer._id, changedAt: cancelledAt });
    const lastChange = history[history.length - 1];

    // ---- payment
    const method = weightedPick(PAYMENT_WEIGHTS, (p) => p[1])[0];
    const payment = { method, status: 'pending' };
    const received = !cancelled && (status === 'delivered' || status === 'installed');
    const deliveredAt = received ? at.delivered : undefined;
    const payRef = () => `PAY-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    if (cancelled) {
      if (method !== 'cod' && cancelStage === 1) {
        payment.status = 'refunded';
        payment.paidAt = at.processing;
        payment.reference = payRef();
      }
    } else if (method === 'cod') {
      if (received) { payment.status = 'paid'; payment.paidAt = deliveredAt; }
    } else if (idx >= 1) {
      payment.status = 'paid';
      payment.paidAt = at.processing;
      payment.reference = payRef();
    }

    // ---- order number (unique)
    let orderNumber;
    do orderNumber = `AST-${createdAt.getTime()}-${randInt(1000, 9999)}`;
    while (usedNumbers.has(orderNumber));
    usedNumbers.add(orderNumber);

    // ---- installation preferred date
    let preferredDate;
    if (wantsInstall) {
      preferredDate = status === 'installed'
        ? new Date(at.delivered.getTime() + randInt(10, 18) * HOUR)
        : new Date(createdAt.getTime() + randInt(3, 8) * DAY);
    }

    const orderId = oid();
    // ---- units + warranties for received orders
    if (received) {
      items.forEach((it, i) => {
        const extended = it.addOns.filter((a) => same(a.addOn, addOns.extended_warranty._id)).length;
        const months = (it._product.specs.warrantyMonths || 12) + 12 * extended;
        for (let slot = 1; slot <= it.quantity; slot++) {
          const unitId = oid();
          const serialNumber = `${it.modelNumber}/${orderNumber}/${i + 1}-${slot}`;
          it.units.push(unitId);
          units.push({
            _id: unitId, product: it.product, serialNumber, stockType: 'online', status: 'sold',
            order: orderId, soldAt: deliveredAt, createdAt: deliveredAt, updatedAt: deliveredAt,
          });
          warranties.push({
            unit: unitId, product: it.product, customer: customer._id, order: orderId, serialNumber,
            purchaseDate: createdAt, expiryDate: addMonths(createdAt, months), status: 'active',
            nextMaintenanceDate: addMonths(createdAt, 6), createdAt: deliveredAt, updatedAt: deliveredAt,
          });
        }
        eligible.push({ customer, product: it._product, orderId, deliveredAt });
      });
    }

    orders.push({
      _id: orderId,
      orderNumber,
      user: customer._id,
      items: items.map(({ _product, ...rest }) => rest),
      fulfillment,
      shippingAddress: fulfillment === 'delivery'
        ? { recipient: customer.name, phone: customer.phone, street: addr.street, barangay: addr.barangay, city: addr.city, province: addr.province, postalCode: addr.postalCode }
        : undefined,
      installation: { requested: wantsInstall, preferredDate },
      payment,
      promotion: promo && !cancelled ? promo._id : undefined,
      itemsTotal, addOnsTotal, installationFee, deliveryFee: delivery, discount, grandTotal,
      status,
      statusHistory: history,
      cancelledAt: cancelled ? cancelledAt : undefined,
      cancelReason,
      deliveredAt,
      createdAt,
      updatedAt: lastChange.changedAt,
    });
    if (promo && !cancelled) promoUsage[promo.code] = (promoUsage[promo.code] || 0) + 1;

    // ---- installation job
    if (wantsInstall) {
      let iStatus = 'pending';
      if (status === 'cancelled') iStatus = 'cancelled';
      else if (status === 'installed') iStatus = 'completed';
      else if (status === 'delivered') iStatus = chance(0.5) ? 'in_progress' : 'scheduled';
      else if (status === 'out_for_delivery') iStatus = 'scheduled';
      else if (status === 'processing') iStatus = chance(0.6) ? 'scheduled' : 'pending';
      const tech = ['scheduled', 'in_progress', 'completed'].includes(iStatus) ? pick(techs) : undefined;
      installations.push({
        _id: oid(),
        order: orderId,
        customer: customer._id,
        technician: tech?._id,
        assignedBy: tech ? pick(admins)._id : undefined,
        scheduledDate: preferredDate,
        address: { street: addr.street, barangay: addr.barangay, city: addr.city, province: addr.province, postalCode: addr.postalCode },
        status: iStatus,
        notes: iStatus === 'completed' ? 'Installed, leak-tested and demonstrated to the customer.' : iStatus === 'pending' ? '' : 'Bring extra piping just in case.',
        completedAt: iStatus === 'completed' ? at.installed : undefined,
        createdAt,
        updatedAt: iStatus === 'completed' ? at.installed : lastChange.changedAt,
      });
      if (tech && (iStatus === 'scheduled' || iStatus === 'in_progress')) {
        notifications.push({
          user: tech._id, type: 'installation_schedule', title: 'New installation assigned',
          message: `Installation for order ${orderNumber} in ${addr.city} was assigned to you.`,
          link: '/technician/jobs', isRead: chance(0.5), emailSent: false,
          createdAt: lastChange.changedAt, updatedAt: lastChange.changedAt,
        });
      }
    }

    // ---- customer notification for orders that moved past "pending"
    if (!cancelled && idx >= 1) {
      notifications.push({
        user: customer._id, type: 'order_update', title: `Order ${orderNumber} is ${STATUS_LABEL(status)}`,
        message: `Your order ${orderNumber} is now ${STATUS_LABEL(status)}. Check your account for the details and receipt.`,
        link: `/account/orders/${orderId}`, isRead: age > 4, emailSent: true,
        createdAt: lastChange.changedAt, updatedAt: lastChange.changedAt,
      });
    }
  });

  // keep notifications small: the 10 latest customer updates and 5 latest technician assignments
  const newestFirst = (list) => list.sort((a, b) => b.createdAt - a.createdAt);
  const keptNotifications = [
    ...newestFirst(notifications.filter((n) => n.type === 'order_update')).slice(0, 10),
    ...newestFirst(notifications.filter((n) => n.type === 'installation_schedule')).slice(0, 5),
  ];

  // ---- admin low-stock alerts
  ctx.products.filter((p) => p.isAvailable && p.plannedOnline + p.plannedShowroom <= 5).slice(0, 3).forEach((p) => {
    const total = p.plannedOnline + p.plannedShowroom;
    admins.forEach((a) => {
      const when = new Date(now.getTime() - randInt(2, 48) * HOUR);
      keptNotifications.push({
        user: a._id, type: 'low_stock', title: `Low stock: ${p.name}`,
        message: `${p.name} (${p.modelNumber}) is down to ${total} unit${total === 1 ? '' : 's'} (online ${p.plannedOnline}, showroom ${p.plannedShowroom}). The low-stock level is 5.`,
        link: `/admin/inventory/${p._id}`, isRead: false, emailSent: true, createdAt: when, updatedAt: when,
      });
    });
  });

  // ---- reviews: only some of the products that were actually received (and not in the last 6 hours)
  const pairs = new Map();
  eligible
    .filter((e) => e.deliveredAt <= new Date(now.getTime() - 6 * HOUR))
    .forEach((e) => {
      const key = `${e.customer._id}:${e.product._id}`;
      if (!pairs.has(key)) pairs.set(key, e);
    });
  const pairList = [...pairs.values()];
  let chosenPairs = pairList.filter(() => chance(0.38));
  if (chosenPairs.length < 8) {
    chosenPairs = chosenPairs.concat(pairList.filter((p) => !chosenPairs.includes(p)).slice(0, 8 - chosenPairs.length));
  }
  const reviews = chosenPairs.map((e, i) => {
    const profane = i === 1; // one review demonstrates the bad-words masking
    const rating = profane ? 4 : weightedPick(RATING_WEIGHTS, (r) => r[1])[0];
    const raw = profane ? PROFANE_COMMENT : chance(0.1) ? '' : pick(REVIEW_COMMENTS[rating]);
    let createdAt = new Date(Math.min(e.deliveredAt.getTime() + randInt(1, 4) * DAY, now.getTime() - 30 * MIN));
    if (createdAt <= e.deliveredAt) createdAt = new Date(e.deliveredAt.getTime() + MIN);
    return {
      _id: oid(), product: e.product._id, user: e.customer._id, order: e.orderId,
      rating, comment: maskProfanity(raw).text, isEdited: false, createdAt, updatedAt: createdAt,
    };
  });
  // two good reviews were edited later
  reviews.filter((r) => r.comment && r.rating >= 4).slice(2, 4).forEach((r) => {
    r.isEdited = true;
    r.comment = `${r.comment} Update: still working great after a few weeks.`;
    r.updatedAt = new Date(Math.min(r.createdAt.getTime() + randInt(2, 6) * DAY, now.getTime() - 10 * MIN));
  });
  const ratings = {};
  reviews.forEach((r) => {
    const k = String(r.product);
    ratings[k] = ratings[k] || { sum: 0, n: 0 };
    ratings[k].sum += r.rating;
    ratings[k].n += 1;
  });

  // ---- service requests (3), tied to real warranties
  const srSpecs = [
    { key: 'juan', type: 'repair', description: 'Naglalagitik ang unit tuwing nagsisimula ang compressor.', status: 'under_review' },
    { key: 'maria', type: 'maintenance', description: 'Humina ang lamig ng aircon, pakisuri ang filter at refrigerant.', status: 'scheduled' },
    { key: 'pedro', type: 'warranty_claim', description: 'Hindi na umiilaw ang display panel after two weeks.', status: 'completed' },
  ];
  const serviceRequests = [];
  srSpecs.forEach((s) => {
    const w = warranties.find((x) => same(x.customer, users[s.key]._id));
    if (!w) return;
    const createdAt = new Date(Math.min(w.createdAt.getTime() + randInt(2, 6) * DAY, now.getTime() - HOUR));
    const scheduled = s.status === 'scheduled' || s.status === 'completed';
    serviceRequests.push({
      customer: w.customer,
      unit: w.unit,
      _warrantyUnit: w.unit, // swapped for the real warranty id after the warranties are inserted
      type: s.type,
      description: s.description,
      preferredDate: new Date(createdAt.getTime() + 3 * DAY),
      scheduledDate: scheduled ? new Date(createdAt.getTime() + 2 * DAY) : undefined,
      status: s.status,
      assignedTo: scheduled ? pick(techs)._id : undefined,
      staffNotes: s.status === 'completed' ? 'Display board replaced under warranty.' : s.status === 'scheduled' ? 'Technician booked for filter cleaning and gas check.' : '',
      resolvedAt: s.status === 'completed' ? new Date(Math.min(createdAt.getTime() + 3 * DAY, now.getTime() - MIN)) : undefined,
      createdAt, updatedAt: createdAt,
    });
  });

  // ---- wishlists and carts (small)
  const wishable = ctx.products.filter((p) => p.isAvailable && p.plannedOnline > 0);
  const some = (n) => {
    const pool = [...wishable];
    const out = [];
    while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]._id);
    return out;
  };
  const wishlists = [
    { user: users.juan._id, products: some(4) },
    { user: users.maria._id, products: some(3) },
    { user: users.pedro._id, products: some(2) },
    { user: users.miguel._id, products: some(3) },
  ];
  const [carlaA, carlaB] = some(2);
  const carts = [
    { user: users.carla._id, items: [{ product: carlaA, quantity: 1, addOns: [addOns.installation._id] }, { product: carlaB, quantity: 2, addOns: [] }] },
    { user: users.luis._id, items: [{ product: some(1)[0], quantity: 1, addOns: [] }] },
  ];

  return {
    orders, units, warranties, installations, reviews, serviceRequests, notifications: keptNotifications,
    wishlists, carts, promoUsage, ratings,
  };
}

// ---------------------------------------------------------------- persistence
const ALL_MODELS = [
  Review, Wishlist, Cart, Notification, ServiceRequest, Warranty, Unit, Installation, Order, Inventory,
  Product, Content, Promotion, DeliveryZone, AddOn, StoreInfo, Brand, Category, User,
];
const insertAll = async (Model, docs) => {
  if (docs.length) await Model.create(docs, { timestamps: false });
};
const peso = (n) => `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function main() {
  const args = new Set(process.argv.slice(2));
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set in backend/.env');
  if (args.has('--reset') && process.env.NODE_ENV === 'production' && !args.has('--force'))
    throw new Error('Refusing to wipe the database while NODE_ENV=production. Add --force if you really mean it.');

  await mongoose.connect(process.env.MONGODB_URI);
  const now = new Date();

  if (args.has('--reset')) {
    console.log('--reset: wiping all collections...');
    for (const M of ALL_MODELS) await M.deleteMany({});
  }

  // ---- categories, brands
  const cats = {}, brands = {};
  for (const [name, description] of CATEGORIES)
    cats[name] = await Category.findOneAndUpdate({ name }, { name, description, isActive: true }, { upsert: true, new: true });
  for (const [name] of BRANDS)
    brands[name] = await Brand.findOneAndUpdate({ name }, { name, isActive: true }, { upsert: true, new: true });

  // ---- users (the admin is created exactly like the original seeder: only if missing)
  const created = [];
  const users = {};
  for (const spec of USER_SPECS) {
    let u = await User.findOne({ email: spec.email });
    if (!u) {
      const pw = spec.key === 'admin'
        ? process.env.SEED_ADMIN_PASSWORD || 'admin123'
        : process.env.SEED_USER_PASSWORD || crypto.randomBytes(9).toString('base64url');
      const since = new Date(now.getTime() - spec.daysAgo * DAY);
      [u] = await User.create([{
        name: spec.name, email: spec.email, password: pw, role: spec.role, phone: spec.phone,
        addresses: (spec.addresses || []).map((a, i) => ({ ...a, recipient: spec.name, phone: spec.phone, isDefault: i === 0 })),
        createdAt: since, updatedAt: since,
      }], { timestamps: false });
      created.push({ role: spec.role, email: spec.email, pw });
    }
    users[spec.key] = { _id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role, addresses: spec.addresses || [] };
  }

  // ---- add-ons, zones, promotions, store info, content
  const addOnDocs = {};
  for (const [name, type, price, description] of ADD_ONS)
    addOnDocs[type] = await AddOn.findOneAndUpdate({ name }, { name, type, price, description, isActive: true }, { upsert: true, new: true });
  for (const z of DELIVERY_ZONES)
    await DeliveryZone.findOneAndUpdate({ name: z.name }, { ...z, isActive: true }, { upsert: true });
  const promoDocs = {};
  for (const p of PROMOTIONS)
    promoDocs[p.code] = await Promotion.findOneAndUpdate({ code: p.code }, p, { upsert: true, new: true });
  if (!(await StoreInfo.findOne()))
    await StoreInfo.create({
      storeName: 'Astron Air Conditioners', address: '123 Sample Street, Quezon City', phone: '(02) 8123 4567',
      email: 'support@astron.com', businessHours: 'Mon-Sat, 9:00 AM-6:00 PM',
      social: { facebook: 'https://facebook.com/astron.aircon', instagram: 'https://instagram.com/astron.aircon' },
    });
  for (const c of CONTENT) {
    await Content.findOneAndUpdate(
      { type: c.type, title: c.title },
      { type: c.type, title: c.title, body: c.body, link: c.link, order: c.order, isPublished: true },
      { upsert: true }
    );
  }

  // ---- products
  const products = [];
  for (const p of buildCatalogPlan()) {
    const doc = await Product.findOneAndUpdate(
      { modelNumber: p.modelNumber },
      {
        $set: {
          name: p.name, description: p.description, category: cats[p.categoryName]._id, brand: brands[p.brandName]._id,
          price: p.price, specs: p.specs, recommendedRoomSize: p.recommendedRoomSize,
          isAvailable: p.isAvailable, isDeleted: false, updatedAt: now,
        },
        $setOnInsert: { averageRating: 0, numReviews: 0, createdAt: p.createdAt },
      },
      { upsert: true, new: true, timestamps: false }
    );
    products.push({ ...p, _id: doc._id });
  }

  // ---- sales data (only when there are no orders yet)
  let tx = null;
  if ((await Order.countDocuments()) === 0) {
    tx = buildTransactions({ now, users, products, addOns: addOnDocs, promos: promoDocs });
  } else {
    console.log('Orders already exist, so sales data was NOT generated. Use `npm run seed:reset` to start over.');
  }

  // ---- inventory (the initial-stock log includes what was sold afterwards)
  const sold = {};
  (tx?.orders || []).filter((o) => o.status !== 'cancelled').forEach((o) =>
    o.items.forEach((it) => { sold[String(it.product)] = (sold[String(it.product)] || 0) + it.quantity; }));
  for (const p of products) {
    await Inventory.findOneAndUpdate(
      { product: p._id },
      {
        $setOnInsert: {
          onlineStock: p.plannedOnline,
          showroomStock: p.plannedShowroom,
          lowStockThreshold: 5,
          lowStockNotified: p.isAvailable && p.plannedOnline + p.plannedShowroom <= 5,
          adjustments: [
            { stockType: 'online', change: p.plannedOnline + (sold[String(p._id)] || 0), reason: 'Initial stock', by: users.admin._id, at: p.createdAt },
            ...(p.plannedShowroom ? [{ stockType: 'showroom', change: p.plannedShowroom, reason: 'Initial stock', by: users.admin._id, at: p.createdAt }] : []),
          ],
        },
      },
      { upsert: true }
    );
  }

  if (tx) {
    await insertAll(Order, tx.orders);
    await insertAll(Unit, tx.units);
    await insertAll(Warranty, tx.warranties);
    await insertAll(Installation, tx.installations);
    await insertAll(Review, tx.reviews);

    // service requests need the warranty ids that were just created
    const warrantyRows = await Warranty.find({ unit: { $in: tx.units.map((u) => u._id) } }).select('unit').lean();
    const warrantyByUnit = Object.fromEntries(warrantyRows.map((w) => [String(w.unit), w._id]));
    await insertAll(ServiceRequest, tx.serviceRequests.map(({ _warrantyUnit, ...sr }) => ({ ...sr, warranty: warrantyByUnit[String(_warrantyUnit)] })));
    await insertAll(Notification, tx.notifications);
    await insertAll(Wishlist, tx.wishlists);
    await insertAll(Cart, tx.carts);

    for (const [code, n] of Object.entries(tx.promoUsage)) await Promotion.updateOne({ code }, { usedCount: n });
    for (const p of products) {
      const r = tx.ratings[String(p._id)];
      await Product.updateOne({ _id: p._id }, { averageRating: r ? Math.round((r.sum / r.n) * 10) / 10 : 0, numReviews: r ? r.n : 0 }, { timestamps: false });
    }
  }

  // ---- summary
  console.log('\n=== Seed complete ===');
  if (created.length) {
    console.log('\nNew accounts (shown once):');
    created.forEach((c) => console.log(`  ${c.role.padEnd(10)} ${c.email.padEnd(34)} ${c.pw}`));
  } else {
    console.log('\nAll seed accounts already existed; their passwords were left unchanged.');
  }
  console.log(`\nCatalog: ${products.length} products (no images seeded)`);
  if (tx) {
    const live = tx.orders.filter((o) => o.status !== 'cancelled');
    const byStatus = {};
    const perCustomer = {};
    tx.orders.forEach((o) => {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
      perCustomer[String(o.user)] = (perCustomer[String(o.user)] || 0) + 1;
    });
    console.log(`Sales:   ${tx.orders.length} orders over 30 days, revenue ${peso(live.reduce((s, o) => s + o.grandTotal, 0))} (cancelled excluded)`);
    console.log(`         by status: ${Object.entries(byStatus).map(([k, v]) => `${k} ${v}`).join(', ')}`);
    console.log(`         customers with no orders: ${USER_SPECS.filter((u) => u.role === 'customer' && !perCustomer[String(users[u.key]._id)]).map((u) => u.name).join(', ')}`);
    console.log(`Other:   ${tx.reviews.length} reviews on ${Object.keys(tx.ratings).length} products, ${tx.warranties.length} warranties, ${tx.installations.length} installations, ` +
      `${tx.serviceRequests.length} service requests, ${tx.notifications.length} notifications`);
  }
  console.log('');
}

module.exports = { USER_SPECS, BUYER_KEYS, buildCatalogPlan, buildTransactions };

if (require.main === module) {
  main()
    .then(() => mongoose.disconnect())
    .then(() => process.exit(0))
    .catch((e) => {
      console.error('\nSeed failed:', e.message);
      process.exit(1);
    });
}