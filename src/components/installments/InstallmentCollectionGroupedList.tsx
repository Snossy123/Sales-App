import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
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
  rowAllowsReconciliation,
  rowRemaining,
} from '../../lib/collectionHelpers'
import { formatDatetime12hDisplay } from '../../lib/datetime12h'
import { customerToPhoneEntries, type CustomerPhoneEntry } from '../../lib/customerForm'
import { formatInvoiceDate, normalizeInstallmentItem } from '../../lib/sales'
import { CollapsibleSection } from '../CollapsibleSection'
import { Icon } from '../Icon'
import { Pagination } from '../Pagination'
import { StatusBadge } from '../StatusBadge'
import { ContractCollectionActions } from './CustomerCollectionActions'

const DEFAULT_PAGE_SIZE = 10

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
  cash: 'نقدي',
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
  emptyMessage?: string
  collectors?: Array<{ id: number; name: string }>
  canAssign?: boolean
  onAssignCollector?: (invoiceId: number, collectorUserId: number | null) => void
  assigningInvoiceId?: number | null
  compact?: boolean
  pageSize?: number
  pageKey?: string | number
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

function ContractMetaCell({
  label,
  children,
  dir,
}: {
  label: string
  children: React.ReactNode
  dir?: 'ltr' | 'rtl'
}) {
  return (
    <div className="min-w-0 rounded-lg bg-surface-container-low/60 px-sm py-1.5">
      <p className="text-[11px] font-medium text-on-surface-variant">{label}</p>
      <div className="mt-0.5 truncate text-xs font-semibold text-on-surface" dir={dir}>
        {children}
      </div>
    </div>
  )
}

function ContractOptionsMenu({
  expandedView,
  onToggleDue,
  onToggleAll,
  canAssign,
  collectors,
  collectorUserId,
  assigning,
  onAssignCollector,
  canAddAction,
  onAddAction,
}: {
  expandedView?: ContractExpandView
  onToggleDue?: () => void
  onToggleAll?: () => void
  canAssign?: boolean
  collectors?: Array<{ id: number; name: string }>
  collectorUserId?: number | null
  assigning?: boolean
  onAssignCollector?: (collectorUserId: number | null) => void
  canAddAction?: boolean
  onAddAction?: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const hasItems = Boolean(onToggleDue || onToggleAll || (canAssign && onAssignCollector) || (canAddAction && onAddAction))
  if (!hasItems) return null

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label="خيارات التعاقد"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((current) => !current)
        }}
        className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
      >
        <Icon name="more_vert" size={22} />
      </button>
      {open && (
        <div className="absolute end-0 z-20 mt-1 min-w-56 rounded-lg border border-outline-variant bg-surface-container-lowest py-1 shadow-lg">
          {onToggleDue && (
            <button
              type="button"
              onClick={() => {
                onToggleDue()
                setOpen(false)
              }}
              className="block w-full px-sm py-2 text-right text-sm text-on-surface hover:bg-surface-container-low"
            >
              {expandedView === 'due' ? 'إخفاء الأقساط المستحقة' : 'عرض جميع الأقساط المستحقة'}
            </button>
          )}
          {onToggleAll && (
            <button
              type="button"
              onClick={() => {
                onToggleAll()
                setOpen(false)
              }}
              className="block w-full px-sm py-2 text-right text-sm text-on-surface hover:bg-surface-container-low"
            >
              {expandedView === 'all' ? 'إخفاء جميع الأقساط' : 'عرض جميع الأقساط'}
            </button>
          )}
          {canAddAction && onAddAction && (
            <button
              type="button"
              onClick={() => {
                onAddAction()
                setOpen(false)
              }}
              className="block w-full px-sm py-2 text-right text-sm text-on-surface hover:bg-surface-container-low"
            >
              إضافة إجراء
            </button>
          )}
          {canAssign && onAssignCollector && (
            <div className="border-t border-outline-variant/60 px-sm py-2">
              <p className="mb-1 text-[11px] text-on-surface-variant">تعيين المحصل</p>
              <select
                value={collectorUserId ?? ''}
                disabled={assigning}
                onChange={(event) => {
                  onAssignCollector(event.target.value ? Number(event.target.value) : null)
                  setOpen(false)
                }}
                className="h-9 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-sm text-xs"
                onClick={(event) => event.stopPropagation()}
              >
                <option value="">بدون محصل</option>
                {collectors?.map((collector) => (
                  <option key={collector.id} value={collector.id}>
                    {collector.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
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
            {tier === 'overdue' && !row.is_suspended && rowAllowsReconciliation(row) && (
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
  showPaymentColumns = false,
}: Omit<InstallmentCollectionGroupedListProps, 'emptyMessage'> & { showPaymentColumns?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant/60">
      <table className={`w-full text-sm ${showPaymentColumns ? 'min-w-[42rem]' : 'min-w-[32rem]'}`}>
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
                  {!isPaid && !row.is_suspended && (
                    <button type="button" onClick={() => onSelect(row)} className="text-sm text-primary hover:underline">
                      تحصيل
                    </button>
                  )}
                  {!isPaid && row.display_tier === 'overdue' && rowAllowsReconciliation(row) && (
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
  emptyMessage = 'لا توجد أقساط مستحقة',
  collectors = [],
  canAssign = false,
  onAssignCollector,
  assigningInvoiceId = null,
  compact = false,
  pageSize = DEFAULT_PAGE_SIZE,
  pageKey,
}: InstallmentCollectionGroupedListProps) {
  const groups = useMemo(() => groupInstallmentsByCustomerAndContract(rows, sortMode), [rows, sortMode])
  const [expandedViews, setExpandedViews] = useState<Record<string, ContractExpandView>>({})
  const [actionsOpenByContract, setActionsOpenByContract] = useState<Record<string, boolean>>({})
  const [page, setPage] = useState(1)

  const paginate = pageSize > 0
  const total = groups.length
  const lastPage = paginate ? Math.max(1, Math.ceil(total / pageSize)) : 1

  useEffect(() => {
    setPage(1)
  }, [pageKey])

  useEffect(() => {
    setPage((current) => Math.min(current, lastPage))
  }, [lastPage, total])

  const currentPage = Math.min(page, lastPage)
  const visibleGroups = paginate
    ? groups.slice((currentPage - 1) * pageSize, (currentPage - 1) * pageSize + pageSize)
    : groups

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
      {visibleGroups.map((customer, index) => (
        <CollapsibleSection
          key={customer.customerKey}
          title={customer.customerName}
          summary={`${customer.contracts.length} عقد · ${customer.totalRemaining.toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م متبقي${customer.overdueCount > 0 ? ` · ${customer.overdueCount} متأخر` : ''}`}
          defaultOpen={compact || index === 0}
          actions={
            customer.customerId ? (
              <Link
                to={`/customers/${customer.customerId}`}
                title="فتح بروفايل العميل"
                aria-label={`فتح بروفايل العميل ${customer.customerName}`}
                className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                onClick={(e) => e.stopPropagation()}
              >
                <Icon name="open_in_new" size={16} />
                بروفايل
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
                  <div className="mb-sm">
                    <div className="mb-sm flex items-start justify-between gap-2">
                      <p className="min-w-0 font-semibold text-on-surface">
                        تعاقد{' '}
                        {contract.invoiceId > 0 ? (
                          <Link
                            to={`/contracts/${contract.invoiceId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            dir="ltr"
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {contract.invoiceNumber}
                          </Link>
                        ) : (
                          contract.invoiceNumber
                        )}
                      </p>
                      <ContractOptionsMenu
                        expandedView={expandedView}
                        onToggleDue={compact ? undefined : () => toggleView(contractKey, 'due')}
                        onToggleAll={compact ? undefined : () => toggleView(contractKey, 'all')}
                        canAssign={!compact && canAssign}
                        collectors={collectors}
                        collectorUserId={contract.collectorUserId}
                        assigning={assigningInvoiceId === contract.invoiceId}
                        onAssignCollector={
                          onAssignCollector
                            ? (collectorUserId) => onAssignCollector(contract.invoiceId, collectorUserId)
                            : undefined
                        }
                        canAddAction={Boolean(customer.customerId)}
                        onAddAction={() =>
                          setActionsOpenByContract((prev) => ({ ...prev, [contractKey]: true }))
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-sm sm:grid-cols-3 lg:grid-cols-6">
                      <ContractMetaCell label="الأقساط">
                        <span className="tabular-nums">{contract.installmentCount}</span>
                      </ContractMetaCell>
                      <ContractMetaCell label="المتبقي">
                        <span className="tabular-nums">
                          {contract.totalRemaining.toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م
                        </span>
                      </ContractMetaCell>
                      {contract.collectionStatus ? (
                        <ContractMetaCell label="حالة التحصيل">
                          {collectionStatusLabels[contract.collectionStatus] ?? contract.collectionStatus}
                        </ContractMetaCell>
                      ) : null}
                      <ContractMetaCell label="المحصل">
                        {contract.collectorName || 'بدون محصل'}
                      </ContractMetaCell>
                      <ContractMetaCell label="السريال" dir="ltr">
                        {serial || '—'}
                      </ContractMetaCell>
                      <ContractMetaCell label="اليوزر" dir="ltr">
                        {username || '—'}
                      </ContractMetaCell>
                      <ContractMetaCell label="الشريحة" dir="ltr">
                        {sim || '—'}
                      </ContractMetaCell>
                      {contract.collectionReminderAt ? (
                        <ContractMetaCell label="التذكير">
                          {formatDatetime12hDisplay(contract.collectionReminderAt)}
                        </ContractMetaCell>
                      ) : null}
                    </div>
                  </div>

                  <ContractCollectionActions
                    customerId={customer.customerId}
                    invoiceId={contract.invoiceId}
                    hasPhone={customer.customerPhones.length > 0}
                    hideTrigger
                    openActions={Boolean(actionsOpenByContract[contractKey])}
                    onOpenActionsChange={(open) =>
                      setActionsOpenByContract((prev) => ({ ...prev, [contractKey]: open }))
                    }
                  />

                  {current ? (
                    <CurrentInstallmentCard
                      row={current}
                      selected={selectedId === current.id}
                      onSelect={() => onSelect(current)}
                      onReconcile={() => onReconcile(current)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const fallback = contract.rows[0]
                        if (fallback) onSelect(fallback)
                      }}
                      className={`w-full rounded-lg border px-sm py-sm text-right text-sm ${
                        selectedId && contract.rows.some((row) => row.id === selectedId)
                          ? 'border-primary/40 bg-primary/10'
                          : 'border-outline-variant/70 bg-surface-container-low'
                      }`}
                    >
                      <span className="inline-flex rounded-full bg-surface-container-high px-2 py-0.5 text-[11px] font-medium text-on-surface-variant">
                        معلّق
                      </span>
                      <p className="mt-1 text-on-surface">
                        {contract.collectionReminderAt
                          ? `متابعة ${formatDatetime12hDisplay(contract.collectionReminderAt)}`
                          : 'أضف ميعاد متابعة من لوحة التحصيل'}
                      </p>
                    </button>
                  )}

                  {expandedView === 'due' && (
                    <div className="mt-sm">
                      <InstallmentDetailsTable
                        rows={contract.rows}
                        selectedId={selectedId}
                        onSelect={onSelect}
                        onReconcile={onReconcile}
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
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CollapsibleSection>
      ))}
      {paginate && lastPage > 1 && (
        <Pagination
          currentPage={currentPage}
          lastPage={lastPage}
          total={total}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
