import { Icon } from './Icon'
import { SidebarNavItem } from './SidebarNavItem'
import type { NavGroup } from '../lib/permissions'
import { isNavGroupActive } from '../lib/permissions'
import type { AuthUser } from '../api/types'

interface SidebarNavGroupProps {
  group: NavGroup
  user: AuthUser | null
  pathname: string
  isOpen: boolean
  onToggle: () => void
}

export function SidebarNavGroup({ group, user, pathname, isOpen, onToggle }: SidebarNavGroupProps) {
  const isActive = isNavGroupActive(group, pathname, user)

  return (
    <div className="flex flex-col gap-xs">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`flex w-full items-center justify-between gap-base rounded-xl px-sm py-sm transition-all ${
          isActive
            ? 'bg-surface-container-low font-semibold text-on-surface'
            : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
        }`}
      >
        <div className="flex items-center gap-base">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              isActive ? 'bg-primary/15 text-primary' : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <Icon name={group.icon} filled={isActive} size={18} className="no-flip" />
          </div>
          <span className="text-sm font-medium">{group.label}</span>
        </div>
        <Icon
          name={isOpen ? 'expand_less' : 'expand_more'}
          size={20}
          className="no-flip shrink-0 text-on-surface-variant"
        />
      </button>

      {isOpen && (
        <div className="ms-sm flex flex-col gap-xs border-s border-outline-variant/60 ps-sm">
          {group.items.map((item) => (
            <SidebarNavItem
              key={`${item.label}-${item.to}`}
              item={item}
              user={user}
              pathname={pathname}
              variant="sub"
            />
          ))}
        </div>
      )}
    </div>
  )
}
