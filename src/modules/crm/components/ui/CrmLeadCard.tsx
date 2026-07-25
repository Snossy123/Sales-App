import type { DragEvent } from 'react'
import type { ReferralLead } from '../../../../api/types'
import {
  formatReferralRelativeDue,
  leadDisplayCode,
  referrerLabel,
} from '../../lib/referralLeads'

interface CrmLeadCardProps {
  lead: ReferralLead
  onOpen?: () => void
  onDragStart?: (e: DragEvent) => void
  draggable?: boolean
}

export function CrmLeadCard({
  lead,
  onOpen,
  onDragStart,
  draggable = true,
}: CrmLeadCardProps) {
  const due = formatReferralRelativeDue(lead.follow_up_at)

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onOpen}
      data-tour="crm-lead-card"
      className="flex cursor-grab flex-col gap-2.5 p-2.5 transition-shadow active:cursor-grabbing"
      style={{
        background: 'var(--crm-surface)',
        border: '1px solid var(--crm-border)',
        borderRadius: 'var(--crm-radius-md)',
        boxShadow: 'var(--crm-shadow-card)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--crm-primary-soft-border)'
        e.currentTarget.style.boxShadow = 'var(--crm-shadow-hover)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--crm-border)'
        e.currentTarget.style.boxShadow = 'var(--crm-shadow-card)'
      }}
    >
      <div className="flex items-start justify-between gap-2.5">
        <span className="text-[13.5px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--crm-text)' }}>
          {lead.name || 'بدون اسم'}
        </span>
        <span className="text-[11px] font-medium" style={{ color: 'var(--crm-text-disabled)' }}>
          {leadDisplayCode(lead)}
        </span>
      </div>
      <span className="text-xs tabular-nums" dir="ltr" style={{ color: 'var(--crm-text-muted)' }}>
        {lead.phone}
      </span>
      <div
        className="flex items-center justify-between gap-2.5 pt-2.5"
        style={{ borderTop: '1px solid var(--crm-border-soft)' }}
      >
        <span className="text-[11.5px]" style={{ color: 'var(--crm-text-faint)' }}>
          المُحيل: {referrerLabel(lead)}
        </span>
        <span
          className="text-[11.5px] font-semibold"
          style={{ color: due.overdue ? 'var(--crm-danger)' : 'var(--crm-text-muted)' }}
        >
          {due.label}
        </span>
      </div>
    </div>
  )
}
