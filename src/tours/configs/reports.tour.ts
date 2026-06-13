import type { TourConfig } from '../types'

export const reportsTour: TourConfig = {
  id: 'reports',
  route: '/accounting/reports',
  steps: [
    {
      id: 'tabs',
      target: '[data-tour="reports-tabs"]',
      title: { ar: 'أنواع التقارير', en: 'Report types' },
      content: {
        ar: 'اختر بين ميزان المراجعة، الميزانية العمومية، أعمار الذمم، وقائمة الدخل.',
        en: 'Choose between trial balance, balance sheet, AR ageing, and income statement.',
      },
      placement: 'bottom',
    },
    {
      id: 'filters',
      target: '[data-tour="reports-filters"]',
      title: { ar: 'فلتر التاريخ', en: 'Date filters' },
      content: {
        ar: 'حدد فترة التقرير بتاريخ البداية والنهاية أو تاريخ محدد للميزانية.',
        en: 'Set the report period with start/end dates or a specific as-of date for balance sheet.',
      },
      placement: 'bottom',
    },
    {
      id: 'summary',
      target: '[data-tour="reports-summary"]',
      title: { ar: 'ملخص التقرير', en: 'Report summary' },
      content: {
        ar: 'بطاقات الإجماليات (مدين/دائن، أصول/خصوم) قبل جدول التفاصيل.',
        en: 'Summary KPI cards (debits/credits, assets/liabilities) before the detail table.',
      },
      placement: 'bottom',
    },
    {
      id: 'table',
      target: '[data-tour="reports-table"]',
      title: { ar: 'جدول التفاصيل', en: 'Detail table' },
      content: {
        ar: 'البيانات التفصيلية للحسابات أو الذمم حسب نوع التقرير المختار.',
        en: 'Detailed account or receivable data based on the selected report type.',
      },
      placement: 'top',
    },
  ],
}
