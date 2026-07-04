import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { InstallmentItem, SalesInvoice } from '../../api/types'
import { contractKindLabel } from '../../lib/contractKinds'
import {
  buildContractSummary,
  buildContractSummaryLine,
  filterContracts,
  formatContractMoney,
  getInstallmentItems,
  getInstallmentNumber,
  installmentRemainingAmount,
  installmentStatusLabel,
  invoiceStatusLabel,
  normalizeInstallmentStatus,
  paymentStatusLabel,
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
                  [
                    showInvoiceStatusBadge(statusFilter) && invoice.status
                      ? invoiceStatusLabel(String(invoice.status))
                      : null,
                    invoice.ownership_transferred_at ? 'مستلم بنقل ملكية' : null,
                    invoice.contract_kind === 'ownership_transfer'
                      ? contractKindLabel(invoice.contract_kind)
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || undefined
                }
                defaultOpen={false}
              >
                <div className="space-y-md">
                  <div className="flex flex-wrap items-center gap-sm">
                    {invoice.payment_status && (
                      <>
                        <span className="text-sm text-on-surface-variant">حالة السداد</span>
                        <StatusBadge
                          status={String(invoice.payment_status)}
                          label={paymentStatusLabel(invoice.payment_status)}
                        />
                      </>
                    )}
                    {showInvoiceStatusBadge(statusFilter) && invoice.status && (
                      <>
                        <span className="text-sm text-on-surface-variant">حالة التعاقد</span>
                        <StatusBadge status={String(invoice.status)} />
                      </>
                    )}
                  </div>

                  <div className="rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm text-sm">
                    <span className="font-medium text-on-surface">ملخص السداد: </span>
                    <span className="tabular-nums text-on-surface">
                      مدفوع {formatContractMoney(summary.paidAmount)}
                    </span>
                    <span className="mx-2 text-on-surface-variant">·</span>
                    <span className="tabular-nums text-on-surface">
                      متبقي {formatContractMoney(summary.remaining)}
                    </span>
                  </div>

                  {invoice.payment_term === 'installment' && (
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

                  <div className="flex flex-wrap gap-sm">
                    <Link
                      to={`/contracts/${invoice.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-primary bg-primary/5 px-md py-sm text-sm font-medium text-primary hover:bg-primary/10"
                    >
                      <Icon name="description" size={18} />
                      تفاصيل العقد
                    </Link>
                    <Link
                      to={`/invoices/${invoice.id}/contract-print`}
                      className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-md py-sm text-sm font-medium text-on-surface hover:bg-surface-container-low"
                    >
                      <Icon name="print" size={18} />
                      طباعة العقد
                    </Link>
                  </div>

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
                            key: 'paid_amount',
                            header: 'مسدد',
                            render: (row) =>
                              formatContractMoney(Number((row as unknown as InstallmentItem).paid_amount ?? 0)),
                          },
                          {
                            key: 'remaining',
                            header: 'متبقي',
                            render: (row) =>
                              formatContractMoney(
                                installmentRemainingAmount(row as unknown as InstallmentItem),
                              ),
                          },
                          {
                            key: 'paid_at',
                            header: 'تاريخ السداد',
                            render: (row) => {
                              const paidAt = (row as unknown as InstallmentItem).paid_at
                              return paidAt ? formatInvoiceDate(paidAt) : '—'
                            },
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
