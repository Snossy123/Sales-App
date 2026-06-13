import type { ModuleGroup } from '../lib/permissionCatalog'

interface PermissionModuleNavProps {
  modules: ModuleGroup[]
  activeModule: string
  onSelect: (module: string) => void
  onToggleModule: (module: string, select: boolean) => void
}

export function PermissionModuleNav({
  modules,
  activeModule,
  onSelect,
  onToggleModule,
}: PermissionModuleNavProps) {
  return (
    <nav className="flex flex-col gap-xs">
      <p className="mb-xs px-sm text-xs font-bold uppercase tracking-wide text-on-surface-variant">
        الوحدات
      </p>
      {modules.map((mod) => {
        const isActive = mod.module === activeModule
        const allSelected = mod.selectedCount === mod.totalCount && mod.totalCount > 0

        return (
          <div key={mod.module} className="flex items-center gap-xs">
            <button
              type="button"
              onClick={() => onSelect(mod.module)}
              className={`flex flex-1 items-center justify-between rounded-lg px-sm py-xs text-sm transition-colors ${
                isActive
                  ? 'border-r-[3px] border-primary bg-primary/10 font-semibold text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <span>{mod.label}</span>
              <span className="text-xs tabular-nums">
                {mod.selectedCount} / {mod.totalCount}
              </span>
            </button>
            <input
              type="checkbox"
              title="تحديد كل صلاحيات الوحدة"
              checked={allSelected}
              onChange={() => onToggleModule(mod.module, !allSelected)}
              className="shrink-0"
            />
          </div>
        )
      })}
    </nav>
  )
}
