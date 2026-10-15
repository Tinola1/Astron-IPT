const router = require('express').Router();
const mongoose = require('mongoose');
const { Order, Inventory, Promotion, Installation, User } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const { getCartContext } = require('../utils/cartHelpers');
const { computeTotals } = require('../utils/pricing');
const { sendOrderConfirmation } = require('../utils/orderEmail');
const { asyncHandler: h, httpError } = require('../utils/http');

router.use(protect, authorize('customer'));

const PAYMENT_METHODS = ['card', 'ewallet', 'bank_transfer', 'cod', 'installment'];
const ADDRESS_FIELDS = ['recipient', 'phone', 'street', 'barangay', 'city', 'province', 'postalCode'];
const PH_PHONE = /^(\+?63|0)?9\d{9}$/;
const CANCELLABLE = ['pending', 'processing']; // before delivery

const publicTotals = (t) => ({
  itemsTotal: t.itemsTotal,
  addOnsTotal: t.addOnsTotal,
  installationFee: t.installationFee,
  deliveryFee: t.deliveryFee,
  deliveryPending: t.deliveryPending,
  deliveryZone: t.deliveryZone,
  discount: t.discount,
  promoError: t.promoError,
  grandTotal: t.grandTotal,
});

// POST /api/orders/quote  { fulfillment, city, province, promoCode }
router.post('/quote', h(async (req, res) => {
  const { cart } = await getCartContext(req.user._id);
  if (!cart.items.length) throw httpError(400, 'Your cart is empty');
  const { fulfillment, city, province, promoCode } = req.body;
  res.json(publicTotals(await computeTotals(cart.items, { fulfillment, city, province, promoCode })));
}));

// POST /api/orders  - place an order from the current cart
router.post('/', h(async (req, res) => {
  const { fulfillment = 'delivery', shippingAddress = {}, installationDate, paymentMethod, promoCode, saveAddress } = req.body;
  if (!['delivery', 'pickup'].includes(fulfillment)) throw httpError(400, 'Invalid fulfillment option');
  if (!PAYMENT_METHODS.includes(paymentMethod)) throw httpError(400, 'Select a valid payment method');

  const { cart, view } = await getCartContext(req.user._id);
  if (!cart.items.length) throw httpError(400, 'Your cart is empty');
  const bad = view.items.find((i) => i.issue);
  if (bad) throw httpError(409, `${bad.product.name}: ${bad.issue}`);

  const needsInstall = view.hasInstallation;
  if (needsInstall && fulfillment !== 'delivery')
    throw httpError(400, 'Installation requires delivery to your address');

  const address = {};
  if (fulfillment === 'delivery') {
    ADDRESS_FIELDS.forEach((f) => (address[f] = String(shippingAddress[f] || '').trim()));
    for (const f of ['recipient', 'street', 'city', 'province'])
      if (!address[f]) throw httpError(400, `Delivery address: ${f} is required`);
    if (!PH_PHONE.test(address.phone)) throw httpError(400, 'Enter a valid PH mobile number');
  }

  let preferredDate;
  if (needsInstall) {
    preferredDate = new Date(installationDate);
    const endToday = new Date();
    endToday.setHours(23, 59, 59, 999);
    if (Number.isNaN(preferredDate.getTime()) || preferredDate <= endToday)
      throw httpError(400, 'Choose an installation date from tomorrow onward');
  }

  const totals = await computeTotals(cart.items, {
    fulfillment, city: address.city, province: address.province, promoCode,
  });
  if (totals.promoError) throw httpError(400, totals.promoError);

  // --- deduct stock atomically, roll back on any failure ---
  const deducted = [];
  let promoUsed = null;
  let order;
  try {
    for (const it of cart.items) {
      const r = await Inventory.findOneAndUpdate(
        { product: it.product._id, onlineStock: { $gte: it.quantity } },
        { $inc: { onlineStock: -it.quantity } }
      );
      if (!r) throw httpError(409, `${it.product.name} is no longer available in the requested quantity`);
      deducted.push({ product: it.product._id, qty: it.quantity });
    }
    if (totals.promo) {
      await Promotion.updateOne({ _id: totals.promo._id }, { $inc: { usedCount: 1 } });
      promoUsed = totals.promo._id;
    }

    order = await Order.create({
      user: req.user._id,
      items: cart.items.map((it) => ({
        product: it.product._id,
        name: it.product.name,
        modelNumber: it.product.modelNumber,
        price: it.product.price,
        quantity: it.quantity,
        addOns: it.addOns.map((a) => ({ addOn: a._id, name: a.name, price: a.price })),
      })),
      fulfillment,
      shippingAddress: address,
      installation: { requested: needsInstall, preferredDate },
      payment: { method: paymentMethod, status: 'pending' },
      promotion: promoUsed || undefined,
      itemsTotal: totals.itemsTotal,
      addOnsTotal: totals.addOnsTotal,
      installationFee: totals.installationFee,
      deliveryFee: totals.deliveryFee,
      discount: totals.discount,
      grandTotal: totals.grandTotal,
      statusHistory: [{ status: 'pending', note: 'Order placed', changedBy: req.user._id }],
    });
  } catch (e) {
    await Promise.all(deducted.map((d) => Inventory.updateOne({ product: d.product }, { $inc: { onlineStock: d.qty } })));
    if (promoUsed) await Promotion.updateOne({ _id: promoUsed }, { $inc: { usedCount: -1 } });
    throw e;
  }

  // --- after the order exists: clear cart, installation job, saved address, email ---
  cart.items = [];
  await cart.save();

  if (needsInstall) {
    await Installation.create({
      order: order._id,
      customer: req.user._id,
      scheduledDate: preferredDate,
      address: { street: address.street, barangay: address.barangay, city: address.city, province: address.province, postalCode: address.postalCode },
      status: 'pending',
    });
  }
  if (saveAddress && fulfillment === 'delivery') {
    const exists = req.user.addresses.some((a) => a.street === address.street && a.city === address.city);
    if (!exists)
      await User.updateOne(
        { _id: req.user._id },
        { $push: { addresses: { ...address, isDefault: req.user.addresses.length === 0 } } }
      );
  }

  // best effort: a mail failure must not fail the order
  sendOrderConfirmation(order, req.user).catch((err) => console.error('Order email failed:', err.message));

  res.status(201).json(order);
}));

// GET /api/orders  - my order history
router.get('/', h(async (req, res) => {
  res.json(await Order.find({ user: req.user._id }).sort('-createdAt').limit(100));
}));

// GET /api/orders/:id
router.get('/:id', h(async (req, res) => {
  const order = mongoose.isValidObjectId(req.params.id)
    ? await Order.findOne({ _id: req.params.id, user: req.user._id })
    : null;
  if (!order) throw httpError(404, 'Order not found');
  res.json(order);
}));

// PUT /api/orders/:id/cancel  { reason }
router.put('/:id/cancel', h(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(404, 'Order not found');
  const reason = String(req.body.reason || '').trim().slice(0, 300);

  // atomic: only flips if it is still cancellable
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id, status: { $in: CANCELLABLE } },
    {
      $set: { status: 'cancelled', cancelledAt: new Date(), cancelReason: reason },
      $push: { statusHistory: { status: 'cancelled', note: reason || 'Cancelled by customer', changedBy: req.user._id } },
    },
    { new: true }
  );
  if (!order) throw httpError(400, 'This order can no longer be cancelled');

  await Promise.all(order.items.map((it) => Inventory.updateOne({ product: it.product }, { $inc: { onlineStock: it.quantity } })));
  await Installation.updateMany({ order: order._id }, { status: 'cancelled' });
  if (order.promotion) await Promotion.updateOne({ _id: order.promotion }, { $inc: { usedCount: -1 } });
  if (order.payment.status === 'paid') {
    order.payment.status = 'refunded';
    await order.save();
  }
  res.json(order);
}));

module.exports = router;