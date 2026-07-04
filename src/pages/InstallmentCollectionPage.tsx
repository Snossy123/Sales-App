import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { AdminUser, Branch, CollectionPaymentAccount, InstallmentItem, PaginatedResponse } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DateTimeInput12h } from '../components/DateTimeInput12h'
import { InstallmentCollectionGroupedList } from '../components/installments/InstallmentCollectionGroupedList'
import { FilterBar } from '../components/FilterBar'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'
import {
  collectionStatusOptions,
  computeContractStats,
  filterRowsByContractTier,
  type ContractTierFilter,
  type InstallmentCollectionRow,
} from '../lib/collectionHelpers'
import { formatDatetimeLocal, parseDatetimeLocal } from '../lib/datetime12h'
import {
  installmentStatusOptions,
  normalizeInstallmentItem,
} from '../lib/sales'
import { openPaymentReceiptPrint } from '../lib/paymentReceipt'
import { useAuthStore } from '../stores/authStore'

type InstallmentRow = InstallmentCollectionRow & Record<string, unknown>

interface BranchStats {
  branch: Branch
  count: number
  overdueCount: number
  totalRemaining: number
}

const paymentMethodOptions = [
  { value: 'cash', label: 'كاش' },
  { value: 'wallet', label: 'محفظة' },
  { value: 'instapay', label: 'انستا' },
  { value: 'bank_transfer', label: 'تحويل بنكي' },
]

const transferMethods = ['wallet', 'instapay', 'bank_transfer']

function BranchInstallmentCard({
  stats,
  selected,
  onSelect,
}: {
  stats: BranchStats
  selected: boolean
  onSelect: () => void
}) {
  const { branch, count, overdueCount, totalRemaining } = stats

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-xl border p-md text-right transition-all ${
        selected
          ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30'
          : 'border-outline-variant bg-surface-container-lowest hover:border-primary/40 hover:bg-surface-container-low'
      }`}
    >
      <div className="mb-sm flex items-start justify-between gap-sm">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-on-surface">
            {branch.name_ar || branch.name}
          </p>
          <p className="text-xs text-on-surface-variant">{branch.code}</p>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            selected ? 'bg-primary text-on-primary' : 'bg-primary/10 text-primary'
          }`}
        >
          <Icon name="store" size={20} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-xs text-center">
        <div className="rounded-lg bg-surface-container-low px-xs py-sm">
          <p className="tabular-nums text-lg font-bold text-on-surface">{count}</p>
          <p className="text-[11px] text-on-surface-variant">قسط مستحق</p>
        </div>
        <div className="rounded-lg bg-surface-container-low px-xs py-sm">
          <p className={`tabular-nums text-lg font-bold ${overdueCount > 0 ? 'text-error' : 'text-on-surface'}`}>
            {overdueCount}
          </p>
          <p className="text-[11px] text-on-surface-variant">متأخر</p>
        </div>
        <div className="rounded-lg bg-surface-container-low px-xs py-sm">
          <p className="tabular-nums text-sm font-bold text-on-surface">
            {totalRemaining.toLocaleString('ar-EG')}
          </p>
          <p className="text-[11px] text-on-surface-variant">متبقي ج.م</p>
        </div>
      </div>
    </button>
  )
}

export function InstallmentCollectionPage() {
  const queryClient = useQueryClient()
  const authBranchId = useAuthStore((s) => s.branchId)
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null)
  const [selected, setSelected] = useState<InstallmentRow | null>(null)
  const [amount, setAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [accountId, setAccountId] = useState<number | ''>('')
  const [senderNumber, setSenderNumber] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [contractTierFilter, setContractTierFilter] = useState<ContractTierFilter>('all')
  const [collectionStatusFilter, setCollectionStatusFilter] = useState('')
  const [sortByReminder, setSortByReminder] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [collectionStatus, setCollectionStatus] = useState('')
  const [collectionReminderAt, setCollectionReminderAt] = useState('')
  const [collectionNotes, setCollectionNotes] = useState('')
  const [deferDate, setDeferDate] = useState('')
  const [showEditDueDates, setShowEditDueDates] = useState(false)
  const [dueDateEdits, setDueDateEdits] = useState<Record<number, string>>({})
  const [showReconcile, setShowReconcile] = useState(false)
  const [responsibleUserId, setResponsibleUserId] = useState<number | ''>('')
  const [reconcileNotes, setReconcileNotes] = useState('')
  const [adjustNextDueDate, setAdjustNextDueDate] = useState(false)
  const [dueDateShiftDays, setDueDateShiftDays] = useState(0)
  const [distributorBalanceAmount, setDistributorBalanceAmount] = useState(0)

  const selectedCustomerId = selected?.customer_id as number | undefined

  const distributorProfileQuery = useQuery({
    queryKey: ['customer', selectedCustomerId, 'distributor-profile'],
    queryFn: async () => {
      const { data } = await api.get<{ distributor_profile?: import('../api/types').Distributor }>(
        `/customers/${selectedCustomerId}`,
        { params: { include: 'distributorProfile' } },
      )
      return data.distributor_profile ?? null
    },
    enabled: Boolean(selectedCustomerId),
  })

  const distributorProfile = distributorProfileQuery.data
  const maxDistributorBalance = Math.min(
    Number(distributorProfile?.commission_balance ?? 0),
    amount,
  )

  interface PaymentRow {
    id: number
    transaction_number?: string
    amount: string | number
    refunded_amount?: string | number
    status: string
    paid_at?: string
  }

  const branchesQuery = useQuery({
    queryKey: ['branches', 'installments'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', {
        params: { per_page: 100, 'filter[is_active]': 1 },
      })
      return data.data
    },
  })

  const usersQuery = useQuery({
    queryKey: ['admin-users', 'reconcile'],
    queryFn: async () => {
      const { data } = await api.get<{ data: AdminUser[] }>('/staff-options')
      return data.data
    },
  })

  const installmentsQuery = useQuery({
    queryKey: ['installments', 'by-branch', statusFilter, collectionStatusFilter, sortByReminder],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 500,
        include: 'salesInvoice.customer',
      }
      if (statusFilter) params['filter[status]'] = statusFilter
      if (collectionStatusFilter) params['filter[collection_status]'] = collectionStatusFilter
      if (sortByReminder) params.sort = 'reminder'

      const { data } = await api.get<{ data: InstallmentItem[] }>('/installments', { params })
      return data.data
        .map((item) => normalizeInstallmentItem(item) as InstallmentRow)
        .filter((item) => item.status !== 'paid')
    },
  })

  const installmentsByBranch = useMemo(() => {
    const map = new Map<number, InstallmentRow[]>()
    for (const row of (installmentsQuery.data ?? []) as InstallmentRow[]) {
      const branchId = row.branch_id
      if (!branchId) continue
      const list = map.get(branchId) ?? []
      list.push(row)
      map.set(branchId, list)
    }
    return map
  }, [installmentsQuery.data])

  const branchStats = useMemo((): BranchStats[] => {
    const branches = branchesQuery.data ?? []
    return branches
      .map((branch) => {
        const rows = installmentsByBranch.get(branch.id) ?? []
        const overdueCount = rows.filter((r) => r.status === 'overdue').length
        const totalRemaining = rows.reduce(
          (sum, r) => sum + Number(r.remaining ?? Number(r.amount) - Number(r.paid_amount)),
          0,
        )
        return {
          branch,
          count: rows.length,
          overdueCount,
          totalRemaining,
        }
      })
      .filter((s) => s.count > 0 || branches.length <= 6)
      .sort((a, b) => b.count - a.count || b.overdueCount - a.overdueCount)
  }, [branchesQuery.data, installmentsByBranch])

  useEffect(() => {
    if (selectedBranchId != null) return
    if (authBranchId && branchStats.some((s) => s.branch.id === authBranchId)) {
      setSelectedBranchId(authBranchId)
      return
    }
    if (branchStats.length === 1) {
      setSelectedBranchId(branchStats[0].branch.id)
    }
  }, [authBranchId, branchStats, selectedBranchId])

  const branchRows = useMemo(() => {
    if (!selectedBranchId) return []
    return installmentsByBranch.get(selectedBranchId) ?? []
  }, [installmentsByBranch, selectedBranchId])

  const filteredRows = useMemo(() => {
    let rows = branchRows
    rows = filterRowsByContractTier(rows, contractTierFilter)
    const q = customerSearch.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => {
      const name = String(row.customer_name ?? '').toLowerCase()
      const invoice = String(row.invoice_number ?? '').toLowerCase()
      return name.includes(q) || invoice.includes(q)
    })
  }, [branchRows, contractTierFilter, customerSearch])

  const contractStats = useMemo(() => computeContractStats(branchRows), [branchRows])
  const selectedBranchSummary = branchStats.find((s) => s.branch.id === selectedBranchId)

  const selectedContractRows = useMemo(() => {
    if (!selected?.sales_invoice_id) return []
    return branchRows.filter((r) => r.sales_invoice_id === selected.sales_invoice_id)
  }, [branchRows, selected?.sales_invoice_id])

  const selectedIsOverdueContract = useMemo(() => {
    return selectedContractRows.some((r) => r.display_tier === 'overdue' || r.status === 'overdue')
  }, [selectedContractRows])

  const selectedBranch = branchStats.find((s) => s.branch.id === selectedBranchId)?.branch

  const accountsQuery = useQuery({
    queryKey: ['collection-accounts', 'active', paymentMethod],
    queryFn: async () => {
      const { data } = await api.get<{ data: CollectionPaymentAccount[] }>('/collection-accounts/active', {
        params: transferMethods.includes(paymentMethod) ? { payment_method: paymentMethod } : undefined,
      })
      return data.data
    },
    enabled: transferMethods.includes(paymentMethod),
  })

  useEffect(() => {
    setAccountId('')
  }, [paymentMethod])

  const installmentPaymentsQuery = useQuery({
    queryKey: ['payment-transactions', 'installment', selected?.id],
    queryFn: async () => {
      const { data } = await api.get<{ data: PaymentRow[] }>('/payment-transactions', {
        params: { installment_item_id: selected!.id, per_page: 20, status: 'active' },
      })
      return (data as { data?: PaymentRow[] }).data ?? []
    },
    enabled: Boolean(selected?.id),
  })

  const deleteMutation = useMutation({
    mutationFn: async (itemId: number) => {
      await api.delete(`/installments/${itemId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      queryClient.invalidateQueries({ queryKey: ['trash'] })
      setSelected(null)
    },
  })

  const collectMutation = useMutation({
    mutationFn: async () => {
      if (!selected?.sales_invoice_id) throw new Error('فاتورة غير محددة')
      const payload: Record<string, unknown> = {
        installment_item_id: selected.id,
        amount,
        payment_method: paymentMethod,
      }
      if (transferMethods.includes(paymentMethod)) {
        payload.collection_payment_account_id = accountId || undefined
        payload.sender_transfer_number = senderNumber.trim() || undefined
      }
      if (adjustNextDueDate && Number(selected.late_fee_accrued ?? 0) > 0) {
        payload.adjust_next_due_date = true
        if (dueDateShiftDays > 0) payload.due_date_shift_days = dueDateShiftDays
      }
      if (distributorBalanceAmount > 0) {
        payload.distributor_balance_amount = distributorBalanceAmount
      }
      const { data } = await api.post(`/sales-invoices/${selected.sales_invoice_id}/installments/collect`, payload)
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      if (data?.id) {
        openPaymentReceiptPrint(Number(data.id))
      }
      setSelected(null)
      setAmount(0)
      setPaymentMethod('cash')
      setAccountId('')
      setSenderNumber('')
      setDistributorBalanceAmount(0)
      setAdjustNextDueDate(false)
      setDueDateShiftDays(0)
    },
  })

  const closeReconcileMutation = useMutation({
    mutationFn: async (reconciliationId: number) => {
      const { data } = await api.post(`/installments/reconciliations/${reconciliationId}/close`, {})
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      setSelected(null)
    },
  })

  const reconcileMutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('قسط غير محدد')
      const { data } = await api.post(`/installments/${selected.id}/reconcile`, {
        responsible_user_id: Number(responsibleUserId),
        notes: reconcileNotes.trim() || undefined,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      setShowReconcile(false)
      setResponsibleUserId('')
      setReconcileNotes('')
    },
  })

  const metadataMutation = useMutation({
    mutationFn: async () => {
      if (!selected?.sales_invoice_id) throw new Error('فاتورة غير محددة')
      const { data } = await api.patch(`/sales-invoices/${selected.sales_invoice_id}/collection-metadata`, {
        collection_status: collectionStatus || null,
        collection_reminder_at: collectionReminderAt || null,
        collection_notes: collectionNotes.trim() || null,
      })
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['installments'] }),
  })

  const deferMutation = useMutation({
    mutationFn: async () => {
      if (!selected?.sales_invoice_id || !deferDate) throw new Error('حدد تاريخ البداية')
      const { data } = await api.post(`/sales-invoices/${selected.sales_invoice_id}/installments/defer`, {
        new_first_due_date: deferDate,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      setDeferDate('')
      setSelected(null)
    },
  })

  const dueDatesMutation = useMutation({
    mutationFn: async () => {
      if (!selected?.sales_invoice_id) throw new Error('فاتورة غير محددة')
      const items = Object.entries(dueDateEdits).map(([id, due_date]) => ({
        installment_item_id: Number(id),
        due_date,
      }))
      const { data } = await api.put(`/sales-invoices/${selected.sales_invoice_id}/installment-due-dates`, {
        items,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      setShowEditDueDates(false)
    },
  })

  const unpaidReasonMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      await api.patch(`/installments/${id}`, { unpaid_reason: reason || null })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['installments'] }),
  })

  const selectRow = (row: InstallmentRow) => {
    setSelected(row)
    setAmount(Number(row.total_due ?? row.remaining ?? Number(row.amount) - Number(row.paid_amount)))
    setPaymentMethod('cash')
    setAccountId('')
    setSenderNumber('')
    setShowReconcile(false)
    setAdjustNextDueDate(false)
    setCollectionStatus(String(row.collection_status ?? ''))
    setCollectionReminderAt(
      row.collection_reminder_at
        ? (() => {
            const parts = parseDatetimeLocal(String(row.collection_reminder_at))
            return parts ? formatDatetimeLocal(parts) : ''
          })()
        : '',
    )
    setCollectionNotes(String(row.collection_notes ?? ''))
    setShowEditDueDates(false)
    const edits: Record<number, string> = {}
    branchRows
      .filter((r) => r.sales_invoice_id === row.sales_invoice_id && r.status !== 'paid')
      .forEach((r) => {
        edits[r.id] = String(r.due_date).slice(0, 10)
      })
    setDueDateEdits(edits)
    const dueDate = row.due_date ? new Date(String(row.due_date)) : null
    const daysLate = dueDate
      ? Math.max(1, Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 1
    setDueDateShiftDays(daysLate)
    setDistributorBalanceAmount(0)
  }

  const toggleBranch = (branchId: number) => {
    setSelectedBranchId((current) => (current === branchId ? null : branchId))
    setSelected(null)
    setAmount(0)
    setCustomerSearch('')
  }

  const hasFilters = Boolean(customerSearch || statusFilter || collectionStatusFilter || contractTierFilter !== 'all')
  const clearFilters = () => {
    setCustomerSearch('')
    setStatusFilter('')
    setCollectionStatusFilter('')
    setContractTierFilter('all')
    setSortByReminder(false)
  }

  return (
    <SalesPageShell
      title="تحصيل الأقساط"
      subtitle="اختر فرعاً لعرض الأقساط مجمّعة حسب العميل ثم التعاقد"
      filters={
        <FilterBar
          selects={[
            {
              id: 'contract-tier',
              label: 'فلتر العقود',
              value: contractTierFilter,
              onChange: (v) => {
                setContractTierFilter(v as ContractTierFilter)
                setSelected(null)
              },
              options: [
                { value: 'all', label: 'كل العقود' },
                { value: 'overdue', label: 'متأخرة' },
                { value: 'due_soon', label: 'مستحقة / فترة سماح' },
              ],
            },
            {
              id: 'collection-status',
              label: 'حالة التحصيل',
              value: collectionStatusFilter,
              onChange: (v) => {
                setCollectionStatusFilter(v)
                setSelected(null)
              },
              options: collectionStatusOptions,
            },
            {
              id: 'status',
              label: 'حالة القسط',
              value: statusFilter,
              onChange: (value) => {
                setStatusFilter(value)
                setSelected(null)
              },
              options: installmentStatusOptions.map((o) => ({ value: o.value, label: o.label })),
            },
            {
              id: 'sort',
              label: 'الترتيب',
              value: sortByReminder ? 'reminder' : 'default',
              onChange: (v) => setSortByReminder(v === 'reminder'),
              options: [
                { value: 'default', label: 'حسب الأولوية' },
                { value: 'reminder', label: 'ميعاد التذكير' },
              ],
            },
          ]}
          showClear={hasFilters || sortByReminder}
          onClear={clearFilters}
        />
      }
    >
      <AsyncState
        isLoading={branchesQuery.isLoading || installmentsQuery.isLoading}
        isError={branchesQuery.isError || installmentsQuery.isError}
        error={branchesQuery.error ?? installmentsQuery.error}
      >
        {branchStats.length === 0 ? (
          <p className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md text-center text-on-surface-variant">
            لا توجد أقساط مستحقة على أي فرع
          </p>
        ) : (
          <div className="mb-md grid grid-cols-1 gap-sm sm:grid-cols-2 xl:grid-cols-3">
            {branchStats.map((stats) => (
              <BranchInstallmentCard
                key={stats.branch.id}
                stats={stats}
                selected={selectedBranchId === stats.branch.id}
                onSelect={() => toggleBranch(stats.branch.id)}
              />
            ))}
          </div>
        )}

        {selectedBranchId && selectedBranch ? (
          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
            <div className="mb-md flex flex-wrap items-center justify-between gap-sm">
              <h2 className="text-lg font-semibold text-on-surface">
                أقساط فرع {selectedBranch.name_ar || selectedBranch.name}
              </h2>
              <span className="rounded-full bg-surface-container-high px-sm py-xs text-xs text-on-surface-variant">
                {filteredRows.length} قسط ·{' '}
                {new Set(filteredRows.map((r) => r.sales_invoice_id)).size} عقد
              </span>
            </div>

            <div className="mb-md grid grid-cols-3 gap-xs text-center">
              <div className="rounded-lg bg-surface-container-low px-xs py-sm">
                <p className="tabular-nums text-lg font-bold text-on-surface">
                  {contractStats.total_contracts}
                </p>
                <p className="text-[11px] text-on-surface-variant">التعاقدات</p>
              </div>
              <div className="rounded-lg bg-surface-container-low px-xs py-sm">
                <p
                  className={`tabular-nums text-lg font-bold ${
                    (selectedBranchSummary?.overdueCount ?? 0) > 0 ? 'text-error' : 'text-on-surface'
                  }`}
                >
                  {selectedBranchSummary?.overdueCount ?? 0}
                </p>
                <p className="text-[11px] text-on-surface-variant">قسط متأخر</p>
              </div>
              <div className="rounded-lg bg-surface-container-low px-xs py-sm">
                <p className="tabular-nums text-lg font-bold text-on-surface">
                  {selectedBranchSummary?.count ?? 0}
                </p>
                <p className="text-[11px] text-on-surface-variant">قسط مستحق</p>
              </div>
            </div>

            <FilterBar
              search={customerSearch}
              onSearchChange={setCustomerSearch}
              searchPlaceholder="بحث بالعميل أو رقم الفاتورة..."
              showClear={hasFilters}
              onClear={clearFilters}
            />

            <div className="grid gap-md lg:grid-cols-[minmax(0,1fr)_min(22rem,38%)]">
              <div className="min-w-0">
                <InstallmentCollectionGroupedList
                  rows={filteredRows}
                  selectedId={selected?.id as number | undefined}
                  onSelect={selectRow}
                  onReconcile={(row) => {
                    selectRow(row)
                    setShowReconcile(true)
                  }}
                  onDelete={(row) => {
                    if (window.confirm('نقل القسط إلى سلة المهملات؟')) {
                      deleteMutation.mutate(row.id as number)
                    }
                  }}
                  onUpdateUnpaidReason={(row, reason) => {
                    unpaidReasonMutation.mutate({ id: row.id, reason })
                  }}
                  emptyMessage="لا توجد أقساط مستحقة لهذا الفرع"
                />
              </div>

              {selected ? (
                <div className="rounded-xl border border-outline-variant bg-surface-container-low p-md">
                  <h3 className="mb-md text-lg font-semibold">تحصيل قسط</h3>
                  {selected.is_suspended && (
                    <p className="mb-sm rounded-lg bg-orange-50 px-sm py-2 text-sm text-orange-800">
                      الأقساط معلّقة — الجهاز قيد المراجعة في الفرع
                    </p>
                  )}
                  <dl className="mb-md space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-on-surface-variant">العميل</dt>
                      <dd>{selected.customer_name as string}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-on-surface-variant">فاتورة</dt>
                      <dd className="flex items-center gap-2">
                        <span>{selected.invoice_number as string}</span>
                        {selected.sales_invoice_id ? (
                          <a
                            href={`/contracts/${selected.sales_invoice_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            عرض تفاصيل العقد
                          </a>
                        ) : null}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-on-surface-variant">قسط رقم</dt>
                      <dd>{selected.installment_number as number}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-on-surface-variant">غرامة التأخير</dt>
                      <dd className="tabular-nums text-error">
                        {Number(selected.late_fee_accrued ?? 0).toLocaleString('ar-EG')} ج.م
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-on-surface-variant">الإجمالي المستحق</dt>
                      <dd className="font-bold tabular-nums">
                        {Number(
                          selected.total_due ??
                            selected.remaining ??
                            Number(selected.amount) - Number(selected.paid_amount),
                        ).toLocaleString('ar-EG')}{' '}
                        ج.م
                      </dd>
                    </div>
                  </dl>

                  <div className="mb-md space-y-sm rounded-lg border border-outline-variant/70 bg-surface-container-high p-sm">
                    <h4 className="text-sm font-semibold">متابعة التحصيل</h4>
                    <label className="mb-xs block text-xs text-on-surface-variant">حالة التحصيل</label>
                    <select
                      value={collectionStatus}
                      onChange={(e) => setCollectionStatus(e.target.value)}
                      className="mb-sm w-full rounded border border-outline-variant px-sm py-2 text-sm"
                    >
                      <option value="">—</option>
                      {collectionStatusOptions.filter((o) => o.value).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <label className="mb-xs block text-xs text-on-surface-variant">ميعاد التذكير</label>
                    <DateTimeInput12h
                      value={collectionReminderAt}
                      onChange={setCollectionReminderAt}
                      className="mb-sm"
                    />
                    <label className="mb-xs block text-xs text-on-surface-variant">ملاحظات</label>
                    <textarea
                      value={collectionNotes}
                      onChange={(e) => setCollectionNotes(e.target.value)}
                      rows={2}
                      className="mb-sm w-full rounded border border-outline-variant px-sm py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => metadataMutation.mutate()}
                      disabled={metadataMutation.isPending}
                      className="w-full rounded-lg border border-primary py-2 text-sm font-medium text-primary"
                    >
                      {metadataMutation.isPending ? 'جاري الحفظ…' : 'حفظ متابعة التحصيل'}
                    </button>
                  </div>

                  {selectedIsOverdueContract && (
                    <div className="mb-md space-y-sm rounded-lg border border-orange-300/50 bg-orange-50/50 p-sm">
                      <h4 className="text-sm font-semibold">ترحيل الأقساط (متأخرين فقط)</h4>
                      <label className="mb-xs block text-xs text-on-surface-variant">تاريخ بداية جديد</label>
                      <input
                        type="date"
                        value={deferDate}
                        onChange={(e) => setDeferDate(e.target.value)}
                        className="mb-sm w-full rounded border border-outline-variant px-sm py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => deferMutation.mutate()}
                        disabled={deferMutation.isPending || !deferDate}
                        className="w-full rounded-lg border border-orange-600 py-2 text-sm font-medium text-orange-800"
                      >
                        {deferMutation.isPending ? 'جاري الترحيل…' : 'ترحيل جدول الأقساط'}
                      </button>
                    </div>
                  )}

                  <div className="mb-md space-y-sm rounded-lg border border-outline-variant/70 p-sm">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">تعديل تواريخ الأقساط</h4>
                      <button
                        type="button"
                        onClick={() => setShowEditDueDates((v) => !v)}
                        className="text-xs text-primary hover:underline"
                      >
                        {showEditDueDates ? 'إخفاء' : 'عرض'}
                      </button>
                    </div>
                    {showEditDueDates && (
                      <>
                        {Object.entries(dueDateEdits).map(([id, date]) => (
                          <div key={id} className="flex items-center gap-2 text-sm">
                            <span className="w-16 text-on-surface-variant">#{id}</span>
                            <input
                              type="date"
                              value={date}
                              onChange={(e) =>
                                setDueDateEdits((prev) => ({ ...prev, [Number(id)]: e.target.value }))
                              }
                              className="flex-1 rounded border border-outline-variant px-sm py-1 text-sm"
                            />
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => dueDatesMutation.mutate()}
                          disabled={dueDatesMutation.isPending}
                          className="w-full rounded-lg border border-outline-variant py-2 text-sm"
                        >
                          {dueDatesMutation.isPending ? 'جاري الحفظ…' : 'حفظ التواريخ'}
                        </button>
                      </>
                    )}
                  </div>

                  <div className="mb-md">
                    <label className="mb-xs block text-sm text-on-surface-variant">طريقة التحصيل</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mb-sm w-full rounded border border-outline-variant px-sm py-2"
                    >
                      {paymentMethodOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>

                    {transferMethods.includes(paymentMethod) && (
                      <>
                        <label className="mb-xs block text-sm text-on-surface-variant">
                          {paymentMethod === 'bank_transfer' ? 'حساب البنك المفعل' : 'رقم المحفظة / انستا المفعل'}
                        </label>
                        <select
                          value={accountId}
                          onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : '')}
                          className="mb-sm w-full rounded border border-outline-variant px-sm py-2 text-sm"
                        >
                          <option value="">اختر الحساب</option>
                          {(accountsQuery.data ?? []).map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.beneficiary_name} — {acc.account_number || acc.phone}
                              {acc.bank_name ? ` (${acc.bank_name})` : ''}
                            </option>
                          ))}
                        </select>

                        <label className="mb-xs block text-sm text-on-surface-variant">رقم التحويل من العميل</label>
                        <input
                          value={senderNumber}
                          onChange={(e) => setSenderNumber(e.target.value)}
                          className="mb-sm w-full rounded border border-outline-variant px-sm py-2"
                          dir="ltr"
                          placeholder="01xxxxxxxxx"
                        />
                      </>
                    )}

                    <label className="mb-xs block text-sm text-on-surface-variant">مبلغ التحصيل</label>
                    <input
                      type="number"
                      min={1}
                      max={Number(
                        selected.total_due ??
                          selected.remaining ??
                          Number(selected.amount) - Number(selected.paid_amount),
                      )}
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full rounded border border-outline-variant px-sm py-2 tabular-nums"
                    />
                    <p className="mt-xs text-xs text-on-surface-variant">
                      يمكن دفع جزء من القسط — المتبقي يُسجّل تلقائياً
                    </p>

                    {distributorProfile && Number(distributorProfile.commission_balance ?? 0) > 0 && (
                      <div className="mt-sm space-y-xs rounded-lg border border-primary/25 bg-primary/5 p-sm">
                        <p className="text-xs text-on-surface-variant">
                          رصيد عمولة متاح:{' '}
                          {Number(distributorProfile.commission_balance).toLocaleString('ar-EG')} ج.م
                        </p>
                        <label className="mb-xs block text-sm text-on-surface-variant">
                          خصم من رصيد العمولة
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={maxDistributorBalance}
                          value={distributorBalanceAmount}
                          onChange={(e) =>
                            setDistributorBalanceAmount(
                              Math.min(Number(e.target.value), maxDistributorBalance),
                            )
                          }
                          className="w-full rounded border border-outline-variant px-sm py-2 tabular-nums"
                        />
                      </div>
                    )}
                    {Number(selected.late_fee_accrued ?? 0) > 0 && (
                      <div className="mt-sm space-y-sm rounded-lg border border-outline-variant bg-surface-container-high p-sm">
                        <label className="flex items-center gap-xs text-sm">
                          <input
                            type="checkbox"
                            checked={adjustNextDueDate}
                            onChange={(e) => setAdjustNextDueDate(e.target.checked)}
                          />
                          تأجيل تاريخ استحقاق القسط التالي
                        </label>
                        {adjustNextDueDate && (
                          <div>
                            <label className="mb-xs block text-xs text-on-surface-variant">
                              عدد أيام التأجيل
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={dueDateShiftDays}
                              onChange={(e) => setDueDateShiftDays(Number(e.target.value))}
                              className="w-full rounded border border-outline-variant px-sm py-2 text-sm tabular-nums"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {selected.has_open_reconciliation && (
                    <p className="mb-sm rounded-lg bg-orange-50 px-sm py-2 text-sm text-orange-800">
                      يوجد تصالح مفتوح — يجب إغلاقه قبل التحصيل
                    </p>
                  )}

                  {collectMutation.isError && (
                    <p className="mb-sm text-sm text-error">{getErrorMessage(collectMutation.error)}</p>
                  )}
                  {collectMutation.isSuccess && (
                    <p className="mb-sm text-sm text-secondary">تم التحصيل بنجاح</p>
                  )}

                  {(installmentPaymentsQuery.data ?? []).length > 0 && (
                    <div className="mb-md rounded-lg border border-outline-variant bg-surface-container-high p-sm">
                      <h4 className="mb-sm text-sm font-semibold">آخر مدفوعات هذا القسط</h4>
                      <ul className="space-y-1 text-sm">
                        {(installmentPaymentsQuery.data ?? []).map((p) => (
                          <li key={p.id} className="flex items-center justify-between gap-2">
                            <span className="tabular-nums">
                              {Number(p.amount).toLocaleString('ar-EG')} ج.م
                              {p.paid_at ? ` — ${new Date(p.paid_at).toLocaleDateString('ar-EG')}` : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => collectMutation.mutate()}
                    disabled={
                      collectMutation.isPending ||
                      amount <= 0 ||
                      Boolean(selected.is_suspended) ||
                      Boolean(selected.has_open_reconciliation) ||
                      (transferMethods.includes(paymentMethod) && (!accountId || !senderNumber.trim()))
                    }
                    className="mb-sm flex w-full items-center justify-center gap-xs rounded-lg bg-primary py-3 font-bold text-on-primary disabled:opacity-60"
                  >
                    <Icon name="payments" />
                    {collectMutation.isPending ? 'جاري التحصيل...' : 'تأكيد التحصيل'}
                  </button>

                  {selected.has_open_reconciliation && selected.open_reconciliation_id != null ? (
                    <button
                      type="button"
                      onClick={() => closeReconcileMutation.mutate(selected.open_reconciliation_id!)}
                      disabled={closeReconcileMutation.isPending}
                      className="mb-sm w-full rounded-lg border border-secondary py-2 text-sm font-bold text-secondary"
                    >
                      {closeReconcileMutation.isPending ? 'جاري الإغلاق...' : 'إغلاق التصالح وإعفاء الغرامة'}
                    </button>
                  ) : null}

                  {showReconcile && selected.display_tier === 'overdue' && !selected.has_open_reconciliation && (
                    <div className="mt-md rounded-lg border border-outline-variant bg-surface-container-high p-sm">
                      <h4 className="mb-sm font-semibold">تصالح — تسجيل حالة مفتوحة</h4>
                      <label className="mb-xs block text-xs text-on-surface-variant">
                        المسؤول الذي تحدث معه العميل *
                      </label>
                      <select
                        value={responsibleUserId}
                        onChange={(e) =>
                          setResponsibleUserId(e.target.value ? Number(e.target.value) : '')
                        }
                        className="mb-sm w-full rounded border border-outline-variant px-sm py-2 text-sm"
                      >
                        <option value="">اختر الموظف</option>
                        {(usersQuery.data ?? []).map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                      <textarea
                        value={reconcileNotes}
                        onChange={(e) => setReconcileNotes(e.target.value)}
                        placeholder="ملاحظات التصالح..."
                        rows={2}
                        className="mb-sm w-full rounded border border-outline-variant px-sm py-2 text-sm"
                      />
                      {reconcileMutation.isError && (
                        <p className="mb-sm text-xs text-error">
                          {getErrorMessage(reconcileMutation.error)}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => reconcileMutation.mutate()}
                        disabled={reconcileMutation.isPending || !responsibleUserId}
                        className="w-full rounded-lg border border-primary py-2 text-sm font-bold text-primary"
                      >
                        {reconcileMutation.isPending ? 'جاري التسجيل...' : 'تسجيل التصالح'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-md text-sm text-on-surface-variant">
                  اختر قسطاً من القائمة لبدء التحصيل
                </div>
              )}
            </div>
          </section>
        ) : (
          branchStats.length > 0 && (
            <p className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-md text-center text-sm text-on-surface-variant">
              اضغط على كارت الفرع لعرض الأقساط
            </p>
          )
        )}
      </AsyncState>
    </SalesPageShell>
  )
}
