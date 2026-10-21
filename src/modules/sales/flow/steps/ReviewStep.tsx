import { Link } from 'react-router-dom'
import type { Promotion, SalesInvoice } from '../../../../api/types'
import { Icon } from '../../../../components/Icon'
import { NumericInput } from '../../../../components/ui/NumericInput'
import {
  isServiceInvoiceLine,
  contractPrintPath,
  serviceContractPrintPath,
  ownershipTransferContractPrintPath,
} from '../../../../lib/sales'
import { contractKindLabel } from '../../../../lib/contractKinds'
import { posFlowActionLabel, posFlowSourceLabel, type PosFlowDraft } from '../posFlowTypes'
import { formatMoney as money } from '../posFlowHelpers'

interface ReviewStepProps {
  draft: PosFlowDraft
  totals: {
    subtotal: number
    fees: number
    paidNow: number
    remaining: number
  }
  promotions?: Promotion[]
  distributorBalanceAvailable?: number
  onPatch: (partial: Partial<PosFlowDraft>) => void
  errors: string[]
  checkoutError?: string
  success?: { invoice: SalesInvoice; message: string } | null
  pending?: boolean
  onSubmit: () => void
  onReset: () => void
}

export function ReviewStep({
  draft,
  totals,
  promotions = [],
  distributorBalanceAvailable = 0,
  onPatch,
  errors,
  checkoutError,
  success,
  pending,
  onSubmit,
  onReset,
}: ReviewStepProps) {
  if (success) {
    const ownershipTransfer = success.invoice.contract_kind === 'ownership_transfer'
    const pendingOwnershipReview =
      ownershipTransfer && success.invoice.review_status !== 'approved'

    return (
      <div className="space-y-md rounded-xl border border-secondary/25 bg-secondary/10 p-md">
        <p className="font-bold text-secondary">{success.message}</p>
        {ownershipTransfer ? (
          <p className="rounded-lg border border-primary/30 bg-primary/5 p-sm text-sm text-on-surface-variant">
            {pendingOwnershipReview
              ? 'بعد اعتماد عقد نقل الملكية ينتقل التعاقد الأصلي والأقساط المتبقية للمالك الجديد فوراً.'
              : 'تم نقل التعاقد الأصلي والأقساط المتبقية إلى المالك الجديد.'}
          </p>
        ) : null}
        <div className="flex flex-col gap-1">
          {ownershipTransfer ? (
            <>
              <Link
                to={ownershipTransferContractPrintPath(success.invoice.id)}
                className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
              >
                <Icon name="print" size={18} />
                طباعة عقد {contractKindLabel('ownership_transfer')}
              </Link>
              {pendingOwnershipReview ? (
                <Link
                  to={`/invoices/review/${success.invoice.id}`}
                  className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                >
                  <Icon name="fact_check" size={18} />
                  مراجعة واعتماد نقل الملكية
                </Link>
              ) : null}
            </>
          ) : success.invoice.contract_kind === 'mixed' ||
          (success.invoice.lines ?? []).some((line) => isServiceInvoiceLine(line)) ? (
            <Link
              to={serviceContractPrintPath(success.invoice.id, undefined, { autoPrint: false })}
              className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
            >
              <Icon name="print" size={18} />
              طباعة العقد
            </Link>
          ) : (
            (success.invoice.lines ?? [])
              .filter((line) => !isServiceInvoiceLine(line))
              .map((line, index) => (
                <Link
                  key={line.id}
                  to={contractPrintPath(success.invoice.id, { lineId: line.id, autoPrint: false })}
                  className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                >
                  <Icon name="print" size={18} />
                  طباعة عقد — بند {index + 1}
                </Link>
              ))
          )}
        </div>
        <button
          type="button"
          onClick={onReset}
          className="w-full rounded-lg bg-primary py-3 font-bold text-on-primary"
        >
          عملية جديدة
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-md">
      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
        <h3 className="mb-sm text-base font-extrabold">ملخص العملية</h3>
        <dl className="grid gap-sm text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-on-surface-variant">العميل</dt>
            <dd className="font-bold">{draft.selectedCustomer?.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-on-surface-variant">المصدر</dt>
            <dd>{posFlowSourceLabel(draft)}</dd>
          </div>
          <div>
            <dt className="text-xs text-on-surface-variant">العملية</dt>
            <dd>{posFlowActionLabel(draft.action)}</dd>
          </div>
          <div>
            <dt className="text-xs text-on-surface-variant">التاريخ</dt>
            <dd className="tabular-nums" dir="ltr">
              {draft.contractDate}
            </dd>
          </div>
          {draft.action === 'ownership_transfer' && draft.sourceTransferInvoice ? (
            <div>
              <dt className="text-xs text-on-surface-variant">التعاقد الأصلي</dt>
              <dd className="font-bold">
                {draft.sourceTransferInvoice.invoice_number ?? `#${draft.sourceTransferInvoice.id}`}
              </dd>
            </div>
          ) : null}
          {draft.action === 'catalog' && draft.feeLines.length + draft.accessoryCart.length > 0 ? (
            <div className="sm:col-span-2">
              <dt className="text-xs text-on-surface-variant">البنود</dt>
              <dd>
                {[
                  ...draft.feeLines.map((item) => item.line.description),
                  ...draft.accessoryCart.map((line) => `${line.name} × ${line.quantity}`),
                ]
                  .filter(Boolean)
                  .join(' — ')}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      {draft.action === 'new_device' && promotions.length > 0 ? (
        <label className="block text-sm">
          العرض
          <select
            className="mt-1 w-full rounded-lg border border-outline-variant px-sm py-2"
            value={draft.selectedPromotionId}
            onChange={(e) =>
              onPatch({
                selectedPromotionId: e.target.value ? Number(e.target.value) : '',
              })
            }
          >
            <option value="">بدون عرض</option>
            {promotions.map((promo) => (
              <option key={promo.id} value={promo.id}>
                {promo.name_ar}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {distributorBalanceAvailable > 0 && draft.action !== 'ownership_transfer' && totals.paidNow > 0 ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-sm">
          <p className="mb-xs text-xs text-on-surface-variant">
            رصيد عمولة: {money(distributorBalanceAvailable)}
          </p>
          <label className="block text-xs text-on-surface-variant">استخدام من الرصيد</label>
          <NumericInput
            type="number"
            min={0}
            max={Math.min(distributorBalanceAvailable, totals.paidNow)}
            value={draft.distributorBalanceAmount}
            onChange={(e) =>
              onPatch({
                distributorBalanceAmount: Math.min(
                  Number(e.target.value) || 0,
                  distributorBalanceAvailable,
                ),
              })
            }
            className="w-full rounded-lg border border-outline-variant px-sm py-1.5 text-sm"
          />
        </div>
      ) : null}

      {draft.action === 'ownership_transfer' ? (
        <p className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md text-sm text-on-surface-variant">
          رسوم نقل الملكية في عقد منفصل. بعد الاعتماد يُنقل التعاقد الأصلي والأقساط المتبقية إلى المالك الجديد فوراً.
        </p>
      ) : (
        <section className="space-y-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-md text-sm">
          <div className="flex justify-between">
            <span className="text-on-surface-variant">البنود</span>
            <span className="font-bold tabular-nums">{money(totals.subtotal)}</span>
          </div>
          {totals.fees > 0 ? (
            <div className="flex justify-between">
              <span className="text-on-surface-variant">رسوم إضافية</span>
              <span className="font-bold tabular-nums">{money(totals.fees)}</span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span className="text-on-surface-variant">المدفوع الآن</span>
            <span className="font-bold text-primary tabular-nums">{money(totals.paidNow)}</span>
          </div>
          <div className="flex justify-between border-t border-outline-variant/60 pt-sm">
            <span className="font-bold">المتبقي</span>
            <span className="text-lg font-extrabold text-error tabular-nums">
              {money(totals.remaining)}
            </span>
          </div>
        </section>
      )}

      {errors.length > 0 ? (
        <ul className="rounded-lg border border-error/30 bg-error/5 p-sm text-sm text-error">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
      {checkoutError ? (
        <p className="rounded-lg border border-error/30 bg-error/5 p-sm text-sm text-error">
          {checkoutError}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onSubmit}
        disabled={pending || errors.length > 0}
        className="flex w-full items-center justify-center gap-xs rounded-lg bg-primary py-4 text-base font-bold text-on-primary disabled:opacity-50"
      >
        <Icon name="check_circle" />
        {pending ? 'جاري الحفظ...' : 'إتمام العملية'}
      </button>
    </div>
  )
}
