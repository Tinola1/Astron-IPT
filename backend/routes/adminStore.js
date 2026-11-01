// Store information and promotion / discount codes. Mounted at /api/admin/store (admin only)
const router = require('express').Router();
const mongoose = require('mongoose');
const validator = require('validator');
const { StoreInfo, Promotion, Order } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const { isDate, dayStart, dayEnd } = require('../utils/reports');
const upload = require('../middleware/upload');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/uploadToCloudinary');
const { looksLikeImage } = require('../utils/imageCheck');
const { asyncHandler: h, httpError } = require('../utils/http');

router.use(protect, authorize('admin'));

const isText = (v) => typeof v === 'string';
const opt = (v, max, label) => {
  if (v === undefined || v === null || v === '') return '';
  if (!isText(v) || v.trim().length > max) throw httpError(400, `${label} is too long (${max} characters at most)`);
  return v.trim();
};
const optUrl = (v, label) => {
  const s = opt(v, 200, label);
  // only real web links: this blocks javascript: and similar tricks in footer links
  if (s && !validator.isURL(s, { protocols: ['http', 'https'], require_protocol: true })) throw httpError(400, `${label} must be a full web address starting with http:// or https://`);
  return s;
};

// ---------------- store information ----------------
const infoView = (i) => ({
  storeName: i?.storeName || '', email: i?.email || '', phone: i?.phone || '', address: i?.address || '',
  businessHours: i?.businessHours || '', facebook: i?.social?.facebook || '', instagram: i?.social?.instagram || '',
  maintenanceReminderMonths: i?.maintenanceReminderMonths ?? 6,
  logo: i?.logo?.url || '',
});

router.get('/info', h(async (req, res) => res.json(infoView(await StoreInfo.findOne().lean()))));

// PUT /api/admin/store/info  (the whole form)
router.put('/info', h(async (req, res) => {
  const b = req.body;
  const storeName = opt(b.storeName, 80, 'Store name');
  if (!storeName) throw httpError(400, 'Store name is required');
  const email = opt(b.email, 120, 'Email');
  if (email && !validator.isEmail(email)) throw httpError(400, 'Enter a valid email address');
  const months = b.maintenanceReminderMonths;
  if (!Number.isInteger(months) || months < 1 || months > 24) throw httpError(400, 'Cleaning reminder interval must be a whole number of months from 1 to 24');

  const data = {
    storeName, email,
    phone: opt(b.phone, 40, 'Phone'),
    address: opt(b.address, 200, 'Address'),
    businessHours: opt(b.businessHours, 200, 'Business hours'),
    social: { facebook: optUrl(b.facebook, 'Facebook link'), instagram: optUrl(b.instagram, 'Instagram link') },
    maintenanceReminderMonths: months,
  };
  const saved = await StoreInfo.findOneAndUpdate({}, { $set: data }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
  res.json(infoView(saved));
}));

// ---------------- store logo ----------------
const receiveLogo = (req, res, next) =>
  upload.single('logo')(req, res, (err) => {
    if (!err) return next();
    res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'The logo must be 5MB or smaller' : err.code === 'LIMIT_UNEXPECTED_FILE' ? 'Upload one image only' : err.message });
  });

// PUT /api/admin/store/logo  (multipart: logo=<file>)
router.put('/logo', receiveLogo, h(async (req, res) => {
  if (!req.file) throw httpError(400, 'Choose an image');
  if (!looksLikeImage(req.file.buffer)) throw httpError(400, 'That file is not a real JPG, PNG or WebP image');
  const fresh = await uploadToCloudinary(req.file.buffer, 'astron/store');
  try {
    const before = await StoreInfo.findOne().select('logo').lean();
    await StoreInfo.findOneAndUpdate({}, { $set: { logo: fresh } }, { upsert: true, setDefaultsOnInsert: true });
    if (before?.logo?.publicId) deleteFromCloudinary(before.logo.publicId).catch(() => {});
  } catch (e) {
    await deleteFromCloudinary(fresh.publicId).catch(() => {});
    throw e;
  }
  res.json({ logo: fresh.url });
}));

// DELETE /api/admin/store/logo
router.delete('/logo', h(async (req, res) => {
  const before = await StoreInfo.findOne().select('logo').lean();
  await StoreInfo.updateOne({}, { $unset: { logo: 1 } });
  if (before?.logo?.publicId) deleteFromCloudinary(before.logo.publicId).catch(() => {});
  res.json({ ok: true });
}));

// ---------------- promotions and discount codes ----------------
const CODE_RE = /^[A-Z0-9][A-Z0-9_-]{2,19}$/;
const MAX_FIXED = 1000000;

function promoStatus(p, now = new Date()) {
  if (!p.isActive) return 'disabled';
  if (p.endDate && p.endDate < now) return 'expired';
  if (p.startDate && p.startDate > now) return 'scheduled';
  if (p.usageLimit != null && p.usedCount >= p.usageLimit) return 'used_up';
  return 'active';
}
const toDateStr = (d) => (d ? new Date(d.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10) : '');
const promoView = (p) => ({
  _id: p._id, title: p.title, code: p.code || '', description: p.description || '', discountType: p.discountType,
  discountValue: p.discountValue, minOrderAmount: p.minOrderAmount || 0, usageLimit: p.usageLimit ?? null,
  usedCount: p.usedCount || 0, startDate: toDateStr(p.startDate), endDate: toDateStr(p.endDate),
  isActive: p.isActive, status: promoStatus(p),
});

function cleanPromo(b) {
  const title = opt(b.title, 80, 'Title');
  if (!title) throw httpError(400, 'Title is required');
  const code = isText(b.code) ? b.code.trim().toUpperCase() : '';
  if (!CODE_RE.test(code)) throw httpError(400, 'Code must be 3 to 20 characters: letters, numbers, - or _');
  if (!['percent', 'fixed'].includes(b.discountType)) throw httpError(400, 'Choose percent or fixed amount');
  const v = b.discountValue;
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) throw httpError(400, 'Discount must be more than 0');
  if (b.discountType === 'percent' && v > 100) throw httpError(400, 'A percent discount can be 100 at most');
  if (b.discountType === 'fixed' && v > MAX_FIXED) throw httpError(400, `A fixed discount can be ${MAX_FIXED.toLocaleString()} at most`);
  const min = b.minOrderAmount === undefined || b.minOrderAmount === null || b.minOrderAmount === '' ? 0 : b.minOrderAmount;
  if (typeof min !== 'number' || !Number.isFinite(min) || min < 0 || min > 100000000) throw httpError(400, 'Minimum order must be 0 or more');
  let limit = b.usageLimit;
  if (limit === undefined || limit === '' || limit === null) limit = null;
  else if (!Number.isInteger(limit) || limit < 1 || limit > 1000000) throw httpError(400, 'Usage limit must be a whole number of 1 or more, or empty for no limit');
  for (const k of ['startDate', 'endDate']) if (b[k] && !isDate(b[k])) throw httpError(400, 'Dates must look like 2026-12-31');
  if (b.startDate && b.endDate && b.startDate > b.endDate) throw httpError(400, 'The start date must be on or before the end date');
  return {
    title, code, description: opt(b.description, 200, 'Description'), discountType: b.discountType, discountValue: v,
    minOrderAmount: min, usageLimit: limit,
    startDate: b.startDate ? dayStart(b.startDate) : null, endDate: b.endDate ? dayEnd(b.endDate) : null,
  };
}
const dupMsg = (code) => `The code ${code} is already used by another promotion`;
const assertId = (id) => {
  if (!mongoose.isValidObjectId(id)) throw httpError(404, 'Promotion not found');
};

router.get('/promotions', h(async (req, res) => {
  const list = await Promotion.find().sort({ createdAt: -1, _id: -1 }).limit(200).lean();
  res.json(list.map(promoView));
}));

router.post('/promotions', h(async (req, res) => {
  const data = cleanPromo(req.body);
  try {
    res.status(201).json(promoView(await Promotion.create(data)));
  } catch (e) {
    if (e.code === 11000) throw httpError(409, dupMsg(data.code));
    throw e;
  }
}));

// PUT /api/admin/store/promotions/:id  (the whole form; how many times it was used is never editable)
router.put('/promotions/:id', h(async (req, res) => {
  assertId(req.params.id);
  const data = cleanPromo(req.body);
  try {
    const p = await Promotion.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true }).lean();
    if (!p) throw httpError(404, 'Promotion not found');
    res.json(promoView(p));
  } catch (e) {
    if (e.code === 11000) throw httpError(409, dupMsg(data.code));
    throw e;
  }
}));

// PUT /api/admin/store/promotions/:id/active  { isActive }
router.put('/promotions/:id/active', h(async (req, res) => {
  assertId(req.params.id);
  if (typeof req.body.isActive !== 'boolean') throw httpError(400, 'isActive must be true or false');
  const p = await Promotion.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { new: true }).lean();
  if (!p) throw httpError(404, 'Promotion not found');
  res.json(promoView(p));
}));

// DELETE: only a code that no order has used (otherwise turn it off, so old orders keep their record)
router.delete('/promotions/:id', h(async (req, res) => {
  assertId(req.params.id);
  if (await Order.exists({ promotion: req.params.id })) throw httpError(409, 'Orders already used this code. Turn it off instead of deleting it.');
  const p = await Promotion.findByIdAndDelete(req.params.id);
  if (!p) throw httpError(404, 'Promotion not found');
  res.json({ ok: true });
}));

module.exports = router;