import type { ReactNode } from 'react'
import '../crmTheme.css'

interface CrmPageShellProps {
  title: string
  subtitle?: string
  kicker?: string
  headerExtra?: ReactNode
  actions?: ReactNode
  filters?: ReactNode
  /** Narrow content column (forms) */
  narrow?: boolean
  children: ReactNode
}

/**
 * Unified CRM page chrome matching the redesign mockup header.
 */
export function CrmPageShell({
  title,
  subtitle,
  kicker = 'المبيعات',
  headerExtra,
  actions,
  filters,
  narrow = false,
  children,
}: CrmPageShellProps) {
  return (
    <div
      className={`crm-scope ${narrow ? 'mx-auto max-w-3xl pb-24' : ''}`}
      style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
    >
      <div className="flex flex-wrap items-start justify-between gap-[18px]">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span
            className="text-[11.5px] font-semibold tracking-[0.02em]"
            style={{ color: 'var(--crm-text-faint)' }}
          >
            {kicker}
          </span>
          <h1
            className="m-0 text-[25px] font-bold tracking-[-0.02em]"
            style={{ color: 'var(--crm-text)' }}
          >
            {title}
          </h1>
          {subtitle ? (
            <p
              className="m-0 max-w-[70ch] text-[13.5px] text-pretty"
              style={{ color: 'var(--crm-text-muted)' }}
            >
              {subtitle}
            </p>
          ) : null}
          {headerExtra}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
      </div>
      {filters}
      {children}
    </div>
  )
}

/** Shared filter / period panel used across CRM list & report pages */
export function CrmFilterPanel({ children }: { children: ReactNode }) {
  return (
    <section
      className="flex flex-wrap items-center gap-2.5 p-3.5"
      style={{
        background: 'var(--crm-surface)',
        border: '1px solid var(--crm-border)',
        borderRadius: 'var(--crm-radius-md)',
        boxShadow: 'var(--crm-shadow)',
      }}
    >
      {children}
    </section>
  )
}

export const CRM_PRIMARY_BTN =
  'inline-flex h-[38px] items-center gap-2 rounded-[9px] px-3.5 text-[13px] font-semibold text-white transition-colors [background:var(--crm-primary)] [box-shadow:0_1px_2px_rgba(15,23,42,.06)] hover:[background:var(--crm-primary-hover)]'

export const CRM_SECONDARY_BTN =
  'inline-flex h-[38px] items-center gap-2 rounded-[9px] border px-3.5 text-[13px] font-medium transition-colors [border-color:var(--crm-border)] [background:var(--crm-surface)] [color:var(--crm-text-secondary)] hover:[border-color:var(--crm-text-disabled)] hover:[background:var(--crm-surface-muted)]'

export const CRM_INPUT =
  'h-[38px] rounded-[9px] border px-2.5 text-[13px] outline-none [border-color:var(--crm-border)] [background:var(--crm-surface-muted)] [color:var(--crm-text)] focus:[border-color:var(--crm-primary)]'
