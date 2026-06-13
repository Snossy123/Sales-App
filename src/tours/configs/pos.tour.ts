import type { TourConfig } from '../types'

export const posTour: TourConfig = {
  id: 'pos',
  route: '/pos',
  steps: [
    {
      id: 'distributor',
      target: '[data-tour="pos-distributor"]',
      title: { ar: 'اختيار الموزع', en: 'Select distributor' },
      content: {
        ar: 'ابدأ باختيار الموزع المسؤول عن عملية البيع.',
        en: 'Start by selecting the distributor responsible for this sale.',
      },
      placement: 'bottom',
    },
    {
      id: 'customer',
      target: '[data-tour="pos-customer"]',
      title: { ar: 'اختيار العميل', en: 'Select customer' },
      content: {
        ar: 'اختر العميل المرتبط بالموزع. يمكنك إضافة عميل جديد من شاشة العملاء.',
        en: 'Pick the customer linked to the distributor. Add new customers from the Customers screen.',
      },
      placement: 'bottom',
    },
    {
      id: 'payment',
      target: '[data-tour="pos-payment"]',
      title: { ar: 'نوع الدفع', en: 'Payment type' },
      content: {
        ar: 'حدد نقدي أو تقسيط. عند التقسيط، أدخل المقدم وعدد الأقساط وتاريخ أول استحقاق.',
        en: 'Choose cash or installment. For installments, enter down payment, count, and first due date.',
      },
      placement: 'bottom',
    },
    {
      id: 'product',
      target: '[data-tour="pos-product"]',
      title: { ar: 'المنتج والكمية', en: 'Product & quantity' },
      content: {
        ar: 'اختر جهاز GPS من المخزون المتاح وأدخل الكمية المطلوبة.',
        en: 'Select a GPS device from available stock and enter the quantity.',
      },
      placement: 'top',
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
