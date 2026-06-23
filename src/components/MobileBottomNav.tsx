import { NavLink } from 'react-router-dom'
import type { AuthUser } from '../api/types'
import { getUserRole } from '../lib/permissions'
import { NavIcon } from './NavIcon'

interface MobileBottomNavItem {
  to: string
  icon: string
  label: string
  roles: string[]
  end?: boolean
}

const MOBILE_NAV_ITEMS: MobileBottomNavItem[] = [
  {
    to: '/',
    icon: 'dashboard',
    label: 'الرئيسية',
    end: true,
    roles: ['super_admin', 'admin', 'sales', 'reviewer', 'collector', 'call_center', 'crm', 'accountant', 'hr_manager'],
  },
  {
    to: '/inventory',
    icon: 'inventory_2',
    label: 'المخزون',
    roles: ['super_admin', 'admin', 'sales'],
  },
  {
    to: '/pos',
    icon: 'point_of_sale',
    label: 'المبيعات',
    roles: ['super_admin', 'admin', 'sales'],
  },
  {
    to: '/installments',
    icon: 'payments',
    label: 'المبيعات',
    roles: ['collector'],
  },
  {
    to: '/accounting/reports',
    icon: 'assessment',
    label: 'التقارير',
    roles: ['super_admin', 'admin', 'accountant'],
  },
  {
    to: '/crm/reports',
    icon: 'analytics',
    label: 'التقارير',
    roles: ['crm'],
  },
]

export function MobileBottomNav({ user }: { user: AuthUser | null }) {
  const role = getUserRole(user)
  const items = MOBILE_NAV_ITEMS.filter((item) => item.roles.includes(role))

  if (items.length === 0) return null

  return (
    <nav
      className="fixed bottom-0 left-0 z-50 flex h-16 w-full items-center justify-around border-t border-outline-variant bg-surface px-2 pb-safe shadow-md md:hidden"
      aria-label="التنقل السريع"
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1 text-xs transition-transform active:scale-95 ${
              isActive
                ? 'bg-primary-container font-bold text-on-primary-container'
                : 'text-on-surface-variant'
            }`
          }
        >
          <NavIcon name={item.icon} size={22} />
          <span className="truncate">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
