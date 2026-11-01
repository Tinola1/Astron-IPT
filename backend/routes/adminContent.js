// Website content: banners, promotions and buying guides. Mounted at /api/admin/content (admin only)
const router = require('express').Router();
const mongoose = require('mongoose');
const validator = require('validator');
const { Content } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/uploadToCloudinary');
const { asyncHandler: h, httpError } = require('../utils/http');

router.use(protect, authorize('admin'));

const TYPES = ['banner', 'promotion', 'buying_guide'];
const isText = (v) => typeof v === 'string';

// multipart parser (data = JSON text, image = one file); turns multer errors into clean JSON
const receiveImage = (req, res, next) =>
  upload.single('image')(req, res, (err) => {
    if (!err) return next();
    res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'The image must be 5MB or smaller' : err.code === 'LIMIT_UNEXPECTED_FILE' ? 'Upload one image only' : err.message });
  });

// the browser's "this is a PNG" is only a claim, so check the first bytes of the file as well
const looksLikeImage = (b) =>
  b.length > 12 &&
  ((b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) || // JPEG
    b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) || // PNG
    (b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP')); // WebP

const view = (c) => ({
  _id: c._id, type: c.type, title: c.title, body: c.body || '', image: c.image?.url || '', link: c.link || '',
  order: c.order || 0, isPublished: c.isPublished, updatedAt: c.updatedAt,
});

function readData(req) {
  let d;
  try {
    d = JSON.parse(req.body?.data);
  } catch {
    throw httpError(400, 'The form data is not valid');
  }
  if (!d || typeof d !== 'object' || Array.isArray(d)) throw httpError(400, 'The form data is not valid');
  return d;
}

function clean(d) {
  if (!TYPES.includes(d.type)) throw httpError(400, 'Choose banner, promotion or buying guide');
  if (!isText(d.title) || !d.title.trim() || d.title.trim().length > 100) throw httpError(400, 'Title is required (up to 100 characters)');
  const maxBody = d.type === 'buying_guide' ? 5000 : 500;
  if (d.body !== undefined && d.body !== null && (!isText(d.body) || d.body.trim().length > maxBody)) throw httpError(400, `Text is too long (${maxBody} characters at most)`);

  let link = '';
  if (d.link !== undefined && d.link !== null && d.link !== '') {
    if (!isText(d.link) || d.link.trim().length > 300) throw httpError(400, 'The link is too long');
    link = d.link.trim();
    const inside = /^\/(?!\/)[A-Za-z0-9\-._~/?=&#%]*$/.test(link); // a page on this site, like /guides
    const outside = validator.isURL(link, { protocols: ['http', 'https'], require_protocol: true });
    if (!inside && !outside) throw httpError(400, 'The link must be a page on this site (like /guides) or a full web address starting with https://');
  }
  const order = d.order === undefined || d.order === '' || d.order === null ? 0 : d.order;
  if (!Number.isInteger(order) || order < 0 || order > 9999) throw httpError(400, 'Order must be a whole number from 0 to 9999');
  if (d.isPublished !== undefined && typeof d.isPublished !== 'boolean') throw httpError(400, 'Published must be true or false');
  return { type: d.type, title: d.title.trim(), body: isText(d.body) ? d.body.trim() : '', link, order, isPublished: d.isPublished ?? true };
}

const assertId = (id) => {
  if (!mongoose.isValidObjectId(id)) throw httpError(404, 'Content not found');
};
const discard = (img) => (img?.publicId ? deleteFromCloudinary(img.publicId).catch(() => {}) : null);
async function storeImage(file) {
  if (!file) return null;
  if (!looksLikeImage(file.buffer)) throw httpError(400, 'That file is not a real JPG, PNG or WebP image');
  return uploadToCloudinary(file.buffer, 'astron/content');
}

// GET /api/admin/content?type=
router.get('/', h(async (req, res) => {
  const where = TYPES.includes(req.query.type) ? { type: req.query.type } : {};
  const list = await Content.find(where).sort({ type: 1, order: 1, createdAt: -1 }).limit(200).lean();
  res.json(list.map(view));
}));

// POST /api/admin/content  (multipart: data=<json>, image=<file>)
router.post('/', receiveImage, h(async (req, res) => {
  const data = clean(readData(req));
  const image = await storeImage(req.file);
  if (data.type === 'banner' && !image) throw httpError(400, 'A banner needs an image');
  try {
    const doc = await Content.create({ ...data, ...(image ? { image } : {}) });
    res.status(201).json(view(doc));
  } catch (e) {
    await discard(image);
    throw e;
  }
}));

// PUT /api/admin/content/:id  (multipart: data=<json incl. removeImage>, image=<new file>)
router.put('/:id', receiveImage, h(async (req, res) => {
  assertId(req.params.id);
  const raw = readData(req);
  const data = clean(raw);
  const doc = await Content.findById(req.params.id);
  if (!doc) throw httpError(404, 'Content not found');

  const old = doc.image?.publicId ? { publicId: doc.image.publicId } : null;
  const fresh = await storeImage(req.file);
  const finalImage = fresh || (raw.removeImage === true ? null : doc.image?.url ? doc.image : null);
  if (data.type === 'banner' && !finalImage) {
    await discard(fresh);
    throw httpError(400, 'A banner needs an image');
  }
  Object.assign(doc, data);
  doc.image = finalImage ? { url: finalImage.url, publicId: finalImage.publicId } : undefined;
  try {
    await doc.save();
  } catch (e) {
    await discard(fresh);
    throw e;
  }
  if (old && (fresh || raw.removeImage === true)) discard(old); // best effort, after the DB is updated
  res.json(view(doc));
}));

// PUT /api/admin/content/:id/published  { isPublished }
router.put('/:id/published', h(async (req, res) => {
  assertId(req.params.id);
  if (typeof req.body.isPublished !== 'boolean') throw httpError(400, 'isPublished must be true or false');
  const doc = await Content.findByIdAndUpdate(req.params.id, { isPublished: req.body.isPublished }, { new: true }).lean();
  if (!doc) throw httpError(404, 'Content not found');
  res.json(view(doc));
}));

// DELETE /api/admin/content/:id
router.delete('/:id', h(async (req, res) => {
  assertId(req.params.id);
  const doc = await Content.findByIdAndDelete(req.params.id);
  if (!doc) throw httpError(404, 'Content not found');
  discard(doc.image);
  res.json({ ok: true });
}));

module.exports = router;