import type { ContractTemplate, SalesInvoice } from '../api/types'

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    key: 'gps_installment',
    name_ar: 'عقد تقسيط GPS',
    description_ar: 'نموذج عقد تقسيط أجهزة GPS مع جدول الأقساط وبنود التعاقد.',
    category: 'gps',
  },
  {
    key: 'gps_cash',
    name_ar: 'عقد كاش GPS',
    description_ar: 'نموذج عقد بيع كاش لأجهزة GPS بدون جدول أقساط.',
    category: 'gps',
  },
  {
    key: 'service_receipt',
    name_ar: 'إيصال / عقد خدمة',
    description_ar: 'نموذج إيصال أو عقد للخدمات والرسوم (صيانة، تركيب، سوفت وير، إلخ).',
    category: 'service',
  },
  {
    key: 'subscription_renewal',
    name_ar: 'تجديد اشتراك',
    description_ar: 'نموذج عقد تجديد اشتراك الجهاز (سنوي أو مدى الحياة) — دفع كاش.',
    category: 'subscription',
  },
  {
    key: 'subscription_renewal_installment',
    name_ar: 'تجديد اشتراك (قسط)',
    description_ar: 'نموذج تجديد اشتراك GPS بالتقسيط — جدول دفعات أسبوعية.',
    category: 'subscription',
  },
  {
    key: 'ownership_transfer',
    name_ar: 'نقل ملكية',
    description_ar: 'نموذج عقد نقل ملكية الجهاز من مالك إلى آخر.',
    category: 'transfer',
  },
]

const TEMPLATE_LABELS = CONTRACT_TEMPLATES.reduce(
  (acc, template) => ({ ...acc, [template.key]: template.name_ar }),
  {} as Record<string, string>,
)

export function contractTemplateLabel(key?: string | null): string {
  if (!key) return '—'
  return TEMPLATE_LABELS[key] ?? key
}

export function sampleServiceReceiptInvoice(): SalesInvoice {
  return {
    id: 44,
    invoice_number: 'INV-000044',
    invoice_date: '2026-06-25',
    customer_id: 1,
    payment_term: 'cash',
    payment_status: 'paid',
    total: 700,
    balance_due: 0,
    technician_name: 'باسم مصطفى',
    notes: 'تم التركيب في فرع المعادي',
    customer: {
      id: 1,
      name: 'ليلى منصور',
      phone: '01022223333',
      username: 'laila.gps',
      device_serial: 'SN-889900',
      status: 'active',
    },
    branch: {
      id: 1,
      name: 'المعادي',
      name_ar: 'المعادي',
      code: 'MAADI',
    },
    lines: [
      {
        id: 1,
        line_type: 'service',
        service_id: 1,
        description: 'رسوم تركيب',
        quantity: 1,
        unit_price: 500,
        line_total: 500,
        technician: { id: 1, name: 'باسم مصطفى' },
      },
      {
        id: 2,
        line_type: 'service',
        service_id: 2,
        description: 'رسوم سوفت وير',
        quantity: 1,
        unit_price: 200,
        line_total: 200,
        technician: { id: 1, name: 'باسم مصطفى' },
      },
    ],
  }
}

export function mockContractPreviewHtml(key: string): string {
  const template = CONTRACT_TEMPLATES.find((item) => item.key === key)
  const title = template?.name_ar ?? key

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: Tahoma, Arial, sans-serif; padding: 2rem; direction: rtl; }
    .box { max-width: 210mm; margin: 0 auto; border: 3px double #c41e3a; padding: 1.5rem; }
    h1 { color: #c41e3a; text-align: center; }
    p { line-height: 1.6; }
  </style>
</head>
<body>
  <div class="box">
    <h1>${title}</h1>
    <p>معاينة تجريبية — في وضع الإنتاج يُعرض النموذج الكامل من الخادم.</p>
    <p><strong>العميل:</strong> أحمد محمد علي</p>
    <p><strong>التاريخ:</strong> 25/06/2026</p>
  </div>
</body>
</html>`
}
