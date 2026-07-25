import { DateTimeInput12h } from '../../../components/DateTimeInput12h'
import { Icon } from '../../../components/Icon'

export type ReferralEntry = {
  key: string
  phone: string
  name: string
  follow_up_at: string
  notes: string
}

const inputClass =
  'w-full rounded-[9px] border py-2.5 pe-2.5 ps-10 text-[13px] [border-color:var(--crm-border)] [background:var(--crm-surface-muted)] [color:var(--crm-text)]'

interface ReferralPersonCardProps {
  entry: ReferralEntry
  index: number
  expanded: boolean
  canRemove: boolean
  onToggle: () => void
  onRemove: () => void
  onChange: (patch: Partial<ReferralEntry>) => void
}

export function ReferralPersonCard({
  entry,
  index,
  expanded,
  canRemove,
  onToggle,
  onRemove,
  onChange,
}: ReferralPersonCardProps) {
  const badge = (
    <span
      className="inline-flex rounded-[9px] px-2.5 py-1 text-xs font-bold"
      style={{ background: 'var(--crm-primary-soft)', color: 'var(--crm-primary)' }}
    >
      شخص {index + 1}
    </span>
  )

  if (!expanded) {
    return (
      <div
        className="flex items-center justify-between gap-2 px-3.5 py-2.5"
        style={{
          border: '1px solid var(--crm-border)',
          borderRadius: 'var(--crm-radius-md)',
          background: 'var(--crm-surface)',
        }}
      >
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2 text-start"
        >
          {badge}
          {(entry.phone || entry.name) && (
            <span className="truncate text-sm" style={{ color: 'var(--crm-text-muted)' }}>
              {entry.name || entry.phone}
              {entry.name && entry.phone ? (
                <span className="ms-1 tabular-nums" dir="ltr">
                  · {entry.phone}
                </span>
              ) : null}
            </span>
          )}
          <Icon name="expand_more" size={20} className="ms-auto shrink-0" />
        </button>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex shrink-0 items-center gap-xs text-sm font-medium text-error hover:underline"
          >
            <Icon name="delete" size={16} />
            حذف
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className="space-y-3.5 p-3.5"
      style={{
        border: '1px solid var(--crm-border)',
        borderRadius: 'var(--crm-radius-md)',
        background: 'var(--crm-surface)',
        boxShadow: 'var(--crm-shadow)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onToggle} className="flex items-center gap-2">
          {badge}
          <Icon name="expand_less" size={20} />
        </button>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
            style={{ color: 'var(--crm-danger)' }}
          >
            <Icon name="delete" size={16} />
            حذف
          </button>
        )}
      </div>

      <div className="grid gap-sm sm:grid-cols-2">
        <div>
          <label className="mb-xs block text-sm font-medium text-on-surface">
            رقم الهاتف <span className="text-error">*</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              <Icon name="call" size={18} />
            </span>
            <input
              placeholder="01012345678"
              value={entry.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              required={index === 0}
              className={inputClass}
              dir="ltr"
            />
          </div>
        </div>
        <div>
          <label className="mb-xs block text-sm font-medium text-on-surface">
            الاسم <span className="font-normal text-on-surface-variant">(اختياري)</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              <Icon name="person" size={18} />
            </span>
            <input
              placeholder="الاسم الكامل"
              value={entry.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-sm sm:grid-cols-2">
        <div>
          <label className="mb-xs block text-sm font-medium text-on-surface">
            موعد المتابعة الأولى{' '}
            <span className="font-normal text-on-surface-variant">(اختياري)</span>
          </label>
          <DateTimeInput12h
            value={entry.follow_up_at}
            onChange={(value) => onChange({ follow_up_at: value })}
          />
        </div>
        <div>
          <label className="mb-xs block text-sm font-medium text-on-surface">
            ملاحظات <span className="font-normal text-on-surface-variant">(اختياري)</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute start-3 top-3 text-on-surface-variant">
              <Icon name="description" size={18} />
            </span>
            <textarea
              placeholder="اكتب أي ملاحظات حول الترشيح..."
              value={entry.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              rows={3}
              className={`${inputClass} min-h-[5.5rem] resize-y pt-2.5`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
