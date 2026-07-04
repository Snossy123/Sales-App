import { useMemo, useState } from 'react'
import type { InstallmentCollectionRow } from '../../lib/collectionHelpers'
import {
  collectionStatusLabels,
  getCurrentInstallment,
  rowRemaining,
} from '../../lib/collectionHelpers'
import { formatDatetime12hDisplay } from '../../lib/datetime12h'
import { customerToPhoneEntries, type CustomerPhoneEntry } from '../../lib/customerForm'
import { formatInvoiceDate } from '../../lib/sales'
import { CollapsibleSection } from '../CollapsibleSection'
import { StatusBadge } from '../StatusBadge'

interface ContractGroup {
  invoiceId: number
  invoiceNumber: string
  totalRemaining: number
  installmentCount: number
  overdueCount: number
  rows: InstallmentCollectionRow[]
  current?: InstallmentCollectionRow
  collectionStatus?: string | null
  collectionReminderAt?: string | null
}

export interface CustomerInstallmentGroup {
  customerKey: string
  customerId?: number
  customerName: string
  customerPhones: CustomerPhoneEntry[]
  totalRemaining: number
  installmentCount: number
  overdueCount: number
  contracts: ContractGroup[]
}

function isOverdueRow(row: InstallmentCollectionRow): boolean {
  return row.status === 'overdue' || row.display_tier === 'overdue'
}

export function groupInstallmentsByCustomerAndContract(
  rows: InstallmentCollectionRow[],
): CustomerInstallmentGroup[] {
  const customerMap = new Map<string, CustomerInstallmentGroup>()

  for (const row of rows) {
    const customerKey = String(row.customer_id ?? row.customer_name ?? 'unknown')
    let customerGroup = customerMap.get(customerKey)
    if (!customerGroup) {
      const customerRecord =
        (row as InstallmentCollectionRow & { sales_invoice?: { customer?: Parameters<typeof customerToPhoneEntries>[0] } })
          .sales_invoice?.customer ?? { phone: row.customer_phone ?? '' }

      customerGroup = {
        customerKey,
        customerId: row.customer_id,
        customerName: String(row.customer_name ?? '—'),
        customerPhones: customerToPhoneEntries(customerRecord).filter((entry) => entry.number.trim()),
        totalRemaining: 0,
        installmentCount: 0,
        overdueCount: 0,
        contracts: [],
      }
      customerMap.set(customerKey, customerGroup)
    }

    const invoiceId = Number(row.sales_invoice_id ?? 0)
    let contractGroup = customerGroup.contracts.find((c) => c.invoiceId === invoiceId)
    if (!contractGroup) {
      contractGroup = {
        invoiceId,
        invoiceNumber: String(row.invoice_number ?? (invoiceId ? `#${invoiceId}` : '—')),
        totalRemaining: 0,
        installmentCount: 0,
        overdueCount: 0,
        rows: [],
        collectionStatus: row.collection_status,
        collectionReminderAt: row.collection_reminder_at,
      }
      customerGroup.contracts.push(contractGroup)
    }

    contractGroup.rows.push(row)
    const remaining = rowRemaining(row)
    contractGroup.totalRemaining += remaining
    contractGroup.installmentCount += 1
    if (isOverdueRow(row)) contractGroup.overdueCount += 1

    customerGroup.totalRemaining += remaining
    customerGroup.installmentCount += 1
    if (isOverdueRow(row)) customerGroup.overdueCount += 1
  }

  return Array.from(customerMap.values())
    .sort((a, b) => a.customerName.localeCompare(b.customerName, 'ar'))
    .map((customer) => ({
      ...customer,
      contracts: customer.contracts
        .sort((a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber, 'ar'))
        .map((contract) => {
          const sortedRows = contract.rows.sort(
            (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime(),
          )
          return {
            ...contract,
            rows: sortedRows,
            current: getCurrentInstallment(sortedRows),
          }
        }),
    }))
}

function tierRowClass(tier?: string, selected?: boolean): string {
  if (selected) return 'bg-primary/10 ring-1 ring-primary/30'
  if (tier === 'overdue') return 'bg-red-50 hover:bg-red-100/80'
  if (tier === 'grace') return 'bg-orange-50 hover:bg-orange-100/80'
  if (tier === 'suspended') return 'bg-surface-container-high opacity-75'
  return 'bg-white hover:bg-surface-container-low'
}

interface InstallmentCollectionGroupedListProps {
  rows: InstallmentCollectionRow[]
  selectedId?: number | null
  onSelect: (row: InstallmentCollectionRow) => void
  onReconcile: (row: InstallmentCollectionRow) => void
  onDelete: (row: InstallmentCollectionRow) => void
  onUpdateUnpaidReason?: (row: InstallmentCollectionRow, reason: string) => void
  emptyMessage?: string
}

function InstallmentMetricCell({
  label,
  children,
  dir,
}: {
  label: string
  children: React.ReactNode
  dir?: 'ltr' | 'rtl'
}) {
  return (
    <div className="rounded-lg border border-outline-variant/40 bg-surface-container-low/50 px-sm py-2.5 text-center">
      <p className="text-[11px] font-medium text-on-surface-variant">{label}</p>
      <div className="mt-1 flex min-h-[1.75rem] items-center justify-center text-sm font-bold text-on-surface" dir={dir}>
        {children}
      </div>
    </div>
  )
}

function CurrentInstallmentCard({
  row,
  invoiceNumber,
  selected,
  onSelect,
  onReconcile,
}: {
  row: InstallmentCollectionRow
  invoiceNumber: string
  selected: boolean
  onSelect: () => void
  onReconcile: () => void
}) {
  const remaining = rowRemaining(row)
  const installmentNo = row.installment_number ?? row.sequence ?? '—'
  const tier = String(row.display_tier ?? row.status)

  return (
    <div
      className={`rounded-xl border p-md ${tierRowClass(tier, selected)} ${
        selected ? 'border-primary/40 shadow-sm' : 'border-outline-variant/60'
      }`}
    >
      <div className="grid grid-cols-2 gap-sm sm:grid-cols-3 xl:grid-cols-6">
        <InstallmentMetricCell label="رقم التعاقد" dir="ltr">
          <span className="font-semibold">{invoiceNumber}</span>
        </InstallmentMetricCell>

        <InstallmentMetricCell label="رقم القسط">
          <span className="tabular-nums">#{installmentNo}</span>
        </InstallmentMetricCell>

        <InstallmentMetricCell label="المبلغ المستحق">
          <span className="tabular-nums">{remaining.toLocaleString('ar-EG')} ج.م</span>
        </InstallmentMetricCell>

        <InstallmentMetricCell label="تاريخ الاستحقاق" dir="ltr">
          <span className="tabular-nums font-semibold">{formatInvoiceDate(row.due_date)}</span>
        </InstallmentMetricCell>

        <InstallmentMetricCell label="الحالة">
          <StatusBadge status={tier} />
        </InstallmentMetricCell>

        <div className="col-span-2 rounded-lg border border-outline-variant/40 bg-surface-container-low/50 px-sm py-2.5 text-center sm:col-span-3 xl:col-span-1">
          <p className="text-[11px] font-medium text-on-surface-variant">الإجراء</p>
          <div className="mt-1 flex min-h-[1.75rem] flex-wrap items-center justify-center gap-2">
            {!row.is_suspended ? (
              <button
                type="button"
                onClick={onSelect}
                className="rounded-lg bg-primary px-md py-1.5 text-sm font-medium text-on-primary hover:bg-primary/90"
              >
                تحصيل
              </button>
            ) : (
              <span className="text-xs text-on-surface-variant">معلّق</span>
            )}
            {tier === 'overdue' && !row.is_suspended && (
              <button
                type="button"
                onClick={onReconcile}
                className="rounded-lg border border-outline-variant px-sm py-1.5 text-xs font-medium text-on-surface-variant hover:border-primary/40 hover:text-primary"
              >
                تصالح
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InstallmentDetailsTable({
  rows,
  selectedId,
  onSelect,
  onReconcile,
  onDelete,
  onUpdateUnpaidReason,
}: Omit<InstallmentCollectionGroupedListProps, 'emptyMessage'>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant/60">
      <table className="w-full min-w-[36rem] text-sm">
        <thead>
          <tr className="border-b border-outline-variant/60 bg-surface-container-low text-[11px] text-on-surface-variant">
            <th className="px-sm py-2 text-start font-bold">قسط #</th>
            <th className="px-sm py-2 text-start font-bold">المبلغ</th>
            <th className="px-sm py-2 text-start font-bold">المتبقي</th>
            <th className="px-sm py-2 text-start font-bold">الاستحقاق</th>
            <th className="px-sm py-2 text-start font-bold">الحالة</th>
            <th className="px-sm py-2 text-start font-bold">سبب عدم السداد</th>
            <th className="px-sm py-2 text-start font-bold"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const selected = selectedId === row.id
            const isPaid = row.status === 'paid' || Number(row.paid_amount) >= Number(row.amount)
            return (
              <tr
                key={row.id}
                className={`border-b border-outline-variant/40 ${tierRowClass(String(row.display_tier ?? row.status), selected)}`}
              >
                <td className="px-sm py-2 tabular-nums">{row.installment_number ?? row.sequence ?? '—'}</td>
                <td className="px-sm py-2 tabular-nums">{Number(row.amount).toLocaleString('ar-EG')}</td>
                <td className="px-sm py-2 tabular-nums font-medium">
                  {isPaid ? '—' : rowRemaining(row).toLocaleString('ar-EG')}
                </td>
                <td className="px-sm py-2 tabular-nums">{formatInvoiceDate(row.due_date)}</td>
                <td className="px-sm py-2">
                  <StatusBadge status={String(row.display_tier ?? row.status)} />
                </td>
                <td className="px-sm py-2">
                  {isPaid ? (
                    <span className="text-xs text-secondary">مسدّد</span>
                  ) : onUpdateUnpaidReason ? (
                    <input
                      type="text"
                      defaultValue={row.unpaid_reason ?? ''}
                      placeholder="سبب التأخير…"
                      className="w-full min-w-[8rem] rounded border border-outline-variant px-1 py-0.5 text-xs"
                      onBlur={(e) => {
                        if (e.target.value !== (row.unpaid_reason ?? '')) {
                          onUpdateUnpaidReason(row, e.target.value)
                        }
                      }}
                    />
                  ) : (
                    row.unpaid_reason ?? '—'
                  )}
                </td>
                <td className="px-sm py-2">
                  {!isPaid && !row.is_suspended && (
                    <button type="button" onClick={() => onSelect(row)} className="text-sm text-primary hover:underline">
                      تحصيل
                    </button>
                  )}
                  {!isPaid && row.display_tier === 'overdue' && (
                    <button
                      type="button"
                      onClick={() => onReconcile(row)}
                      className="ms-2 text-xs text-on-surface-variant hover:underline"
                    >
                      تصالح
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDelete(row)}
                    className="ms-2 text-xs text-error hover:underline"
                  >
                    حذف
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function InstallmentCollectionGroupedList({
  rows,
  selectedId,
  onSelect,
  onReconcile,
  onDelete,
  onUpdateUnpaidReason,
  emptyMessage = 'لا توجد أقساط مستحقة',
}: InstallmentCollectionGroupedListProps) {
  const groups = useMemo(() => groupInstallmentsByCustomerAndContract(rows), [rows])
  const [expandedContracts, setExpandedContracts] = useState<Set<string>>(new Set())

  const toggleDetails = (key: string) => {
    setExpandedContracts((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (groups.length === 0) {
    return (
      <p className="rounded-lg border border-outline-variant bg-surface-container-low p-md text-center text-sm text-on-surface-variant">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="space-y-sm">
      {groups.map((customer) => (
        <CollapsibleSection
          key={customer.customerKey}
          title={customer.customerName}
          summary={`${customer.contracts.length} عقد · ${customer.totalRemaining.toLocaleString('ar-EG')} ج.م متبقي${customer.overdueCount > 0 ? ` · ${customer.overdueCount} متأخر` : ''}`}
          defaultOpen={groups.length === 1}
        >
          {customer.customerPhones.length > 0 && (
            <div className="mb-sm grid grid-cols-2 gap-sm sm:grid-cols-3 lg:grid-cols-4">
              {customer.customerPhones.map((entry, index) => (
                <div
                  key={`${entry.number}-${index}`}
                  className="rounded-lg border border-outline-variant/40 bg-surface-container-low/50 px-sm py-2 text-center"
                >
                  <p className="text-[11px] font-medium text-on-surface-variant">
                    {(entry.label ?? '').trim() || `رقم ${index + 1}`}
                  </p>
                  <a
                    href={`tel:${entry.number}`}
                    dir="ltr"
                    className="mt-1 block text-sm font-bold tabular-nums text-primary hover:underline"
                  >
                    {entry.number}
                  </a>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-sm">
            {customer.contracts.map((contract) => {
              const contractKey = `${customer.customerKey}-${contract.invoiceId}`
              const showDetails = expandedContracts.has(contractKey)
              const current = contract.current

              return (
                <div
                  key={contractKey}
                  className="rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-sm"
                >
                  <div className="mb-sm flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-on-surface">تعاقد {contract.invoiceNumber}</p>
                      <p className="text-xs text-on-surface-variant">
                        {contract.installmentCount} قسط · {contract.totalRemaining.toLocaleString('ar-EG')} ج.م
                        {contract.collectionStatus && (
                          <> · {collectionStatusLabels[contract.collectionStatus] ?? contract.collectionStatus}</>
                        )}
                        {contract.collectionReminderAt && (
                          <> · تذكير {formatDatetime12hDisplay(contract.collectionReminderAt)}</>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleDetails(contractKey)}
                      className="text-sm text-primary hover:underline"
                    >
                      {showDetails ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                    </button>
                  </div>

                  {current ? (
                    <CurrentInstallmentCard
                      row={current}
                      invoiceNumber={contract.invoiceNumber}
                      selected={selectedId === current.id}
                      onSelect={() => onSelect(current)}
                      onReconcile={() => onReconcile(current)}
                    />
                  ) : (
                    <p className="text-sm text-on-surface-variant">لا يوجد قسط حالي (معَلّق أو مسدّد)</p>
                  )}

                  {showDetails && (
                    <div className="mt-sm">
                      <InstallmentDetailsTable
                        rows={contract.rows}
                        selectedId={selectedId}
                        onSelect={onSelect}
                        onReconcile={onReconcile}
                        onDelete={onDelete}
                        onUpdateUnpaidReason={onUpdateUnpaidReason}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CollapsibleSection>
      ))}
    </div>
  )
}
