import { NavLink } from 'react-router-dom'

const links = [
  { to: '/hrm', label: 'لوحة التحكم', end: true },
  { to: '/hrm/employees', label: 'الموظفون' },
  { to: '/hrm/attendance', label: 'الحضور' },
  { to: '/hrm/leaves', label: 'الإجازات' },
  { to: '/hrm/leave-types', label: 'أنواع الإجازة' },
  { to: '/hrm/shifts', label: 'الورديات' },
  { to: '/hrm/holidays', label: 'العطلات' },
  { to: '/hrm/allowances', label: 'البدلات' },
  { to: '/hrm/payroll', label: 'الرواتب' },
  { to: '/hrm/payroll-groups', label: 'مسيرات الرواتب' },
  { to: '/hrm/settings', label: 'الإعدادات' },
]

export function HrmSubNav() {
  return (
    <nav className="mb-md flex flex-wrap gap-xs border-b border-outline-variant pb-sm">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            `rounded-lg px-sm py-xs text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
