import type { TourConfig } from '../types'

export const invoicesTour: TourConfig = {
  id: 'invoices',
  route: '/invoices',
  steps: [
    {
      id: 'create',
      target: '[data-tour="invoices-create"]',
      title: { ar: 'إنشاء فاتورة جديدة', en: 'Create new invoice' },
      content: {
        ar: 'لإنشاء فاتورة جديدة، انتقل إلى شاشة نقطة البيع (تعاقد جديد) من القائمة الجانبية أو الزر أعلاه.',
        en: 'To create a new invoice, go to the POS (new contract) screen from the sidebar or the button above.',
      },
      placement: 'bottom',
      requiresRoute: '/pos',
    },
    {
      id: 'filters',
      target: '[data-tour="invoices-filters"]',
      title: { ar: 'فلتر البحث', en: 'Search & filters' },
      content: {
        ar: 'ابحث برقم الفاتورة أو صفِّ حسب حالة المراجعة، السداد، ونوع الدفع.',
        en: 'Search by invoice number or filter by review status, payment status, and payment type.',
      },
      placement: 'bottom',
    },
    {
      id: 'table',
      target: '[data-tour="invoices-table"]',
      title: { ar: 'جدول الفواتير', en: 'Invoices table' },
      content: {
        ar: 'يعرض جميع الفواتير مع العميل والموزع والإجمالي ونوع الدفع.',
        en: 'Lists all invoices with customer, distributor, total, and payment type.',
      },
      placement: 'top',
    },
    {
      id: 'status',
      target: '[data-tour="invoices-status"]',
      title: { ar: 'حالة الفاتورة', en: 'Invoice status' },
      content: {
        ar: 'حالة المراجعة (مؤكدة، معلقة، مرفوضة) وحالة السداد (مدفوعة، جزئية، متأخرة).',
        en: 'Review status (confirmed, pending, rejected) and payment status (paid, partial, overdue).',
      },
      placement: 'left',
    },
    {
      id: 'actions',
      target: '[data-tour="invoices-actions"]',
      title: { ar: 'إجراءات الفاتورة', en: 'Invoice actions' },
      content: {
        ar: 'طباعة عقد التقسيط أو الفاتورة مباشرة من هذا العمود.',
        en: 'Print the installment contract or invoice directly from this column.',
      },
      placement: 'left',
    },
    {
      id: 'pagination',
      target: '[data-tour="invoices-results"]',
      title: { ar: 'نتائج الفواتير', en: 'Invoice results' },
      content: {
        ar: 'جدول النتائج مع التصفح بين الصفحات عند وجود عدد كبير من الفواتير.',
        en: 'Results table with pagination when there are many invoices.',
      },
      placement: 'top',
    },
  ],
}
