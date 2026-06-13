import type { ReactNode } from 'react'

interface SettingsSectionCardProps {
  title: string
  description?: string
  children: ReactNode
}

export function SettingsSectionCard({ title, description, children }: SettingsSectionCardProps) {
  return (
    <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
      <div className="mb-md">
        <h2 className="text-base font-bold text-on-surface">{title}</h2>
        {description && (
          <p className="mt-xs text-sm text-on-surface-variant">{description}</p>
        )}
      </div>
      <div className="space-y-md">{children}</div>
    </section>
  )
}

interface FieldProps {
  label: string
  hint?: string
  children: ReactNode
  className?: string
}

export function SettingsField({ label, hint, children, className }: FieldProps) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-on-surface">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-on-surface-variant">{hint}</p>}
    </div>
  )
}

export const settingsInputClass =
  'w-full rounded-lg border border-outline-variant bg-surface px-sm py-2 text-sm text-on-surface'

export const settingsToggleClass = 'h-4 w-4 rounded border-outline-variant accent-primary'
