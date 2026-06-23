import type { TourConfig } from '../types'

export const crmTour: TourConfig = {
  id: 'crm',
  route: '/crm',
  steps: [
    {
      id: 'kpis',
      target: '[data-tour="crm-kpis"]',
      title: { ar: 'مؤشرات CRM', en: 'CRM metrics' },
      content: {
        ar: 'متابعات اليوم، تحويلات الشهر، نسبة التحويل، وإجمالي العملاء المحتملين.',
        en: 'Today\'s follow-ups, monthly conversions, conversion rate, and total leads.',
      },
      placement: 'bottom',
    },
    {
      id: 'pipeline',
      target: '[data-tour="crm-pipeline"]',
      title: { ar: 'مراحل Pipeline', en: 'Pipeline stages' },
      content: {
        ar: 'الأعمدة تمثل مراحل العميل المحتمل: جديد، تواصل، تفاوض، انتظار التعاقد، تم التعاقد، غير مهتم.',
        en: 'Columns represent lead stages: new, contacted, negotiation, qualified, won, lost.',
      },
      placement: 'top',
    },
    {
      id: 'lead-card',
      target: '[data-tour="crm-lead-card"]',
      title: { ar: 'بطاقة العميل المحتمل', en: 'Lead card' },
      content: {
        ar: 'كل بطاقة تعرض الاسم والهاتف وعدد الأجهزة. غيّر المرحلة من القائمة المنسدلة.',
        en: 'Each card shows name, phone, and device count. Change stage from the dropdown.',
      },
      placement: 'left',
    },
  ],
}
