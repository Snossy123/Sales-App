import { Icon } from '../Icon'
import type { ExcessAllocationPreview } from '../../lib/collectionHelpers'

interface OverpaymentConfirmDialogProps {
  open: boolean
  currentDue: number
  paymentAmount: number
  allocations: ExcessAllocationPreview[]
  isPending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

function formatMoney(value: number): string {
  return value.toLocaleString('ar-EG', { numberingSystem: 'latn' })
}

export function OverpaymentConfirmDialog({
  open,
  currentDue,
  paymentAmount,
  allocations,
  isPending = false,
  onConfirm,
  onCancel,
}: OverpaymentConfirmDialogProps) {
  if (!open) return null

  const excess = Math.round((paymentAmount - currentDue) * 100) / 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-md">
      <div
        className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="overpay-dialog-title"
      >
        <h2 id="overpay-dialog-title" className="mb-sm text-base font-bold text-on-surface">
          توزيع الزيادة على الأقساط التالية
        </h2>
        <p className="mb-md text-sm text-on-surface-variant">
          المبلغ المدفوع ({formatMoney(paymentAmount)} ج.م) أكبر من متبقي هذا القسط (
          {formatMoney(currentDue)} ج.م). سيتم سداد القسط الحالي بالكامل وتطبيق الزيادة (
          {formatMoney(Math.max(0, excess))} ج.م) على الأقساط التالية بالترتيب.
        </p>
        {allocations.length > 0 && (
          <ul className="mb-lg space-y-xs rounded-lg bg-surface-container-low p-sm text-sm">
            {allocations.map((item) => (
              <li key={item.installmentId} className="flex items-center justify-between gap-sm">
                <span className="text-on-surface">قسط رقم {item.sequence}</span>
                <span className="tabular-nums text-on-surface">
                  {formatMoney(item.amount)} ج.م
                  {item.remainingAfter > 0.009 ? (
                    <span className="ms-1 text-xs text-on-surface-variant">
                      (يتبقى {formatMoney(item.remainingAfter)})
                    </span>
                  ) : (
                    <span className="ms-1 text-xs text-on-surface-variant">(كامل)</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end gap-sm">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg border border-outline-variant px-md py-sm text-sm"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
          >
            <Icon name="payments" size={18} />
            {isPending ? 'جاري التحصيل...' : 'الموافقة والتحصيل'}
          </button>
        </div>
      </div>
    </div>
  )
}
