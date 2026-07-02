export interface PosStockInfoBarProps {
  available: number
  cashPrice: number
  installmentPrice: number
  loading?: boolean
  allowNegativeInventory?: boolean
}

function stockCardClass(primary?: boolean): string {
  return primary
    ? 'min-w-0 rounded-lg border border-primary/25 bg-primary/5 px-2 py-1.5 sm:px-sm sm:py-xs'
    : 'min-w-0 rounded-lg border border-outline-variant/70 bg-surface-container-low px-2 py-1.5 sm:px-sm sm:py-xs'
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
      <div
        className="grid w-full grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:flex-wrap sm:gap-xs"
        data-tour="pos-stock-info"
      >
        {[0, 1, 2].map((key) => (
          <div
            key={key}
            className="h-12 animate-pulse rounded-lg border border-outline-variant/50 bg-surface-container-low sm:h-14 sm:min-w-[5.5rem]"
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className="grid w-full grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:flex-wrap sm:items-stretch sm:gap-xs"
      data-tour="pos-stock-info"
    >
      <div className={stockCardClass(true)}>
        <p className="truncate text-[10px] font-medium text-on-surface-variant sm:text-[11px]">
          متاح
        </p>
        <p className="text-base font-extrabold leading-tight tabular-nums text-primary sm:text-lg">
          {available}
        </p>
      </div>
      <div className={stockCardClass()}>
        <p className="truncate text-[10px] font-medium text-on-surface-variant sm:text-[11px]">
          كاش
        </p>
        <p className="truncate text-xs font-bold leading-tight tabular-nums text-on-surface sm:text-sm">
          {cashPrice.toLocaleString('ar-EG')}{' '}
          <span className="text-[10px] font-medium sm:text-[11px]">ج.م</span>
        </p>
      </div>
      <div className={stockCardClass()}>
        <p className="truncate text-[10px] font-medium text-on-surface-variant sm:text-[11px]">
          تقسيط
        </p>
        <p className="truncate text-xs font-bold leading-tight tabular-nums text-on-surface sm:text-sm">
          {installmentPrice.toLocaleString('ar-EG')}{' '}
          <span className="text-[10px] font-medium sm:text-[11px]">ج.م</span>
        </p>
      </div>
      {allowNegativeInventory ? (
        <span className="col-span-3 self-center text-[10px] text-amber-800 sm:col-auto sm:text-[11px]">
          مخزون سالب
        </span>
      ) : null}
    </div>
  )
}
