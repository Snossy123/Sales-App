import { useMemo } from 'react'
import type { InstallmentItem, SalesInvoice } from '../../api/types'
import {
  buildContractSummary,
  formatContractMoney,
  getInstallmentItems,
  getInstallmentNumber,
  installmentRemainingAmount,
  installmentStatusLabel,
  normalizeInstallmentStatus,
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
  const totalDue = items.reduce((sum, item) => sum + Number(item.amount ?? 0), 0)
  const totalPaid = items.reduce((sum, item) => sum + Number(item.paid_amount ?? 0), 0)
  const totalRemaining = items.reduce((sum, item) => sum + installmentRemainingAmount(item), 0)

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-lg text-center text-sm text-on-surface-variant">
        لا توجد أقساط على هذا التعاقد
      </p>
    )
  }

  return (
    <section className="space-y-md">
      <div className="grid gap-sm sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="عدد الأقساط" value={String(summary.installmentCount || items.length)} />
        <SummaryCard label="إجمالي المطلوب" value={formatContractMoney(totalDue)} />
        <SummaryCard label="المسدد" value={formatContractMoney(totalPaid || summary.paidAmount)} />
        <SummaryCard label="المتبقي" value={formatContractMoney(totalRemaining || summary.remaining)} />
      </div>

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
              <StatusBadge
                status={normalizeInstallmentStatus(String(row.status))}
                label={installmentStatusLabel(String(row.status))}
              />
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
      <p className="mt-xs text-sm font-semibold tabular-nums text-on-surface">{value}</p>
    </div>
  )
}
