import type { PermissionDefinition } from '../lib/permissionCatalog'

interface PermissionCardProps {
  permission: PermissionDefinition
  checked: boolean
  onChange: (key: string) => void
}

export function PermissionCard({ permission, checked, onChange }: PermissionCardProps) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-sm rounded-xl border p-sm transition-colors ${
        checked
          ? 'border-primary/40 bg-primary/5'
          : 'border-outline-variant bg-surface-container-lowest hover:border-outline'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onChange(permission.key)}
        className="mt-0.5 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-on-surface">{permission.label}</p>
        <p className="mt-xs text-xs leading-relaxed text-on-surface-variant">{permission.description}</p>
      </div>
    </label>
  )
}
