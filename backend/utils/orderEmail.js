const sendEmail = require('./sendEmail');
const { orderLineSubtotal } = require('./pricing');

const peso = (n) =>
  '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Itemized HTML: products/add-ons, line subtotals, grand total
function orderEmailHtml(order, intro) {
  const rows = order.items
    .map((it) => {
      const addOns = (it.addOns || []).map((a) => `${esc(a.name)} (+${peso(a.price)})`).join(', ');
      return `<tr>
        <td style="padding:6px;border-bottom:1px solid #eee">${esc(it.name)}
          ${addOns ? `<br><small style="color:#666">Add-ons: ${addOns}</small>` : ''}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:center">${it.quantity}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:right">${peso(it.price)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:right">${peso(orderLineSubtotal(it))}</td>
      </tr>`;
    })
    .join('');

  const totalRow = (label, value, bold) =>
    `<tr><td colspan="3" style="padding:4px 6px;text-align:right;${bold ? 'font-weight:bold' : ''}">${label}</td>
     <td style="padding:4px 6px;text-align:right;${bold ? 'font-weight:bold' : ''}">${value}</td></tr>`;

  return `<div style="font-family:Arial,sans-serif;max-width:640px">
    <h2>Astron Air Conditioners</h2>
    <p>${intro}</p>
    <p><b>Order:</b> ${esc(order.orderNumber)}<br><b>Status:</b> ${esc(order.status.replace(/_/g, ' '))}</p>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#f3f6fc">
        <th style="padding:6px;text-align:left">Item</th><th style="padding:6px">Qty</th>
        <th style="padding:6px;text-align:right">Price</th><th style="padding:6px;text-align:right">Subtotal</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        ${totalRow('Items', peso(order.itemsTotal))}
        ${order.addOnsTotal ? totalRow('Add-ons', peso(order.addOnsTotal)) : ''}
        ${order.installationFee ? totalRow('Installation', peso(order.installationFee)) : ''}
        ${totalRow('Delivery', peso(order.deliveryFee))}
        ${order.discount ? totalRow('Discount', '-' + peso(order.discount)) : ''}
        ${totalRow('Grand total', peso(order.grandTotal), true)}
      </tfoot>
    </table></div>`;
}

const sendOrderConfirmation = (order, user) =>
  sendEmail({
    to: user.email,
    subject: `Astron order confirmation ${order.orderNumber}`,
    html: orderEmailHtml(order, `Thanks for your order, ${esc(user.name)}! Here are your order details.`),
  });

module.exports = { orderEmailHtml, sendOrderConfirmation, peso };