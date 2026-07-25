interface CrmBulkActionBarProps {
  count: number
  onClear: () => void
  onAssign?: () => void
  onSchedule?: () => void
  onMarkInstalled?: () => void
  busy?: boolean
}

export function CrmBulkActionBar({
  count,
  onClear,
  onAssign,
  onSchedule,
  onMarkInstalled,
  busy = false,
}: CrmBulkActionBarProps) {
  if (count <= 0) return null

  return (
    <div
      className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2.5 px-3.5 py-2.5"
      style={{
        background: 'var(--crm-ink)',
        color: '#ffffff',
        border: '1px solid var(--crm-ink)',
        borderRadius: 'var(--crm-radius-md)',
        boxShadow: 'var(--crm-shadow-bulk)',
      }}
    >
      <span className="text-[12.5px] font-semibold">{count} ترشيح محدد</span>
      <span className="h-5 w-px" style={{ background: '#33405c' }} />
      {onAssign ? (
        <button
          type="button"
          disabled={busy}
          onClick={onAssign}
          className="h-8 rounded-[9px] border-none px-2.5 text-[12.5px] font-medium text-white disabled:opacity-50"
          style={{ background: 'var(--crm-ink-soft)' }}
        >
          إسناد لموظف
        </button>
      ) : null}
      {onSchedule ? (
        <button
          type="button"
          disabled={busy}
          onClick={onSchedule}
          className="h-8 rounded-[9px] border-none px-2.5 text-[12.5px] font-medium text-white disabled:opacity-50"
          style={{ background: 'var(--crm-ink-soft)' }}
        >
          جدولة متابعة
        </button>
      ) : null}
      {onMarkInstalled ? (
        <button
          type="button"
          disabled={busy}
          onClick={onMarkInstalled}
          className="h-8 rounded-[9px] border-none px-2.5 text-[12.5px] font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--crm-success)' }}
        >
          تعليم كتم التركيب
        </button>
      ) : null}
      <button
        type="button"
        onClick={onClear}
        className="cursor-pointer px-1.5 text-[12.5px]"
        style={{ color: 'var(--crm-text-disabled)' }}
      >
        إلغاء
      </button>
    </div>
  )
}
