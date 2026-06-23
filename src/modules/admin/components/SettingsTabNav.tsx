import { NavIcon } from '../../../components/NavIcon'
import type { SettingsTab } from '../lib/systemSettingsCatalog'
import { SETTINGS_TABS } from '../lib/systemSettingsCatalog'

interface SettingsTabNavProps {
  active: SettingsTab
  onChange: (tab: SettingsTab) => void
}

export function SettingsTabNav({ active, onChange }: SettingsTabNavProps) {
  return (
    <nav className="mb-md flex flex-wrap gap-xs border-b border-outline-variant pb-sm">
      {SETTINGS_TABS.map((tab) => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-xs rounded-lg px-md py-sm text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <NavIcon name={tab.icon} size={18} />
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
