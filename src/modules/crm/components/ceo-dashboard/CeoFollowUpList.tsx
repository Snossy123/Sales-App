import { Link } from 'react-router-dom'
import type { CeoDashboardFollowUp } from '../../../../api/types'
import { Icon } from '../../../../components/Icon'
import { CeoCard } from './CeoCard'

interface CeoFollowUpListProps {
  items: CeoDashboardFollowUp[]
  formatDateTime: (value?: string | null) => string
}

function chipFor(item: CeoDashboardFollowUp): { label: string; color: string; tint: string } {
  if (item.source === 'referral') {
    return {
      label: 'متابعة ترشيح',
      color: '#64748b',
      tint: 'var(--crm-neutral-soft)',
    }
  }
  if (
    item.schedule_type === 'meeting' ||
    item.schedule_type === 'offer' ||
    item.schedule_type === 'presentation'
  ) {
    return {
      label: 'عرض متأخر',
      color: 'var(--crm-warning)',
      tint: 'var(--crm-warning-soft)',
    }
  }
  return {
    label: 'متابعة متأخرة',
    color: 'var(--crm-danger)',
    tint: 'var(--crm-danger-soft)',
  }
}

function displayTitle(item: CeoDashboardFollowUp) {
  if (item.customer?.name) return item.customer.name
  if (item.lead?.name) return item.lead.name
  if (item.referral?.name) return item.referral.name
  return item.title
}

export function CeoFollowUpList({ items, formatDateTime }: CeoFollowUpListProps) {
  return (
    <CeoCard
      title="المتأخرون في المتابعة"
      subtitle={`${items.length} عناصر تحتاج إجراءً`}
      icon={
        <div
          className="flex h-8 w-8 items-center justify-center rounded-[9px]"
          style={{ background: 'var(--crm-warning-soft)', color: 'var(--crm-warning)' }}
        >
          <Icon name="schedule" size={17} />
        </div>
      }
      action={
        <Link
          to="/crm/tasks"
          className="text-[12.5px] font-semibold"
          style={{ color: 'var(--crm-primary)' }}
        >
          عرض المهام
        </Link>
      }
      headerClassName="mb-2 items-center"
    >
      {items.length === 0 ? (
        <p className="py-8 text-center text-[13px]" style={{ color: 'var(--crm-text-faint)' }}>
          لا توجد متابعات متأخرة
        </p>
      ) : (
        <div className="flex flex-col">
          {items.slice(0, 6).map((item) => {
            const chip = chipFor(item)
            return (
              <div
                key={`${item.source}-${item.id}`}
                className="flex items-center justify-between gap-3 px-1.5 py-3"
                style={{ borderTop: '1px solid var(--crm-border-soft)' }}
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span
                    className="truncate text-[13.5px] font-semibold"
                    style={{ color: 'var(--crm-text)' }}
                  >
                    {displayTitle(item)}
                  </span>
                  <span className="text-[11.5px]" style={{ color: 'var(--crm-text-faint)' }}>
                    {formatDateTime(item.start_datetime)}
                  </span>
                </div>
                <span
                  className="shrink-0 rounded-[8px] px-2.5 py-1 text-[11px] font-semibold"
                  style={{ background: chip.tint, color: chip.color }}
                >
                  {chip.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </CeoCard>
  )
}
