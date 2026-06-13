import { NavLink } from 'react-router-dom'
import { Icon } from './Icon'
import type { NavItem } from '../lib/permissions'
import { isNavItemActive, resolveNavPath } from '../lib/permissions'
import type { AuthUser } from '../api/types'

interface SidebarNavItemProps {
  item: NavItem
  user: AuthUser | null
  pathname: string
  variant?: 'standalone' | 'sub'
}

export function SidebarNavItem({ item, user, pathname, variant = 'standalone' }: SidebarNavItemProps) {
  const isActive = isNavItemActive(item, pathname, user)
  const navTo = resolveNavPath(item, user)

  if (variant === 'sub') {
    return (
      <NavLink
        to={navTo}
        end={item.end}
        className={`flex items-center gap-xs rounded-md py-xs pl-md pr-sm text-sm transition-all ${
          isActive
            ? 'border-s-[3px] border-primary bg-primary/10 font-semibold text-primary'
            : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
        }`}
      >
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${isActive ? 'bg-primary' : 'bg-outline-variant'}`}
        />
        {item.label}
      </NavLink>
    )
  }

  return (
    <NavLink
      to={navTo}
      end={item.end}
      className={`flex items-center gap-base rounded-xl px-sm py-sm transition-all ${
        isActive
          ? 'border-s-[3px] border-primary bg-primary/10 font-bold text-primary'
          : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
      }`}
    >
      <Icon name={item.icon} filled={isActive} className="no-flip" />
      <span className="text-sm font-medium">{item.label}</span>
    </NavLink>
  )
}
