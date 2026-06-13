import type { TourConfig } from '../types'

export const dashboardTour: TourConfig = {
  id: 'dashboard',
  route: '/',
  steps: [
    {
      id: 'quick-actions',
      target: '[data-tour="dashboard-quick-actions"]',
      title: { ar: 'إجراءات سريعة', en: 'Quick actions' },
      content: {
        ar: 'اختصارات للمهام الأكثر استخداماً: بيع جديد، عملاء، مراجعة فواتير، وتحصيل أقساط.',
        en: 'Shortcuts to your most common tasks: new sale, customers, invoice review, and installment collection.',
      },
      placement: 'bottom',
    },
    {
      id: 'kpis',
      target: '[data-tour="dashboard-kpis"]',
      title: { ar: 'مؤشرات الأداء', en: 'Key metrics' },
      content: {
        ar: 'تابع ملخص المبيعات والفواتير والمخزون والعملاء من هذه البطاقات.',
        en: 'Track sales, invoices, inventory, and customer counts from these KPI cards.',
      },
      placement: 'bottom',
    },
    {
      id: 'overdue',
      target: '[data-tour="dashboard-overdue"]',
      title: { ar: 'الأقساط المتأخرة', en: 'Overdue installments' },
      content: {
        ar: 'تنبيه فوري للأقساط المتأخرة مع إمكانية الانتقال مباشرة لصفحة التحصيل.',
        en: 'Instant alert for overdue installments with a direct link to collection.',
      },
      placement: 'top',
      roles: ['super_admin', 'admin', 'collector'],
      requiresRoute: '/installments',
    },
    {
      id: 'charts',
      target: '[data-tour="dashboard-charts"]',
      title: { ar: 'الرسوم البيانية', en: 'Charts' },
      content: {
        ar: 'رسوم توضيحية لمخزون الفروع وتوزيع الأقساط.',
        en: 'Visual charts for branch stock and installment distribution.',
      },
      placement: 'top',
      roles: ['super_admin', 'admin'],
    },
  ],
}
