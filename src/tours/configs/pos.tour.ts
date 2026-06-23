import type { TourConfig } from '../types'

export const posTour: TourConfig = {
  id: 'pos',
  route: '/pos',
  steps: [
    {
      id: 'customer',
      target: '[data-tour="pos-customer"]',
      title: { ar: 'اختيار العميل', en: 'Select customer' },
      content: {
        ar: 'ابحث عن العميل بالاسم أو رقم الموبايل. إن كان مسجلاً لدى موظف مبيعات سيظهر اسمه ويُقفل مصدر التعاقد على موظف المبيعات.',
        en: 'Search by name or phone. If the customer belongs to a sales rep, their name appears and the contract source locks to sales rep.',
      },
      placement: 'bottom',
    },
    {
      id: 'source',
      target: '[data-tour="pos-source"]',
      title: { ar: 'مصدر التعاقد', en: 'Contract source' },
      content: {
        ar: 'بعد اختيار العميل: إن كان تابعاً لموظف مبيعات يُحدَّد تلقائياً. وإلا اختر فرع أو موزع أو موظف مبيعات.',
        en: 'After selecting the customer: sales-attributed customers auto-fill. Otherwise choose branch, distributor, or sales rep.',
      },
      placement: 'bottom',
    },
    {
      id: 'payment',
      target: '[data-tour="pos-payment"]',
      title: { ar: 'نوع الدفع', en: 'Payment type' },
      content: {
        ar: 'لكل جهاز: حدد كاش أو تقسيط. عند التقسيط أدخل قيمة القسط والمقدم — يُحسب عدد الأقساط تلقائياً.',
        en: 'Per device: choose cash or installment. For installments enter installment amount and down payment — count is auto-calculated.',
      },
      placement: 'bottom',
    },
    {
      id: 'product',
      target: '[data-tour="pos-product"]',
      title: { ar: 'المنتج والكمية', en: 'Product & quantity' },
      content: {
        ar: 'من الهيدر: اختر عدد الأجهزة وتحقق من السعر والمخزون المتاح.',
        en: 'From the header: set device count and verify price and available stock.',
      },
      placement: 'bottom',
    },
    {
      id: 'submit',
      target: '[data-tour="pos-submit"]',
      title: { ar: 'إتمام البيع', en: 'Complete sale' },
      content: {
        ar: 'بعد مراجعة البيانات، اضغط إتمام البيع لإنشاء الفاتورة وطباعة العقد.',
        en: 'After reviewing details, click complete sale to create the invoice and print the contract.',
      },
      placement: 'top',
    },
  ],
}
