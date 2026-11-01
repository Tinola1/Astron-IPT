// Delivery zones (fees by location) and add-on prices. Mounted at /api/admin/shop (admin only)
const router = require('express').Router();
const mongoose = require('mongoose');
const { DeliveryZone, AddOn } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const { asyncHandler: h, httpError } = require('../utils/http');

router.use(protect, authorize('admin'));

const isText = (v) => typeof v === 'string';
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const MAX_PRICE = 1000000;
const ADDON_TYPES = ['installation', 'extended_warranty', 'mounting_bracket', 'piping_kit', 'other'];
const assertId = (id, msg) => {
  if (!mongoose.isValidObjectId(id)) throw httpError(404, msg);
};
const money = (v, label) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > MAX_PRICE) throw httpError(400, `${label} must be a number from 0 to ${MAX_PRICE.toLocaleString()}`);
  return Math.round(v * 100) / 100;
};
const name = (v, label) => {
  if (!isText(v) || !v.trim() || v.trim().length > 80) throw httpError(400, `${label} is required (up to 80 characters)`);
  return v.trim();
};

// ---------------- delivery zones ----------------
const placeList = (v, label) => {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > 100) throw httpError(400, `${label}: send a list of at most 100 places`);
  const out = [];
  for (const x of v) {
    if (!isText(x) || x.trim().length > 60) throw httpError(400, `${label}: each place must be text up to 60 characters`);
    const s = x.trim();
    if (s && !out.some((o) => o.toLowerCase() === s.toLowerCase())) out.push(s);
  }
  return out;
};
const zoneView = (z) => ({ _id: z._id, name: z.name, cities: z.cities || [], provinces: z.provinces || [], fee: z.fee, isActive: z.isActive });
function cleanZone(b) {
  const data = { name: name(b.name, 'Zone name'), cities: placeList(b.cities, 'Cities'), provinces: placeList(b.provinces, 'Provinces'), fee: money(b.fee, 'Delivery fee') };
  if (!data.cities.length && !data.provinces.length) throw httpError(400, 'Add at least one city or province to this zone');
  if (b.isActive !== undefined) {
    if (typeof b.isActive !== 'boolean') throw httpError(400, 'isActive must be true or false');
    data.isActive = b.isActive;
  }
  return data;
}
const zoneNameTaken = (n, exceptId) =>
  DeliveryZone.exists({ name: new RegExp(`^${escapeRegex(n)}$`, 'i'), ...(exceptId ? { _id: { $ne: exceptId } } : {}) });

router.get('/zones', h(async (req, res) => {
  const zones = await DeliveryZone.find().sort({ name: 1, _id: 1 }).lean();
  res.json({ defaultFee: Number(process.env.DEFAULT_DELIVERY_FEE) || 2500, zones: zones.map(zoneView) });
}));

router.post('/zones', h(async (req, res) => {
  const data = cleanZone(req.body);
  if (await zoneNameTaken(data.name)) throw httpError(409, `A zone named "${data.name}" already exists`);
  res.status(201).json(zoneView(await DeliveryZone.create(data)));
}));

router.put('/zones/:id', h(async (req, res) => {
  assertId(req.params.id, 'Zone not found');
  const data = cleanZone(req.body);
  if (await zoneNameTaken(data.name, req.params.id)) throw httpError(409, `A zone named "${data.name}" already exists`);
  const z = await DeliveryZone.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true }).lean();
  if (!z) throw httpError(404, 'Zone not found');
  res.json(zoneView(z));
}));

// Orders keep their own copy of the fee, so a zone can be deleted safely
router.delete('/zones/:id', h(async (req, res) => {
  assertId(req.params.id, 'Zone not found');
  if (!(await DeliveryZone.findByIdAndDelete(req.params.id))) throw httpError(404, 'Zone not found');
  res.json({ ok: true });
}));

// ---------------- add-ons ----------------
const addOnView = (a) => ({ _id: a._id, name: a.name, type: a.type, description: a.description || '', price: a.price, isActive: a.isActive });
function cleanAddOn(b) {
  if (b.description !== undefined && b.description !== null && (!isText(b.description) || b.description.trim().length > 200)) throw httpError(400, 'Description is too long (200 characters at most)');
  const data = { name: name(b.name, 'Name'), description: isText(b.description) ? b.description.trim() : '', price: money(b.price, 'Price') };
  if (b.isActive !== undefined) {
    if (typeof b.isActive !== 'boolean') throw httpError(400, 'isActive must be true or false');
    data.isActive = b.isActive;
  }
  return data;
}

router.get('/addons', h(async (req, res) => {
  res.json((await AddOn.find().sort({ type: 1, name: 1 }).lean()).map(addOnView));
}));

// The type decides how an add-on behaves (installation fee, warranty extension), so it is set when created and never changed
router.post('/addons', h(async (req, res) => {
  if (!ADDON_TYPES.includes(req.body.type)) throw httpError(400, 'Choose an add-on type');
  res.status(201).json(addOnView(await AddOn.create({ ...cleanAddOn(req.body), type: req.body.type })));
}));

router.put('/addons/:id', h(async (req, res) => {
  assertId(req.params.id, 'Add-on not found');
  const a = await AddOn.findByIdAndUpdate(req.params.id, { $set: cleanAddOn(req.body) }, { new: true, runValidators: true }).lean();
  if (!a) throw httpError(404, 'Add-on not found');
  res.json(addOnView(a));
}));
// There is no delete: carts and past orders point at add-ons, so hide one instead (isActive: false).

module.exports = router;