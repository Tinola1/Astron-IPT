const router = require('express').Router();
const mongoose = require('mongoose');
const { Review, Product, Order, User } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const { maskProfanity } = require('../utils/profanity');
const { asyncHandler: h, httpError } = require('../utils/http');

const REVIEWABLE = ['delivered', 'installed']; // the customer must have actually received the product
const ADMIN_SORTABLE = { createdAt: 'createdAt', rating: 'rating' };
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// "Juan Dela Cruz" -> "Juan C."  (reviews are public, so don't show full names)
const shortName = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Customer';
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
};

const assertId = (id, msg = 'Not found') => {
  if (!mongoose.isValidObjectId(id)) throw httpError(404, msg);
};

const findPurchase = (userId, productId) =>
  Order.findOne({ user: userId, status: { $in: REVIEWABLE }, 'items.product': productId })
    .sort('-createdAt')
    .select('_id');

// Keeps Product.averageRating / numReviews (used by the storefront rating filters) in sync
async function recalcRating(productId) {
  const [agg] = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } },
  ]);
  await Product.updateOne(
    { _id: productId },
    { averageRating: agg ? Math.round(agg.avg * 10) / 10 : 0, numReviews: agg ? agg.n : 0 }
  );
}

function parseReview(body) {
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw httpError(400, 'Choose a rating from 1 to 5 stars');
  const comment = String(body.comment || '').trim();
  if (comment.length > 1000) throw httpError(400, 'Your review can be at most 1000 characters');
  return { rating, comment };
}

const mine = (r) => ({
  _id: r._id, rating: r.rating, comment: r.comment, isEdited: r.isEdited, createdAt: r.createdAt, updatedAt: r.updatedAt,
});

// ---------- public ----------

// GET /api/products/:id/reviews?page&limit&rating
router.get('/products/:id/reviews', h(async (req, res) => {
  assertId(req.params.id, 'Product not found');
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 20);
  const oid = new mongoose.Types.ObjectId(req.params.id);

  const where = { product: oid };
  const rating = Number(req.query.rating);
  if (Number.isInteger(rating) && rating >= 1 && rating <= 5) where.rating = rating;

  const [total, reviews, dist] = await Promise.all([
    Review.countDocuments(where),
    Review.find(where).populate('user', 'name').sort('-createdAt').skip((page - 1) * limit).limit(limit).lean(),
    Review.aggregate([{ $match: { product: oid } }, { $group: { _id: '$rating', n: { $sum: 1 } } }]),
  ]);

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  dist.forEach((d) => (distribution[d._id] = d.n));

  res.json({
    total,
    page,
    pages: Math.max(Math.ceil(total / limit), 1),
    distribution, // always for the whole product, even when filtering by rating
    reviews: reviews.map((r) => ({
      _id: r._id,
      rating: r.rating,
      comment: r.comment,
      author: shortName(r.user?.name),
      isEdited: r.isEdited,
      createdAt: r.createdAt,
    })),
  });
}));

// ---------- customer ----------

// GET /api/products/:id/review-status -> can I review this, and what did I already write?
router.get('/products/:id/review-status', protect, authorize('customer'), h(async (req, res) => {
  assertId(req.params.id, 'Product not found');
  const [review, purchase] = await Promise.all([
    Review.findOne({ product: req.params.id, user: req.user._id }),
    findPurchase(req.user._id, req.params.id),
  ]);
  res.json({ eligible: Boolean(purchase || review), review: review ? mine(review) : null });
}));

// POST /api/products/:id/reviews  { rating, comment }
router.post('/products/:id/reviews', protect, authorize('customer'), h(async (req, res) => {
  assertId(req.params.id, 'Product not found');
  const { rating, comment } = parseReview(req.body);

  const product = await Product.findOne({ _id: req.params.id, isDeleted: false }).select('_id');
  if (!product) throw httpError(404, 'Product not found');

  const purchase = await findPurchase(req.user._id, product._id);
  if (!purchase) throw httpError(403, 'Only customers who have received this product can review it');
  if (await Review.exists({ product: product._id, user: req.user._id }))
    throw httpError(409, 'You already reviewed this product. You can edit your review instead.');

  const { text, masked } = maskProfanity(comment);
  let review;
  try {
    review = await Review.create({ product: product._id, user: req.user._id, order: purchase._id, rating, comment: text });
  } catch (e) {
    if (e.code === 11000) throw httpError(409, 'You already reviewed this product.');
    throw e;
  }
  await recalcRating(product._id);
  res.status(201).json({ review: mine(review), masked });
}));

// PUT /api/reviews/:id  { rating, comment }  (own review only)
router.put('/reviews/:id', protect, authorize('customer'), h(async (req, res) => {
  assertId(req.params.id, 'Review not found');
  const review = await Review.findOne({ _id: req.params.id, user: req.user._id });
  if (!review) throw httpError(404, 'Review not found');

  const { rating, comment } = parseReview(req.body);
  const { text, masked } = maskProfanity(comment);
  review.rating = rating;
  review.comment = text;
  review.isEdited = true;
  await review.save();
  await recalcRating(review.product);
  res.json({ review: mine(review), masked });
}));

// ---------- admin moderation ----------

// GET /api/admin/reviews?page&limit&rating&q&sortField&sortOrder
router.get('/admin/reviews', protect, authorize('admin'), h(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const where = {};
  const rating = Number(req.query.rating);
  if (Number.isInteger(rating) && rating >= 1 && rating <= 5) where.rating = rating;
  if (req.query.q) {
    const re = new RegExp(escapeRegex(String(req.query.q)), 'i');
    const [products, users] = await Promise.all([
      Product.find({ name: re }).select('_id').limit(200),
      User.find({ $or: [{ name: re }, { email: re }] }).select('_id').limit(200),
    ]);
    where.$or = [{ comment: re }, { product: { $in: products.map((p) => p._id) } }, { user: { $in: users.map((u) => u._id) } }];
  }
  const sortField = ADMIN_SORTABLE[req.query.sortField] || 'createdAt';
  const dir = req.query.sortOrder === 'asc' ? 1 : -1;

  const total = await Review.countDocuments(where);
  const reviews = await Review.find(where)
    .populate('product', 'name')
    .populate('user', 'name email')
    .sort({ [sortField]: dir, _id: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  res.json({
    total,
    rows: reviews.map((r) => ({
      _id: r._id,
      product: { _id: r.product?._id, name: r.product?.name || 'Deleted product' },
      customer: { name: r.user?.name || 'Deleted user', email: r.user?.email || '' },
      rating: r.rating,
      comment: r.comment,
      isEdited: r.isEdited,
      createdAt: r.createdAt,
    })),
  });
}));

// DELETE /api/admin/reviews/:id
router.delete('/admin/reviews/:id', protect, authorize('admin'), h(async (req, res) => {
  assertId(req.params.id, 'Review not found');
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) throw httpError(404, 'Review not found');
  await recalcRating(review.product);
  res.json({ message: 'Review deleted' });
}));

module.exports = router;