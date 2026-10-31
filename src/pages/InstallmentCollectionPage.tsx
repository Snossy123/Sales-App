import { useEffect, useMemo, useRef, useState } from 'react'
import { useProcedureDraft } from '../hooks/useProcedureDraft'
import {
  PROCEDURE_DRAFT_IDS,
  readProcedureDraft,
  useProcedureDraftStore,
} from '../stores/procedureDraftStore'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { AdminUser, Branch, CollectionPaymentAccount, CollectorOption, Employee, InstallmentItem, PaginatedResponse } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { CollectionFollowUpSidebar } from '../components/installments/CollectionFollowUpSidebar'
import { InstallmentCollectionGroupedList } from '../components/installments/InstallmentCollectionGroupedList'
import {
  InstallmentCollectionPanel,
} from '../components/installments/InstallmentCollectionPanel'
import { FilterBar } from '../components/FilterBar'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'
import {
  buildCollectionFollowUpPayload,
  collectionStatusLabels,
  collectionStatusFilterOptions,
  computeContractStats,
  filterRowsByContractTier,
  filterInstallmentCollectionRows,
  filterRowsWithParkedFollowUp,
  filterRowsWithoutParkedFollowUp,
  type ContractTierFilter,
  type InstallmentCollectionRow,
} from '../lib/collectionHelpers'
import {
  installmentStatusOptions,
  normalizeInstallmentItem,
} from '../lib/sales'
import { useAuthStore } from '../stores/authStore'
import { userHasPermission } from '../lib/access'

type InstallmentRow = InstallmentCollectionRow & Record<string, unknown>

interface BranchStats {
  branch: Branch
  contractsCount: number
  overdueCount: number
  dueSoonCount: number
  upcomingCount: number
}

const transferMethods = ['wallet', 'instapay', 'bank_transfer']
const COLLECTION_CHROME_STORAGE_KEY = 'collection-chrome-open'

interface CollectionDailyStats {
  postponed: number
  paid: number
  follow_up: number
  no_answer: number
  no_contact: number
}

function CollectionDailyStatCards({
  stats,
  activeStatus,
  onSelectStatus,
}: {
  stats: CollectionDailyStats
  activeStatus: string
  onSelectStatus: (status: string) => void
}) {
  const cards = [
    { key: 'postponed', label: collectionStatusLabels.postponed, value: stats.postponed, filter: 'postponed' },
    { key: 'paid', label: 'تم الدفع اليوم', value: stats.paid, filter: null },
    { key: 'follow_up', label: 'متابعة اليوم', value: stats.follow_up, filter: '' },
    { key: 'no_answer', label: collectionStatusLabels.no_answer, value: stats.no_answer, filter: 'no_answer' },
    { key: 'no_contact', label: collectionStatusLabels.no_contact, value: stats.no_contact, filter: 'none' },
  ] as const

  return (
    <div className="mb-sm flex min-w-0 gap-sm overflow-x-auto pb-1">
      {cards.map((card) => {
        const clickable = card.filter !== null
        const active = clickable && card.filter !== '' && activeStatus === card.filter
        return (
          <button
            key={card.key}
            type="button"
            disabled={!clickable}
            onClick={() => {
              if (card.filter === null) return
              onSelectStatus(activeStatus === card.filter ? '' : card.filter)
            }}
            className={`min-w-[8.5rem] shrink-0 rounded-xl border px-sm py-2 text-right ${
              active
                ? 'border-primary bg-primary/10'
                : 'border-outline-variant bg-surface-container-low'
            } ${clickable ? 'hover:border-primary/40' : 'cursor-default opacity-95'}`}
          >
            <p className="text-[11px] font-medium text-on-surface-variant">{card.label}</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-on-surface">{card.value}</p>
          </button>
        )
      })}
    </div>
  )
}

function branchInstallmentsTitle(name: string) {
  const trimmed = name.trim()
  return trimmed.startsWith('فرع') ? `أقساط ${trimmed}` : `أقساط فرع ${trimmed}`
}

function collectionListEmptyMessage(filter: ContractTierFilter) {
  switch (filter) {
    case 'overdue':
      return 'لا توجد عقود متأخرة لهذا الفرع'
    case 'due_soon':
      return 'لا توجد عقود مستحقة لهذا الفرع'
    case 'upcoming':
      return 'لا توجد عقود قادمة لهذا الفرع'
    case 'open_reconciliation':
      return 'لا توجد عقود بتصالح مفتوح لهذا الفرع'
    default:
      return 'لا توجد أقساط غير مدفوعة لهذا الفرع'
  }
}

type InstallmentDraft = {
  selectedBranchId: number | null
  selectedId: number | null
  amount: number
  paymentMethod: string
  accountId: number | ''
  senderNumber: string
  collectionStatus: string
  collectionReminderAt: string
  collectionNotes: string
  deferDate: string
  dueDateEdits: Record<number, string>
  showReconcile: boolean
  responsibleUserId: number | ''
  reconcileNotes: string
  adjustNextDueDate: boolean
  dueDateShiftDays: number
  distributorBalanceAmount: number
}

function BranchInstallmentCard({
  stats,
  selected,
  activeFilter,
  onSelectBranch,
  onFilter,
  onOpenFollowUps,
}: {
  stats: BranchStats
  selected: boolean
  activeFilter: ContractTierFilter
  onSelectBranch: () => void
  onFilter: (tier: ContractTierFilter) => void
  onOpenFollowUps: () => void
}) {
  const { branch, contractsCount, overdueCount, dueSoonCount, upcomingCount } = stats

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
      className={`scroll-mt-24 rounded-xl border p-md text-right transition-all ${
        selected
          ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30'
          : 'border-outline-variant bg-surface-container-lowest'
      }`}
    >
      <div className="mb-sm flex w-full items-start justify-between gap-sm">
        <button
          type="button"
          onClick={onSelectBranch}
          className="min-w-0 flex-1 text-right"
        >
          <p className="truncate font-semibold text-on-surface">
            {branch.name_ar || branch.name}
          </p>
          <p className="text-xs text-on-surface-variant">{branch.code}</p>
        </button>
        <div className="flex shrink-0 items-center gap-xs">
          <button
            type="button"
            title="المتابعات القادمة"
            aria-label="فتح المتابعات القادمة"
            onClick={onOpenFollowUps}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
          >
            <Icon name="schedule" size={20} />
          </button>
          <button
            type="button"
            onClick={onSelectBranch}
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              selected ? 'bg-primary text-on-primary' : 'bg-primary/10 text-primary'
            }`}
            aria-label={`اختيار فرع ${branch.name_ar || branch.name}`}
          >
            <Icon name="store" size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-xs text-center">
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
          <p className="text-[11px] text-on-surface-variant">عقد متأخر</p>
        </button>
        <button
          type="button"
          onClick={() => onFilter('due_soon')}
          className={statButtonClass('due_soon')}
        >
          <p className="tabular-nums text-lg font-bold text-on-surface">{dueSoonCount}</p>
          <p className="text-[11px] text-on-surface-variant">عقد مستحق</p>
        </button>
        <button
          type="button"
          onClick={() => onFilter('upcoming')}
          className={statButtonClass('upcoming')}
        >
          <p className="tabular-nums text-lg font-bold text-on-surface">{upcomingCount}</p>
          <p className="text-[11px] text-on-surface-variant">عقد قادم</p>
        </button>
      </div>
    </div>
  )
}

export function InstallmentCollectionPage() {
  const queryClient = useQueryClient()
  const authBranchId = useAuthStore((s) => s.branchId)
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const user = useAuthStore((s) => s.user)
  const canAssignCollectors = userHasPermission(user, 'installments.assign')
  const savedDraft = readProcedureDraft<InstallmentDraft>(PROCEDURE_DRAFT_IDS.installments, userId)
  const restoredRef = useRef(false)
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(
    () => savedDraft?.selectedBranchId ?? null,
  )
  const [selected, setSelected] = useState<InstallmentRow | null>(null)
  const [amount, setAmount] = useState(() => savedDraft?.amount ?? 0)
  const [paymentMethod, setPaymentMethod] = useState(() => savedDraft?.paymentMethod ?? 'cash')
  const [accountId, setAccountId] = useState<number | ''>(() => savedDraft?.accountId ?? '')
  const [senderNumber, setSenderNumber] = useState(() => savedDraft?.senderNumber ?? '')
  const [statusFilter, setStatusFilter] = useState('')
  const [contractTierFilter, setContractTierFilter] = useState<ContractTierFilter>('all')
  const [collectionStatusFilter, setCollectionStatusFilter] = useState('')
  const [collectorFilter, setCollectorFilter] = useState('')
  const [sortByReminder, setSortByReminder] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showFollowUps, setShowFollowUps] = useState(false)
  const [collectionStatus, setCollectionStatus] = useState(() => savedDraft?.collectionStatus ?? '')
  const [collectionReminderAt, setCollectionReminderAt] = useState(
    () => savedDraft?.collectionReminderAt ?? '',
  )
  const [collectionNotes, setCollectionNotes] = useState(() => savedDraft?.collectionNotes ?? '')
  const [deferDate, setDeferDate] = useState(() => savedDraft?.deferDate ?? '')
  const [dueDateEdits, setDueDateEdits] = useState<Record<number, string>>(
    () => savedDraft?.dueDateEdits ?? {},
  )
  const [showReconcile, setShowReconcile] = useState(() => savedDraft?.showReconcile ?? false)
  const [responsibleUserId, setResponsibleUserId] = useState<number | ''>(
    () => savedDraft?.responsibleUserId ?? '',
  )
  const [reconcileNotes, setReconcileNotes] = useState(() => savedDraft?.reconcileNotes ?? '')
  const [adjustNextDueDate, setAdjustNextDueDate] = useState(
    () => savedDraft?.adjustNextDueDate ?? false,
  )
  const [dueDateShiftDays, setDueDateShiftDays] = useState(() => savedDraft?.dueDateShiftDays ?? 0)
  const [distributorBalanceAmount, setDistributorBalanceAmount] = useState(
    () => savedDraft?.distributorBalanceAmount ?? 0,
  )
  const [showChrome, setShowChrome] = useState(() => {
    try {
      return localStorage.getItem(COLLECTION_CHROME_STORAGE_KEY) !== 'false'
    } catch {
      return true
    }
  })

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

  const collectorsQuery = useQuery({
    queryKey: ['collectors'],
    queryFn: async () => {
      const { data } = await api.get<{ data: CollectorOption[] }>('/collectors')
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

  const emptyDailyStats: CollectionDailyStats = {
    postponed: 0,
    paid: 0,
    follow_up: 0,
    no_answer: 0,
    no_contact: 0,
  }

  const dailyStatsQuery = useQuery({
    queryKey: ['collection-daily-stats', selectedBranchId, collectorFilter, userId],
    queryFn: async () => {
      const params: Record<string, string | number> = {}
      if (selectedBranchId) params['filter[branch_id]'] = selectedBranchId
      if (collectorFilter) params['filter[collector_user_id]'] = collectorFilter
      const { data } = await api.get<CollectionDailyStats>('/collection-daily-stats', { params })
      return data
    },
    enabled: Boolean(selectedBranchId),
  })

  const installmentsQuery = useQuery({
    queryKey: ['installments', 'by-branch', statusFilter, collectionStatusFilter, collectorFilter, sortByReminder],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 500,
        include: 'salesInvoice.customer',
      }
      if (statusFilter) params['filter[status]'] = statusFilter
      if (collectionStatusFilter) params['filter[collection_status]'] = collectionStatusFilter
      if (collectorFilter) params['filter[collector_user_id]'] = collectorFilter
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
          upcoming_contracts: upcomingCount,
        } = computeContractStats(rows)
        return {
          branch,
          contractsCount,
          overdueCount,
          dueSoonCount,
          upcomingCount,
        }
      })
      .filter(
        (s) =>
          s.contractsCount > 0 ||
          s.overdueCount > 0 ||
          s.dueSoonCount > 0 ||
          s.upcomingCount > 0 ||
          branches.length <= 6,
      )
      .sort(
        (a, b) =>
          b.overdueCount - a.overdueCount ||
          b.dueSoonCount - a.dueSoonCount ||
          b.upcomingCount - a.upcomingCount ||
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

  useEffect(() => {
    if (restoredRef.current || !savedDraft?.selectedId) {
      if (installmentsQuery.isSuccess || !savedDraft?.selectedId) restoredRef.current = true
      return
    }
    const row = (installmentsQuery.data ?? []).find((item) => item.id === savedDraft.selectedId)
    if (!row) {
      if (installmentsQuery.isSuccess) restoredRef.current = true
      return
    }
    setSelected(row)
    if (savedDraft.selectedBranchId != null) {
      setSelectedBranchId(savedDraft.selectedBranchId)
    }
    restoredRef.current = true
  }, [installmentsQuery.data, installmentsQuery.isSuccess, savedDraft])

  const installmentDraftSnapshot = useMemo<InstallmentDraft>(
    () => ({
      selectedBranchId,
      selectedId: typeof selected?.id === 'number' ? selected.id : null,
      amount,
      paymentMethod,
      accountId,
      senderNumber,
      collectionStatus,
      collectionReminderAt,
      collectionNotes,
      deferDate,
      dueDateEdits,
      showReconcile,
      responsibleUserId,
      reconcileNotes,
      adjustNextDueDate,
      dueDateShiftDays,
      distributorBalanceAmount,
    }),
    [
      selectedBranchId,
      selected?.id,
      amount,
      paymentMethod,
      accountId,
      senderNumber,
      collectionStatus,
      collectionReminderAt,
      collectionNotes,
      deferDate,
      dueDateEdits,
      showReconcile,
      responsibleUserId,
      reconcileNotes,
      adjustNextDueDate,
      dueDateShiftDays,
      distributorBalanceAmount,
    ],
  )

  useProcedureDraft({
    id: PROCEDURE_DRAFT_IDS.installments,
    userId,
    titleAr: 'تحصيل أقساط',
    resumePath: '/installments',
    snapshot: installmentDraftSnapshot,
    isMeaningful: Boolean(
      selected?.id ||
        amount > 0 ||
        senderNumber.trim() ||
        collectionNotes.trim() ||
        deferDate ||
        showReconcile ||
        distributorBalanceAmount > 0,
    ),
  })

  const resetInstallmentProcedure = () => {
    collectMutation.reset()
    setSelected(null)
    setAmount(0)
    setPaymentMethod('cash')
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
    useProcedureDraftStore.getState().clearDraft(PROCEDURE_DRAFT_IDS.installments, userId)
  }

  const branchRows = useMemo(() => {
    if (!selectedBranchId) return []
    return installmentsByBranch.get(selectedBranchId) ?? []
  }, [installmentsByBranch, selectedBranchId])

  const filteredRows = useMemo(() => {
    let rows = branchRows
    rows = filterRowsByContractTier(rows, contractTierFilter)
    rows = filterInstallmentCollectionRows(rows, customerSearch)
    return filterRowsWithoutParkedFollowUp(rows)
  }, [branchRows, contractTierFilter, customerSearch])

  const followUpRows = useMemo(
    () => filterRowsWithParkedFollowUp(filterInstallmentCollectionRows(branchRows, customerSearch)),
    [branchRows, customerSearch],
  )

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

  const collectMutation = useMutation<{ id?: number; related_payment_ids?: number[] } | null | undefined, Error, { applyExcessToFollowing?: boolean } | void>({
    mutationFn: async (vars) => {
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
      if (vars?.applyExcessToFollowing) {
        payload.apply_excess_to_following = true
      }
      const { data } = await api.post(`/sales-invoices/${selected.sales_invoice_id}/installments/collect`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      queryClient.invalidateQueries({ queryKey: ['collection-daily-stats'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      resetInstallmentProcedure()
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
      if (!selected?.id) throw new Error('قسط غير محدد')
      const payload = buildCollectionFollowUpPayload({
        collectionStatus,
        collectionReminderAt,
        collectionNotes,
      })
      if (Object.keys(payload).length === 0) throw new Error('أضف حالة أو ميعاد تذكير أو ملاحظة')
      const { data } = await api.patch(
        `/installments/${selected.id}/collection-metadata`,
        payload,
      )
      return data
    },
    onSuccess: async () => {
      const reminderIsFuture =
        Boolean(collectionReminderAt) && new Date(collectionReminderAt).getTime() > Date.now()
      const installmentId = selected?.id
      const invoiceId = selected?.sales_invoice_id
      await queryClient.invalidateQueries({ queryKey: ['installments'] })
      await queryClient.invalidateQueries({ queryKey: ['collection-daily-stats'] })
      if (installmentId) {
        await queryClient.invalidateQueries({ queryKey: ['collection-follow-ups', 'installment', installmentId] })
      }
      if (invoiceId) {
        await queryClient.invalidateQueries({ queryKey: ['collection-follow-ups', invoiceId] })
      }
      setCollectionStatus('')
      setCollectionReminderAt('')
      setCollectionNotes('')
      if (reminderIsFuture) {
        setShowFollowUps(true)
      }
    },
  })

  const quickStatusMutation = useMutation({
    mutationFn: async ({
      installmentId,
      status,
    }: {
      installmentId: number
      status: 'no_answer'
    }) => {
      const payload = buildCollectionFollowUpPayload({
        collectionStatus: status,
        collectionReminderAt: '',
        collectionNotes: '',
      })
      const { data } = await api.patch(`/installments/${installmentId}/collection-metadata`, payload)
      return data
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['installments'] })
      await queryClient.invalidateQueries({ queryKey: ['collection-daily-stats'] })
      await queryClient.invalidateQueries({
        queryKey: ['collection-follow-ups', 'installment', variables.installmentId],
      })
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
      resetInstallmentProcedure()
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
      collection_reminder_at?: string
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['installments'] })
      if (selected?.id) {
        await queryClient.invalidateQueries({ queryKey: ['collection-follow-ups', 'installment', selected.id] })
      }
      if (selected?.sales_invoice_id) {
        await queryClient.invalidateQueries({ queryKey: ['collection-follow-ups', selected.sales_invoice_id] })
      }
      setShowFollowUps(true)
    },
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

  const assignCollectorMutation = useMutation({
    mutationFn: async ({
      invoiceId,
      collectorUserId,
    }: {
      invoiceId: number
      collectorUserId: number | null
    }) => {
      const { data } = await api.post('/collection-assignments', {
        sales_invoice_ids: [invoiceId],
        collector_user_id: collectorUserId,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      queryClient.invalidateQueries({ queryKey: ['collection-assignments'] })
    },
  })

  const selectRow = (row: InstallmentRow) => {
    collectMutation.reset()
    setSelected(row)
    setAmount(Number(row.total_due ?? row.remaining ?? Number(row.amount) - Number(row.paid_amount)))
    setPaymentMethod('cash')
    setAccountId('')
    setSenderNumber('')
    setShowReconcile(false)
    setAdjustNextDueDate(false)
    setCollectionStatus('')
    setCollectionReminderAt('')
    setCollectionNotes('')
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

  const hasFilters = Boolean(customerSearch || statusFilter || collectionStatusFilter || collectorFilter || contractTierFilter !== 'all')
  const activeFilterCount = [
    customerSearch,
    statusFilter,
    collectionStatusFilter,
    collectorFilter,
    contractTierFilter !== 'all',
    sortByReminder,
  ].filter(Boolean).length

  useEffect(() => {
    localStorage.setItem(COLLECTION_CHROME_STORAGE_KEY, String(showChrome))
  }, [showChrome])
  const clearFilters = () => {
    setCustomerSearch('')
    setStatusFilter('')
    setCollectionStatusFilter('')
    setCollectorFilter('')
    setContractTierFilter('all')
    setSortByReminder(false)
  }

  return (
    <SalesPageShell
      title="تحصيل الأقساط"
      actions={
        canAssignCollectors ? (
          <Link
            to="/installments/assignments"
            className="rounded-lg bg-primary px-md py-2 text-sm font-medium text-on-primary"
          >
            توزيع العقود
          </Link>
        ) : undefined
      }
      filters={
        showChrome ? (
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
                { value: 'due_soon', label: 'مستحقة' },
                { value: 'upcoming', label: 'قادمة' },
                { value: 'open_reconciliation', label: 'تصالح مفتوح' },
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
              options: collectionStatusFilterOptions,
            },
            {
              id: 'collector',
              label: 'المحصل',
              value: collectorFilter,
              onChange: (v) => {
                setCollectorFilter(v)
                setSelected(null)
              },
              options: [
                { value: '', label: 'كل المحصلين' },
                { value: 'unassigned', label: 'غير معيَّن' },
                ...(collectorsQuery.data ?? []).map((collector) => ({
                  value: String(collector.id),
                  label: collector.name,
                })),
              ],
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
        ) : undefined
      }
    >
      <AsyncState
        isLoading={branchesQuery.isLoading || installmentsQuery.isLoading}
        isError={branchesQuery.isError || installmentsQuery.isError}
        error={branchesQuery.error ?? installmentsQuery.error}
      >
        {showChrome && (branchStats.length === 0 ? (
          <p className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md text-center text-on-surface-variant">
            لا توجد أقساط مستحقة على أي فرع
          </p>
        ) : (
          <div id="collection-branch-cards" className="mb-md grid min-w-0 grid-cols-1 gap-sm sm:grid-cols-2 xl:grid-cols-3">
            {branchStats.map((stats) => (
              <BranchInstallmentCard
                key={stats.branch.id}
                stats={stats}
                selected={selectedBranchId === stats.branch.id}
                activeFilter={contractTierFilter}
                onSelectBranch={() => selectBranch(stats.branch.id)}
                onFilter={(tier) => applyBranchStatFilter(stats.branch.id, tier)}
                onOpenFollowUps={() => {
                  setSelectedBranchId(stats.branch.id)
                  setShowFollowUps(true)
                }}
              />
            ))}
          </div>
        ))}

        {selectedBranchId && selectedBranch ? (
          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
            <CollectionDailyStatCards
              stats={dailyStatsQuery.data ?? emptyDailyStats}
              activeStatus={collectionStatusFilter}
              onSelectStatus={(status) => {
                setCollectionStatusFilter(status)
                setSelected(null)
              }}
            />
            <div className="mb-md flex flex-col gap-sm sm:flex-row sm:flex-nowrap sm:items-center">
              <h2 className="shrink-0 text-base font-semibold text-on-surface">
                {branchInstallmentsTitle(selectedBranch.name_ar || selectedBranch.name)}
              </h2>
              <div className="relative min-w-0 w-full flex-1">
                <Icon
                  name="search"
                  size={18}
                  className="pointer-events-none absolute start-2 top-1/2 -translate-y-1/2 text-on-surface-variant"
                />
                <input
                  id="collection-customer-search"
                  type="search"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="بحث بالاسم أو الهاتف أو اسم المستخدم أو السريال..."
                  aria-label="بحث"
                  className="h-9 w-full rounded-lg border border-outline-variant bg-surface-container-low ps-8 pe-sm text-sm text-on-surface"
                />
              </div>
              <div className="flex shrink-0 items-center gap-sm">
                <button
                  type="button"
                  aria-expanded={showChrome}
                  aria-controls="collection-branch-cards"
                  onClick={() => setShowChrome((open) => !open)}
                  className="inline-flex h-9 items-center gap-xs rounded-lg border border-outline-variant bg-surface-container-low px-sm text-sm text-on-surface hover:bg-surface-container-high"
                >
                  <Icon name={showChrome ? 'expand_less' : 'tune'} size={18} />
                  {showChrome
                    ? 'إخفاء الفلاتر'
                    : activeFilterCount > 0
                      ? `إظهار الفلاتر · ${activeFilterCount}`
                      : 'إظهار الفلاتر'}
                </button>
                <button
                  type="button"
                  title="المتابعات القادمة"
                  aria-label="فتح المتابعات القادمة"
                  onClick={() => setShowFollowUps(true)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                >
                  <Icon name="schedule" size={18} />
                </button>
              </div>
            </div>

            <div className={`grid gap-md lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:min-h-0 lg:overflow-hidden ${showChrome ? 'lg:max-h-[calc(100dvh-8.5rem)]' : 'lg:max-h-[calc(100dvh-13rem)]'}`}>
              <div className="min-w-0 lg:min-h-0 lg:overflow-y-auto">
                <InstallmentCollectionGroupedList
                  rows={filteredRows}
                  sortMode={sortByReminder ? 'reminder' : 'priority'}
                  pageKey={`${selectedBranchId}-${contractTierFilter}-${customerSearch}-${statusFilter}-${collectionStatusFilter}-${collectorFilter}`}
                  selectedId={selected?.id as number | undefined}
                  onSelect={selectRow}
                  onReconcile={(row) => {
                    selectRow(row)
                    setShowReconcile(true)
                  }}
                  onQuickCollectionStatus={(row, status) => {
                    if (!row.id) return
                    quickStatusMutation.mutate({ installmentId: row.id, status })
                  }}
                  quickStatusPendingId={
                    quickStatusMutation.isPending
                      ? (quickStatusMutation.variables?.installmentId ?? null)
                      : null
                  }
                  emptyMessage={collectionListEmptyMessage(contractTierFilter)}
                  collectors={collectorsQuery.data ?? []}
                  canAssign={canAssignCollectors}
                  onAssignCollector={(invoiceId, collectorUserId) =>
                    assignCollectorMutation.mutate({ invoiceId, collectorUserId })
                  }
                  assigningInvoiceId={
                    assignCollectorMutation.isPending
                      ? (assignCollectorMutation.variables?.invoiceId ?? null)
                      : null
                  }
                />
              </div>

              <div className="min-w-0 lg:min-h-0 lg:overflow-y-auto">
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
                suspendMutation={suspendMutation}
                resumeMutation={resumeMutation}
              />
              </div>
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
      <CollectionFollowUpSidebar
        open={showFollowUps}
        onClose={() => setShowFollowUps(false)}
        rows={followUpRows}
        pageKey={`${selectedBranchId}-${customerSearch}`}
        selectedId={selected?.id as number | undefined}
        onSelect={selectRow}
        onReconcile={(row) => {
          selectRow(row)
          setShowReconcile(true)
        }}
      />
    </SalesPageShell>
  )
}
