import { NavLink } from 'react-router-dom'

const links = [
  { to: '/crm', label: 'خط الأنابيب', end: true },
  { to: '/crm/follow-ups', label: 'المتابعات' },
  { to: '/crm/activities', label: 'الأنشطة' },
  { to: '/crm/call-logs', label: 'سجل المكالمات' },
  { to: '/crm/campaigns', label: 'الحملات' },
  { to: '/crm/proposals', label: 'العروض' },
  { to: '/crm/order-requests', label: 'طلبات العملاء' },
  { to: '/crm/marketplace', label: 'التكاملات' },
  { to: '/crm/reports', label: 'التقارير' },
  { to: '/crm/settings', label: 'الإعدادات' },
]

export function CrmSubNav() {
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
