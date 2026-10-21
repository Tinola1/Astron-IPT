// Public, read-only endpoints used by the storefront.
const router = require('express').Router();
const mongoose = require('mongoose');
const { Product, Category, Brand, Inventory, StoreInfo, AddOn } = require('../models');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const num = (v) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);

const SORTS = {
  price_asc: 'price',
  price_desc: '-price',
  rating: '-averageRating -numReviews',
  newest: '-createdAt',
  name: 'name',
};

router.get('/categories', async (_req, res) => {
  res.json(await Category.find({ isActive: true }).sort('name').select('name'));
});

router.get('/brands', async (_req, res) => {
  res.json(await Brand.find({ isActive: true }).sort('name').select('name'));
});

router.get('/addons', async (_req, res) => {
  res.json(await AddOn.find({ isActive: true }).sort('type price').select('name type description price'));
});

router.get('/store-info', async (_req, res) => {
  res.json((await StoreInfo.findOne()) || {});
});

/*
 GET /api/products
   q, category, brand, inverter=true|false, btu, energy (min stars),
   minPrice, maxPrice, rating (min avg stars), minReviews,
   sort=price_asc|price_desc|rating|newest|name, page, limit
 Returns { products, page, pages, total }
*/
router.get('/products', async (req, res) => {
  try {
    const { q, category, brand, inverter, sort } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 1), 48);

    const where = { isDeleted: false };
    if (category && mongoose.isValidObjectId(category)) where.category = category;
    if (brand && mongoose.isValidObjectId(brand)) where.brand = brand;
    if (inverter === 'true' || inverter === 'false') where['specs.isInverter'] = inverter === 'true';

    const btu = num(req.query.btu);
    if (btu !== null) where['specs.capacityBTU'] = btu;

    // energyRating is stored as a string ('1'..'5'); match "N stars or more"
    const energy = num(req.query.energy);
    if (energy !== null && energy >= 1 && energy <= 5)
      where['specs.energyRating'] = { $in: ['1', '2', '3', '4', '5'].filter((s) => Number(s) >= energy) };

    const minPrice = num(req.query.minPrice);
    const maxPrice = num(req.query.maxPrice);
    if (minPrice !== null || maxPrice !== null) {
      where.price = {};
      if (minPrice !== null) where.price.$gte = minPrice;
      if (maxPrice !== null) where.price.$lte = maxPrice;
    }

    const rating = num(req.query.rating);
    if (rating !== null) where.averageRating = { $gte: rating };
    const minReviews = num(req.query.minReviews);
    if (minReviews !== null) where.numReviews = { $gte: minReviews };

    if (q) {
      const re = new RegExp(escapeRegex(q), 'i');
      where.$or = [{ name: re }, { modelNumber: re }];
    }

    // "_id" tiebreaker keeps page boundaries stable
    const sortBy = `${SORTS[sort] || SORTS.price_asc} _id`;

    const total = await Product.countDocuments(where);
    const products = await Product.find(where)
      .populate('brand', 'name')
      .populate('category', 'name')
      .sort(sortBy)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const stock = await Inventory.find({ product: { $in: products.map((p) => p._id) } }).lean();
    const byProduct = Object.fromEntries(stock.map((s) => [String(s.product), s]));

    res.json({
      page,
      pages: Math.max(Math.ceil(total / limit), 1),
      total,
      products: products.map((p) => {
        const inv = byProduct[String(p._id)];
        const online = inv ? inv.onlineStock : 0;
        return {
          _id: p._id,
          name: p.name,
          modelNumber: p.modelNumber,
          brand: p.brand?.name,
          category: p.category?.name,
          price: p.price,
          specs: p.specs || {},
          image: p.images?.[0]?.url || null,
          recommendedRoomSize: p.recommendedRoomSize || null,
          averageRating: p.averageRating || 0,
          numReviews: p.numReviews || 0,
          onlineStock: online,
          available: p.isAvailable && online > 0, // unavailable products cannot be purchased
        };
      }),
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/products/:id  - full detail for the product page
router.get('/products/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Product not found' });
    const p = await Product.findOne({ _id: req.params.id, isDeleted: false })
      .populate('brand', 'name')
      .populate('category', 'name')
      .lean();
    if (!p) return res.status(404).json({ message: 'Product not found' });

    const inv = await Inventory.findOne({ product: p._id }).lean();
    const online = inv ? inv.onlineStock : 0;
    res.json({
      _id: p._id,
      name: p.name,
      modelNumber: p.modelNumber,
      description: p.description,
      brand: p.brand?.name,
      category: p.category?.name,
      price: p.price,
      specs: p.specs || {},
      images: (p.images || []).map((i) => i.url),
      recommendedRoomSize: p.recommendedRoomSize || null,
      averageRating: p.averageRating || 0,
      numReviews: p.numReviews || 0,
      onlineStock: online,
      available: p.isAvailable && online > 0,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;