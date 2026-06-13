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
        className={`block rounded-md py-xs pr-md pl-sm text-sm transition-all ${
          isActive
            ? 'border-r-4 border-primary bg-secondary-container font-bold text-on-secondary-container'
            : 'text-on-surface-variant hover:bg-surface-container-high'
        }`}
      >
        {item.label}
      </NavLink>
    )
  }

  return (
    <NavLink
      to={navTo}
      end={item.end}
      className={`flex items-center gap-base rounded-lg p-sm transition-all ${
        isActive
          ? 'scale-[0.98] border-r-4 border-primary bg-secondary-container font-bold text-on-secondary-container'
          : 'text-on-surface-variant hover:bg-surface-container-high'
      }`}
    >
      <Icon name={item.icon} filled={isActive} className="no-flip" />
      <span className="text-sm font-medium">{item.label}</span>
    </NavLink>
  )
}
