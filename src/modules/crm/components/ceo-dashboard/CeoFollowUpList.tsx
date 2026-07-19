import { Link } from 'react-router-dom'
import type { CeoDashboardFollowUp } from '../../../../api/types'
import { Icon } from '../../../../components/Icon'
import { CeoCard } from './CeoCard'

interface CeoFollowUpListProps {
  items: CeoDashboardFollowUp[]
  formatDateTime: (value?: string | null) => string
}

function chipFor(item: CeoDashboardFollowUp): { label: string; className: string } {
  if (item.source === 'referral') {
    return {
      label: 'متابعة ترشيح',
      className: 'bg-[#f1f3f7] text-[#64748b]',
    }
  }
  if (item.schedule_type === 'meeting' || item.schedule_type === 'offer' || item.schedule_type === 'presentation') {
    return {
      label: 'عرض متأخر',
      className: 'bg-[#fef4e9] text-[#e58a1a]',
    }
  }
  return {
    label: 'متابعة متأخرة',
    className: 'bg-[#fdeded] text-[#dc2626]',
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
        <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#fef1e6] text-[#e58a1a]">
          <Icon name="schedule" size={17} />
        </div>
      }
      action={
        <Link to="/crm/referrals/follow-ups" className="text-[12.5px] font-semibold text-primary hover:underline">
          عرض الكل
        </Link>
      }
      headerClassName="mb-2 items-center"
    >
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#8890a0]">لا توجد متابعات متأخرة</p>
      ) : (
        <div className="flex flex-col">
          {items.slice(0, 6).map((item) => {
            const chip = chipFor(item)
            return (
              <div
                key={`${item.source}-${item.id}`}
                className="flex items-center justify-between gap-3 border-t border-[#f1f3f8] px-1.5 py-3"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[13.5px] font-semibold text-[#1f2531]">
                    {displayTitle(item)}
                  </span>
                  <span className="text-[11.5px] text-[#9098a8]">
                    {formatDateTime(item.start_datetime)}
                  </span>
                </div>
                <span
                  className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${chip.className}`}
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
