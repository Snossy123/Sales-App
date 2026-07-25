import type { DragEvent } from 'react'
import type { CrmTask } from '../../../../api/types'
import { CRM_TASK_PRIORITY_LABELS } from '../../api/tasks'
import { formatReferralRelativeDue } from '../../lib/referralLeads'

const PRIORITY_STYLE: Record<string, { fg: string; bg: string }> = {
  high: { fg: '#dc2626', bg: '#fdecec' },
  medium: { fg: '#1d4ed8', bg: '#eff4fe' },
  low: { fg: '#64748b', bg: '#eef1f7' },
}

interface CrmTaskCardProps {
  task: CrmTask
  done?: boolean
  onDragStart?: (e: DragEvent) => void
  onClick?: () => void
}

export function CrmTaskCard({ task, done = false, onDragStart, onClick }: CrmTaskCardProps) {
  const pr = PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE.medium
  const due = formatReferralRelativeDue(task.deadline)

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="flex cursor-grab flex-col gap-2.5 p-2.5 transition-shadow active:cursor-grabbing"
      style={{
        background: 'var(--crm-surface)',
        border: '1px solid var(--crm-border)',
        borderRadius: 'var(--crm-radius-md)',
        opacity: done ? 0.75 : 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--crm-primary-soft-border)'
        e.currentTarget.style.boxShadow = 'var(--crm-shadow-hover)'
        if (done) e.currentTarget.style.opacity = '1'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--crm-border)'
        e.currentTarget.style.boxShadow = 'none'
        if (done) e.currentTarget.style.opacity = '0.75'
      }}
    >
      <div className="flex items-center justify-between gap-2.5">
        <span
          className="text-[13px] font-semibold"
          style={{
            color: done ? 'var(--crm-text-muted)' : 'var(--crm-text)',
            textDecoration: done ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </span>
        {!done ? (
          <span
            className="rounded-[9px] px-2.5 py-0.5 text-[10.5px] font-semibold"
            style={{ color: pr.fg, background: pr.bg }}
          >
            {CRM_TASK_PRIORITY_LABELS[task.priority] ?? task.priority}
          </span>
        ) : null}
      </div>
      <span className="text-xs" style={{ color: done ? 'var(--crm-text-faint)' : 'var(--crm-text-muted)' }}>
        {task.employee?.name ?? '—'}
      </span>
      <div
        className="flex items-center justify-between pt-2.5"
        style={{ borderTop: '1px solid var(--crm-border-soft)' }}
      >
        <span className="text-[11.5px]" style={{ color: 'var(--crm-text-faint)' }}>
          {task.tags?.[0] ?? 'مهمة'}
        </span>
        <span
          className="text-[11.5px] font-semibold"
          style={{
            color: done
              ? 'var(--crm-text)'
              : due.overdue
                ? 'var(--crm-danger)'
                : 'var(--crm-text-muted)',
          }}
        >
          {done ? 'مكتملة' : due.label}
        </span>
      </div>
    </div>
  )
}
