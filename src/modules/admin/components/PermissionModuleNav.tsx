import { Icon } from '../../../components/Icon'
import type { PermissionSection } from '../lib/permissionCatalog'

interface PermissionModuleNavProps {
  sections: PermissionSection[]
  activeModule: string
  onSelect: (module: string) => void
  onToggleModule: (module: string, select: boolean) => void
  onToggleSection: (sectionId: string, select: boolean) => void
}

export function PermissionModuleNav({
  sections,
  activeModule,
  onSelect,
  onToggleModule,
  onToggleSection,
}: PermissionModuleNavProps) {
  return (
    <nav className="flex flex-col gap-sm">
      <p className="px-sm text-xs font-bold uppercase tracking-wide text-on-surface-variant">
        الموديولات
      </p>

      {sections.map((section) => {
        const allSectionSelected =
          section.selectedCount === section.totalCount && section.totalCount > 0
        const hasSingleModule = section.modules.length === 1

        return (
          <div key={section.id} className="rounded-lg border border-outline-variant/60 bg-surface-container-low">
            <div className="flex items-center gap-xs border-b border-outline-variant/50 px-sm py-xs">
              <Icon name={section.icon} size={16} className="shrink-0 text-on-surface-variant" />
              <span className="flex-1 text-xs font-bold text-on-surface">{section.label}</span>
              <span className="text-[11px] tabular-nums text-on-surface-variant">
                {section.selectedCount}/{section.totalCount}
              </span>
              <input
                type="checkbox"
                title={`تحديد كل صلاحيات ${section.label}`}
                checked={allSectionSelected}
                onChange={() => onToggleSection(section.id, !allSectionSelected)}
                className="shrink-0"
              />
            </div>

            <div className="flex flex-col gap-2xs p-xs">
              {section.modules.map((mod) => {
                const isActive = mod.module === activeModule
                const allSelected = mod.selectedCount === mod.totalCount && mod.totalCount > 0

                return (
                  <div key={mod.module} className="flex items-center gap-xs">
                    <button
                      type="button"
                      onClick={() => onSelect(mod.module)}
                      className={`flex flex-1 items-center justify-between rounded-md px-sm py-xs text-sm transition-colors ${
                        isActive
                          ? 'bg-primary/12 font-semibold text-primary ring-1 ring-primary/25'
                          : 'text-on-surface-variant hover:bg-surface-container-high'
                      } ${hasSingleModule ? 'font-medium' : ''}`}
                    >
                      <span className="truncate">{hasSingleModule ? section.label : mod.label}</span>
                      <span className="mr-xs text-[11px] tabular-nums opacity-80">
                        {mod.selectedCount}/{mod.totalCount}
                      </span>
                    </button>
                    {!hasSingleModule && (
                      <input
                        type="checkbox"
                        title={`تحديد كل صلاحيات ${mod.label}`}
                        checked={allSelected}
                        onChange={() => onToggleModule(mod.module, !allSelected)}
                        className="shrink-0"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </nav>
  )
}
