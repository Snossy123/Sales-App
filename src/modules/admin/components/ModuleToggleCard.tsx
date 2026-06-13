import { Link } from 'react-router-dom'
import { Icon } from '../../../components/Icon'
import type { ModuleDefinition } from '../lib/systemSettingsCatalog'

interface ModuleToggleCardProps {
  module: ModuleDefinition
  enabled: boolean
  onToggle?: (key: string) => void
}

export function ModuleToggleCard({ module, enabled, onToggle }: ModuleToggleCardProps) {
  const isLocked = module.alwaysOn

  return (
    <div className="flex flex-col gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-md sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-sm">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            enabled || isLocked ? 'bg-primary/10 text-primary' : 'bg-surface-container text-on-surface-variant'
          }`}
        >
          <Icon name={isLocked ? 'point_of_sale' : 'extension'} size={22} className="no-flip" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-xs">
            <h3 className="text-sm font-bold text-on-surface">{module.label}</h3>
            {isLocked && (
              <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary">
                أساسي
              </span>
            )}
            {!isLocked && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  enabled ? 'bg-secondary/10 text-secondary' : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                {enabled ? 'مفعّل' : 'معطّل'}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-on-surface-variant">{module.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-sm">
        {module.settingsPath && enabled && (
          <Link
            to={module.settingsPath}
            className="flex items-center gap-xs rounded-lg border border-outline-variant px-sm py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
          >
            <Icon name="settings" size={16} className="no-flip" />
            إعدادات الوحدة
          </Link>
        )}
        {!isLocked && onToggle && (
          <label className="flex cursor-pointer items-center gap-xs text-sm">
            <input
              type="checkbox"
              checked={enabled}
              onChange={() => onToggle(module.key)}
              className="h-4 w-4 rounded border-outline-variant accent-primary"
            />
            <span className="text-on-surface-variant">{enabled ? 'إيقاف' : 'تفعيل'}</span>
          </label>
        )}
      </div>
    </div>
  )
}
