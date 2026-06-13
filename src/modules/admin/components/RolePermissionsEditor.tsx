import { useMemo, useState } from 'react'
import { Icon } from '../../../components/Icon'
import {
  getAllPermissions,
  groupPermissionsByModule,
  searchPermissions,
  type ModuleGroup,
  type PermissionDefinition,
} from '../lib/permissionCatalog'
import { PermissionCategorySection } from './PermissionCategorySection'
import { PermissionModuleNav } from './PermissionModuleNav'

interface RolePermissionsEditorProps {
  roleName: string
  selected: string[]
  apiPermissionKeys?: string[]
  onChange: (permissions: string[]) => void
  onRoleNameChange?: (name: string) => void
  isNew?: boolean
}

export function RolePermissionsEditor({
  roleName,
  selected,
  apiPermissionKeys,
  onChange,
  onRoleNameChange,
  isNew,
}: RolePermissionsEditorProps) {
  const [search, setSearch] = useState('')
  const [activeModule, setActiveModule] = useState('dashboard')

  const allPermissions = useMemo(
    () => getAllPermissions(apiPermissionKeys),
    [apiPermissionKeys],
  )

  const filteredPermissions = useMemo(
    () => searchPermissions(allPermissions, search),
    [allPermissions, search],
  )

  const modules = useMemo(
    () => groupPermissionsByModule(filteredPermissions, selected),
    [filteredPermissions, selected],
  )

  const activeModuleGroup = useMemo(() => {
    const found = modules.find((m) => m.module === activeModule)
    return found ?? modules[0]
  }, [modules, activeModule])

  const togglePermission = (key: string) => {
    onChange(
      selected.includes(key) ? selected.filter((p) => p !== key) : [...selected, key],
    )
  }

  const toggleKeys = (keys: string[], select: boolean) => {
    if (select) {
      onChange([...new Set([...selected, ...keys])])
      return
    }
    onChange(selected.filter((k) => !keys.includes(k)))
  }

  const toggleModule = (module: string, select: boolean) => {
    const mod = modules.find((m) => m.module === module)
    if (!mod) return
    toggleKeys(
      mod.permissions.map((p) => p.key),
      select,
    )
  }

  const modulePermissions = activeModuleGroup?.permissions ?? []
  const totalSelected = selected.length
  const totalAvailable = allPermissions.length

  return (
    <div className="space-y-md">
      <div className="flex flex-wrap items-center gap-md rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
        {isNew && onRoleNameChange ? (
          <input
            value={roleName}
            onChange={(e) => onRoleNameChange(e.target.value)}
            placeholder="اسم الدور"
            required
            dir="ltr"
            className="min-w-[200px] flex-1 rounded-lg border border-outline-variant px-sm py-2 text-sm"
          />
        ) : (
          <div>
            <p className="text-xs text-on-surface-variant">الدور</p>
            <p className="text-lg font-bold text-on-surface">{roleName}</p>
          </div>
        )}
        <div className="mr-auto text-sm text-on-surface-variant">
          محدد <span className="font-bold text-primary">{totalSelected}</span> / {totalAvailable}
        </div>
        <div className="relative min-w-[240px] flex-1">
          <Icon
            name="search"
            size={18}
            className="pointer-events-none absolute right-sm top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في الصلاحيات..."
            className="w-full rounded-lg border border-outline-variant py-2 pr-xl pl-sm text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-md lg:grid-cols-[240px_1fr]">
        <aside className="rounded-xl border border-outline-variant bg-surface-container-lowest p-sm lg:sticky lg:top-4 lg:self-start">
          <PermissionModuleNav
            modules={modules}
            activeModule={activeModuleGroup?.module ?? 'dashboard'}
            onSelect={setActiveModule}
            onToggleModule={toggleModule}
          />
        </aside>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
          {activeModuleGroup ? (
            <>
              <div className="mb-md flex flex-wrap items-center justify-between gap-sm border-b border-outline-variant pb-sm">
                <div>
                  <h2 className="text-base font-bold text-on-surface">{activeModuleGroup.label}</h2>
                  <p className="text-xs text-on-surface-variant">
                    محدد {activeModuleGroup.selectedCount} / {activeModuleGroup.totalCount}
                  </p>
                </div>
                <label className="flex cursor-pointer items-center gap-xs text-xs text-primary">
                  <input
                    type="checkbox"
                    checked={
                      activeModuleGroup.selectedCount === activeModuleGroup.totalCount &&
                      activeModuleGroup.totalCount > 0
                    }
                    onChange={() =>
                      toggleModule(
                        activeModuleGroup.module,
                        activeModuleGroup.selectedCount !== activeModuleGroup.totalCount,
                      )
                    }
                  />
                  تحديد الكل في الوحدة
                </label>
              </div>
              <PermissionCategorySection
                permissions={modulePermissions}
                selected={selected}
                onToggle={togglePermission}
                onToggleCategory={toggleKeys}
              />
            </>
          ) : (
            <p className="py-lg text-center text-sm text-on-surface-variant">لا توجد صلاحيات مطابقة</p>
          )}
        </div>
      </div>
    </div>
  )
}

export type { ModuleGroup, PermissionDefinition }
