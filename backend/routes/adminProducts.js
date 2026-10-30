const router = require('express').Router();
const mongoose = require('mongoose');
const { Product, Category, Brand, Inventory, Cart } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/uploadToCloudinary');
const { asyncHandler: h, httpError } = require('../utils/http');
const { checkLowStock } = require('../utils/stock');

router.use(protect, authorize('admin'));

const MAX_IMAGES = 6;
const SORTABLE = { name: 'name', modelNumber: 'modelNumber', price: 'price', createdAt: 'createdAt' };
const ENERGY = ['1', '2', '3', '4', '5'];
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// multipart parser; turns multer errors into clean JSON
const receiveImages = (req, res, next) =>
  upload.array('images', MAX_IMAGES)(req, res, (err) => {
    if (!err) return next();
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Each image must be 5MB or smaller'
      : err.code === 'LIMIT_UNEXPECTED_FILE' ? `You can upload up to ${MAX_IMAGES} images`
      : err.message;
    res.status(400).json({ message });
  });

const num = (v, label, { min = 0, required = false } = {}) => {
  if (v === undefined || v === null || v === '') {
    if (required) throw httpError(400, `${label} is required`);
    return undefined;
  }
  const n = Number(v);
  if (!Number.isFinite(n) || n < min) throw httpError(400, `${label} must be a number of at least ${min}`);
  return n;
};

// Validates the JSON in the "data" form field and returns clean values
function parsePayload(body) {
  let d;
  try { d = JSON.parse(body.data || '{}'); } catch { throw httpError(400, 'Invalid form data'); }

  const name = String(d.name || '').trim();
  const modelNumber = String(d.modelNumber || '').trim();
  if (!name) throw httpError(400, 'Product name is required');
  if (!modelNumber) throw httpError(400, 'Model number is required');
  if (!mongoose.isValidObjectId(d.category)) throw httpError(400, 'Select a product type');
  if (!mongoose.isValidObjectId(d.brand)) throw httpError(400, 'Select a brand');

  const s = d.specs || {};
  const energyRating = s.energyRating ? String(s.energyRating) : undefined;
  if (energyRating && !ENERGY.includes(energyRating)) throw httpError(400, 'Energy rating must be 1 to 5');

  const dim = s.dimensions || {};
  const dims = {
    width: num(dim.width, 'Width'), height: num(dim.height, 'Height'), depth: num(dim.depth, 'Depth'),
  };
  const hasDims = Object.values(dims).some((v) => v !== undefined);

  const room = d.recommendedRoomSize || {};
  const minSqm = num(room.minSqm, 'Min room size');
  const maxSqm = num(room.maxSqm, 'Max room size');
  if (minSqm !== undefined && maxSqm !== undefined && maxSqm < minSqm)
    throw httpError(400, 'Max room size must be at least the min room size');

  return {
    name,
    modelNumber,
    description: String(d.description || '').trim(),
    category: d.category,
    brand: d.brand,
    price: num(d.price, 'Price', { required: true }),
    isAvailable: d.isAvailable !== false,
    specs: {
      capacityBTU: num(s.capacityBTU, 'Capacity (BTU)', { min: 1, required: true }),
      capacityHP: num(s.capacityHP, 'Capacity (HP)'),
      isInverter: Boolean(s.isInverter),
      energyRating,
      powerConsumptionWatts: num(s.powerConsumptionWatts, 'Power consumption'),
      refrigerantType: s.refrigerantType ? String(s.refrigerantType).trim() : undefined,
      noiseLevelDb: num(s.noiseLevelDb, 'Noise level'),
      dimensions: hasDims ? dims : undefined,
      warrantyMonths: num(s.warrantyMonths, 'Warranty') ?? 12,
    },
    recommendedRoomSize: minSqm !== undefined || maxSqm !== undefined ? { minSqm, maxSqm } : undefined,
    stock: {
      online: Math.floor(num(d.stock?.online, 'Online stock') || 0),
      showroom: Math.floor(num(d.stock?.showroom, 'Showroom stock') || 0),
    },
    keepImages: Array.isArray(d.keepImages) ? d.keepImages.map(String) : undefined,
  };
}

async function assertRefs({ category, brand }) {
  const [c, b] = await Promise.all([Category.exists({ _id: category }), Brand.exists({ _id: brand })]);
  if (!c) throw httpError(400, 'Selected product type does not exist');
  if (!b) throw httpError(400, 'Selected brand does not exist');
}

const uploadAll = (files) => Promise.all(files.map((f) => uploadToCloudinary(f.buffer, 'astron/products')));
const discard = (images) => Promise.all(images.map((i) => deleteFromCloudinary(i.publicId).catch(() => {})));

const shape = (p, inv) => ({
  _id: p._id,
  name: p.name,
  modelNumber: p.modelNumber,
  description: p.description,
  brand: p.brand,
  category: p.category,
  price: p.price,
  images: (p.images || []).map((i) => ({ url: i.url, publicId: i.publicId })),
  specs: p.specs || {},
  recommendedRoomSize: p.recommendedRoomSize || null,
  isAvailable: p.isAvailable,
  onlineStock: inv?.onlineStock ?? 0,
  showroomStock: inv?.showroomStock ?? 0,
  createdAt: p.createdAt,
});

// Soft delete: keeps order history intact, frees the model number, empties carts
async function softDelete(ids) {
  const valid = [...new Set(ids.map(String))].filter((i) => mongoose.isValidObjectId(i)).slice(0, 200);
  if (!valid.length) return 0;
  const r = await Product.updateMany({ _id: { $in: valid }, isDeleted: false }, [
    {
      $set: {
        isDeleted: true,
        isAvailable: false,
        modelNumber: { $concat: ['$modelNumber', '__deleted_', { $toString: '$$NOW' }] },
      },
    },
  ]);
  await Cart.updateMany({}, { $pull: { items: { product: { $in: valid } } } });
  return r.modifiedCount;
}

// GET /api/admin/products?page&limit&q&sortField&sortOrder
router.get('/', h(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const where = { isDeleted: false };
  if (req.query.q) {
    const re = new RegExp(escapeRegex(String(req.query.q)), 'i');
    where.$or = [{ name: re }, { modelNumber: re }];
  }
  const sortField = SORTABLE[req.query.sortField] || 'createdAt';
  const dir = req.query.sortOrder === 'asc' ? 1 : -1;

  const total = await Product.countDocuments(where);
  const products = await Product.find(where)
    .populate('brand', 'name')
    .populate('category', 'name')
    .sort({ [sortField]: dir, _id: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  const inv = await Inventory.find({ product: { $in: products.map((p) => p._id) } }).lean();
  const byProduct = Object.fromEntries(inv.map((i) => [String(i.product), i]));

  res.json({ total, rows: products.map((p) => shape(p, byProduct[String(p._id)])) });
}));

// POST /api/admin/products/bulk-delete  { ids: [] }
router.post('/bulk-delete', h(async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  if (!ids.length) throw httpError(400, 'Select at least one product');
  const deleted = await softDelete(ids);
  res.json({ deleted });
}));

// GET /api/admin/products/:id
router.get('/:id', h(async (req, res) => {
  const p = mongoose.isValidObjectId(req.params.id)
    ? await Product.findOne({ _id: req.params.id, isDeleted: false })
        .populate('brand', 'name').populate('category', 'name').lean()
    : null;
  if (!p) throw httpError(404, 'Product not found');
  res.json(shape(p, await Inventory.findOne({ product: p._id }).lean()));
}));

// POST /api/admin/products  (multipart: data=<json>, images=<files>)
router.post('/', receiveImages, h(async (req, res) => {
  const p = parsePayload(req.body);
  await assertRefs(p);
  if (await Product.exists({ modelNumber: p.modelNumber }))
    throw httpError(409, 'A product with this model number already exists');

  const images = await uploadAll(req.files || []);
  let product;
  try {
    product = await Product.create({
      name: p.name, modelNumber: p.modelNumber, description: p.description,
      category: p.category, brand: p.brand, price: p.price, isAvailable: p.isAvailable,
      specs: p.specs, recommendedRoomSize: p.recommendedRoomSize, images,
    });
    await Inventory.create({ product: product._id, onlineStock: p.stock.online, showroomStock: p.stock.showroom });
  } catch (e) {
    if (product) await Product.deleteOne({ _id: product._id });
    await discard(images);
    if (e.code === 11000) throw httpError(409, 'A product with this model number already exists');
    throw e;
  }
  checkLowStock([product._id]).catch((e) => console.error('Low-stock check failed:', e.message));
  res.status(201).json(shape(product.toObject(), { onlineStock: p.stock.online, showroomStock: p.stock.showroom }));
}));

// PUT /api/admin/products/:id  (multipart: data=<json incl. keepImages>, images=<new files>)
router.put('/:id', receiveImages, h(async (req, res) => {
  const product = mongoose.isValidObjectId(req.params.id)
    ? await Product.findOne({ _id: req.params.id, isDeleted: false })
    : null;
  if (!product) throw httpError(404, 'Product not found');

  const p = parsePayload(req.body);
  await assertRefs(p);
  if (p.modelNumber !== product.modelNumber &&
      (await Product.exists({ modelNumber: p.modelNumber, _id: { $ne: product._id } })))
    throw httpError(409, 'A product with this model number already exists');

  // which existing images stay (and in what order); the rest are removed
  const files = req.files || [];
  const kept = p.keepImages
    ? p.keepImages.map((id) => product.images.find((i) => i.publicId === id)).filter(Boolean)
    : [...product.images];
  const removed = product.images.filter((i) => !kept.includes(i));
  if (kept.length + files.length > MAX_IMAGES)
    throw httpError(400, `A product can have at most ${MAX_IMAGES} images`);

  const uploaded = await uploadAll(files);
  product.images = [...kept.map((i) => ({ url: i.url, publicId: i.publicId })), ...uploaded];
  Object.assign(product, {
    name: p.name, modelNumber: p.modelNumber, description: p.description,
    category: p.category, brand: p.brand, price: p.price, isAvailable: p.isAvailable,
    specs: p.specs, recommendedRoomSize: p.recommendedRoomSize,
  });
  try {
    await product.save();
  } catch (e) {
    await discard(uploaded);
    if (e.code === 11000) throw httpError(409, 'A product with this model number already exists');
    throw e;
  }
    // apply stock changes as a difference so a customer order in between isn't overwritten, and keep a history
  const current = (await Inventory.findOne({ product: product._id })) || (await Inventory.create({ product: product._id }));
  const onlineDiff = p.stock.online - current.onlineStock;
  const showroomDiff = p.stock.showroom - current.showroomStock;
  let inv = current.toObject();
  if (onlineDiff || showroomDiff) {
    const log = [];
    if (onlineDiff) log.push({ stockType: 'online', change: onlineDiff, reason: 'Edited in product form', by: req.user._id });
    if (showroomDiff) log.push({ stockType: 'showroom', change: showroomDiff, reason: 'Edited in product form', by: req.user._id });
    inv = await Inventory.findOneAndUpdate(
      { _id: current._id },
      { $inc: { onlineStock: onlineDiff, showroomStock: showroomDiff }, $push: { adjustments: { $each: log } } },
      { new: true }
    ).lean();
  }
  checkLowStock([product._id]).catch((e) => console.error('Low-stock check failed:', e.message));
  discard(removed); // best effort, after the DB is updated
  res.json(shape(product.toObject(), inv));
}));

// DELETE /api/admin/products/:id
router.delete('/:id', h(async (req, res) => {
  if (!(await softDelete([req.params.id]))) throw httpError(404, 'Product not found');
  res.json({ message: 'Product deleted' });
}));

module.exports = router;