export const PAYMENT_RECEIPT_PRINT_CSS = `
html,
body {
  margin: 0;
  padding: 0;
  width: 80mm;
  background: #fff;
  color: #000;
  font-family: 'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.payment-receipt {
  width: 80mm;
  max-width: 80mm;
  margin: 0;
  padding: 4mm 3mm;
  background: #fff;
  color: #000;
  font-size: 11pt;
  line-height: 1.45;
  direction: rtl;
  text-align: center;
  box-sizing: border-box;
}

.pr-header { margin-bottom: 3mm; }

.pr-logo {
  max-height: 14mm;
  max-width: 40mm;
  object-fit: contain;
  margin: 0 auto 2mm;
  display: block;
}

.pr-org-name { font-size: 12pt; font-weight: 800; margin: 0; }
.pr-org-phone { font-size: 9pt; color: #444; margin: 1mm 0 0; }

.pr-title {
  font-size: 13pt;
  font-weight: 900;
  border-top: 1px dashed #999;
  border-bottom: 1px dashed #999;
  padding: 2mm 0;
  margin: 3mm 0;
}

.pr-meta { text-align: right; font-size: 10pt; margin-bottom: 3mm; }

.pr-row {
  display: flex;
  justify-content: space-between;
  gap: 2mm;
  padding: 1mm 0;
  border-bottom: 1px dotted #ddd;
}

.pr-row dt { color: #555; font-weight: 600; flex-shrink: 0; }
.pr-row dd { margin: 0; text-align: left; font-weight: 700; word-break: break-word; }

.pr-amount-box {
  margin: 4mm 0;
  padding: 3mm;
  border: 2px solid #111;
  border-radius: 2mm;
}

.pr-amount-label { font-size: 10pt; color: #444; margin-bottom: 1mm; }
.pr-amount-value { font-size: 18pt; font-weight: 900; font-variant-numeric: tabular-nums; }

.pr-footer {
  margin-top: 4mm;
  padding-top: 2mm;
  border-top: 1px dashed #999;
  font-size: 9pt;
  color: #444;
}

@media print {
  @page { margin: 0; size: 80mm auto; }
  html, body { width: 80mm; }
}
`
