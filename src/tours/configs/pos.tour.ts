import type { TourConfig } from '../types'

export const posTour: TourConfig = {
  id: 'pos',
  route: '/pos',
  steps: [
    {
      id: 'source',
      target: '[data-tour="pos-source"]',
      title: { ar: 'مصدر التعاقد', en: 'Contract source' },
      content: {
        ar: 'حدد إن كان التعاقد عبر فرع أو عبر موزع، ثم ابحث واختر من القائمة.',
        en: 'Choose whether the contract goes through a branch or distributor, then search and pick from the list.',
      },
      placement: 'bottom',
    },
    {
      id: 'customer',
      target: '[data-tour="pos-customer"]',
      title: { ar: 'اختيار العميل', en: 'Select customer' },
      content: {
        ar: 'ابحث عن العميل بالاسم أو رقم الموبايل واختره من نفس الحقل. يمكنك إضافة عميل جديد من شاشة العملاء.',
        en: 'Search for the customer by name or phone and select from the same field. Add new customers from the Customers screen.',
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
