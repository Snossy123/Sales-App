import { createPortal } from 'react-dom'
import { Icon } from '../Icon'

interface PosMobileCheckoutBarProps {
  paidAtCheckout: number
  submitDisabled: boolean
  submitPending: boolean
}

export function PosMobileCheckoutBar({
  paidAtCheckout,
  submitDisabled,
  submitPending,
}: PosMobileCheckoutBarProps) {
  const submitLabel = submitPending ? 'جاري الحفظ...' : 'إتمام التعاقد'

  return createPortal(
    <div
      className="fixed inset-x-0 z-[49] border-t border-outline-variant bg-surface-container-lowest shadow-[0_-6px_20px_rgba(0,0,0,0.1)] lg:hidden"
      style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="mx-auto flex max-w-screen-xl items-stretch gap-sm px-margin py-sm">
        <div className="flex min-w-0 flex-1 flex-col justify-center tabular-nums">
          <p className="text-[11px] font-medium text-on-surface-variant">المطلوب عند التعاقد</p>
          <p className="text-lg font-extrabold leading-tight text-tertiary sm:text-xl">
            {paidAtCheckout.toLocaleString('ar-EG')} ج.م
          </p>
        </div>
        <button
          type="submit"
          form="pos-checkout-form"
          disabled={submitDisabled}
          className="inline-flex min-h-12 min-w-[9.5rem] flex-1 items-center justify-center gap-xs rounded-xl bg-secondary px-md py-3 text-sm font-bold text-on-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-[12rem] sm:flex-none"
        >
          <Icon name="check_circle" size={20} />
          <span className="whitespace-nowrap">{submitLabel}</span>
        </button>
      </div>
    </div>,
    document.body,
  )
}
