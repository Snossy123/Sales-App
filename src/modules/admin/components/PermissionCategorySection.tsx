import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  groupPermissionsByCategory,
  type PermissionDefinition,
} from '../lib/permissionCatalog'
import { PermissionCard } from './PermissionCard'

interface PermissionCategorySectionProps {
  permissions: PermissionDefinition[]
  selected: string[]
  onToggle: (key: string) => void
  onToggleCategory: (keys: string[], select: boolean) => void
}

export function PermissionCategorySection({
  permissions,
  selected,
  onToggle,
  onToggleCategory,
}: PermissionCategorySectionProps) {
  const byCategory = groupPermissionsByCategory(permissions)

  return (
    <div className="space-y-md">
      {CATEGORY_ORDER.map((category) => {
        const items = byCategory[category]
        if (items.length === 0) return null

        const selectedInCategory = items.filter((p) => selected.includes(p.key)).length
        const allSelected = selectedInCategory === items.length

        return (
          <section key={category}>
            <div className="mb-sm flex items-center justify-between gap-sm">
              <div className="flex items-center gap-sm">
                <h3 className="text-sm font-bold text-on-surface">{CATEGORY_LABELS[category]}</h3>
                <span className="text-xs text-on-surface-variant">
                  {selectedInCategory} / {items.length}
                </span>
              </div>
              <label className="flex cursor-pointer items-center gap-xs text-xs text-primary">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() =>
                    onToggleCategory(
                      items.map((p) => p.key),
                      !allSelected,
                    )
                  }
                />
                تحديد الكل في الفئة
              </label>
            </div>
            <div className="grid grid-cols-1 gap-sm sm:grid-cols-2 lg:grid-cols-3">
              {items.map((perm) => (
                <PermissionCard
                  key={perm.key}
                  permission={perm}
                  checked={selected.includes(perm.key)}
                  onChange={onToggle}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
