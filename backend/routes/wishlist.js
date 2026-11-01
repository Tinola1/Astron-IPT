// A customer's saved products. Mounted at /api/wishlist
const router = require('express').Router();
const mongoose = require('mongoose');
const { Wishlist, Product, Inventory } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const { asyncHandler: h, httpError } = require('../utils/http');

router.use(protect, authorize('customer'));

const MAX_ITEMS = 100;
const idsOf = (w) => (w?.products || []).map(String);

// GET /api/wishlist -> { ids, items } (items have the same shape as the shop's product cards)
router.get('/', h(async (req, res) => {
  const w = await Wishlist.findOne({ user: req.user._id }).lean();
  const products = await Product.find({ _id: { $in: w?.products || [] }, isDeleted: false })
    .populate('brand', 'name').populate('category', 'name').lean();
  const stock = await Inventory.find({ product: { $in: products.map((p) => p._id) } }).lean();
  const online = Object.fromEntries(stock.map((s) => [String(s.product), s.onlineStock]));
  // newest saved first
  const order = (w?.products || []).map(String).reverse();
  products.sort((a, b) => order.indexOf(String(a._id)) - order.indexOf(String(b._id)));
  res.json({
    ids: products.map((p) => String(p._id)),
    items: products.map((p) => {
      const n = online[String(p._id)] || 0;
      return {
        _id: p._id, name: p.name, modelNumber: p.modelNumber, brand: p.brand?.name, category: p.category?.name,
        price: p.price, image: p.images?.[0]?.url || null, averageRating: p.averageRating || 0, numReviews: p.numReviews || 0,
        onlineStock: n, available: p.isAvailable && n > 0,
      };
    }),
  });
}));

// PUT /api/wishlist/:productId  -> save (saving twice does nothing)
router.put('/:productId', h(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.productId)) throw httpError(404, 'Product not found');
  if (!(await Product.exists({ _id: req.params.productId, isDeleted: false }))) throw httpError(404, 'Product not found');
  try {
    // the filter fails once a 101st slot would be needed, which the unique user index turns into a clean error
    const w = await Wishlist.findOneAndUpdate(
      { user: req.user._id, [`products.${MAX_ITEMS - 1}`]: { $exists: false } },
      { $addToSet: { products: req.params.productId } },
      { upsert: true, new: true }
    ).lean();
    res.json({ ids: idsOf(w) });
  } catch (e) {
    if (e.code === 11000) throw httpError(409, `Your wishlist is full (${MAX_ITEMS} units). Remove one first.`);
    throw e;
  }
}));

// DELETE /api/wishlist/:productId
router.delete('/:productId', h(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.productId)) throw httpError(404, 'Product not found');
  const w = await Wishlist.findOneAndUpdate({ user: req.user._id }, { $pull: { products: req.params.productId } }, { new: true }).lean();
  res.json({ ids: idsOf(w) });
}));

module.exports = router;