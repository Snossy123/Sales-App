import { createPortal } from 'react-dom'
import { Icon } from '../Icon'

interface PosMobileCheckoutBarProps {
  totalEstimate: number
  paidAtCheckout: number
  submitDisabled: boolean
  submitPending: boolean
  submitInvalid?: boolean
}

export function PosMobileCheckoutBar({
  totalEstimate,
  paidAtCheckout,
  submitDisabled,
  submitPending,
  submitInvalid = false,
}: PosMobileCheckoutBarProps) {
  const submitLabel = submitPending ? 'جاري الحفظ...' : 'إتمام التعاقد'
  const showDueNow = Math.abs(paidAtCheckout - totalEstimate) > 0.009

  return createPortal(
    <div
      className="fixed inset-x-0 z-[49] border-t border-outline-variant bg-surface-container-lowest shadow-[0_-6px_20px_rgba(0,0,0,0.1)] lg:hidden"
      style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="mx-auto flex max-w-screen-xl items-center gap-sm px-margin py-sm">
        <div className="min-w-0 flex-1 space-y-1 tabular-nums">
          {showDueNow ? (
            <div className="flex items-baseline justify-between gap-sm">
              <span className="shrink-0 text-[11px] font-medium text-on-surface-variant">
                إجمالي التعاقد
              </span>
              <span className="text-sm font-bold leading-tight text-on-surface">
                {totalEstimate.toLocaleString('ar-EG')} ج.م
              </span>
            </div>
          ) : null}
          <div className="rounded-lg border border-primary/20 bg-primary/8 px-sm py-1.5">
            <div className="flex items-baseline justify-between gap-sm">
              <span className="shrink-0 text-[11px] font-medium text-on-surface-variant">
                المطلوب عند التعاقد
              </span>
              <span className="text-base font-extrabold leading-tight text-primary sm:text-lg">
                {paidAtCheckout.toLocaleString('ar-EG')} ج.م
              </span>
            </div>
          </div>
        </div>
        <button
          type="submit"
          form="pos-checkout-form"
          disabled={submitPending}
          aria-disabled={submitDisabled}
          className={`inline-flex min-h-12 shrink-0 items-center justify-center gap-xs rounded-xl bg-primary px-md py-3 text-sm font-bold text-on-primary transition-opacity disabled:cursor-not-allowed disabled:opacity-50 ${
            submitInvalid ? 'opacity-60' : 'hover:opacity-90'
          }`}
        >
          <Icon name="check_circle" size={20} />
          <span className="whitespace-nowrap">{submitLabel}</span>
        </button>
      </div>
    </div>,
    document.body,
  )
}
