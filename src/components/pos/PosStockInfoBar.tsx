export interface PosStockInfoBarProps {
  available: number
  cashPrice: number
  installmentPrice: number
  loading?: boolean
  allowNegativeInventory?: boolean
}

export function PosStockInfoBar({
  available,
  cashPrice,
  installmentPrice,
  loading,
  allowNegativeInventory,
}: PosStockInfoBarProps) {
  if (loading) {
    return (
      <div className="flex flex-wrap items-stretch gap-xs" data-tour="pos-stock-info">
        {[0, 1, 2].map((key) => (
          <div
            key={key}
            className="h-14 min-w-[5.5rem] animate-pulse rounded-lg border border-outline-variant/50 bg-surface-container-low"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-stretch gap-xs" data-tour="pos-stock-info">
      <div className="rounded-lg border border-primary/25 bg-primary/5 px-sm py-xs">
        <p className="text-[11px] font-medium text-on-surface-variant">متاح</p>
        <p className="text-lg font-extrabold leading-tight tabular-nums text-primary">
          {available}
        </p>
      </div>
      <div className="rounded-lg border border-outline-variant/70 bg-surface-container-low px-sm py-xs">
        <p className="text-[11px] font-medium text-on-surface-variant">كاش</p>
        <p className="text-sm font-bold leading-tight tabular-nums text-on-surface">
          {cashPrice.toLocaleString('ar-EG')}{' '}
          <span className="text-[11px] font-medium">ج.م</span>
        </p>
      </div>
      <div className="rounded-lg border border-outline-variant/70 bg-surface-container-low px-sm py-xs">
        <p className="text-[11px] font-medium text-on-surface-variant">تقسيط</p>
        <p className="text-sm font-bold leading-tight tabular-nums text-on-surface">
          {installmentPrice.toLocaleString('ar-EG')}{' '}
          <span className="text-[11px] font-medium">ج.م</span>
        </p>
      </div>
      {allowNegativeInventory ? (
        <span className="self-center text-[11px] text-amber-800">مخزون سالب</span>
      ) : null}
    </div>
  )
}
