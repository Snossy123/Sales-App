import { Link } from 'react-router-dom'
import type { CeoDashboardInstallationItem } from '../../../../api/types'
import { Icon } from '../../../../components/Icon'
import { CeoCard } from './CeoCard'

const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  assigned: 'مُسند',
  in_progress: 'جارٍ التنفيذ',
  completed: 'مكتمل',
  cancelled: 'ملغى',
}

const STATUS_CHIP: Record<string, string> = {
  completed: 'bg-[#e9f7ef] text-[#16a34a]',
  in_progress: 'bg-[#eef3ff] text-primary',
  assigned: 'bg-[#f1f3f7] text-[#64748b]',
  pending: 'bg-[#fef4e9] text-[#e58a1a]',
  cancelled: 'bg-[#fdeded] text-[#dc2626]',
}

const AVATAR_TONES = [
  'bg-[#eef3ff] text-primary',
  'bg-[#f1ecfe] text-[#7c5cfc]',
  'bg-[#e9f7ef] text-[#16a34a]',
  'bg-[#fef1e6] text-[#e58a1a]',
]

interface CeoInstallationListProps {
  items: CeoDashboardInstallationItem[]
  count: number
  formatDateTime: (value?: string | null) => string
}

function initialOf(name?: string | null) {
  const trimmed = (name ?? 'عميل').trim()
  return trimmed ? trimmed[0] : 'ع'
}

export function CeoInstallationList({ items, count, formatDateTime }: CeoInstallationListProps) {
  return (
    <CeoCard
      title="التركيبات اليوم"
      subtitle={`${count} مهام مجدولة`}
      icon={
        <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#eef3ff] text-primary">
          <Icon name="handyman" size={17} />
        </div>
      }
      action={
        <Link to="/support/tasks" className="text-[12.5px] font-semibold text-primary hover:underline">
          المهام
        </Link>
      }
      headerClassName="mb-2 items-center"
    >
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#8890a0]">لا توجد تركيبات مجدولة اليوم</p>
      ) : (
        <div className="flex flex-col">
          {items.slice(0, 6).map((item, index) => (
            <div
              key={item.id}
              className="flex items-center gap-3 border-t border-[#f1f3f8] px-1.5 py-3"
            >
              <div
                className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] text-sm font-bold ${AVATAR_TONES[index % AVATAR_TONES.length]}`}
              >
                {initialOf(item.customer_name)}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[13.5px] font-semibold text-[#1f2531]">
                  {item.customer_name ?? 'عميل'}
                </span>
                <span className="text-[11.5px] text-[#9098a8]">
                  {formatDateTime(item.scheduled_at)}
                </span>
              </div>
              <span
                className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${STATUS_CHIP[item.status] ?? 'bg-[#f1f3f7] text-[#64748b]'}`}
              >
                {STATUS_LABELS[item.status] ?? item.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </CeoCard>
  )
}
