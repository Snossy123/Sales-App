import type { ReactNode } from 'react'
import type { Promotion } from '../../api/types'
import { Icon } from '../Icon'

interface PosContractSummaryProps {
  branchLabel?: string
  contractDate: string
  devicesSubtotal: number
  servicesSubtotal: number
  netInstallationFeeTotal: number
  deviceCount: number
  paidAtCheckout: number
  totalEstimate: number
  promotions?: Promotion[]
  selectedPromotionId: number | ''
  onPromotionChange: (id: number | '') => void
  showPromotions: boolean
  devicesOnly?: boolean
  servicesOnly?: boolean
  validationSummary: string[]
  checkoutError?: string
  successBlock?: ReactNode
  submitDisabled: boolean
  submitPending: boolean
  submitInvalid?: boolean
}

export function PosContractSummary({
  branchLabel,
  contractDate,
  devicesSubtotal,
  servicesSubtotal,
  netInstallationFeeTotal,
  deviceCount,
  paidAtCheckout,
  totalEstimate,
  promotions = [],
  selectedPromotionId,
  onPromotionChange,
  showPromotions,
  devicesOnly = false,
  servicesOnly = false,
  validationSummary,
  checkoutError,
  successBlock,
  submitDisabled,
  submitPending,
  submitInvalid = false,
}: PosContractSummaryProps) {
  const submitLabel = submitPending ? 'جاري الحفظ...' : 'إتمام التعاقد'

  return (
    <aside className="flex flex-col gap-md lg:sticky lg:top-4 lg:self-start">
      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="border-b border-outline-variant/60 px-sm py-sm sm:px-md">
          <h2 className="text-[16px] font-extrabold text-on-surface">ملخص التعاقد</h2>
          <div className="mt-xs flex flex-wrap gap-x-sm gap-y-0.5 text-[12px] text-on-surface-variant">
            {branchLabel ? <span>{branchLabel}</span> : null}
            {branchLabel ? <span aria-hidden>·</span> : null}
            <span className="tabular-nums" dir="ltr">
              {contractDate}
            </span>
          </div>
        </div>

        <div className="space-y-sm px-sm py-sm text-sm sm:px-md">
          {showPromotions && promotions.length > 0 && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-sm">
              <label className="mb-xs block text-xs font-medium text-on-surface">عروض نشطة</label>
              <select
                value={selectedPromotionId}
                onChange={(e) =>
                  onPromotionChange(e.target.value ? Number(e.target.value) : '')
                }
                className="w-full rounded-lg border border-outline-variant px-sm py-1.5 text-sm"
              >
                <option value="">بدون عرض</option>
                {promotions.map((promo) => (
                  <option key={promo.id} value={promo.id}>
                    {promo.name_ar}
                    {promo.promotion_type === 'percent'
                      ? ` (${promo.discount_value}%)`
                      : ` (${Number(promo.discount_value).toLocaleString('ar-EG')} ج.م)`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!servicesOnly && devicesSubtotal > 0 ? (
            <div className="flex items-start justify-between gap-sm tabular-nums">
              <span className="text-on-surface-variant">قيمة الأجهزة (بعد الخصم)</span>
              <span className="shrink-0 font-medium text-on-surface">
                {devicesSubtotal.toLocaleString('ar-EG')} ج.م
              </span>
            </div>
          ) : null}
          {!servicesOnly && netInstallationFeeTotal > 0 ? (
            <div className="flex items-start justify-between gap-sm tabular-nums">
              <span className="text-on-surface-variant">
                رسوم التركيب ({deviceCount} × جهاز)
              </span>
              <span className="shrink-0 font-medium text-on-surface">
                {netInstallationFeeTotal.toLocaleString('ar-EG')} ج.م
              </span>
            </div>
          ) : null}
          {!devicesOnly && servicesSubtotal > 0 ? (
            <div className="flex items-start justify-between gap-sm tabular-nums">
              <span className="text-on-surface-variant">قيمة الخدمات</span>
              <span className="shrink-0 font-medium text-on-surface">
                {servicesSubtotal.toLocaleString('ar-EG')} ج.م
              </span>
            </div>
          ) : null}

          {paidAtCheckout > 0 ? (
            <div className="rounded-lg border border-primary/20 bg-primary/8 px-sm py-sm">
              <div className="flex items-center justify-between gap-sm tabular-nums">
                <span className="font-bold text-on-surface">المطلوب عند التعاقد</span>
                <span className="text-lg font-extrabold text-primary">
                  {paidAtCheckout.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-sm border-t border-outline-variant/60 pt-sm tabular-nums">
            <span className="font-bold text-on-surface">إجمالي التعاقد</span>
            <span className="text-lg font-extrabold text-on-surface">
              {totalEstimate.toLocaleString('ar-EG')} ج.م
            </span>
          </div>
        </div>

        <div
          className="h-3 bg-surface-container-lowest"
          style={{
            backgroundImage:
              'linear-gradient(135deg, var(--color-surface-container-low) 33.33%, transparent 33.33%, transparent 50%, var(--color-surface-container-low) 50%, var(--color-surface-container-low) 83.33%, transparent 83.33%, transparent 100%)',
            backgroundSize: '12px 12px',
          }}
          aria-hidden
        />
      </div>

      {checkoutError ? (
        <p className="rounded-lg border border-error/30 bg-error/5 p-sm text-sm text-error">
          {checkoutError}
        </p>
      ) : null}

      {validationSummary.length > 0 ? (
        <div className="rounded-lg border border-error/30 bg-error/5 p-sm text-sm text-error">
          <p className="font-medium">يرجى إكمال الحقول المطلوبة:</p>
          <ul className="mt-xs list-inside list-disc">
            {validationSummary.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {successBlock}

      <button
        type="submit"
        data-tour="pos-submit"
        disabled={submitPending}
        aria-disabled={submitDisabled}
        className={`hidden w-full items-center justify-center gap-xs rounded-lg bg-primary py-4 text-base font-bold text-on-primary transition-opacity lg:flex ${
          submitInvalid ? 'opacity-60' : 'hover:opacity-90'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <Icon name="check_circle" />
        {submitLabel}
      </button>
    </aside>
  )
}
