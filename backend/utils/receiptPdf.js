const PDFDocument = require('pdfkit');
const { orderLineSubtotal } = require('./pricing');

// Built-in PDF fonts cannot render the peso sign, so the receipt uses "PHP".
const money = (n) =>
  'PHP ' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
const label = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const PAYMENT = {
  card: 'Credit / debit card', ewallet: 'E-wallet', bank_transfer: 'Bank transfer',
  cod: 'Cash on delivery / pickup', installment: 'Installment',
};

const COLORS = { brand: '#0b5fff', text: '#1b2438', muted: '#667085', line: '#e4e8f0', band: '#f3f6fc' };

// Resolves to a Buffer so it can be attached to an email
function buildReceiptPdf(order, customer) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Receipt ${order.orderNumber}`, Author: 'Astron' } });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = 50;
    const right = doc.page.width - 50;
    const width = right - left;
    const col = { item: left, qty: 285, price: 330, sub: 425 }; // x positions
    const bottomLimit = () => doc.page.height - 80;

    // ---- header ----
    doc.fillColor(COLORS.brand).font('Helvetica-Bold').fontSize(22).text('Astron Air Conditioners', left, 50);
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(10).text('Official order receipt', left, 78);
    doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(11)
      .text(order.orderNumber, left, 50, { width, align: 'right' });
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted)
      .text(`Issued ${fmtDate(new Date())}`, left, 66, { width, align: 'right' })
      .text(`Status: ${label(order.status)}`, left, 80, { width, align: 'right' });
    doc.moveTo(left, 104).lineTo(right, 104).strokeColor(COLORS.line).stroke();

    // ---- customer / delivery / payment blocks ----
    let y = 118;
    const block = (title, lines, x, w) => {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.muted).text(title.toUpperCase(), x, y, { width: w });
      doc.font('Helvetica').fontSize(10).fillColor(COLORS.text).text(lines.filter(Boolean).join('\n'), x, y + 14, { width: w });
    };
    const a = order.shippingAddress || {};
    block('Billed to', [customer.name, customer.email], left, 160);
    block(
      order.fulfillment === 'pickup' ? 'Pickup' : 'Delivery address',
      order.fulfillment === 'pickup'
        ? ['Astron showroom']
        : [a.recipient, a.phone, [a.street, a.barangay].filter(Boolean).join(', '), [a.city, a.province, a.postalCode].filter(Boolean).join(', ')],
      225, 190
    );
    block(
      'Payment',
      [PAYMENT[order.payment?.method] || order.payment?.method, `Status: ${label(order.payment?.status)}`, `Ordered ${fmtDate(order.createdAt)}`],
      425, 120
    );
    y = 200;

    // ---- items table ----
    const header = () => {
      doc.rect(left, y, width, 22).fill(COLORS.band);
      doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(9);
      doc.text('ITEM', col.item + 8, y + 7);
      doc.text('QTY', col.qty, y + 7, { width: 40, align: 'center' });
      doc.text('UNIT PRICE', col.price, y + 7, { width: 90, align: 'right' });
      doc.text('SUBTOTAL', col.sub, y + 7, { width: right - col.sub - 8, align: 'right' });
      y += 28;
    };
    header();

    for (const it of order.items) {
      const addOnLines = (it.addOns || []).map((x) => `+ ${x.name} (${money(x.price)} each)`);
      const rowHeight = 16 + addOnLines.length * 12 + 8;
      if (y + rowHeight > bottomLimit()) {
        doc.addPage();
        y = 50;
        header();
      }
      doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(10)
        .text(it.name, col.item + 8, y, { width: col.qty - col.item - 16 });
      doc.font('Helvetica').fontSize(10)
        .text(String(it.quantity), col.qty, y, { width: 40, align: 'center' })
        .text(money(it.price), col.price, y, { width: 90, align: 'right' })
        .text(money(orderLineSubtotal(it)), col.sub, y, { width: right - col.sub - 8, align: 'right' });
      let ly = y + 14;
      doc.fontSize(8.5).fillColor(COLORS.muted);
      addOnLines.forEach((t) => {
        doc.text(t, col.item + 16, ly, { width: col.qty - col.item - 24 });
        ly += 12;
      });
      y = ly + 6;
      doc.moveTo(left, y - 3).lineTo(right, y - 3).strokeColor(COLORS.line).stroke();
    }

    // ---- totals ----
    const rows = [
      ['Items', order.itemsTotal],
      order.addOnsTotal ? ['Add-ons', order.addOnsTotal] : null,
      order.installationFee ? ['Installation', order.installationFee] : null,
      ['Delivery', order.deliveryFee],
      order.discount ? ['Discount', -order.discount] : null,
    ].filter(Boolean);

    if (y + rows.length * 16 + 50 > bottomLimit()) {
      doc.addPage();
      y = 50;
    }
    y += 8;
    rows.forEach(([name, value]) => {
      doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted).text(name, 330, y, { width: 90, align: 'right' });
      doc.fillColor(COLORS.text).text(value < 0 ? `-${money(-value)}` : money(value), col.sub, y, { width: right - col.sub - 8, align: 'right' });
      y += 16;
    });
    y += 4;
    doc.rect(330, y, right - 330, 28).fill(COLORS.brand);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(12)
      .text('GRAND TOTAL', 342, y + 8, { lineBreak: false })
      .text(money(order.grandTotal), col.sub, y + 8, { width: right - col.sub - 8, align: 'right' });
    y += 48;

    if (order.installation?.requested) {
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9)
        .text(`Installation requested for ${fmtDate(order.installation.preferredDate).split(',').slice(0, 2).join(',')}. Our team will confirm the schedule.`, left, y, { width });
    }

    // ---- footer ----
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8)
      .text('Thank you for shopping with Astron. This receipt was generated automatically and is valid without a signature.',
        left, doc.page.height - 60, { width, align: 'center', lineBreak: false });
    doc.end();
  });
}

module.exports = { buildReceiptPdf };