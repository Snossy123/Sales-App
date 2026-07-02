export interface PosStockInfoBarProps {
  productName?: string
  available: number
  cashPrice: number
  installmentPrice: number
  loading?: boolean
  allowNegativeInventory?: boolean
}

export function PosStockInfoBar({
  productName,
  available,
  cashPrice,
  installmentPrice,
  loading,
  allowNegativeInventory,
}: PosStockInfoBarProps) {
  if (loading) {
    return (
      <div className="mb-md rounded-xl border border-outline-variant/70 bg-surface-container-low px-md py-sm text-sm text-on-surface-variant">
        جاري تحميل إحصائيات المخزون...
      </div>
    )
  }

  return (
    <div
      className="mb-md rounded-xl border border-primary/20 bg-primary/5 p-md"
      data-tour="pos-stock-info"
    >
      {productName ? (
        <p className="mb-sm text-sm font-semibold text-on-surface">{productName}</p>
      ) : null}
      <div className="grid gap-sm sm:grid-cols-3">
        <div className="text-center sm:text-start">
          <p className="text-xs font-medium text-on-surface-variant">متاح في المخزن</p>
          <p className="text-2xl font-extrabold tabular-nums text-primary">{available}</p>
        </div>
        <div className="text-center sm:text-start">
          <p className="text-xs font-medium text-on-surface-variant">سعر الكاش</p>
          <p className="text-xl font-bold tabular-nums text-on-surface">
            {cashPrice.toLocaleString('ar-EG')}{' '}
            <span className="text-sm font-medium">ج.م</span>
          </p>
        </div>
        <div className="text-center sm:text-start">
          <p className="text-xs font-medium text-on-surface-variant">سعر التقسيط</p>
          <p className="text-xl font-bold tabular-nums text-on-surface">
            {installmentPrice.toLocaleString('ar-EG')}{' '}
            <span className="text-sm font-medium">ج.م</span>
          </p>
        </div>
      </div>
      {allowNegativeInventory ? (
        <p className="mt-sm text-xs text-amber-800">المخزون السالب مفعّل</p>
      ) : null}
    </div>
  )
}
