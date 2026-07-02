import { createPortal } from 'react-dom'
import { Icon } from '../Icon'

interface PosMobileCheckoutBarProps {
  totalEstimate: number
  paidAtCheckout: number
  submitDisabled: boolean
  submitPending: boolean
}

export function PosMobileCheckoutBar({
  totalEstimate,
  paidAtCheckout,
  submitDisabled,
  submitPending,
}: PosMobileCheckoutBarProps) {
  const submitLabel = submitPending ? 'جاري الحفظ...' : 'إتمام التعاقد'
  const showDueNow = Math.abs(paidAtCheckout - totalEstimate) > 0.009

  return createPortal(
    <div
      className="fixed inset-x-0 z-[49] border-t border-outline-variant bg-surface-container-lowest shadow-[0_-6px_20px_rgba(0,0,0,0.1)] lg:hidden"
      style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="mx-auto flex max-w-screen-xl items-center gap-sm px-margin py-sm">
        <div className="min-w-0 flex-1 space-y-0.5 tabular-nums">
          <div className="flex items-baseline justify-between gap-sm">
            <span className="shrink-0 text-[11px] font-medium text-on-surface-variant">
              إجمالي التعاقد
            </span>
            <span className="text-base font-extrabold leading-tight text-on-surface sm:text-lg">
              {totalEstimate.toLocaleString('ar-EG')} ج.م
            </span>
          </div>
          {showDueNow ? (
            <div className="flex items-baseline justify-between gap-sm">
              <span className="shrink-0 text-[11px] font-medium text-on-surface-variant">
                المطلوب الآن
              </span>
              <span className="text-sm font-bold leading-tight text-tertiary">
                {paidAtCheckout.toLocaleString('ar-EG')} ج.م
              </span>
            </div>
          ) : null}
        </div>
        <button
          type="submit"
          form="pos-checkout-form"
          disabled={submitDisabled}
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-xs rounded-xl bg-secondary px-md py-3 text-sm font-bold text-on-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="check_circle" size={20} />
          <span className="whitespace-nowrap">{submitLabel}</span>
        </button>
      </div>
    </div>,
    document.body,
  )
}
