import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { SidebarNavGroup } from './SidebarNavGroup'
import { SidebarNavItem } from './SidebarNavItem'
import type { NavEntry } from '../lib/permissions'
import { getUserRole, isNavGroupActive } from '../lib/permissions'
import type { AuthUser } from '../api/types'

interface SidebarNavProps {
  entries: NavEntry[]
  user: AuthUser | null
  collapsed?: boolean
  onExpand?: () => void
}

export function SidebarNav({ entries, user, collapsed = false, onExpand }: SidebarNavProps) {
  const { pathname } = useLocation()
  const role = getUserRole(user)
  const defaultOpenGroup =
    role === 'super_admin' || role === 'admin' ? 'management' : null
  const [openGroupId, setOpenGroupId] = useState<string | null>(defaultOpenGroup)

  useEffect(() => {
    const activeGroup = entries.find(
      (entry) => entry.type === 'group' && isNavGroupActive(entry.group, pathname, user),
    )
    if (activeGroup?.type === 'group') {
      setOpenGroupId(activeGroup.group.id)
    }
  }, [entries, pathname, user])

  return (
    <nav className="flex flex-col gap-sm py-xs">
      {entries.map((entry, index) => {
        if (entry.type === 'item') {
          return (
            <div key={`${entry.item.label}-${entry.item.to}`}>
              <SidebarNavItem
                item={entry.item}
                user={user}
                pathname={pathname}
                variant="standalone"
                collapsed={collapsed}
              />
              {!collapsed && index === 0 && entries.length > 1 && (
                <div className="my-sm border-b border-outline-variant/60" />
              )}
            </div>
          )
        }

        return (
          <SidebarNavGroup
            key={entry.group.id}
            group={entry.group}
            user={user}
            pathname={pathname}
            isOpen={!collapsed && openGroupId === entry.group.id}
            collapsed={collapsed}
            onToggle={() => {
              if (collapsed) {
                onExpand?.()
                setOpenGroupId(entry.group.id)
                return
              }
              setOpenGroupId((prev) => (prev === entry.group.id ? null : entry.group.id))
            }}
          />
        )
      })}
    </nav>
  )
}
