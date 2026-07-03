// src/services/pdfService.ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import type { Invoice, Shop } from '../types';
import { CURRENCY_SYMBOL } from '../constants';
import i18n from './i18n';

// ─── Amount in Words (English) ──────────────────────────────────────────────────

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const convertHundredsEn = (n: number): string => {
  if (n === 0) return '';
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
  return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertHundredsEn(n % 100) : '');
};

const amountToWordsEn = (amount: number): string => {
  const rounded = Math.round(amount);
  if (rounded === 0) return 'Zero Rupees Only';

  const crore = Math.floor(rounded / 10000000);
  const lakh = Math.floor((rounded % 10000000) / 100000);
  const thousand = Math.floor((rounded % 100000) / 1000);
  const rest = rounded % 1000;

  let result = '';
  if (crore > 0) result += convertHundredsEn(crore) + ' Crore ';
  if (lakh > 0) result += convertHundredsEn(lakh) + ' Lakh ';
  if (thousand > 0) result += convertHundredsEn(thousand) + ' Thousand ';
  if (rest > 0) result += convertHundredsEn(rest);

  return result.trim() + ' Rupees Only';
};

// ─── Amount in Words (Gujarati) ────────────────────────────────────────────────

const guNumbers = [
  '', 'એક', 'બે', 'ત્રણ', 'ચાર', 'પાંચ', 'છ', 'સાત', 'આઠ', 'નવ', 'દસ',
  'અગિયાર', 'બાર', 'તેર', 'ચૌદ', 'પંદર', 'સોળ', 'સત્તર', 'અઢાર', 'ઓગણીસ', 'વીસ',
  'એકવીસ', 'બાવીસ', 'તેવીસ', 'ચોવીસ', 'પંચીસ', 'છવ્વીસ', 'સત્તાવીસ', 'અઠ્ઠાવીસ', 'ઓગણત્રીસ', 'ત્રીસ',
  'એકત્રીસ', 'બત્રીસ', 'તેત્રીસ', 'ચોત્રીસ', 'પાંત્રીસ', 'છત્રીસ', 'સાડત્રીસ', 'આડત્રીસ', 'ઓગણચાળીસ', 'ચાળીસ',
  'એકતાલીસ', 'બેતાલીસ', 'તેતાલીસ', 'ચોમાલીસ', 'પિસ્તાલીસ', 'છેતાલીસ', 'સુડતાલીસ', 'અડતાલીસ', 'ઓગણપચાસ', 'પચાસ',
  'એકાવન', 'બાવન', 'ત્રેપન', 'ચોપન', 'પંચાવન', 'છપ્પન', 'સત્તાવન', 'અઠ્ઠાવન', 'ઓગણસાઈઠ', 'સાઈઠ',
  'એકસઠ', 'બાસઠ', 'ત્રેસઠ', 'ચોસઠ', 'પંચસઠ', 'છાસઠ', 'સડસઠ', 'અડસઠ', 'ઓગણસિત્તેર', 'સિત્તેર',
  'એકોતેર', 'બોતેર', 'તોતેર', 'ચોંતેર', 'પંચોતેર', 'છોતેર', 'સિત્તોતેર', 'ઇઠ્ઠોતેર', 'ઓગણએંસી', 'એંસી',
  'એક્યાસી', 'બ્યાસી', 'ત્યાસી', 'ચોર્યાસી', 'પંચાસી', 'છ્યાસી', 'સત્યાસી', 'અઠ્યાસી', 'ઓગણનેવું', 'নেવું',
  'એકણું', 'બાણું', 'ત્રાણું', 'ચોરાણું', 'પંચાણું', 'છન્નું', 'સત્તાણું', 'અઠ્ઠાણું', 'નવ્વાણું'
];

const convertHundredsGu = (n: number): string => {
  if (n === 0) return '';
  if (n < 100) return guNumbers[n];
  const hundredDigit = Math.floor(n / 100);
  const remainder = n % 100;
  return guNumbers[hundredDigit] + ' સો' + (remainder !== 0 ? ' ' + convertHundredsGu(remainder) : '');
};

const amountToWordsGu = (amount: number): string => {
  const rounded = Math.round(amount);
  if (rounded === 0) return 'શૂન્ય રૂપિયા પૂરા';

  const crore = Math.floor(rounded / 10000000);
  const lakh = Math.floor((rounded % 10000000) / 100000);
  const thousand = Math.floor((rounded % 100000) / 1000);
  const rest = rounded % 1000;

  let result = '';
  if (crore > 0) result += convertHundredsGu(crore) + ' કરોડ ';
  if (lakh > 0) result += convertHundredsGu(lakh) + ' લાખ ';
  if (thousand > 0) result += convertHundredsGu(thousand) + ' હજાર ';
  if (rest > 0) result += convertHundredsGu(rest);

  return result.trim() + ' રૂપિયા પૂરા';
};

export const amountToWords = (amount: number): string => {
  const lang = i18n.language || 'en';
  if (lang === 'gu') {
    return amountToWordsGu(amount);
  }
  return amountToWordsEn(amount);
};

// ─── Format helpers ────────────────────────────────────────────────────────────

const fmt = (n: number) => `${CURRENCY_SYMBOL}${n.toFixed(2)}`;
const fmtDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
};

// Determine document title based on invoice type
const getDocumentTitle = (invoice: Invoice): string => {
  const docType = (invoice as any).docType || 'invoice';
  switch (docType) {
    case 'estimate':   return 'ESTIMATE';
    case 'quotation':  return 'QUOTATION';
    case 'challan':    return 'DELIVERY CHALLAN';
    default:           return 'TAX INVOICE';
  }
};

// ─── Professional Print-Ready HTML Template ─────────────────────────────────────

const buildHTML = (invoice: Invoice, shop: Shop): string => {
  const docTitle = getDocumentTitle(invoice);

  const itemRows = invoice.items.map((item, idx) => `
    <tr>
      <td class="center">${idx + 1}</td>
      <td>
        <span class="item-name">${item.productName}</span>
        ${item.description ? `<br/><span class="item-desc">${item.description}</span>` : ''}
        ${item.altQuantity ? `<br/><span class="item-desc">${item.altQuantity} ${item.altUnit ?? ''}</span>` : ''}
      </td>
      <td class="center">${item.quantity}</td>
      <td class="center">${item.unit}</td>
      <td class="right">${item.rate.toFixed(2)}</td>
      <td class="right"><strong>${item.total.toFixed(2)}</strong></td>
    </tr>
  `).join('');

  const extraRows = [
    invoice.transport > 0    ? `<tr><td colspan="5">Transport Charges</td><td class="right">${invoice.transport.toFixed(2)}</td></tr>` : '',
    invoice.packing > 0      ? `<tr><td colspan="5">Packing Charges</td><td class="right">${invoice.packing.toFixed(2)}</td></tr>` : '',
    invoice.otherCharges > 0 ? `<tr><td colspan="5">Other Charges</td><td class="right">${invoice.otherCharges.toFixed(2)}</td></tr>` : '',
  ].filter(Boolean).join('');

  const totalPaid   = (invoice.paidAmount || 0) + (invoice.advancePaid || 0);
  const outstanding = invoice.pendingAmount || 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=210mm, initial-scale=1"/>
  <title>${docTitle} – ${invoice.invoiceNumber}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4 portrait; margin: 14mm 14mm 18mm 14mm; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 9pt;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page { width: 182mm; margin: 0 auto; }

    /* Document Title */
    .doc-title {
      text-align: center;
      font-size: 15pt;
      font-weight: bold;
      letter-spacing: 3px;
      text-transform: uppercase;
      border-top: 2px solid #000;
      border-bottom: 1px solid #000;
      padding: 5px 0;
      margin-bottom: 8px;
    }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
    .header-left { display: flex; align-items: flex-start; gap: 10px; }
    .logo { width: 52px; height: 52px; object-fit: contain; border: 1px solid #000; }
    .logo-placeholder {
      width: 52px; height: 52px; border: 1px solid #000;
      display: flex; align-items: center; justify-content: center;
      font-size: 20pt; font-weight: bold; color: #000; background: #f5f5f5; flex-shrink: 0;
    }
    .shop-name { font-size: 13pt; font-weight: bold; color: #000; line-height: 1.2; }
    .shop-detail { font-size: 8pt; color: #333; margin-top: 2px; line-height: 1.5; }
    .header-right { text-align: right; }
    .inv-meta-label { font-size: 7.5pt; color: #555; text-transform: uppercase; letter-spacing: 0.5px; }
    .inv-meta-value { font-size: 9.5pt; font-weight: bold; color: #000; margin-bottom: 4px; }

    /* Party Details */
    .parties { display: flex; border: 1px solid #000; margin-bottom: 8px; }
    .party-cell { flex: 1; padding: 7px 9px; }
    .party-cell + .party-cell { border-left: 1px solid #000; }
    .party-label {
      font-size: 7.5pt; font-weight: bold; text-transform: uppercase;
      letter-spacing: 0.8px; color: #333; margin-bottom: 4px;
      border-bottom: 1px solid #ccc; padding-bottom: 3px;
    }
    .party-name { font-size: 10.5pt; font-weight: bold; color: #000; }
    .party-detail { font-size: 8pt; color: #333; margin-top: 2px; line-height: 1.4; }

    /* Items Table */
    .items-wrapper { border: 1px solid #000; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
    thead th {
      background: #000; color: #fff; padding: 5px 6px;
      font-size: 8pt; font-weight: bold; text-transform: uppercase;
      letter-spacing: 0.3px; border: 1px solid #000;
    }
    tbody td { padding: 5px 6px; border: 1px solid #555; vertical-align: top; color: #000; }
    tbody tr:nth-child(even) td { background: #fafafa; }
    .center { text-align: center; }
    .right  { text-align: right; }
    .left   { text-align: left; }
    .item-name { font-weight: bold; }
    .item-desc { font-size: 7.5pt; color: #444; }

    /* Totals */
    .totals-section { display: flex; justify-content: flex-end; margin-bottom: 8px; }
    .totals-table { width: 55%; border: 1px solid #000; border-collapse: collapse; }
    .totals-table tr td { padding: 4px 8px; font-size: 8.5pt; border-bottom: 1px solid #ccc; color: #000; }
    .totals-table tr td:last-child { text-align: right; font-weight: bold; }
    .totals-table tr.grand-total td {
      border-top: 2px solid #000; border-bottom: 2px solid #000;
      font-size: 10pt; font-weight: bold; background: #f0f0f0;
    }
    .totals-table tr.outstanding-row td { font-size: 9pt; font-weight: bold; border-top: 1px solid #000; }

    /* Amount in Words */
    .amount-words { border: 1px solid #000; padding: 6px 10px; margin-bottom: 8px; }
    .amount-words-label {
      font-size: 7.5pt; font-weight: bold; text-transform: uppercase;
      letter-spacing: 0.5px; color: #333; margin-bottom: 2px;
    }
    .amount-words-value { font-size: 9pt; font-style: italic; color: #000; font-weight: bold; }

    /* Footer */
    .footer-section {
      display: flex; justify-content: space-between; align-items: flex-end;
      margin-top: 8px; border-top: 1px solid #000; padding-top: 8px;
    }
    .terms-box { flex: 1; padding-right: 16px; }
    .terms-label { font-size: 7.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #333; margin-bottom: 3px; }
    .terms-text { font-size: 8pt; color: #333; line-height: 1.5; white-space: pre-wrap; }
    .signature-box { text-align: center; min-width: 130px; }
    .sig-space { height: 40px; border-bottom: 1px solid #000; margin-bottom: 4px; }
    .sig-label { font-size: 7.5pt; color: #333; font-weight: bold; }
    .sig-name  { font-size: 7pt; color: #555; margin-top: 1px; }

    /* Page Footer */
    .page-footer {
      text-align: center; font-size: 7.5pt; color: #555;
      margin-top: 10px; border-top: 1px solid #ccc; padding-top: 5px;
    }

    @media print {
      body { margin: 0; }
      .no-break { page-break-inside: avoid; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Document Title -->
  <div class="doc-title">${docTitle}</div>

  <!-- Header -->
  <div class="header">
    <div class="header-left">
      ${shop.logo
        ? `<img src="${shop.logo}" class="logo" alt="Logo"/>`
        : `<div class="logo-placeholder">${shop.shopName.charAt(0).toUpperCase()}</div>`
      }
      <div>
        <div class="shop-name">${shop.shopName}</div>
        ${shop.address ? `<div class="shop-detail">${shop.address}</div>` : ''}
        ${shop.gst    ? `<div class="shop-detail">GSTIN: ${shop.gst}</div>` : ''}
        <div class="shop-detail">${shop.phone}${shop.email ? '  |  ' + shop.email : ''}</div>
      </div>
    </div>
    <div class="header-right">
      <div class="inv-meta-label">Invoice No.</div>
      <div class="inv-meta-value">${invoice.invoiceNumber}</div>
      <div class="inv-meta-label">Invoice Date</div>
      <div class="inv-meta-value">${fmtDate(invoice.invoiceDate)}</div>
      ${invoice.dueDate ? `<div class="inv-meta-label">Due Date</div><div class="inv-meta-value">${fmtDate(invoice.dueDate)}</div>` : ''}
    </div>
  </div>

  <!-- Party Details -->
  <div class="parties">
    <div class="party-cell">
      <div class="party-label">Customer</div>
      <div class="party-name">${invoice.customerName}</div>
    </div>
    ${invoice.buyerName ? `
    <div class="party-cell">
      <div class="party-label">Buyer</div>
      <div class="party-name">${invoice.buyerName}</div>
    </div>` : ''}
  </div>

  <!-- Items Table -->
  <div class="items-wrapper">
    <table>
      <thead>
        <tr>
          <th class="center" style="width:28px">No.</th>
          <th class="left">Product Name</th>
          <th class="center" style="width:42px">Qty</th>
          <th class="center" style="width:38px">Unit</th>
          <th class="right"  style="width:72px">Rate (${CURRENCY_SYMBOL})</th>
          <th class="right"  style="width:82px">Amount (${CURRENCY_SYMBOL})</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        ${extraRows}
      </tbody>
    </table>
  </div>

  <!-- Totals -->
  <div class="totals-section">
    <table class="totals-table">
      <tr>
        <td>Subtotal</td>
        <td>${invoice.subtotal.toFixed(2)}</td>
      </tr>
      ${invoice.discount > 0 ? `<tr><td>Discount</td><td>- ${invoice.discount.toFixed(2)}</td></tr>` : ''}
      ${invoice.gst > 0      ? `<tr><td>Total GST / Tax</td><td>${invoice.gst.toFixed(2)}</td></tr>` : ''}
      <tr class="grand-total no-break">
        <td>GRAND TOTAL (${CURRENCY_SYMBOL})</td>
        <td>${invoice.grandTotal.toFixed(2)}</td>
      </tr>
      ${totalPaid > 0    ? `<tr><td>Amount Received</td><td>- ${totalPaid.toFixed(2)}</td></tr>` : ''}
      ${outstanding > 0  ? `<tr class="outstanding-row"><td>Outstanding Amount</td><td>${outstanding.toFixed(2)}</td></tr>` : ''}
    </table>
  </div>

  <!-- Amount in Words -->
  <div class="amount-words no-break">
    <div class="amount-words-label">Amount Chargeable (in Words)</div>
    <div class="amount-words-value">${CURRENCY_SYMBOL} ${amountToWords(invoice.grandTotal)}</div>
  </div>

  <!-- Footer: Terms | Signature -->
  <div class="footer-section no-break">
    <div class="terms-box">
      ${invoice.terms ? `<div class="terms-label">Terms &amp; Conditions</div><div class="terms-text">${invoice.terms}</div>` : ''}
      ${invoice.notes ? `<div class="terms-label" style="margin-top:6px">Notes / Remarks</div><div class="terms-text">${invoice.notes}</div>` : ''}
    </div>
    <div class="signature-box">
      <div class="sig-space"></div>
      <div class="sig-label">Authorised Signatory</div>
      <div class="sig-name">${shop.shopName}</div>
    </div>
  </div>

  <!-- Page Footer -->
  <div class="page-footer">
    Generated by <strong>BillDesk</strong> &nbsp;|&nbsp; ${shop.shopName} &nbsp;|&nbsp; ${shop.phone}${shop.gst ? ' &nbsp;|&nbsp; GSTIN: ' + shop.gst : ''}
  </div>

</div>
</body>
</html>`;
};

// ─── Public API ────────────────────────────────────────────────────────────────

export const pdfService = {
  /** Generate PDF and return its local file URI */
  async generateInvoicePdf(invoice: Invoice, shop: Shop): Promise<string> {
    const html = buildHTML(invoice, shop);
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Move to a named file in document directory
    const fileName = `Invoice_${invoice.invoiceNumber}.pdf`;
    const destUri = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.moveAsync({ from: uri, to: destUri });

    return destUri;
  },

  /** Open the system print dialog */
  async printInvoice(invoice: Invoice, shop: Shop): Promise<void> {
    const html = buildHTML(invoice, shop);
    await Print.printAsync({ html });
  },

  /** Share the PDF via system share sheet (includes WhatsApp) */
  async shareInvoicePdf(invoice: Invoice, shop: Shop): Promise<void> {
    const fileUri = await this.generateInvoicePdf(invoice, shop);
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) throw new Error('Sharing is not available on this device');
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/pdf',
      dialogTitle: `${i18n.t('invoices.title', 'Invoice')} ${invoice.invoiceNumber}`,
      UTI: 'com.adobe.pdf',
    });
  },

  /** Build WhatsApp-friendly text message */
  buildWhatsAppMessage(invoice: Invoice, shop: Shop): string {
    const lines = [
      `*${shop.shopName}*`,
      `📋 *${i18n.t('invoices.title', 'Invoice')}: ${invoice.invoiceNumber}*`,
      `📅 ${i18n.t('invoices.date', 'Date')}: ${fmtDate(invoice.invoiceDate)}`,
      `👤 ${i18n.t('invoices.customer', 'Customer')}: ${invoice.customerName}`,
      ``,
      `*${i18n.t('common.amount', 'Amount Details')}:*`,
      `• ${i18n.t('common.grandTotal', 'Total')}: ${fmt(invoice.grandTotal)}`,
      invoice.paidAmount > 0 ? `• ${i18n.t('common.amountPaid', 'Paid')}: ${fmt(invoice.paidAmount)}` : '',
      invoice.pendingAmount > 0 ? `• ${i18n.t('common.pendingAmount', 'Balance Due')}: ${fmt(invoice.pendingAmount)}` : `✅ ${i18n.t('invoices.fullyPaid', 'Fully Paid')}`,
      ``,
      `${i18n.t('invoices.thankYou', 'Thank you for your business! 🙏')}`,
      ``,
      `_${i18n.t('invoices.generatedByWhatsApp', 'Generated by BillDesk')}_`,
    ].filter(Boolean);
    return lines.join('\n');
  },
};
