import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, getErrorMessage } from '../../api/client'
import type { InstallmentItem } from '../../api/types'
import type { CollectionSortMode, InstallmentCollectionRow } from '../../lib/collectionHelpers'
import {
  collectionStatusLabels,
  compareCollectionSortKeys,
  compareContractCollection,
  contractCollectionSortKey,
  getCurrentInstallment,
  rowRemaining,
} from '../../lib/collectionHelpers'
import { formatDatetime12hDisplay } from '../../lib/datetime12h'
import { customerToPhoneEntries, type CustomerPhoneEntry } from '../../lib/customerForm'
import { formatInvoiceDate, normalizeInstallmentItem } from '../../lib/sales'
import { CollapsibleSection } from '../CollapsibleSection'
import { Icon } from '../Icon'
import { StatusBadge } from '../StatusBadge'
import { ContractCollectionActions } from './CustomerCollectionActions'

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
  collectorUserId?: number | null
  collectorName?: string | null
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

type ContractExpandView = 'due' | 'all'

const installmentPaymentMethodLabels: Record<string, string> = {
  cash: 'كاش',
  wallet: 'محفظة',
  instapay: 'انستا',
  bank_transfer: 'تحويل بنكي',
  card: 'بطاقة',
  distributor_balance: 'رصيد موزع',
}

function formatInstallmentPaymentMethod(value?: string | null): string {
  if (!value?.trim()) return '—'
  return value
    .split(',')
    .map((method) => method.trim())
    .filter(Boolean)
    .map((method) => installmentPaymentMethodLabels[method] ?? method)
    .join(' + ')
}

function isOverdueRow(row: InstallmentCollectionRow): boolean {
  return row.status === 'overdue' || row.display_tier === 'overdue'
}

function sortContractInstallments(rows: InstallmentCollectionRow[]): InstallmentCollectionRow[] {
  return [...rows].sort((a, b) => {
    const seqA = a.sequence ?? a.installment_number ?? 0
    const seqB = b.sequence ?? b.installment_number ?? 0
    if (seqA !== seqB) return seqA - seqB
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  })
}

export function groupInstallmentsByCustomerAndContract(
  rows: InstallmentCollectionRow[],
  sortMode: CollectionSortMode = 'priority',
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
        collectorUserId: row.collector_user_id ?? null,
        collectorName: row.collector_name ?? null,
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

  const finalized = Array.from(customerMap.values()).map((customer) => ({
    ...customer,
    contracts: customer.contracts
      .map((contract) => {
        const sortedRows = contract.rows.sort(
          (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime(),
        )
        return {
          ...contract,
          rows: sortedRows,
          current: getCurrentInstallment(sortedRows),
        }
      })
      .sort((a, b) => compareContractCollection(a.rows, b.rows, sortMode)),
  }))

  return finalized.sort((a, b) => {
    const keyA = contractCollectionSortKey(
      a.contracts[0]?.rows ?? [],
      sortMode,
    )
    const keyB = contractCollectionSortKey(
      b.contracts[0]?.rows ?? [],
      sortMode,
    )
    return compareCollectionSortKeys(keyA, keyB)
  })
}

function tierRowClass(tier?: string, selected?: boolean): string {
  if (selected) {
    return 'bg-primary/10 ring-1 ring-primary/30 border-primary/40 shadow-sm'
  }
  if (tier === 'overdue') {
    return 'bg-red-50 hover:bg-red-100/80 border-red-300/70'
  }
  if (tier === 'grace') {
    return 'bg-yellow-50 hover:bg-yellow-100/80 border-yellow-300/70'
  }
  if (tier === 'suspended') {
    return 'bg-surface-container-high opacity-75 border-outline-variant/60'
  }
  return 'bg-white hover:bg-surface-container-low border-outline-variant/60'
}

interface InstallmentCollectionGroupedListProps {
  rows: InstallmentCollectionRow[]
  sortMode?: CollectionSortMode
  selectedId?: number | null
  onSelect: (row: InstallmentCollectionRow) => void
  onReconcile: (row: InstallmentCollectionRow) => void
  onUpdateUnpaidReason?: (row: InstallmentCollectionRow, reason: string) => void
  emptyMessage?: string
  collectors?: Array<{ id: number; name: string }>
  canAssign?: boolean
  onAssignCollector?: (invoiceId: number, collectorUserId: number | null) => void
  assigningInvoiceId?: number | null
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
  selected,
  onSelect,
  onReconcile,
}: {
  row: InstallmentCollectionRow
  selected: boolean
  onSelect: () => void
  onReconcile: () => void
}) {
  const remaining = rowRemaining(row)
  const installmentNo = row.installment_number ?? row.sequence ?? '—'
  const tier = String(row.display_tier ?? row.status)

  return (
    <div className={`rounded-xl border p-md ${tierRowClass(tier, selected)}`}>
      <div className="grid grid-cols-2 gap-sm sm:grid-cols-3 xl:grid-cols-5">
        <InstallmentMetricCell label="رقم القسط">
          <span className="tabular-nums">#{installmentNo}</span>
        </InstallmentMetricCell>

        <InstallmentMetricCell label="المبلغ المستحق">
          <span className="tabular-nums">{remaining.toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م</span>
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
  onUpdateUnpaidReason,
  showPaymentColumns = false,
}: Omit<InstallmentCollectionGroupedListProps, 'emptyMessage'> & { showPaymentColumns?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant/60">
      <table className={`w-full text-sm ${showPaymentColumns ? 'min-w-[46rem]' : 'min-w-[36rem]'}`}>
        <thead>
          <tr className="border-b border-outline-variant/60 bg-surface-container-low text-[11px] text-on-surface-variant">
            <th className="px-sm py-2 text-start font-bold">قسط #</th>
            <th className="px-sm py-2 text-start font-bold">المبلغ</th>
            <th className="px-sm py-2 text-start font-bold">المتبقي</th>
            <th className="px-sm py-2 text-start font-bold">الاستحقاق</th>
            {showPaymentColumns && (
              <>
                <th className="px-sm py-2 text-start font-bold">تاريخ السداد</th>
                <th className="px-sm py-2 text-start font-bold">طريقة الدفع</th>
              </>
            )}
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
                <td className="px-sm py-2 tabular-nums">{Number(row.amount).toLocaleString('ar-EG', { numberingSystem: 'latn' })}</td>
                <td className="px-sm py-2 tabular-nums font-medium">
                  {isPaid ? '—' : rowRemaining(row).toLocaleString('ar-EG', { numberingSystem: 'latn' })}
                </td>
                <td className="px-sm py-2 tabular-nums">{formatInvoiceDate(row.due_date)}</td>
                {showPaymentColumns && (
                  <>
                    <td className="px-sm py-2 tabular-nums">
                      {row.paid_at ? formatInvoiceDate(row.paid_at) : '—'}
                    </td>
                    <td className="px-sm py-2">{formatInstallmentPaymentMethod(row.payment_method)}</td>
                  </>
                )}
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
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ContractAllInstallmentsTable({
  invoiceId,
  selectedId,
  onSelect,
  onReconcile,
  onUpdateUnpaidReason,
}: {
  invoiceId: number
} & Omit<InstallmentCollectionGroupedListProps, 'rows' | 'emptyMessage' | 'sortMode'>) {
  const query = useQuery({
    queryKey: ['installments', 'by-invoice', invoiceId],
    queryFn: async () => {
      const { data } = await api.get<{ data: InstallmentItem[] }>('/installments', {
        params: {
          per_page: 500,
          'filter[sales_invoice_id]': invoiceId,
          include: 'salesInvoice.customer',
        },
      })
      return sortContractInstallments(
        data.data.map((item) => normalizeInstallmentItem(item) as InstallmentCollectionRow),
      )
    },
    enabled: invoiceId > 0,
  })

  if (query.isLoading) {
    return <p className="text-sm text-on-surface-variant">جاري التحميل…</p>
  }

  if (query.isError) {
    return <p className="text-sm text-error">{getErrorMessage(query.error)}</p>
  }

  const rows = query.data ?? []
  if (rows.length === 0) {
    return <p className="text-sm text-on-surface-variant">لا توجد أقساط على هذا التعاقد</p>
  }

  return (
    <InstallmentDetailsTable
      rows={rows}
      selectedId={selectedId}
      onSelect={onSelect}
      onReconcile={onReconcile}
      onUpdateUnpaidReason={onUpdateUnpaidReason}
      showPaymentColumns
    />
  )
}

export function InstallmentCollectionGroupedList({
  rows,
  sortMode = 'priority',
  selectedId,
  onSelect,
  onReconcile,
  onUpdateUnpaidReason,
  emptyMessage = 'لا توجد أقساط مستحقة',
  collectors = [],
  canAssign = false,
  onAssignCollector,
  assigningInvoiceId = null,
}: InstallmentCollectionGroupedListProps) {
  const groups = useMemo(() => groupInstallmentsByCustomerAndContract(rows, sortMode), [rows, sortMode])
  const [expandedViews, setExpandedViews] = useState<Record<string, ContractExpandView>>({})

  const toggleView = (key: string, view: ContractExpandView) => {
    setExpandedViews((prev) => {
      if (prev[key] === view) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: view }
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
      {groups.map((customer, index) => (
        <CollapsibleSection
          key={customer.customerKey}
          title={customer.customerName}
          summary={`${customer.contracts.length} عقد · ${customer.totalRemaining.toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م متبقي${customer.overdueCount > 0 ? ` · ${customer.overdueCount} متأخر` : ''}`}
          defaultOpen={index === 0}
          actions={
            customer.customerId ? (
              <Link
                to={`/customers/${customer.customerId}`}
                title="فتح ملف العميل"
                aria-label={`فتح ملف العميل ${customer.customerName}`}
                className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                onClick={(e) => e.stopPropagation()}
              >
                <Icon name="open_in_new" size={16} />
                الملف
              </Link>
            ) : null
          }
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
              const expandedView = expandedViews[contractKey]
              const current = contract.current
              const deviceRow =
                contract.rows.find((row) => {
                  const serial = String(row.serial_number ?? '').trim()
                  const username = String(row.username ?? '').trim()
                  const sim = String(row.sim_number ?? '').trim()
                  return Boolean(serial || username || sim)
                }) ??
                current ??
                contract.rows[0]
              const serial = String(deviceRow?.serial_number ?? '').trim()
              const username = String(deviceRow?.username ?? '').trim()
              const sim = String(deviceRow?.sim_number ?? '').trim()

              return (
                <div
                  key={contractKey}
                  className="rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-sm"
                >
                  <div className="mb-sm flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-on-surface">تعاقد {contract.invoiceNumber}</p>
                      <p className="text-xs text-on-surface-variant">
                        {contract.installmentCount} قسط · {contract.totalRemaining.toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م
                        {contract.collectionStatus && (
                          <> · {collectionStatusLabels[contract.collectionStatus] ?? contract.collectionStatus}</>
                        )}
                        {contract.collectionReminderAt && (
                          <> · تذكير {formatDatetime12hDisplay(contract.collectionReminderAt)}</>
                        )}
                        {' · '}
                        {contract.collectorName ? `المحصل: ${contract.collectorName}` : 'بدون محصل'}
                      </p>
                      <p className="mt-1 text-xs text-on-surface">
                        <span className="text-on-surface-variant">السريال:</span>{' '}
                        <span className="font-semibold" dir="ltr">
                          {serial || '—'}
                        </span>
                        <span className="mx-2 text-on-surface-variant">·</span>
                        <span className="text-on-surface-variant">اليوزر:</span>{' '}
                        <span className="font-semibold" dir="ltr">
                          {username || '—'}
                        </span>
                        <span className="mx-2 text-on-surface-variant">·</span>
                        <span className="text-on-surface-variant">الشريحة:</span>{' '}
                        <span className="font-semibold" dir="ltr">
                          {sim || '—'}
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {canAssign && onAssignCollector && (
                        <select
                          value={contract.collectorUserId ?? ''}
                          disabled={assigningInvoiceId === contract.invoiceId}
                          onChange={(e) =>
                            onAssignCollector(
                              contract.invoiceId,
                              e.target.value ? Number(e.target.value) : null,
                            )
                          }
                          className="h-9 rounded-lg border border-outline-variant bg-surface-container-lowest px-sm text-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="">بدون محصل</option>
                          {collectors.map((collector) => (
                            <option key={collector.id} value={collector.id}>
                              {collector.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleView(contractKey, 'due')}
                        className="text-sm text-primary hover:underline"
                      >
                        {expandedView === 'due' ? 'إخفاء الأقساط المستحقة' : 'عرض جميع الأقساط المستحقة'}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleView(contractKey, 'all')}
                        className="text-sm text-primary hover:underline"
                      >
                        {expandedView === 'all' ? 'إخفاء جميع الأقساط' : 'عرض جميع الأقساط'}
                      </button>
                    </div>
                  </div>

                  <ContractCollectionActions
                    customerId={customer.customerId}
                    invoiceId={contract.invoiceId}
                    hasPhone={customer.customerPhones.length > 0}
                  />

                  {current ? (
                    <CurrentInstallmentCard
                      row={current}
                      selected={selectedId === current.id}
                      onSelect={() => onSelect(current)}
                      onReconcile={() => onReconcile(current)}
                    />
                  ) : (
                    <p className="text-sm text-on-surface-variant">لا يوجد قسط حالي (معَلّق أو مسدّد)</p>
                  )}

                  {expandedView === 'due' && (
                    <div className="mt-sm">
                      <InstallmentDetailsTable
                        rows={contract.rows}
                        selectedId={selectedId}
                        onSelect={onSelect}
                        onReconcile={onReconcile}
                        onUpdateUnpaidReason={onUpdateUnpaidReason}
                      />
                    </div>
                  )}

                  {expandedView === 'all' && (
                    <div className="mt-sm">
                      <ContractAllInstallmentsTable
                        invoiceId={contract.invoiceId}
                        selectedId={selectedId}
                        onSelect={onSelect}
                        onReconcile={onReconcile}
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
