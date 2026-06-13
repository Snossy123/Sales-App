import type { TourConfig } from '../types'

export const accountingTour: TourConfig = {
  id: 'accounting',
  route: '/accounting',
  steps: [
    {
      id: 'kpis',
      target: '[data-tour="accounting-kpis"]',
      title: { ar: 'نظرة عامة', en: 'Overview' },
      content: {
        ar: 'ملخص الحسابات النشطة وقيود اليومية والتحويلات والمبيعات غير المربوطة.',
        en: 'Summary of active accounts, journal entries, transfers, and unmapped sales.',
      },
      placement: 'bottom',
    },
    {
      id: 'balances',
      target: '[data-tour="accounting-balances"]',
      title: { ar: 'الأرصدة حسب النوع', en: 'Balances by type' },
      content: {
        ar: 'توزيع الأرصدة على أنواع الحسابات (أصول، خصوم، إيرادات، مصروفات).',
        en: 'Balance breakdown by account type (assets, liabilities, revenue, expenses).',
      },
      placement: 'top',
    },
    {
      id: 'unmapped',
      target: '[data-tour="accounting-unmapped"]',
      title: { ar: 'مبيعات غير مربوطة', en: 'Unmapped sales' },
      content: {
        ar: 'فواتير تحتاج ربط محاسبي. اضغط للانتقال لشاشة الربط.',
        en: 'Invoices needing accounting mapping. Click to go to the mapping screen.',
      },
      placement: 'top',
    },
    {
      id: 'recent',
      target: '[data-tour="accounting-recent"]',
      title: { ar: 'آخر القيود', en: 'Recent entries' },
      content: {
        ar: 'آخر قيود اليومية المسجلة في النظام.',
        en: 'Most recent journal entries recorded in the system.',
      },
      placement: 'top',
    },
  ],
}
