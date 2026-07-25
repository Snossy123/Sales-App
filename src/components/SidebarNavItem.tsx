import { NavLink } from 'react-router-dom'
import { NavIcon } from './NavIcon'
import type { NavItem } from '../lib/permissions'
import { isNavItemActive, resolveNavPath } from '../lib/permissions'
import type { AuthUser } from '../api/types'

interface SidebarNavItemProps {
  item: NavItem
  user: AuthUser | null
  pathname: string
  variant?: 'standalone' | 'sub'
  collapsed?: boolean
}

export function SidebarNavItem({
  item,
  user,
  pathname,
  variant = 'standalone',
  collapsed = false,
}: SidebarNavItemProps) {
  const isActive = isNavItemActive(item, pathname, user)
  const navTo = resolveNavPath(item, user)

  if (variant === 'sub') {
    return (
      <NavLink
        to={navTo}
        end={item.end}
        className={`relative flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-all ${
          isActive
            ? 'bg-primary/10 font-semibold text-primary before:absolute before:inset-y-1.5 before:end-0 before:w-[3px] before:rounded-full before:bg-primary'
            : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
        }`}
      >
        <NavIcon name={item.icon} size={16} className="shrink-0" />
        <span className="truncate">{item.label}</span>
      </NavLink>
    )
  }

  return (
    <NavLink
      to={navTo}
      end={item.end}
      className={`flex items-center rounded-xl transition-all ${
        collapsed ? 'justify-center px-sm py-sm' : 'gap-base px-sm py-sm'
      } ${
        isActive
          ? collapsed
            ? 'bg-primary/10 text-primary'
            : 'border-s-[3px] border-primary bg-primary/10 font-bold text-primary'
          : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
      }`}
    >
      <NavIcon name={item.icon} size={22} className="shrink-0" />
      {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
    </NavLink>
  )
}
