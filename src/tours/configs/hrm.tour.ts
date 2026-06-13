import type { TourConfig } from '../types'

export const hrmTour: TourConfig = {
  id: 'hrm',
  route: '/hrm',
  steps: [
    {
      id: 'kpis',
      target: '[data-tour="hrm-kpis"]',
      title: { ar: 'مؤشرات الموارد البشرية', en: 'HR metrics' },
      content: {
        ar: 'تابع الحضور اليومي والإجازات المعلقة والرواتب المستحقة.',
        en: 'Track daily attendance, pending leaves, and due payroll.',
      },
      placement: 'bottom',
    },
    {
      id: 'leaves',
      target: '[data-tour="hrm-leaves"]',
      title: { ar: 'الإجازات القادمة', en: 'Upcoming leaves' },
      content: {
        ar: 'جدول الإجازات المعتمدة أو المعلقة خلال الفترة القادمة.',
        en: 'Table of approved or pending leaves in the upcoming period.',
      },
      placement: 'top',
    },
    {
      id: 'employees',
      target: '[data-tour="hrm-employees"]',
      title: { ar: 'قائمة الموظفين', en: 'Employee list' },
      content: {
        ar: 'عرض الموظفين المسجلين مع الفرع والقسم. انتقل لصفحة الموظفين للإدارة الكاملة.',
        en: 'View registered employees with branch and department. Go to Employees for full management.',
      },
      placement: 'top',
      requiresRoute: '/hrm/employees',
    },
  ],
}
