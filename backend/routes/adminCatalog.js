// Product types (categories) and brands. Mounted at /api/admin/catalog (admin only)
const router = require('express').Router();
const mongoose = require('mongoose');
const { Category, Brand, Product } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const { asyncHandler: h, httpError } = require('../utils/http');

router.use(protect, authorize('admin'));

const KINDS = {
  categories: { Model: Category, field: 'category', label: 'Product type' },
  brands: { Model: Brand, field: 'brand', label: 'Brand' },
};
const isText = (v) => typeof v === 'string';
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const kindOf = (req) => {
  const k = KINDS[req.params.kind];
  if (!k) throw httpError(404, 'Not found');
  return k;
};
const cleanName = (v) => {
  if (!isText(v) || !v.trim() || v.trim().length > 60) throw httpError(400, 'Name is required (up to 60 characters)');
  return v.trim();
};
const cleanDesc = (v) => {
  if (v === undefined || v === null) return '';
  if (!isText(v) || v.trim().length > 300) throw httpError(400, 'Description is too long (300 characters at most)');
  return v.trim();
};
const assertId = (id) => {
  if (!mongoose.isValidObjectId(id)) throw httpError(404, 'Not found');
};
// names are unique ignoring upper/lower case ("Split" and "split" are the same)
const nameTaken = (Model, name, exceptId) =>
  Model.exists({ name: new RegExp(`^${escapeRegex(name)}$`, 'i'), ...(exceptId ? { _id: { $ne: exceptId } } : {}) });
const view = (d, products) => ({ _id: d._id, name: d.name, description: d.description || '', isActive: d.isActive, products });

// GET /api/admin/catalog/:kind  (kind = categories | brands) -> all, with how many products use each
router.get('/:kind', h(async (req, res) => {
  const { Model, field } = kindOf(req);
  const [docs, counts] = await Promise.all([
    Model.find().sort({ name: 1, _id: 1 }).lean(),
    Product.aggregate([{ $match: { isDeleted: false } }, { $group: { _id: `$${field}`, n: { $sum: 1 } } }]),
  ]);
  const by = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  res.json(docs.map((d) => view(d, by[String(d._id)] || 0)));
}));

// POST /api/admin/catalog/:kind  { name, description }
router.post('/:kind', h(async (req, res) => {
  const { Model, label } = kindOf(req);
  const name = cleanName(req.body.name);
  const description = Model === Category ? cleanDesc(req.body.description) : undefined;
  if (await nameTaken(Model, name)) throw httpError(409, `${label} "${name}" already exists`);
  try {
    const doc = await Model.create({ name, ...(description !== undefined ? { description } : {}) });
    res.status(201).json(view(doc, 0));
  } catch (e) {
    if (e.code === 11000) throw httpError(409, `${label} "${name}" already exists`);
    throw e;
  }
}));

// PUT /api/admin/catalog/:kind/:id  { name, description, isActive }
router.put('/:kind/:id', h(async (req, res) => {
  const { Model, label } = kindOf(req);
  assertId(req.params.id);
  const doc = await Model.findById(req.params.id);
  if (!doc) throw httpError(404, `${label} not found`);
  if (req.body.name !== undefined) {
    const name = cleanName(req.body.name);
    if (await nameTaken(Model, name, doc._id)) throw httpError(409, `${label} "${name}" already exists`);
    doc.name = name;
  }
  if (Model === Category && req.body.description !== undefined) doc.description = cleanDesc(req.body.description);
  if (req.body.isActive !== undefined) {
    if (typeof req.body.isActive !== 'boolean') throw httpError(400, 'isActive must be true or false');
    doc.isActive = req.body.isActive;
  }
  try {
    await doc.save();
  } catch (e) {
    if (e.code === 11000) throw httpError(409, `${label} already exists`);
    throw e;
  }
  res.json(view(doc, await Product.countDocuments({ [KINDS[req.params.kind].field]: doc._id, isDeleted: false })));
}));

// DELETE /api/admin/catalog/:kind/:id  -> only when no product uses it (otherwise deactivate it)
router.delete('/:kind/:id', h(async (req, res) => {
  const { Model, field, label } = kindOf(req);
  assertId(req.params.id);
  if (await Product.exists({ [field]: req.params.id })) {
    throw httpError(409, `${label} is used by products. Deactivate it instead of deleting.`);
  }
  const gone = await Model.findByIdAndDelete(req.params.id);
  if (!gone) throw httpError(404, `${label} not found`);
  res.json({ ok: true });
}));

module.exports = router;