import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { InstallmentItem, SalesInvoice } from '../../api/types'
import {
  buildContractSummary,
  formatContractMoney,
  getInstallmentItems,
  getInstallmentNumber,
  installmentRemainingAmount,
  installmentStatusLabel,
  legacyCreditForItem,
  normalizeInstallmentStatus,
  reconcileContractLedger,
  splitOwnershipTransferInstallmentItems,
} from '../../lib/customerContracts'
import { formatInvoiceDate } from '../../lib/sales'
import { DataTable } from '../DataTable'
import { StatusBadge } from '../StatusBadge'

interface ContractInstallmentsTabProps {
  invoice: SalesInvoice
}

function sortInstallmentItems(rows: InstallmentItem[]): InstallmentItem[] {
  return [...rows].sort((a, b) => {
    const numA = getInstallmentNumber(a)
    const numB = getInstallmentNumber(b)
    if (numA !== numB) return numA - numB
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  })
}

function OwnershipTransferSourceLink({ invoice }: { invoice: SalesInvoice }) {
  const sourceContractId =
    invoice.source_invoice?.id ?? invoice.source_sales_invoice_id ?? null
  const sourceInvoiceNumber =
    invoice.source_invoice?.invoice_number ??
    (sourceContractId ? `#${sourceContractId}` : null)

  if (!sourceContractId) return null

  return (
    <div className="rounded-lg border border-primary/25 bg-primary/5 px-md py-sm text-sm text-on-surface">
      <p>
        أقساط الجهاز المتبقية تُجمَّد على التعاقد الأصلي وتُنسخ على عقد النقل عند التأكيد.
      </p>
      <Link
        to={`/contracts/${sourceContractId}?tab=installments`}
        className="mt-xs inline-flex font-medium text-primary hover:underline"
      >
        عرض أقساط التعاقد الأصلي
        {sourceInvoiceNumber ? ` (${sourceInvoiceNumber})` : ''}
      </Link>
    </div>
  )
}

function installmentBadgeStatus(row: InstallmentItem): string {
  if (row.is_ownership_transferred || row.ownership_transferred_at) {
    return 'blocked'
  }
  if (row.is_suspended || row.suspended_at) {
    return 'blocked'
  }
  return normalizeInstallmentStatus(String(row.status), row.due_date)
}

function InstallmentsTable({
  items,
  emptyMessage,
  ledger,
}: {
  items: InstallmentItem[]
  emptyMessage: string
  ledger: ReturnType<typeof reconcileContractLedger>
}) {
  return (
    <DataTable<InstallmentItem>
      data={items}
      keyExtractor={(row) => row.id}
      pageSize={12}
      emptyMessage={emptyMessage}
      columns={[
        {
          key: 'installment_number',
          header: 'قسط رقم',
          render: (row) => getInstallmentNumber(row) || '—',
        },
        {
          key: 'due_date',
          header: 'الاستحقاق',
          render: (row) => formatInvoiceDate(row.due_date),
        },
        {
          key: 'amount',
          header: 'المطلوب سداده',
          render: (row) => formatContractMoney(Number(row.amount)),
        },
        {
          key: 'paid_amount',
          header: 'مسدد',
          render: (row) => formatContractMoney(Number(row.paid_amount ?? 0)),
        },
        {
          key: 'remaining',
          header: 'متبقي',
          render: (row) => formatContractMoney(installmentRemainingAmount(row)),
        },
        {
          key: 'paid_at',
          header: 'تاريخ السداد',
          render: (row) => (row.paid_at ? formatInvoiceDate(row.paid_at) : '—'),
        },
        {
          key: 'status',
          header: 'الحالة',
          render: (row) => (
            <div className="flex flex-wrap items-center gap-xs">
              <StatusBadge
                status={installmentBadgeStatus(row)}
                label={installmentStatusLabel(String(row.status), row.due_date, row)}
              />
              {legacyCreditForItem(ledger, row.id) > 0 ? (
                <span className="text-xs text-on-surface-variant">سجل قديم غير مؤكد</span>
              ) : null}
            </div>
          ),
        },
      ]}
    />
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest px-md py-sm">
      <p className="text-xs text-on-surface-variant">{label}</p>
      <p className="mt-xs whitespace-nowrap text-sm font-semibold tabular-nums text-on-surface">
        {value}
      </p>
    </div>
  )
}

export function ContractInstallmentsTab({ invoice }: ContractInstallmentsTabProps) {
  const isOwnershipTransfer = invoice.contract_kind === 'ownership_transfer'

  const { feeItems, transferredBalanceItems } = useMemo(() => {
    if (isOwnershipTransfer) {
      const split = splitOwnershipTransferInstallmentItems(invoice)
      return {
        feeItems: sortInstallmentItems(split.feeItems),
        transferredBalanceItems: sortInstallmentItems(split.transferredBalanceItems),
      }
    }

    const source = getInstallmentItems(invoice)
    const rows = source.length > 0 ? source : (invoice.installment_items ?? [])
    return {
      feeItems: sortInstallmentItems(rows),
      transferredBalanceItems: [] as InstallmentItem[],
    }
  }, [invoice, isOwnershipTransfer])

  const summary = buildContractSummary(invoice)
  const ledger = reconcileContractLedger(invoice)
  const feeTotalDue = feeItems.reduce((sum, item) => sum + Number(item.amount ?? 0), 0)
  const transferredTotalDue = transferredBalanceItems.reduce(
    (sum, item) => sum + Number(item.amount ?? 0),
    0,
  )

  if (feeItems.length === 0 && transferredBalanceItems.length === 0) {
    if (isOwnershipTransfer) {
      return (
        <div className="space-y-md">
          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-lg text-center text-sm text-on-surface-variant">
            <p>
              أقساط الجهاز المتبقية تُجمَّد على التعاقد الأصلي وتُنسخ على عقد النقل عند التأكيد.
            </p>
          </div>
          <OwnershipTransferSourceLink invoice={invoice} />
        </div>
      )
    }

    return (
      <p className="rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-lg text-center text-sm text-on-surface-variant">
        لا توجد أقساط على هذا التعاقد
      </p>
    )
  }

  return (
    <section className="space-y-md">
      {isOwnershipTransfer ? <OwnershipTransferSourceLink invoice={invoice} /> : null}

      {feeItems.length > 0 ? (
        <div className="space-y-sm">
          {isOwnershipTransfer ? (
            <h3 className="text-sm font-bold text-on-surface">أقساط رسوم نقل الملكية</h3>
          ) : null}

          {!isOwnershipTransfer ? (
            <>
              <div className="grid gap-sm sm:grid-cols-2 lg:grid-cols-3">
                <SummaryCard
                  label="عدد الأقساط"
                  value={String(summary.installmentCount || feeItems.length)}
                />
                <SummaryCard label="المقدمة" value={formatContractMoney(summary.downPayment)} />
                <SummaryCard label="إجمالي الأقساط" value={formatContractMoney(feeTotalDue)} />
                <SummaryCard
                  label="مسدد مؤكد"
                  value={formatContractMoney(ledger.confirmedInstallmentPaid)}
                />
                <SummaryCard
                  label="متبقي مؤكد"
                  value={formatContractMoney(ledger.confirmedOutstanding)}
                />
                <SummaryCard
                  label="متأخر مؤكد"
                  value={formatContractMoney(ledger.confirmedOverdue)}
                />
                <SummaryCard
                  label="سجل قديم غير مؤكد"
                  value={formatContractMoney(ledger.legacyCredit)}
                />
              </div>
              <p className="text-xs text-on-surface-variant">
                الأقساط {formatContractMoney(feeTotalDue)} + المقدمة{' '}
                {formatContractMoney(summary.downPayment)} = إجمالي التعاقد{' '}
                {formatContractMoney(feeTotalDue + summary.downPayment)}
                {ledger.downPaymentUnverified > 0
                  ? ` · المقدمة غير مؤكدة بسند: ${formatContractMoney(ledger.downPaymentUnverified)}`
                  : ''}
              </p>
            </>
          ) : (
            <div className="grid gap-sm sm:grid-cols-2 lg:grid-cols-3">
              <SummaryCard label="عدد الأقساط" value={String(feeItems.length)} />
              <SummaryCard label="إجمالي الأقساط" value={formatContractMoney(feeTotalDue)} />
            </div>
          )}

          <InstallmentsTable
            items={feeItems}
            emptyMessage="لا توجد أقساط على هذا التعاقد"
            ledger={ledger}
          />
        </div>
      ) : null}

      {isOwnershipTransfer && transferredBalanceItems.length > 0 ? (
        <div className="space-y-sm">
          <h3 className="text-sm font-bold text-on-surface">أقساط الجهاز المنقولة</h3>
          <div className="grid gap-sm sm:grid-cols-2 lg:grid-cols-3">
            <SummaryCard label="عدد الأقساط" value={String(transferredBalanceItems.length)} />
            <SummaryCard
              label="إجمالي الأقساط"
              value={formatContractMoney(transferredTotalDue)}
            />
          </div>
          <InstallmentsTable
            items={transferredBalanceItems}
            emptyMessage="لا توجد أقساط منقولة"
            ledger={ledger}
          />
        </div>
      ) : null}
    </section>
  )
}
