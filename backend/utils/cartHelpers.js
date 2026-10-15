const { Cart, Inventory } = require('../models');
const { priceLines } = require('./pricing');

async function loadCart(userId) {
  const cart = await Cart.findOne({ user: userId })
    .populate({ path: 'items.product', select: 'name modelNumber price images isAvailable isDeleted' })
    .populate({ path: 'items.addOns', match: { isActive: true } });
  if (!cart) return Cart.create({ user: userId, items: [] });

  // drop lines whose product was deleted
  const stale = cart.items.filter((i) => !i.product || i.product.isDeleted);
  if (stale.length) {
    stale.forEach((i) => cart.items.pull(i._id));
    await cart.save();
  }
  return cart;
}

// Returns the populated cart plus a client-friendly "view" with totals and stock issues
async function getCartContext(userId) {
  const cart = await loadCart(userId);
  const inv = await Inventory.find({ product: { $in: cart.items.map((i) => i.product._id) } }).lean();
  const stockMap = Object.fromEntries(inv.map((s) => [String(s.product), s.onlineStock]));
  const priced = priceLines(cart.items);

  const items = cart.items.map((it, idx) => {
    const stock = stockMap[String(it.product._id)] || 0;
    let issue = null;
    if (!it.product.isAvailable || stock < 1) issue = 'Currently unavailable';
    else if (it.quantity > stock) issue = `Only ${stock} in stock`;
    return {
      _id: it._id,
      product: {
        _id: it.product._id,
        name: it.product.name,
        modelNumber: it.product.modelNumber,
        price: it.product.price,
        image: it.product.images?.[0]?.url || null,
        stock,
      },
      quantity: it.quantity,
      addOns: it.addOns.map((a) => ({ _id: a._id, name: a.name, type: a.type, price: a.price })),
      lineTotal: priced.lines[idx].lineTotal,
      issue,
    };
  });

  const view = {
    items,
    count: items.reduce((s, i) => s + i.quantity, 0),
    itemsTotal: priced.itemsTotal,
    addOnsTotal: priced.addOnsTotal,
    installationFee: priced.installationFee,
    subtotal: priced.itemsTotal + priced.addOnsTotal + priced.installationFee,
    hasInstallation: cart.items.some((i) => i.addOns.some((a) => a.type === 'installation')),
    hasIssues: items.some((i) => i.issue),
  };
  return { cart, stockMap, view };
}

module.exports = { getCartContext };