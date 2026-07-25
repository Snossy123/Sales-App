import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import type { AuthUser } from '../../../api/types'
import {
  isNavItemActive,
  resolveNavPath,
  type NavItem,
} from '../../../lib/permissions'
import {
  buildCrmNavSections,
  CRM_NAV_CATALOG,
  crmNavDefToNavItem,
} from '../lib/crmNavCatalog'
import '../crmTheme.css'

interface CrmSidebarSectionProps {
  /** Role-filtered items from the المبيعات nav group */
  allowedItems: NavItem[]
  user: AuthUser | null
  pathname: string
}

export function CrmSidebarSection({
  allowedItems,
  user,
  pathname,
}: CrmSidebarSectionProps) {
  const allowedPaths = useMemo(
    () => new Set(allowedItems.map((item) => item.to)),
    [allowedItems],
  )

  const sections = useMemo(
    () =>
      buildCrmNavSections()
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => allowedPaths.has(item.to)),
        }))
        .filter((section) => section.items.length > 0),
    [allowedPaths],
  )

  // Fallback if catalog/paths drift — still show allowed flat items
  if (sections.length === 0 && allowedItems.length > 0) {
    return (
      <div className="crm-scope flex flex-col gap-0.5 px-1 py-1">
        {allowedItems.map((item) => {
          const def = CRM_NAV_CATALOG.find((c) => c.to === item.to)
          const letter = def?.letter ?? item.label.slice(0, 1)
          const navTo = resolveNavPath(item, user)
          const active = isNavItemActive(item, pathname, user)
          return (
            <CrmNavRow
              key={`${item.label}-${item.to}`}
              to={navTo}
              end={item.end}
              label={item.label}
              letter={letter}
              active={active}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className="crm-scope flex flex-col gap-3.5 px-1 py-1">
      {sections.map((section) => (
        <div key={section.id} className="flex flex-col gap-0.5">
          <span
            className="px-2.5 pb-1.5 pt-1.5 text-[10.5px] font-semibold tracking-[0.04em]"
            style={{ color: 'var(--crm-text-disabled)' }}
          >
            {section.label}
          </span>
          {section.items.map((def) => {
            const item = crmNavDefToNavItem(def) as NavItem
            const navTo = resolveNavPath(item, user)
            const active = isNavItemActive(item, pathname, user)
            return (
              <CrmNavRow
                key={def.id}
                to={navTo}
                end={def.end}
                label={def.label}
                letter={def.letter}
                active={active}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

function CrmNavRow({
  to,
  end,
  label,
  letter,
  active,
}: {
  to: string
  end?: boolean
  label: string
  letter: string
  active: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className="flex items-center gap-2.5 rounded-[13px] px-2.5 py-2.5 transition-colors"
      style={{
        background: active ? 'var(--crm-primary-soft)' : 'transparent',
        color: active ? 'var(--crm-primary-hover)' : 'var(--crm-text-secondary)',
        fontWeight: active ? 600 : 500,
        fontSize: 13,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'var(--crm-surface-muted)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = active
          ? 'var(--crm-primary-soft)'
          : 'transparent'
      }}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] text-[13px] font-semibold"
        style={{
          background: active ? 'var(--crm-primary)' : 'var(--crm-neutral-soft)',
          color: active ? '#ffffff' : 'var(--crm-text-muted)',
        }}
      >
        {letter}
      </span>
      <span className="truncate">{label}</span>
    </NavLink>
  )
}
