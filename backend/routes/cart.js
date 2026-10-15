const router = require('express').Router();
const mongoose = require('mongoose');
const { Cart, Product, Inventory, AddOn } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const { getCartContext } = require('../utils/cartHelpers');
const { asyncHandler: h, httpError } = require('../utils/http');

const MAX_QTY = 10;
router.use(protect, authorize('customer'));

const parseQty = (v) => {
  const q = Number(v);
  if (!Number.isInteger(q) || q < 1 || q > MAX_QTY)
    throw httpError(400, `Quantity must be between 1 and ${MAX_QTY}`);
  return q;
};
const stockFor = async (productId) => (await Inventory.findOne({ product: productId }))?.onlineStock || 0;
const validAddOnIds = async (ids = []) => {
  const clean = [...new Set(ids.map(String))].filter((i) => mongoose.isValidObjectId(i));
  return (await AddOn.find({ _id: { $in: clean }, isActive: true }).select('_id')).map((a) => a._id);
};
const sendCart = async (req, res, status = 200) =>
  res.status(status).json((await getCartContext(req.user._id)).view);

// GET /api/cart
router.get('/', h((req, res) => sendCart(req, res)));

// POST /api/cart/items  { productId, quantity, addOns: [addOnId] }
router.post('/items', h(async (req, res) => {
  const { productId, quantity = 1, addOns = [] } = req.body;
  if (!mongoose.isValidObjectId(productId)) throw httpError(400, 'Invalid product');
  const qty = parseQty(quantity);

  const product = await Product.findOne({ _id: productId, isDeleted: false });
  if (!product || !product.isAvailable) throw httpError(400, 'This product is unavailable');
  const stock = await stockFor(product._id);

  const cart = (await Cart.findOne({ user: req.user._id })) || new Cart({ user: req.user._id, items: [] });
  const addOnIds = await validAddOnIds(addOns);
  const existing = cart.items.find((i) => String(i.product) === String(product._id));
  const newQty = (existing?.quantity || 0) + qty;
  if (newQty > Math.min(stock, MAX_QTY))
    throw httpError(400, stock < 1 ? 'Out of stock' : `You can only add up to ${Math.min(stock, MAX_QTY)} of this item`);

  if (existing) {
    existing.quantity = newQty;
    existing.addOns = [...new Set([...existing.addOns.map(String), ...addOnIds.map(String)])];
  } else {
    cart.items.push({ product: product._id, quantity: qty, addOns: addOnIds });
  }
  await cart.save();
  await sendCart(req, res, 201);
}));

// PUT /api/cart/items/:itemId  { quantity?, addOns? }
router.put('/items/:itemId', h(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  const item = mongoose.isValidObjectId(req.params.itemId) ? cart?.items.id(req.params.itemId) : null;
  if (!item) throw httpError(404, 'Cart item not found');

  const { quantity, addOns } = req.body;
  if (quantity !== undefined) {
    const qty = parseQty(quantity);
    const stock = await stockFor(item.product);
    if (qty > stock) throw httpError(400, `Only ${stock} in stock`);
    item.quantity = qty;
  }
  if (addOns !== undefined) item.addOns = await validAddOnIds(addOns);
  await cart.save();
  await sendCart(req, res);
}));

// DELETE /api/cart/items/:itemId
router.delete('/items/:itemId', h(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  const item = mongoose.isValidObjectId(req.params.itemId) ? cart?.items.id(req.params.itemId) : null;
  if (!item) throw httpError(404, 'Cart item not found');
  cart.items.pull(item._id);
  await cart.save();
  await sendCart(req, res);
}));

// DELETE /api/cart  (clear)
router.delete('/', h(async (req, res) => {
  await Cart.updateOne({ user: req.user._id }, { $set: { items: [] } });
  await sendCart(req, res);
}));

module.exports = router;