import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type { AdminUser, CollectionPaymentAccount, Distributor, Employee, InstallmentItem, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { Icon } from '../../../components/Icon'
import { InstallmentCollectionGroupedList } from '../../../components/installments/InstallmentCollectionGroupedList'
import { InstallmentCollectionPanel } from '../../../components/installments/InstallmentCollectionPanel'
import { SalesPageShell } from '../../../components/SalesPageShell'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import {
  filterRowsByContractTier,
  type ContractTierFilter,
  type InstallmentCollectionRow,
} from '../../../lib/collectionHelpers'
import { formatDatetimeLocal, parseDatetimeLocal } from '../../../lib/datetime12h'
import { normalizeInstallmentItem } from '../../../lib/sales'
import { openCollectionReceipts } from '../../../lib/paymentReceipt'

type InstallmentRow = InstallmentCollectionRow & Record<string, unknown>

const transferMethods = ['wallet', 'instapay', 'bank_transfer']
const MIN_SEARCH_LENGTH = 3

export function ExternalCollectionPage() {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<InstallmentRow | null>(null)
  const [amount, setAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [accountId, setAccountId] = useState<number | ''>('')
  const [senderNumber, setSenderNumber] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [contractTierFilter, setContractTierFilter] = useState<ContractTierFilter>('all')
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
  const debouncedSearch = useDebouncedValue(customerSearch.trim(), 300)
  const canSearch = debouncedSearch.length >= MIN_SEARCH_LENGTH
  const selectedCustomerId = selected?.customer_id as number | undefined
  const selectedBranchId = typeof selected?.branch_id === 'number' ? selected.branch_id : null

  const installmentsQuery = useQuery({
    queryKey: ['installments', 'external', debouncedSearch],
    queryFn: async () => {
      const { data } = await api.get<{ data: InstallmentItem[] }>('/installments', {
        params: {
          per_page: 100,
          include: 'salesInvoice.customer',
          'filter[search]': debouncedSearch,
        },
      })
      return data.data
        .map((item) => normalizeInstallmentItem(item) as InstallmentRow)
        .filter((item) => item.status !== 'paid')
    },
    enabled: canSearch,
  })

  const rows = useMemo(() => {
    return filterRowsByContractTier((installmentsQuery.data ?? []) as InstallmentRow[], contractTierFilter)
  }, [installmentsQuery.data, contractTierFilter])

  const selectedContractRows = useMemo(() => {
    if (!selected?.sales_invoice_id) return []
    return ((installmentsQuery.data ?? []) as InstallmentRow[]).filter(
      (r) => r.sales_invoice_id === selected.sales_invoice_id,
    )
  }, [installmentsQuery.data, selected?.sales_invoice_id])

  const selectedIsOverdueContract = useMemo(() => {
    return selectedContractRows.some((r) => r.display_tier === 'overdue' || r.status === 'overdue')
  }, [selectedContractRows])

  const distributorProfileQuery = useQuery({
    queryKey: ['customer', selectedCustomerId, 'distributor-profile'],
    queryFn: async () => {
      const { data } = await api.get<{ distributor_profile?: Distributor }>(`/customers/${selectedCustomerId}`, {
        params: { include: 'distributorProfile' },
      })
      return data.distributor_profile ?? null
    },
    enabled: Boolean(selectedCustomerId),
  })

  const distributorProfile = distributorProfileQuery.data
  const maxDistributorBalance = Math.min(Number(distributorProfile?.commission_balance ?? 0), amount)

  interface PaymentRow {
    id: number
    transaction_number?: string
    amount: string | number
    refunded_amount?: string | number
    status: string
    paid_at?: string
  }

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

  useEffect(() => {
    setAccountId('')
  }, [paymentMethod])

  useEffect(() => {
    setSelected(null)
    setAmount(0)
    setSenderNumber('')
    setAccountId('')
    setShowReconcile(false)
    setDistributorBalanceAmount(0)
  }, [debouncedSearch])

  const resetSelection = () => {
    setSelected(null)
    setAmount(0)
    setPaymentMethod('bank_transfer')
    setAccountId('')
    setSenderNumber('')
    setCollectionStatus('')
    setCollectionReminderAt('')
    setCollectionNotes('')
    setDeferDate('')
    setDueDateEdits({})
    setShowReconcile(false)
    setResponsibleUserId('')
    setReconcileNotes('')
    setAdjustNextDueDate(false)
    setDueDateShiftDays(0)
    setDistributorBalanceAmount(0)
  }

  const collectMutation = useMutation({
    mutationFn: async (vars?: { applyExcessToFollowing?: boolean }) => {
      if (!selected?.sales_invoice_id) throw new Error('فاتورة غير محددة')
      const payload: Record<string, unknown> = {
        sales_invoice_id: selected.sales_invoice_id,
        installment_item_id: selected.id,
        amount,
        payment_method: paymentMethod,
        collection_payment_account_id: accountId || undefined,
        sender_transfer_number: senderNumber.trim() || undefined,
      }
      if (adjustNextDueDate && Number(selected.late_fee_accrued ?? 0) > 0) {
        payload.adjust_next_due_date = true
        if (dueDateShiftDays > 0) payload.due_date_shift_days = dueDateShiftDays
      }
      if (distributorBalanceAmount > 0) {
        payload.distributor_balance_amount = distributorBalanceAmount
      }
      if (vars?.applyExcessToFollowing) {
        payload.apply_excess_to_following = true
      }
      const { data } = await api.post('/external-collections/collect', payload)
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      openCollectionReceipts(data)
      resetSelection()
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      if (selected?.sales_invoice_id) {
        queryClient.invalidateQueries({ queryKey: ['collection-follow-ups', selected.sales_invoice_id] })
      }
    },
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
      resetSelection()
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
      const { data } = await api.post(`/sales-invoices/${selected.sales_invoice_id}/installments/suspend`, {
        branch_id: selectedBranchId,
        ...payload,
      })
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['installments'] }),
  })

  const resumeMutation = useMutation({
    mutationFn: async () => {
      if (!selected?.sales_invoice_id) throw new Error('عقد غير محدد')
      const { data } = await api.post(`/sales-invoices/${selected.sales_invoice_id}/installments/resume`, {})
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['installments'] }),
  })

  const selectRow = (row: InstallmentRow) => {
    setSelected(row)
    setAmount(Number(row.total_due ?? row.remaining ?? Number(row.amount) - Number(row.paid_amount)))
    setPaymentMethod('bank_transfer')
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
    ;((installmentsQuery.data ?? []) as InstallmentRow[])
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

  return (
    <SalesPageShell
      title="التحصيلات الخارجية"
      subtitle="مركز اتصال الإدارة — ابحث عن العميل ثم حصّل بالتحويل من أي فرع"
    >
      <div className="mb-md rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
        <label htmlFor="call-center-search" className="mb-xs block text-sm font-medium text-on-surface">
          بحث عن العميل
        </label>
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            id="call-center-search"
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            placeholder="اسم العميل أو الهاتف أو رقم الفاتورة..."
            className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-low pe-sm ps-10 text-base text-on-surface"
          />
        </div>
        {customerSearch.trim() && customerSearch.trim().length < MIN_SEARCH_LENGTH && (
          <p className="mt-sm text-xs text-on-surface-variant">اكتب {MIN_SEARCH_LENGTH} حروف على الأقل للبحث</p>
        )}
      </div>

      {!canSearch ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-md py-xl text-center">
          <Icon name="support_agent" size={40} className="mb-sm text-primary" />
          <p className="font-medium text-on-surface">ابحث عن العميل لعرض الأقساط في فروع الإدارة</p>
          <p className="mt-xs max-w-md text-sm text-on-surface-variant">
            التحصيل بالتحويل فقط، لأي فرع داخل نفس الإدارة
          </p>
        </div>
      ) : (
        <AsyncState
          isLoading={installmentsQuery.isLoading}
          isError={installmentsQuery.isError}
          error={installmentsQuery.error}
        >
          <div className="mb-md flex flex-wrap items-center justify-between gap-sm">
            <select
              value={contractTierFilter}
              onChange={(e) => {
                setContractTierFilter(e.target.value as ContractTierFilter)
                setSelected(null)
              }}
              className="rounded-lg border border-outline-variant bg-surface-container-low px-sm py-2 text-sm"
            >
              <option value="all">كل العقود</option>
              <option value="overdue">متأخرة</option>
              <option value="due_soon">مستحقة / فترة سماح</option>
              <option value="open_reconciliation">تصالح مفتوح</option>
            </select>
            <span className="rounded-full bg-surface-container-high px-sm py-xs text-xs text-on-surface-variant">
              {rows.length} قسط · {new Set(rows.map((r) => r.sales_invoice_id)).size} عقد
            </span>
          </div>

          <div className="grid gap-md lg:grid-cols-[minmax(0,1fr)_min(22rem,38%)]">
            <div className="min-w-0">
              <InstallmentCollectionGroupedList
                rows={rows}
                selectedId={selected?.id as number | undefined}
                onSelect={selectRow}
                onReconcile={(row) => {
                  selectRow(row)
                  setShowReconcile(true)
                }}
                emptyMessage="لا توجد أقساط مطابقة للبحث"
              />
            </div>

            <InstallmentCollectionPanel
              selected={selected}
              selectedIsOverdueContract={selectedIsOverdueContract}
              contractRows={selectedContractRows}
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
              hideCash
              suspendMutation={suspendMutation}
              resumeMutation={resumeMutation}
            />
          </div>
        </AsyncState>
      )}
    </SalesPageShell>
  )
}
