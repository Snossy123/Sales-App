import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { AdminUser, Branch, CollectionPaymentAccount, Employee, InstallmentItem, PaginatedResponse } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { InstallmentCollectionGroupedList } from '../components/installments/InstallmentCollectionGroupedList'
import {
  InstallmentCollectionPanel,
} from '../components/installments/InstallmentCollectionPanel'
import { FilterBar } from '../components/FilterBar'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'
import {
  collectionStatusOptions,
  computeContractStats,
  filterRowsByContractTier,
  filterInstallmentCollectionRows,
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
  contractsCount: number
  overdueCount: number
  dueSoonCount: number
}

const transferMethods = ['wallet', 'instapay', 'bank_transfer']

function BranchInstallmentCard({
  stats,
  selected,
  activeFilter,
  onSelectBranch,
  onFilter,
}: {
  stats: BranchStats
  selected: boolean
  activeFilter: ContractTierFilter
  onSelectBranch: () => void
  onFilter: (tier: ContractTierFilter) => void
}) {
  const { branch, contractsCount, overdueCount, dueSoonCount } = stats

  const statButtonClass = (tier: ContractTierFilter, overdueTone = false) => {
    const isActive = selected && activeFilter === tier
    return [
      'rounded-lg bg-surface-container-low px-xs py-sm text-center transition-all',
      'hover:ring-1 hover:ring-primary/40',
      isActive ? 'bg-primary/10 ring-1 ring-primary/40' : '',
      overdueTone && overdueCount > 0 ? 'text-error' : '',
    ]
      .filter(Boolean)
      .join(' ')
  }

  return (
    <div
      className={`rounded-xl border p-md text-right transition-all ${
        selected
          ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30'
          : 'border-outline-variant bg-surface-container-lowest'
      }`}
    >
      <button
        type="button"
        onClick={onSelectBranch}
        className="mb-sm flex w-full items-start justify-between gap-sm text-right"
      >
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
      </button>

      <div className="grid grid-cols-3 gap-xs text-center">
        <button
          type="button"
          onClick={() => onFilter('all')}
          className={statButtonClass('all')}
        >
          <p className="tabular-nums text-lg font-bold text-on-surface">{contractsCount}</p>
          <p className="text-[11px] text-on-surface-variant">التعاقدات</p>
        </button>
        <button
          type="button"
          onClick={() => onFilter('overdue')}
          className={statButtonClass('overdue', true)}
        >
          <p className={`tabular-nums text-lg font-bold ${overdueCount > 0 ? 'text-error' : 'text-on-surface'}`}>
            {overdueCount}
          </p>
          <p className="text-[11px] text-on-surface-variant">قسط متأخر</p>
        </button>
        <button
          type="button"
          onClick={() => onFilter('due_soon')}
          className={statButtonClass('due_soon')}
        >
          <p className="tabular-nums text-lg font-bold text-on-surface">{dueSoonCount}</p>
          <p className="text-[11px] text-on-surface-variant">قسط مستحق</p>
        </button>
      </div>
    </div>
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

  const branchEmployeesQuery = useQuery({
    queryKey: ['employees', 'collection-suspend', selectedBranchId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', {
        params: { per_page: 100, 'filter[branch_id]': selectedBranchId },
      })
      return data.data ?? []
    },
    enabled: Boolean(selectedBranchId),
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
        const {
          total_contracts: contractsCount,
          overdue_contracts: overdueCount,
          due_soon_contracts: dueSoonCount,
        } = computeContractStats(rows)
        return {
          branch,
          contractsCount,
          overdueCount,
          dueSoonCount,
        }
      })
      .filter((s) => s.contractsCount > 0 || s.overdueCount > 0 || s.dueSoonCount > 0 || branches.length <= 6)
      .sort(
        (a, b) =>
          b.overdueCount - a.overdueCount ||
          b.dueSoonCount - a.dueSoonCount ||
          b.contractsCount - a.contractsCount,
      )
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
    return filterInstallmentCollectionRows(rows, customerSearch)
  }, [branchRows, contractTierFilter, customerSearch])

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
    },
  })

  const unpaidReasonMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      await api.patch(`/installments/${id}`, { unpaid_reason: reason || null })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['installments'] }),
  })

  const suspendMutation = useMutation({
    mutationFn: async (payload: {
      device_received: boolean
      suspend_mode?: 'not_installed' | 'receive_device' | 'vehicle_impounded'
      resume_from_date?: string
      serial_code?: string
      employee_id?: number
      reason?: string
      notes?: string
    }) => {
      if (!selected?.sales_invoice_id || !selectedBranchId) throw new Error('عقد أو فرع غير محدد')
      const { data } = await api.post(
        `/sales-invoices/${selected.sales_invoice_id}/installments/suspend`,
        {
          branch_id: selectedBranchId,
          ...payload,
        },
      )
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['installments'] }),
  })

  const resumeMutation = useMutation({
    mutationFn: async () => {
      if (!selected?.sales_invoice_id) throw new Error('عقد غير محدد')
      const { data } = await api.post(
        `/sales-invoices/${selected.sales_invoice_id}/installments/resume`,
        {},
      )
      return data
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

  const selectBranch = (branchId: number) => {
    if (selectedBranchId !== branchId) {
      setContractTierFilter('all')
    }
    setSelectedBranchId(branchId)
    setSelected(null)
    setCustomerSearch('')
  }

  const applyBranchStatFilter = (branchId: number, tier: ContractTierFilter) => {
    setSelectedBranchId(branchId)
    setContractTierFilter(tier)
    setSelected(null)
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
                activeFilter={contractTierFilter}
                onSelectBranch={() => selectBranch(stats.branch.id)}
                onFilter={(tier) => applyBranchStatFilter(stats.branch.id, tier)}
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

            <FilterBar
              search={customerSearch}
              onSearchChange={setCustomerSearch}
              searchPlaceholder="بحث بالاسم أو الهاتف أو اسم المستخدم أو السريال..."
              showClear={hasFilters}
              onClear={clearFilters}
            />

            <div className="grid gap-md lg:grid-cols-[minmax(0,1fr)_min(22rem,38%)]">
              <div className="min-w-0">
                <InstallmentCollectionGroupedList
                  rows={filteredRows}
                  sortMode={sortByReminder ? 'reminder' : 'priority'}
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

              <InstallmentCollectionPanel
                selected={selected}
                selectedIsOverdueContract={selectedIsOverdueContract}
                amount={amount}
                onAmountChange={setAmount}
                paymentMethod={paymentMethod}
                onPaymentMethodChange={setPaymentMethod}
                accountId={accountId}
                onAccountIdChange={setAccountId}
                senderNumber={senderNumber}
                onSenderNumberChange={setSenderNumber}
                distributorBalanceAmount={distributorBalanceAmount}
                onDistributorBalanceAmountChange={setDistributorBalanceAmount}
                maxDistributorBalance={maxDistributorBalance}
                adjustNextDueDate={adjustNextDueDate}
                onAdjustNextDueDateChange={setAdjustNextDueDate}
                dueDateShiftDays={dueDateShiftDays}
                onDueDateShiftDaysChange={setDueDateShiftDays}
                collectionStatus={collectionStatus}
                onCollectionStatusChange={setCollectionStatus}
                collectionReminderAt={collectionReminderAt}
                onCollectionReminderAtChange={setCollectionReminderAt}
                collectionNotes={collectionNotes}
                onCollectionNotesChange={setCollectionNotes}
                deferDate={deferDate}
                onDeferDateChange={setDeferDate}
                dueDateEdits={dueDateEdits}
                onDueDateEditsChange={setDueDateEdits}
                showReconcile={showReconcile}
                responsibleUserId={responsibleUserId}
                onResponsibleUserIdChange={setResponsibleUserId}
                reconcileNotes={reconcileNotes}
                onReconcileNotesChange={setReconcileNotes}
                accountsQuery={accountsQuery}
                usersQuery={usersQuery}
                installmentPaymentsQuery={installmentPaymentsQuery}
                distributorProfile={distributorProfile}
                collectMutation={collectMutation}
                closeReconcileMutation={closeReconcileMutation}
                reconcileMutation={reconcileMutation}
                metadataMutation={metadataMutation}
                deferMutation={deferMutation}
                dueDatesMutation={dueDatesMutation}
                branchId={selectedBranchId}
                branchEmployees={branchEmployeesQuery.data ?? []}
                suspendMutation={suspendMutation}
                resumeMutation={resumeMutation}
              />
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
