const express     = require('express');
const router      = express.Router();
const prisma      = require('../lib/prisma');
const PDFDocument = require('pdfkit');

// ── Auto bill number ─────────────────────────────────────────────────────────
async function nextBillNumber() {
  const d      = new Date();
  const prefix = `LTC-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-`;
  const last   = await prisma.bill.findFirst({ where: { billNumber: { startsWith: prefix } }, orderBy: { billNumber: 'desc' } });
  const seq    = last ? String(parseInt(last.billNumber.split('-')[2]) + 1).padStart(4,'0') : '0001';
  return `${prefix}${seq}`;
}

// ── Number to Indian words ───────────────────────────────────────────────────
function numberToWords(n) {
  const num = Math.round(n);
  if (num === 0) return 'Zero';
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  function below100(n) {
    if (n < 20) return ones[n];
    return tens[Math.floor(n/10)] + (n%10 ? ' ' + ones[n%10] : '');
  }
  function below1000(n) {
    if (n < 100) return below100(n);
    return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + below100(n%100) : '');
  }
  let result = '';
  if (num >= 10000000) { result += below1000(Math.floor(num/10000000)) + ' Crore '; n = num % 10000000; } else { n = num; }
  if (n >= 100000)     { result += below1000(Math.floor(n/100000))     + ' Lakh ';  n = n % 100000; }
  if (n >= 1000)       { result += below1000(Math.floor(n/1000))       + ' Thousand '; n = n % 1000; }
  if (n > 0)           { result += below1000(n); }
  return result.trim() + ' Rupees Only';
}

// ── Company info from env ────────────────────────────────────────────────────
const CO = {
  name:    process.env.COMPANY_NAME    || 'Lally Trading Company',
  tagline: process.env.COMPANY_TAGLINE || 'LTC Pumps',
  address: process.env.COMPANY_ADDRESS || 'Punjab, India',
  phone:   process.env.COMPANY_PHONE   || '+91 98765 43210',
  gstin:   process.env.COMPANY_GSTIN   || '03XXXXX1234X1Z5',
  email:   process.env.COMPANY_EMAIL   || 'ltcpumps@email.com',
};

// ── PDF generation ───────────────────────────────────────────────────────────
function generateInvoicePDF(bill, res) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${bill.billNumber}.pdf"`);
  doc.pipe(res);

  const W    = doc.page.width - 80;  // usable width
  const L    = 40;                    // left margin
  const GOLD = '#C9A227';
  const DARK = '#0A1628';
  const GREY = '#6b7280';

  // ── Header bar ─────────────────────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 90).fill(DARK);

  doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(22)
     .text(CO.name, L, 18);
  doc.fillColor('#cbd5e1').font('Helvetica').fontSize(10)
     .text(CO.tagline, L, 44)
     .text(`${CO.address}  |  ${CO.phone}  |  ${CO.email}`, L, 57)
     .text(`GSTIN: ${CO.gstin}`, L, 70);

  // ── TAX INVOICE banner ─────────────────────────────────────────────────────
  doc.rect(0, 90, doc.page.width, 28).fill(GOLD);
  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(13)
     .text('TAX INVOICE', 0, 98, { align: 'center', width: doc.page.width });

  // ── Bill info ──────────────────────────────────────────────────────────────
  const infoY = 130;
  // Left: Bill To
  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9)
     .text('BILL TO:', L, infoY);
  doc.fillColor('#111827').font('Helvetica').fontSize(10)
     .text(bill.customerName    || '—',  L, infoY + 13)
     .text(bill.customerPhone   || '',   L, infoY + 26)
     .text(bill.customerAddress || '',   L, infoY + 39, { width: 220 });

  // Right: Bill details
  const rx = L + W - 180;
  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9)
     .text('INVOICE DETAILS:', rx, infoY);
  doc.fillColor(GREY).font('Helvetica').fontSize(9)
     .text('Invoice No:', rx, infoY + 14)
     .text('Date:', rx, infoY + 27);
  doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9)
     .text(bill.billNumber, rx + 65, infoY + 14)
     .text(new Date(bill.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }), rx + 65, infoY + 27);

  // Divider
  const divY = infoY + 65;
  doc.moveTo(L, divY).lineTo(L + W, divY).strokeColor('#e5e7eb').lineWidth(1).stroke();

  // ── Items table ─────────────────────────────────────────────────────────────
  const tableY  = divY + 10;
  // Column layout: #(25) | Description(flexible) | HSN(65) | Qty(40) | Rate(75) | Amount(75)
  const cols = {
    num:   { x: L,         w: 25  },
    desc:  { x: L+25,      w: 195 },
    hsn:   { x: L+220,     w: 65  },
    qty:   { x: L+285,     w: 40  },
    rate:  { x: L+325,     w: 80  },
    amt:   { x: L+405,     w: 75  },
  };

  // Table header row
  doc.rect(L, tableY, W, 22).fill(DARK);
  const thY = tableY + 6;
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(8);
  doc.text('#',           cols.num.x,  thY, { width: cols.num.w,  align: 'center' });
  doc.text('Description', cols.desc.x, thY, { width: cols.desc.w });
  doc.text('HSN',         cols.hsn.x,  thY, { width: cols.hsn.w,  align: 'center' });
  doc.text('Qty',         cols.qty.x,  thY, { width: cols.qty.w,  align: 'center' });
  doc.text('Unit Price',  cols.rate.x, thY, { width: cols.rate.w, align: 'right' });
  doc.text('Amount',      cols.amt.x,  thY, { width: cols.amt.w,  align: 'right' });

  // Data rows
  const items = Array.isArray(bill.items) ? bill.items : [];
  let rowY = tableY + 22;

  items.forEach((item, idx) => {
    const rowH  = 22;
    const bg    = idx % 2 === 0 ? '#f9fafb' : '#ffffff';
    const uprice = parseFloat(item.unitPrice) || 0;
    const qty    = parseInt(item.qty)         || 0;
    const amt    = uprice * qty;

    doc.rect(L, rowY, W, rowH).fill(bg);
    doc.fillColor('#111827').font('Helvetica').fontSize(9);
    doc.text(String(idx+1),                  cols.num.x,  rowY+6, { width: cols.num.w,  align: 'center' });
    doc.text(item.name || '',                cols.desc.x, rowY+6, { width: cols.desc.w });
    doc.text(item.hsnCode || '—',           cols.hsn.x,  rowY+6, { width: cols.hsn.w,  align: 'center' });
    doc.text(String(qty),                    cols.qty.x,  rowY+6, { width: cols.qty.w,  align: 'center' });
    doc.text(`₹${uprice.toLocaleString('en-IN')}`, cols.rate.x, rowY+6, { width: cols.rate.w, align: 'right' });
    doc.text(`₹${amt.toLocaleString('en-IN')}`,    cols.amt.x,  rowY+6, { width: cols.amt.w,  align: 'right' });
    rowY += rowH;
  });

  // Table border
  doc.rect(L, tableY, W, rowY - tableY).strokeColor('#e5e7eb').lineWidth(0.5).stroke();

  // ── Totals ──────────────────────────────────────────────────────────────────
  rowY += 8;
  const totX  = L + W - 200;
  const totW1 = 120, totW2 = 80;

  function totRow(label, value, bold = false, color = '#374151') {
    doc.fillColor(GREY).font('Helvetica').fontSize(9)
       .text(label, totX, rowY, { width: totW1, align: 'right' });
    doc.fillColor(color).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 10 : 9)
       .text(`₹${parseFloat(value).toLocaleString('en-IN')}`, totX + totW1, rowY, { width: totW2, align: 'right' });
    rowY += 16;
  }

  totRow('Subtotal:', bill.subtotal);
  if (bill.discount > 0) totRow('Discount:', bill.discount, false, '#dc2626');
  doc.moveTo(totX, rowY).lineTo(totX + totW1 + totW2, rowY).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
  rowY += 4;
  totRow('Grand Total:', bill.total, true, DARK);

  // Amount in words
  rowY += 8;
  doc.rect(L, rowY, W, 22).fill('#f0f2f5');
  doc.fillColor(GREY).font('Helvetica').fontSize(8)
     .text('Amount in words:', L + 6, rowY + 7);
  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(8)
     .text(numberToWords(bill.total), L + 90, rowY + 7, { width: W - 96 });
  rowY += 22;

  // Notes
  if (bill.notes) {
    rowY += 8;
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9).text('Notes:', L, rowY);
    doc.fillColor(GREY).font('Helvetica').fontSize(9).text(bill.notes, L + 40, rowY, { width: W - 40 });
    rowY += 20;
  }

  // ── Footer ──────────────────────────────────────────────────────────────────
  const footY = doc.page.height - 70;
  doc.rect(0, footY, doc.page.width, 70).fill('#f8f9fa');
  doc.moveTo(0, footY).lineTo(doc.page.width, footY).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
  doc.fillColor(GREY).font('Helvetica').fontSize(8)
     .text('Terms & Conditions:', L, footY + 10, { underline: true })
     .text('• Goods once sold will not be taken back or exchanged.', L, footY + 22)
     .text('• Payment due on delivery unless agreed otherwise.', L, footY + 34)
     .text('• Subject to local jurisdiction.', L, footY + 46);
  doc.fillColor('#9ca3af').font('Helvetica').fontSize(7)
     .text(`This is a computer-generated invoice — ${CO.name}`, 0, footY + 56, { align: 'center', width: doc.page.width });

  doc.end();
}

// ── ROUTES ───────────────────────────────────────────────────────────────────

// GET /api/bills
router.get('/', async (req, res) => {
  try {
    const bills = await prisma.bill.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(bills.map(b => ({ ...b, _id: b.id })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/bills/export
router.get('/export', async (req, res) => {
  try {
    const XLSX  = require('xlsx');
    const bills = await prisma.bill.findMany({ orderBy: { createdAt: 'desc' } });

    const rows = bills.map(b => ({
      'Bill No':  b.billNumber,
      'Date':     new Date(b.createdAt).toLocaleDateString('en-IN'),
      'Customer': b.customerName    || '',
      'Phone':    b.customerPhone   || '',
      'Address':  b.customerAddress || '',
      'Items':    Array.isArray(b.items) ? b.items.map(i => `${i.name} x${i.qty}`).join('; ') : '',
      'Subtotal': b.subtotal,
      'Discount': b.discount,
      'Total':    b.total,
      'Notes':    b.notes || '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [12, 20, 20, 14, 20, 40, 12, 10, 12, 20].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, 'Bills');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="LTC-Bills.xlsx"');
    res.send(buf);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/bills/:id
router.get('/:id', async (req, res) => {
  try {
    const bill = await prisma.bill.findUnique({ where: { id: req.params.id } });
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json({ ...bill, _id: bill.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/bills
router.post('/', async (req, res) => {
  try {
    const { customerName, customerPhone, customerAddress, items, discount, notes } = req.body;
    if (!items || items.length === 0)
      return res.status(400).json({ error: 'At least one item is required' });

    const disc     = parseFloat(discount) || 0;
    const subtotal = items.reduce((s, i) => s + (parseFloat(i.unitPrice)||0) * (parseInt(i.qty)||0), 0);
    const total    = Math.max(0, subtotal - disc);
    const billNum  = await nextBillNumber();

    const bill = await prisma.bill.create({
      data: { billNumber: billNum, customerName: customerName||'', customerPhone: customerPhone||'',
              customerAddress: customerAddress||'', items, subtotal, discount: disc, total, notes: notes||'' },
    });

    // Auto-deduct stock
    for (const item of items) {
      if (!item.productId) continue;
      try {
        const p = await prisma.product.findUnique({ where: { id: item.productId } });
        if (p && p.stock > 0) {
          const deduct = Math.min(parseInt(item.qty)||0, p.stock);
          if (deduct > 0) await prisma.$transaction([
            prisma.product.update({ where: { id: item.productId }, data: { stock: { decrement: deduct } } }),
            prisma.inventoryLog.create({ data: { productId: item.productId, type: 'OUT', quantity: deduct, note: `Bill ${billNum}` } }),
          ]);
        }
      } catch (_) {}
    }

    res.status(201).json({ ...bill, _id: bill.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/bills/:id/pdf
router.get('/:id/pdf', async (req, res) => {
  try {
    const bill = await prisma.bill.findUnique({ where: { id: req.params.id } });
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    generateInvoicePDF(bill, res);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/bills/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.bill.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;
