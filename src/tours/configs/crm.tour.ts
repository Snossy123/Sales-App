import type { TourConfig } from '../types'

export const crmTour: TourConfig = {
  id: 'crm',
  route: '/crm/referrals',
  steps: [
    {
      id: 'kpis',
      target: '[data-tour="crm-kpis"]',
      title: { ar: 'مؤشرات الترشيحات', en: 'Referral metrics' },
      content: {
        ar: 'إجمالي الترشيحات، المتابعات المستحقة، المواعيد المجدولة، وحالات التركيب.',
        en: 'Total referrals, due follow-ups, scheduled installations, and installed count.',
      },
      placement: 'bottom',
    },
    {
      id: 'pipeline',
      target: '[data-tour="crm-pipeline"]',
      title: { ar: 'مراحل الترشيح', en: 'Referral stages' },
      content: {
        ar: 'الأعمدة تمثل مراحل الترشيح: لم يرد، غير مهتم، موعد تركيب، تم التركيب.',
        en: 'Columns represent referral stages: no answer, not interested, installation scheduled, installed.',
      },
      placement: 'top',
    },
    {
      id: 'lead-card',
      target: '[data-tour="crm-lead-card"]',
      title: { ar: 'بطاقة الترشيح', en: 'Referral card' },
      content: {
        ar: 'كل بطاقة تعرض الاسم والهاتف والمُحيل. غيّر الحالة أو افتح ملف الترشيح.',
        en: 'Each card shows name, phone, and referrer. Change status or open the profile.',
      },
      placement: 'left',
    },
  ],
}
