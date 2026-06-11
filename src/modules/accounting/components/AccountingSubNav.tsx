import { NavLink } from 'react-router-dom'

const links = [
  { to: '/accounting', label: 'لوحة التحكم', end: true },
  { to: '/accounting/chart-of-accounts', label: 'دليل الحسابات' },
  { to: '/accounting/journal-entries', label: 'قيود اليومية' },
  { to: '/accounting/transfers', label: 'التحويلات' },
  { to: '/accounting/transactions', label: 'ربط المبيعات' },
  { to: '/accounting/reports', label: 'التقارير' },
  { to: '/accounting/budgets', label: 'الميزانيات' },
  { to: '/accounting/settings', label: 'الإعدادات' },
]

export function AccountingSubNav() {
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
