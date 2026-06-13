import { NavLink } from 'react-router-dom'

const links = [
  { to: '/admin/users', label: 'المستخدمون', end: true },
  { to: '/admin/roles', label: 'الأدوار والصلاحيات' },
  { to: '/admin/activity-log', label: 'سجل التدقيق' },
  { to: '/admin/settings', label: 'إعدادات النظام' },
]

export function AdminSubNav() {
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
