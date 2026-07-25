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

const STATUS_CHIP: Record<string, { color: string; tint: string }> = {
  completed: { color: 'var(--crm-success)', tint: 'var(--crm-success-soft)' },
  in_progress: { color: 'var(--crm-primary)', tint: 'var(--crm-primary-soft)' },
  assigned: { color: '#64748b', tint: 'var(--crm-neutral-soft)' },
  pending: { color: 'var(--crm-warning)', tint: 'var(--crm-warning-soft)' },
  cancelled: { color: 'var(--crm-danger)', tint: 'var(--crm-danger-soft)' },
}

const AVATAR_TONES = [
  { bg: 'var(--crm-primary-soft)', color: 'var(--crm-primary)' },
  { bg: '#f1ecfe', color: '#7c5cfc' },
  { bg: 'var(--crm-success-soft)', color: 'var(--crm-success)' },
  { bg: 'var(--crm-warning-soft)', color: 'var(--crm-warning)' },
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
        <div
          className="flex h-8 w-8 items-center justify-center rounded-[9px]"
          style={{ background: 'var(--crm-primary-soft)', color: 'var(--crm-primary)' }}
        >
          <Icon name="handyman" size={17} />
        </div>
      }
      action={
        <Link
          to="/support/tasks"
          className="text-[12.5px] font-semibold"
          style={{ color: 'var(--crm-primary)' }}
        >
          المهام
        </Link>
      }
      headerClassName="mb-2 items-center"
    >
      {items.length === 0 ? (
        <p className="py-8 text-center text-[13px]" style={{ color: 'var(--crm-text-faint)' }}>
          لا توجد تركيبات مجدولة اليوم
        </p>
      ) : (
        <div className="flex flex-col">
          {items.slice(0, 6).map((item, index) => {
            const tone = AVATAR_TONES[index % AVATAR_TONES.length]
            const chip = STATUS_CHIP[item.status] ?? {
              color: 'var(--crm-text-muted)',
              tint: 'var(--crm-neutral-soft)',
            }
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 px-1.5 py-3"
                style={{ borderTop: '1px solid var(--crm-border-soft)' }}
              >
                <div
                  className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] text-sm font-bold"
                  style={{ background: tone.bg, color: tone.color }}
                >
                  {initialOf(item.customer_name)}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span
                    className="truncate text-[13.5px] font-semibold"
                    style={{ color: 'var(--crm-text)' }}
                  >
                    {item.customer_name ?? 'عميل'}
                  </span>
                  <span className="text-[11.5px]" style={{ color: 'var(--crm-text-faint)' }}>
                    {formatDateTime(item.scheduled_at)}
                  </span>
                </div>
                <span
                  className="shrink-0 rounded-[8px] px-2.5 py-1 text-[11px] font-semibold"
                  style={{ background: chip.tint, color: chip.color }}
                >
                  {STATUS_LABELS[item.status] ?? item.status}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </CeoCard>
  )
}
