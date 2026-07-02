import type { ReactNode } from 'react'
import type { SalesInvoice } from '../../api/types'
import {
  contractSourceLabel,
  fmtContractMoney,
  invoiceContractSummary,
} from '../../lib/contractFields'
import { reviewStatusForBadge, reviewStatusLabel } from '../../lib/sales'
import { StatusBadge } from '../StatusBadge'

function hasAmount(value: string | number | null | undefined): boolean {
  return Number(value ?? 0) > 0
}

interface ContractReviewDecisionPanelProps {
  invoice: SalesInvoice
  children?: ReactNode
}

export function ContractReviewDecisionPanel({
  invoice,
  children,
}: ContractReviewDecisionPanelProps) {
  const summary = invoiceContractSummary(invoice)
  const balanceDue = Number(invoice.balance_due ?? 0)
  const paidAmount = Number(invoice.paid_amount ?? 0)

  return (
    <aside className="flex flex-col gap-md lg:sticky lg:top-4 lg:self-start">
      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="border-b border-outline-variant/60 bg-primary px-sm py-sm text-on-primary sm:px-md">
          <h2 className="text-[15px] font-extrabold">قرار المراجعة</h2>
          <p className="mt-0.5 text-[12px] opacity-90">
            {invoice.invoice_number ? `${invoice.invoice_number} · ` : ''}
            {invoice.customer?.name ?? '—'}
          </p>
        </div>

        <div className="space-y-sm px-sm py-sm text-sm sm:px-md">
          {summary.lineCount > 0 ? (
            <div className="flex items-start justify-between gap-sm tabular-nums">
              <span className="text-on-surface-variant">
                الأجهزة ({summary.lineCount})
              </span>
              <span className="shrink-0 font-medium text-on-surface">
                {fmtContractMoney(summary.devicesSubtotal)}
              </span>
            </div>
          ) : null}

          {summary.feeNet > 0 ? (
            <div className="flex items-start justify-between gap-sm tabular-nums">
              <span className="text-on-surface-variant">التركيب</span>
              <span className="shrink-0 font-medium text-on-surface">
                {fmtContractMoney(summary.feeNet)}
              </span>
            </div>
          ) : null}

          {summary.serviceLineCount > 0 ? (
            <div className="flex items-start justify-between gap-sm tabular-nums">
              <span className="text-on-surface-variant">
                الخدمات ({summary.serviceLineCount})
              </span>
              <span className="shrink-0 font-medium text-on-surface">
                {fmtContractMoney(summary.servicesSubtotal)}
              </span>
            </div>
          ) : null}

          {hasAmount(paidAmount) ? (
            <div className="flex items-start justify-between gap-sm tabular-nums">
              <span className="text-on-surface-variant">المدفوع</span>
              <span className="shrink-0 font-medium text-on-surface">
                {fmtContractMoney(paidAmount)}
              </span>
            </div>
          ) : null}

          {balanceDue > 0 ? (
            <div className="rounded-lg border border-tertiary/30 bg-tertiary/10 px-sm py-sm">
              <div className="flex items-center justify-between gap-sm tabular-nums">
                <span className="font-medium text-on-surface">المتبقي (للأقساط)</span>
                <span className="text-base font-extrabold text-on-surface">
                  {fmtContractMoney(balanceDue)}
                </span>
              </div>
            </div>
          ) : null}

          <div className="border-t border-outline-variant/60 pt-sm">
            <div className="flex items-center justify-between gap-sm tabular-nums">
              <span className="font-bold text-on-surface">صافي التعاقد</span>
              <span className="text-lg font-extrabold text-on-surface">
                {fmtContractMoney(summary.total)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-xs pt-xs">
            {invoice.payment_status ? (
              <StatusBadge status={invoice.payment_status} />
            ) : null}
            <StatusBadge
              status={reviewStatusForBadge(invoice.review_status)}
              label={reviewStatusLabel(invoice.review_status)}
            />
          </div>
        </div>

        {children ? (
          <div className="space-y-sm border-t border-outline-variant/60 px-sm py-sm sm:px-md">
            {children}
          </div>
        ) : null}

        <p className="border-t border-outline-variant/60 px-sm py-sm text-[11px] leading-relaxed text-on-surface-variant sm:px-md">
          المصدر: {contractSourceLabel(invoice)}. أي قرار يُسجَّل مع الوقت والمستخدم.
        </p>
      </div>
    </aside>
  )
}
