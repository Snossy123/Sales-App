import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { InstallmentItem, SalesInvoice } from '../../api/types'
import {
  buildContractSummary,
  buildContractSummaryLine,
  filterContracts,
  formatContractMoney,
  getInstallmentItems,
  getInstallmentNumber,
  installmentStatusLabel,
  invoiceStatusLabel,
  normalizeInstallmentStatus,
  type ContractStatusFilter,
} from '../../lib/customerContracts'
import { formatInvoiceDate } from '../../lib/sales'
import { CollapsibleSection } from '../CollapsibleSection'
import { DataTable } from '../DataTable'
import { FilterBar } from '../FilterBar'
import { Icon } from '../Icon'
import { StatusBadge } from '../StatusBadge'

const STATUS_FILTER_OPTIONS = [
  { value: 'confirmed', label: 'مؤكد' },
  { value: 'unconfirmed', label: 'غير مؤكد' },
  { value: 'all', label: 'الكل' },
]

interface CustomerContractsSectionProps {
  invoices: SalesInvoice[]
}

function showInvoiceStatusBadge(filter: ContractStatusFilter): boolean {
  return filter === 'all' || filter === 'unconfirmed'
}

export function CustomerContractsSection({ invoices }: CustomerContractsSectionProps) {
  const [statusFilter, setStatusFilter] = useState<ContractStatusFilter>('confirmed')

  const filteredInvoices = useMemo(
    () => filterContracts(invoices, statusFilter),
    [invoices, statusFilter],
  )

  return (
    <section className="mb-md">
      <div className="mb-sm flex flex-wrap items-center justify-between gap-sm">
        <h2 className="text-lg font-semibold">التعاقدات</h2>
      </div>

      <FilterBar
        selects={[
          {
            id: 'contract-status',
            label: 'حالة التعاقد',
            value: statusFilter,
            options: STATUS_FILTER_OPTIONS,
            onChange: (value) => setStatusFilter(value as ContractStatusFilter),
          },
        ]}
      />

      {filteredInvoices.length === 0 ? (
        <p className="rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-lg text-center text-sm text-on-surface-variant">
          لا توجد تعاقدات
        </p>
      ) : (
        <div className="space-y-sm">
          {filteredInvoices.map((invoice) => {
            const summary = buildContractSummary(invoice)
            const installmentItems = getInstallmentItems(invoice)
            const summaryLine = buildContractSummaryLine(invoice)

            return (
              <CollapsibleSection
                key={invoice.id}
                title={summaryLine}
                summary={
                  showInvoiceStatusBadge(statusFilter) && invoice.status
                    ? invoiceStatusLabel(String(invoice.status))
                    : undefined
                }
                defaultOpen={false}
              >
                <div className="space-y-md">
                  {showInvoiceStatusBadge(statusFilter) && invoice.status && (
                    <div className="flex items-center gap-sm">
                      <span className="text-sm text-on-surface-variant">حالة التعاقد</span>
                      <StatusBadge status={String(invoice.status)} />
                    </div>
                  )}

                  {summary && (
                    <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <dt className="text-on-surface-variant">المقدم</dt>
                        <dd className="tabular-nums font-medium">
                          {formatContractMoney(summary.downPayment)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-on-surface-variant">عدد الأقساط</dt>
                        <dd className="tabular-nums font-medium">{summary.installmentCount}</dd>
                      </div>
                      <div>
                        <dt className="text-on-surface-variant">مدفوع</dt>
                        <dd className="tabular-nums font-medium">
                          {formatContractMoney(summary.paidAmount)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-on-surface-variant">متبقي</dt>
                        <dd className="tabular-nums font-medium">
                          {formatContractMoney(summary.remaining)}
                        </dd>
                      </div>
                    </dl>
                  )}

                  <Link
                    to={`/invoices/${invoice.id}/contract-print`}
                    className="inline-flex items-center gap-1 rounded-lg border border-primary bg-primary/5 px-md py-sm text-sm font-medium text-primary hover:bg-primary/10"
                  >
                    <Icon name="description" size={18} />
                    عرض تفاصيل التعاقد
                  </Link>

                  {invoice.payment_term === 'installment' && installmentItems.length > 0 && (
                    <div>
                      <h3 className="mb-sm text-sm font-semibold text-on-surface">جدول الأقساط</h3>
                      <DataTable
                        data={installmentItems as unknown as Record<string, unknown>[]}
                        keyExtractor={(row) => `${invoice.id}-${row.id as number}`}
                        pageSize={10}
                        columns={[
                          {
                            key: 'invoice_number',
                            header: 'فاتورة',
                            render: () => invoice.invoice_number ?? `#${invoice.id}`,
                          },
                          {
                            key: 'installment_number',
                            header: 'قسط رقم',
                            render: (row) =>
                              getInstallmentNumber(row as unknown as InstallmentItem),
                          },
                          {
                            key: 'due_date',
                            header: 'الاستحقاق',
                            render: (row) => formatInvoiceDate(String(row.due_date)),
                          },
                          {
                            key: 'amount',
                            header: 'المطلوب سداده',
                            render: (row) => formatContractMoney(Number(row.amount)),
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
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            )
          })}
        </div>
      )}
    </section>
  )
}
