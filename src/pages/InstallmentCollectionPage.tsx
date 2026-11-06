import { isAxiosError } from 'axios'
import { Modal } from '../components/Modal'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useProcedureDraft } from '../hooks/useProcedureDraft'
import {
  PROCEDURE_DRAFT_IDS,
  readProcedureDraft,
  useProcedureDraftStore,
} from '../stores/procedureDraftStore'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useInstallmentPages } from '../lib/installmentPages'
import { api, getErrorMessage } from '../api/client'
import type { AdminUser, Branch, CollectionPaymentAccount, CollectorOption, Employee, PaginatedResponse } from '../api/types'
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
  type ContractTierFilter,
  type InstallmentCollectionRow,
} from '../lib/collectionHelpers'
import {
  installmentStatusOptions,
  normalizeInstallmentItem,
} from '../lib/sales'
import { useAuthStore } from '../stores/authStore'
import { userHasPermission } from '../lib/access'
import {
  clearInstallmentCollectionFocus,
  readInstallmentCollectionFocus,
  saveInstallmentCollectionFocus,
} from '../lib/installmentCollectionFocus'

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
  paid_invoice_ids?: number[]
  paid_installment_ids?: number[]
  follow_up: number
  follow_up_invoice_ids?: number[]
  scheduled_no_answer?: number
  no_answer: number
  no_contact: number
}

function CollectionDailyStatCards({
  stats,
  activeStatus,
  followUpActive,
  paidActive,
  onSelectStatus,
  onToggleFollowUp,
  onTogglePaid,
}: {
  stats: CollectionDailyStats
  activeStatus: string
  followUpActive: boolean
  paidActive: boolean
  onSelectStatus: (status: string) => void
  onToggleFollowUp: () => void
  onTogglePaid: () => void
}) {
  const cards = [
    { key: 'postponed', label: collectionStatusLabels.postponed, value: stats.postponed, filter: 'postponed' },
    { key: 'paid', label: 'تم الدفع اليوم', value: stats.paid, filter: 'paid' },
    { key: 'follow_up', label: 'متابعة اليوم', value: stats.follow_up, filter: 'follow_up' },
    { key: 'scheduled_no_answer', label: 'مواعيد لم يتم الرد', value: stats.scheduled_no_answer ?? 0, filter: 'scheduled_no_answer' },
    { key: 'no_answer', label: collectionStatusLabels.no_answer, value: stats.no_answer, filter: 'no_answer' },
    { key: 'no_contact', label: collectionStatusLabels.no_contact, value: stats.no_contact, filter: 'none' },
  ] as const

  return (
    <div className="mb-md flex min-w-0 gap-sm overflow-x-auto pb-1 sm:grid sm:grid-cols-3 xl:grid-cols-6 sm:overflow-visible">
      {cards.map((card) => {
        const active =
          card.key === 'follow_up'
            ? followUpActive
            : card.key === 'paid'
              ? paidActive
              : activeStatus === card.filter
        return (
          <button
            key={card.key}
            type="button"
            aria-pressed={active}
            onClick={() => {
              if (card.key === 'follow_up') {
                onToggleFollowUp()
                return
              }
              if (card.key === 'paid') {
                onTogglePaid()
                return
              }
              onSelectStatus(activeStatus === card.filter ? '' : card.filter)
            }}
            className={`min-w-[8.5rem] shrink-0 rounded-xl border px-sm py-sm text-right sm:min-w-0 ${
              active
                ? 'border-transparent bg-primary text-on-primary'
                : 'border-outline-variant bg-surface-container-low text-on-surface hover:border-primary/40'
            }`}
          >
            <p className={`text-[11px] font-medium ${active ? 'text-on-primary' : 'text-on-surface-variant'}`}>
              {card.label}
            </p>
            <p className="mt-0.5 text-xl font-bold tabular-nums">{card.value}</p>
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
  const [collectionFocus] = useState(() => readInstallmentCollectionFocus())
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(
    () => savedDraft?.selectedBranchId ?? null,
  )
  const [selected, setSelected] = useState<InstallmentRow | null>(null)
  const [amount, setAmount] = useState(() => savedDraft?.amount ?? 0)
  const [paymentMethod, setPaymentMethod] = useState(() => savedDraft?.paymentMethod ?? 'cash')
  const [accountId, setAccountId] = useState<number | ''>(() => savedDraft?.accountId ?? '')
  const [senderNumber, setSenderNumber] = useState(() => savedDraft?.senderNumber ?? '')
  const [statusFilter, setStatusFilter] = useState(() => collectionFocus?.statusFilter ?? '')
  const [contractTierFilter, setContractTierFilter] = useState<ContractTierFilter>(
    () => collectionFocus?.contractTierFilter ?? 'all',
  )
  const [collectionStatusFilter, setCollectionStatusFilter] = useState(
    () => collectionFocus?.collectionStatusFilter ?? '',
  )
  const [collectionActionPrompt, setCollectionActionPrompt] = useState<{ applyExcessToFollowing?: boolean; actions?: string[] } | null>(null)
  const [followUpToday, setFollowUpToday] = useState(false)
  const [completedContracts, setCompletedContracts] = useState(false)
  const [paidToday, setPaidToday] = useState(false)
  const [collectorFilter, setCollectorFilter] = useState(() => collectionFocus?.collectorFilter ?? '')
  const [sortByReminder, setSortByReminder] = useState(() => collectionFocus?.sortByReminder ?? false)
  const [customerSearch, setCustomerSearch] = useState(() => collectionFocus?.customerSearch ?? '')
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

  useEffect(() => {
    if (collectionFocus) clearInstallmentCollectionFocus()
  }, [collectionFocus])

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

  const paidInstallmentIds = dailyStatsQuery.data?.paid_installment_ids ?? []
  const paidInstallmentKey = paidInstallmentIds.join(',')
  const debouncedCustomerSearch = useDebouncedValue(customerSearch.trim(), 300)

  const paidInstallmentsQuery = useInstallmentPages(
    {
      'filter[branch_id]': selectedBranchId ?? undefined,
      'filter[ids]': paidInstallmentKey || undefined,
      'filter[search]': debouncedCustomerSearch || undefined,
    },
    paidToday && paidInstallmentIds.length > 0,
  )

  const branchCountsQuery = useQuery({
    queryKey: ['installments', 'branch-counts'],
    queryFn: async () => {
      const { data } = await api.get<{
        data: Array<{
          branch_id: number
          contracts_count: number
          overdue_count: number
          due_soon_count: number
          upcoming_count: number
        }>
      }>('/installments/branch-counts')
      return data.data
    },
  })

  const installmentsQuery = useInstallmentPages(
    {
      'filter[branch_id]': selectedBranchId ?? undefined,
      ...(completedContracts ? {
        'filter[status]': 'paid',
        'filter[fully_paid_contract]': 1,
        'filter[collector_user_id]': collectorFilter || undefined,
        'filter[search]': debouncedCustomerSearch || undefined,
      } : {
        'filter[status]': statusFilter || undefined,
        'filter[collection_status]': collectionStatusFilter || (followUpToday ? undefined : 'none'),
        'filter[collector_user_id]': collectorFilter || undefined,
        'filter[search]': debouncedCustomerSearch || undefined,
        'filter[contract_tier]':
          contractTierFilter !== 'all' && contractTierFilter !== 'open_reconciliation'
            ? contractTierFilter
            : undefined,
        'filter[has_open_reconciliation]': contractTierFilter === 'open_reconciliation' ? 1 : undefined,
        'filter[unhandled_today]': !collectionStatusFilter && !followUpToday ? 1 : undefined,
        'filter[parked_follow_up]': followUpToday || collectionStatusFilter ? undefined : 0,
        'filter[follow_up_today]': followUpToday ? 1 : undefined,
        sort: sortByReminder ? 'reminder' : undefined,
      }),
    },
    Boolean(selectedBranchId) && !paidToday,
  )

  const branchRows = useMemo(
    () =>
      (installmentsQuery.data?.pages ?? []).flatMap((page) =>
        page.data.map((item) => normalizeInstallmentItem(item) as InstallmentRow),
      ),
    [installmentsQuery.data],
  )

  const branchStats = useMemo((): BranchStats[] => {
    const branches = branchesQuery.data ?? []
    const counts = new Map((branchCountsQuery.data ?? []).map((row) => [row.branch_id, row]))
    return branches
      .map((branch) => {
        const count = counts.get(branch.id)
        return {
          branch,
          contractsCount: count?.contracts_count ?? 0,
          overdueCount: count?.overdue_count ?? 0,
          dueSoonCount: count?.due_soon_count ?? 0,
          upcomingCount: count?.upcoming_count ?? 0,
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
  }, [branchesQuery.data, branchCountsQuery.data])

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
    const row = branchRows.find((item) => item.id === savedDraft.selectedId)
    if (!row) {
      if (installmentsQuery.isSuccess) restoredRef.current = true
      return
    }
    setSelected(row)
    if (savedDraft.selectedBranchId != null) {
      setSelectedBranchId(savedDraft.selectedBranchId)
    }
    restoredRef.current = true
  }, [branchRows, installmentsQuery.isSuccess, savedDraft])

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

  const paidRows = useMemo(
    () =>
      (paidInstallmentsQuery.data?.pages ?? []).flatMap((page) =>
        page.data.map((item) => normalizeInstallmentItem(item) as InstallmentRow),
      ),
    [paidInstallmentsQuery.data],
  )

  const filteredRows = paidToday ? paidRows : branchRows
  const listQuery = paidToday ? paidInstallmentsQuery : installmentsQuery

  const contractInstallmentsQuery = useInstallmentPages(
    { 'filter[sales_invoice_id]': selected?.sales_invoice_id as number | undefined },
    Boolean(selected?.sales_invoice_id),
  )

  const selectedContractRows = useMemo(
    () =>
      (contractInstallmentsQuery.data?.pages ?? []).flatMap((page) =>
        page.data.map((item) => normalizeInstallmentItem(item) as InstallmentRow),
      ),
    [contractInstallmentsQuery.data],
  )

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

  const refreshCollectionLists = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['installments'] }),
      queryClient.invalidateQueries({ queryKey: ['collection-daily-stats'] }),
      queryClient.invalidateQueries({ queryKey: ['collection-follow-ups'] }),
    ])
  }

  const collectMutation = useMutation<{ id?: number; related_payment_ids?: number[] } | null | undefined, Error, { applyExcessToFollowing?: boolean; clearCollectionAction?: boolean } | void>({
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
      if (vars?.clearCollectionAction) payload.clear_collection_action = true
      if (vars?.applyExcessToFollowing) {
        payload.apply_excess_to_following = true
      }
      const { data } = await api.post(`/sales-invoices/${selected.sales_invoice_id}/installments/collect`, payload)
      return data
    },
    onError: (error, variables) => {
      if (isAxiosError(error) && error.response?.data?.code === 'collection_action_active') {
        setCollectionActionPrompt({ applyExcessToFollowing: variables?.applyExcessToFollowing, actions: error.response.data.actions })
      }
    },
    onSuccess: async () => {
      setCollectionActionPrompt(null)
      await queryClient.invalidateQueries({ queryKey: ['collection-actions-summary'] })
      await refreshCollectionLists()
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
    onSuccess: async () => {
      await refreshCollectionLists()
      resetInstallmentProcedure()
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
    onSuccess: async () => {
      await refreshCollectionLists()
      resetInstallmentProcedure()
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
      await refreshCollectionLists()
      resetInstallmentProcedure()
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
      await refreshCollectionLists()
      if (selected?.id === variables.installmentId) resetInstallmentProcedure()
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
    onSuccess: async () => {
      await refreshCollectionLists()
      if (selected?.sales_invoice_id) {
        queryClient.invalidateQueries({ queryKey: ['collection-follow-ups', selected.sales_invoice_id] })
      }
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
    onSuccess: async () => {
      await refreshCollectionLists()
      if (selected?.sales_invoice_id) {
        queryClient.invalidateQueries({ queryKey: ['collection-follow-ups', selected.sales_invoice_id] })
      }
      resetInstallmentProcedure()
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
      await refreshCollectionLists()
      if (selected?.id) {
        await queryClient.invalidateQueries({ queryKey: ['collection-follow-ups', 'installment', selected.id] })
      }
      if (selected?.sales_invoice_id) {
        await queryClient.invalidateQueries({ queryKey: ['collection-follow-ups', selected.sales_invoice_id] })
      }
      resetInstallmentProcedure()
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
    onSuccess: async () => {
      await refreshCollectionLists()
      resetInstallmentProcedure()
    },
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
    onSuccess: async () => {
      await refreshCollectionLists()
      queryClient.invalidateQueries({ queryKey: ['collection-assignments'] })
    },
  })

  const selectRow = (row: InstallmentRow, options?: { keepReconcile?: boolean }) => {
    collectMutation.reset()
    setSelected(row)
    setAmount(Number(row.total_due ?? row.remaining ?? Number(row.amount) - Number(row.paid_amount)))
    setPaymentMethod('cash')
    setAccountId('')
    setSenderNumber('')
    if (!options?.keepReconcile) {
      setShowReconcile(false)
    }
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

  const hasFilters = Boolean(customerSearch || statusFilter || collectionStatusFilter || collectorFilter || contractTierFilter !== 'all' || followUpToday || paidToday || completedContracts)
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
    setCompletedContracts(false)
    setCustomerSearch('')
    setStatusFilter('')
    setCollectionStatusFilter('')
    setFollowUpToday(false)
    setPaidToday(false)
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
                setFollowUpToday(false)
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
        isLoading={branchesQuery.isLoading || branchCountsQuery.isLoading || listQuery.isLoading}
        isError={branchesQuery.isError || branchCountsQuery.isError || listQuery.isError}
        error={branchesQuery.error ?? branchCountsQuery.error ?? listQuery.error}
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
          <>
            <CollectionDailyStatCards
              stats={dailyStatsQuery.data ?? emptyDailyStats}
              activeStatus={collectionStatusFilter}
              followUpActive={followUpToday}
              paidActive={paidToday}
              onSelectStatus={(status) => {
                setCompletedContracts(false)
                setFollowUpToday(false)
                setPaidToday(false)
                setCollectionStatusFilter(status)
                setSelected(null)
              }}
              onToggleFollowUp={() => {
                setCompletedContracts(false)
                setFollowUpToday((active) => !active)
                setPaidToday(false)
                setCollectionStatusFilter('')
                setSelected(null)
              }}
              onTogglePaid={() => {
                setCompletedContracts(false)
                setPaidToday((active) => !active)
                setFollowUpToday(false)
                setCollectionStatusFilter('')
                setSelected(null)
              }}
            />
          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
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
                  title="العقود المسددة بالكامل"
                  aria-label="عرض العقود المسددة بالكامل"
                  aria-pressed={completedContracts}
                  onClick={() => {
                    setCompletedContracts((active) => !active)
                    setPaidToday(false)
                    setFollowUpToday(false)
                    setSelected(null)
                  }}
                  className={`inline-flex h-9 items-center gap-1 rounded-lg border px-2 text-sm ${completedContracts ? 'border-primary bg-primary text-on-primary' : 'border-primary/30 bg-primary/10 text-primary'}`}
                >
                  <Icon name="task_alt" size={18} />
                  <span>مسددة بالكامل</span>
                </button>
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

            {quickStatusMutation.isError ? (
              <p className="mb-sm text-sm text-error" role="alert">
                {getErrorMessage(quickStatusMutation.error)}
              </p>
            ) : null}
            <div className={`grid gap-md lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:min-h-0 lg:overflow-hidden ${showChrome ? 'lg:max-h-[calc(100dvh-8.5rem)]' : 'lg:max-h-[calc(100dvh-13rem)]'}`}>
              <div className="min-w-0 lg:min-h-0 lg:overflow-y-auto">
                <InstallmentCollectionGroupedList
                  rows={filteredRows}
                  sortMode={sortByReminder ? 'reminder' : 'priority'}
                  focusCustomerId={collectionFocus?.customerId ?? null}
                  onOpenProfile={(customerId) =>
                    saveInstallmentCollectionFocus({
                      customerId,
                      customerSearch,
                      statusFilter,
                      contractTierFilter,
                      collectionStatusFilter,
                      collectorFilter,
                      sortByReminder,
                    })
                  }
                  pageKey={`${selectedBranchId}-${contractTierFilter}-${customerSearch}-${statusFilter}-${collectionStatusFilter}-${collectorFilter}-${followUpToday ? 'follow-up' : 'all'}-${paidToday ? 'paid' : 'open'}-${completedContracts ? 'completed' : 'active'}`}
                  selectedId={selected?.id as number | undefined}
                  onSelect={selectRow}
                  onReconcile={(row) => {
                    selectRow(row, { keepReconcile: true })
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
                  emptyMessage={
                    completedContracts
                      ? 'لا توجد عقود مسددة بالكامل'
                      : paidToday
                      ? 'لا توجد عقود تم دفعها اليوم'
                      : followUpToday
                        ? 'لا توجد عقود تحتاج متابعة اليوم'
                        : collectionListEmptyMessage(contractTierFilter)
                  }
                  hasNextPage={listQuery.hasNextPage}
                  isFetchingNextPage={listQuery.isFetchingNextPage}
                  onLoadMore={() => {
                    if (!listQuery.isFetchingNextPage) void listQuery.fetchNextPage()
                  }}
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
                onCollectionReminderAtChange={(value) => {
                  setCollectionReminderAt(value)
                  if (value) setCollectionStatus('new_payment_date')
                }}
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
          </>
        ) : (
          branchStats.length > 0 && (
            <p className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-md text-center text-sm text-on-surface-variant">
              اضغط على كارت الفرع لعرض الأقساط
            </p>
          )
        )}
      </AsyncState>
      <Modal open={collectionActionPrompt !== null} title="إجراء قائم على العقد" onClose={() => { if (!collectMutation.isPending) setCollectionActionPrompt(null) }}>
        <p className="mb-3 text-sm">يوجد إجراء تحصيل قائم: {collectionActionPrompt?.actions?.join('، ')}. هل تريد إلغاء الإجراء ثم تأكيد التحصيل؟ إلغاء «ريسيت متأخر» أو «فقد الإشارة» يسري على العميل، والرسالة التحذيرية على هذا العقد فقط.</p>
        {collectMutation.isError && <p role="alert" className="mb-3 text-sm text-error">{getErrorMessage(collectMutation.error)}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" disabled={collectMutation.isPending} onClick={() => { setCollectionActionPrompt(null); collectMutation.reset() }} className="rounded-lg border px-3 py-2 text-sm">رجوع بدون تحصيل</button>
          <button type="button" disabled={collectMutation.isPending} onClick={() => collectMutation.mutate({ ...collectionActionPrompt, clearCollectionAction: true })} className="rounded-lg bg-primary px-3 py-2 text-sm text-on-primary disabled:opacity-50">{collectMutation.isPending ? 'جارٍ التحصيل...' : 'إلغاء الإجراء وتأكيد التحصيل'}</button>
        </div>
      </Modal>
      <CollectionFollowUpSidebar
        open={showFollowUps}
        onClose={() => setShowFollowUps(false)}
        branchId={selectedBranchId}
        search={debouncedCustomerSearch}
        pageKey={`${selectedBranchId}-${debouncedCustomerSearch}`}
        selectedId={selected?.id as number | undefined}
        onSelect={selectRow}
        onReconcile={(row) => {
          selectRow(row, { keepReconcile: true })
          setShowReconcile(true)
        }}
      />
    </SalesPageShell>
  )
}
