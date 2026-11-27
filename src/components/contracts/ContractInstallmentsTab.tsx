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
} from '../../lib/customerContracts'
import { formatInvoiceDate } from '../../lib/sales'
import { DataTable } from '../DataTable'
import { StatusBadge } from '../StatusBadge'

interface ContractInstallmentsTabProps {
  invoice: SalesInvoice
}

export function ContractInstallmentsTab({ invoice }: ContractInstallmentsTabProps) {
  const items = useMemo(() => {
    const source = getInstallmentItems(invoice)
    const rows = source.length > 0 ? source : (invoice.installment_items ?? [])
    return [...rows].sort((a, b) => {
      const numA = getInstallmentNumber(a)
      const numB = getInstallmentNumber(b)
      if (numA !== numB) return numA - numB
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })
  }, [invoice])

  const summary = buildContractSummary(invoice)
  const ledger = reconcileContractLedger(invoice)
  const totalDue = items.reduce((sum, item) => sum + Number(item.amount ?? 0), 0)
  const sourceContractId =
    invoice.source_invoice?.id ?? invoice.source_sales_invoice_id ?? null
  const sourceInvoiceNumber =
    invoice.source_invoice?.invoice_number ??
    (sourceContractId ? `#${sourceContractId}` : null)

  if (items.length === 0) {
    if (invoice.contract_kind === 'ownership_transfer') {
      return (
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-lg text-center text-sm text-on-surface-variant">
          <p>
            عقد نقل الملكية لا يحتوي أقساطاً خاصة به. الأقساط المتبقية تبقى على التعاقد الأصلي
            وتنتقل للمالك الجديد بعد الاعتماد.
          </p>
          {sourceContractId ? (
            <Link
              to={`/contracts/${sourceContractId}?tab=installments`}
              className="mt-sm inline-flex font-medium text-primary hover:underline"
            >
              عرض أقساط التعاقد الأصلي
              {sourceInvoiceNumber ? ` (${sourceInvoiceNumber})` : ''}
            </Link>
          ) : null}
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
      <div className="grid gap-sm sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="عدد الأقساط" value={String(summary.installmentCount || items.length)} />
        <SummaryCard label="المقدمة" value={formatContractMoney(summary.downPayment)} />
        <SummaryCard label="إجمالي الأقساط" value={formatContractMoney(totalDue)} />
        <SummaryCard label="مسدد مؤكد" value={formatContractMoney(ledger.confirmedInstallmentPaid)} />
        <SummaryCard label="متبقي مؤكد" value={formatContractMoney(ledger.confirmedOutstanding)} />
        <SummaryCard label="متأخر مؤكد" value={formatContractMoney(ledger.confirmedOverdue)} />
        <SummaryCard label="سجل قديم غير مؤكد" value={formatContractMoney(ledger.legacyCredit)} />
      </div>
      <p className="text-xs text-on-surface-variant">
        الأقساط {formatContractMoney(totalDue)} + المقدمة {formatContractMoney(summary.downPayment)} = إجمالي
        التعاقد {formatContractMoney(totalDue + summary.downPayment)}
        {ledger.downPaymentUnverified > 0
          ? ` · المقدمة غير مؤكدة بسند: ${formatContractMoney(ledger.downPaymentUnverified)}`
          : ''}
      </p>

      <DataTable<InstallmentItem>
        data={items}
        keyExtractor={(row) => row.id}
        pageSize={12}
        emptyMessage="لا توجد أقساط على هذا التعاقد"
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
                  status={normalizeInstallmentStatus(String(row.status), row.due_date)}
                  label={installmentStatusLabel(String(row.status), row.due_date)}
                />
                {legacyCreditForItem(ledger, row.id) > 0 ? (
                  <span className="text-xs text-on-surface-variant">سجل قديم غير مؤكد</span>
                ) : null}
              </div>
            ),
          },
        ]}
      />
    </section>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest px-md py-sm">
      <p className="text-xs text-on-surface-variant">{label}</p>
      <p className="mt-xs whitespace-nowrap text-sm font-semibold tabular-nums text-on-surface">{value}</p>
    </div>
  )
}
