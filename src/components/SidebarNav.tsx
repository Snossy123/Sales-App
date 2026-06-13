import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { SidebarNavGroup } from './SidebarNavGroup'
import { SidebarNavItem } from './SidebarNavItem'
import type { NavEntry } from '../lib/permissions'
import { isNavGroupActive } from '../lib/permissions'
import type { AuthUser } from '../api/types'

interface SidebarNavProps {
  entries: NavEntry[]
  user: AuthUser | null
}

export function SidebarNav({ entries, user }: SidebarNavProps) {
  const { pathname } = useLocation()
  const [openGroupId, setOpenGroupId] = useState<string | null>(null)

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
              />
              {index === 0 && entries.length > 1 && (
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
            isOpen={openGroupId === entry.group.id}
            onToggle={() =>
              setOpenGroupId((prev) => (prev === entry.group.id ? null : entry.group.id))
            }
          />
        )
      })}
    </nav>
  )
}
