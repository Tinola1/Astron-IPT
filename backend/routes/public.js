// Public, read-only endpoints used by the storefront main page.
const router = require('express').Router();
const { Product, Category, Brand, Inventory, StoreInfo } = require('../models');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/categories', async (_req, res) => {
  res.json(await Category.find({ isActive: true }).sort('name').select('name'));
});

router.get('/brands', async (_req, res) => {
  res.json(await Brand.find({ isActive: true }).sort('name').select('name'));
});

router.get('/store-info', async (_req, res) => {
  res.json((await StoreInfo.findOne()) || {});
});

// GET /api/products?q=&category=&brand=&inverter=true|false&maxPrice=
router.get('/products', async (req, res) => {
  try {
    const { q, category, brand, inverter, maxPrice } = req.query;
    const where = { isDeleted: false };
    if (category) where.category = category;
    if (brand) where.brand = brand;
    if (inverter) where['specs.isInverter'] = inverter === 'true';
    if (maxPrice) where.price = { $lte: Number(maxPrice) };
    if (q) {
      const re = new RegExp(escapeRegex(q), 'i');
      where.$or = [{ name: re }, { modelNumber: re }];
    }

    const products = await Product.find(where)
      .populate('brand', 'name').populate('category', 'name')
      .sort('price').lean();
    const stock = await Inventory.find({ product: { $in: products.map((p) => p._id) } }).lean();
    const byProduct = Object.fromEntries(stock.map((s) => [String(s.product), s]));

    res.json(products.map((p) => {
      const inv = byProduct[String(p._id)];
      const online = inv ? inv.onlineStock : 0;
      return {
        _id: p._id, name: p.name, modelNumber: p.modelNumber,
        brand: p.brand?.name, category: p.category?.name,
        price: p.price, specs: p.specs || {}, image: p.images?.[0]?.url || null,
        recommendedRoomSize: p.recommendedRoomSize || null,
        onlineStock: online,
        available: p.isAvailable && online > 0, // unavailable products cannot be purchased
      };
    }));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
