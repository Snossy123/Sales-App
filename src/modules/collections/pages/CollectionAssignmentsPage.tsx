import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type {
  Branch,
  CollectorOption,
  CollectionWorkloadRow,
  InstallmentItem,
  PaginatedResponse,
} from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { FilterBar } from '../../../components/FilterBar'
import { Icon } from '../../../components/Icon'
import { SalesPageShell } from '../../../components/SalesPageShell'
import { StatusBadge } from '../../../components/StatusBadge'
import { formatDate } from '../../../lib/accounting'
import {
  collectionStatusLabels,
  computeContractStats,
  firstDueStatus,
  firstDueStatusLabels,
  firstDueStatusOptions,
  getCurrentInstallment,
  type ContractTierFilter,
  type FirstDueStatus,
  type InstallmentCollectionRow,
} from '../../../lib/collectionHelpers'
import { normalizeInstallmentItem } from '../../../lib/sales'

const ASSIGNMENT_CHROME_STORAGE_KEY = 'assignment-chrome-open'

interface AssignmentContract {
  invoiceId: number
  invoiceNumber: string
  customerName: string
  customerId?: number
  branchId?: number
  collectionStatus?: string | null
  collectorUserId?: number | null
  collectorName?: string | null
  remaining: number
  firstDueDate?: string
  firstDueStatus?: FirstDueStatus
}

const dueStatusBadgeStatus: Record<FirstDueStatus, string> = {
  upcoming: 'upcoming',
  due: 'due_soon',
  overdue: 'overdue',
}

interface AssignmentBranchStats {
  branch: Branch
  contractsCount: number
  overdueCount: number
  dueSoonCount: number
  upcomingCount: number
}

function dueStatusToTier(filter: string): ContractTierFilter {
  if (filter === 'overdue') return 'overdue'
  if (filter === 'due') return 'due_soon'
  if (filter === 'upcoming') return 'upcoming'
  return 'all'
}

function AssignmentBranchCard({
  stats,
  selected,
  activeFilter,
  onSelectBranch,
  onFilter,
}: {
  stats: AssignmentBranchStats
  selected: boolean
  activeFilter: ContractTierFilter
  onSelectBranch: () => void
  onFilter: (tier: ContractTierFilter) => void
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
      className={`rounded-xl border p-md text-right transition-all ${
        selected
          ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30'
          : 'border-outline-variant bg-surface-container-lowest'
      }`}
    >
      <div className="mb-sm flex w-full items-start justify-between gap-sm">
        <button type="button" onClick={onSelectBranch} className="min-w-0 flex-1 text-right">
          <p className="truncate font-semibold text-on-surface">{branch.name_ar || branch.name}</p>
          <p className="text-xs text-on-surface-variant">{branch.code}</p>
        </button>
        <button
          type="button"
          onClick={onSelectBranch}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            selected ? 'bg-primary text-on-primary' : 'bg-primary/10 text-primary'
          }`}
          aria-label={`اختيار فرع ${branch.name_ar || branch.name}`}
        >
          <Icon name="store" size={20} />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-xs text-center">
        <button type="button" onClick={() => onFilter('all')} className={statButtonClass('all')}>
          <p className="tabular-nums text-lg font-bold text-on-surface">{contractsCount}</p>
          <p className="text-[11px] text-on-surface-variant">التعاقدات</p>
        </button>
        <button type="button" onClick={() => onFilter('overdue')} className={statButtonClass('overdue', true)}>
          <p className={`tabular-nums text-lg font-bold ${overdueCount > 0 ? 'text-error' : 'text-on-surface'}`}>
            {overdueCount}
          </p>
          <p className="text-[11px] text-on-surface-variant">عقد متأخر</p>
        </button>
        <button type="button" onClick={() => onFilter('due_soon')} className={statButtonClass('due_soon')}>
          <p className="tabular-nums text-lg font-bold text-on-surface">{dueSoonCount}</p>
          <p className="text-[11px] text-on-surface-variant">عقد مستحق</p>
        </button>
        <button type="button" onClick={() => onFilter('upcoming')} className={statButtonClass('upcoming')}>
          <p className="tabular-nums text-lg font-bold text-on-surface">{upcomingCount}</p>
          <p className="text-[11px] text-on-surface-variant">عقد قادم</p>
        </button>
      </div>
    </div>
  )
}

export function CollectionAssignmentsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [collectorFilter, setCollectorFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [dueStatusFilter, setDueStatusFilter] = useState('')
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Record<number, boolean>>({})
  const [bulkCollectorId, setBulkCollectorId] = useState<number | ''>('')
  const [error, setError] = useState('')
  const [showChrome, setShowChrome] = useState(() => {
    try {
      return localStorage.getItem(ASSIGNMENT_CHROME_STORAGE_KEY) !== 'false'
    } catch {
      return true
    }
  })

  useEffect(() => {
    localStorage.setItem(ASSIGNMENT_CHROME_STORAGE_KEY, String(showChrome))
  }, [showChrome])

  const branchesQuery = useQuery({
    queryKey: ['branches', 'installments'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', {
        params: { per_page: 100, 'filter[is_active]': 1 },
      })
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

  const workloadQuery = useQuery({
    queryKey: ['collection-assignments', 'workload'],
    queryFn: async () => {
      const { data } = await api.get<{ data: CollectionWorkloadRow[]; unassigned_count: number }>(
        '/collection-assignments/workload',
      )
      return data
    },
  })

  const installmentsQuery = useQuery({
    queryKey: ['installments', 'assignments', collectorFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 500,
        include: 'salesInvoice.customer',
      }
      if (collectorFilter) params['filter[collector_user_id]'] = collectorFilter
      const { data } = await api.get<{ data: InstallmentItem[] }>('/installments', { params })
      return data.data.map((item) => normalizeInstallmentItem(item))
    },
  })

  const contracts = useMemo((): AssignmentContract[] => {
    const rowsByInvoice = new Map<number, InstallmentItem[]>()
    for (const row of installmentsQuery.data ?? []) {
      if (row.status === 'paid') continue
      const invoiceId = Number(row.sales_invoice_id ?? 0)
      if (!invoiceId) continue
      const list = rowsByInvoice.get(invoiceId) ?? []
      list.push(row)
      rowsByInvoice.set(invoiceId, list)
    }

    const built: AssignmentContract[] = []
    for (const [invoiceId, rows] of rowsByInvoice) {
      const remaining = rows.reduce((sum, row) => sum + Number(row.remaining ?? 0), 0)
      const current = getCurrentInstallment(rows as InstallmentCollectionRow[])
      const sample = current ?? rows[0]
      built.push({
        invoiceId,
        invoiceNumber: String(sample?.invoice_number ?? `#${invoiceId}`),
        customerName: String(sample?.customer_name ?? '—'),
        customerId: sample?.customer_id,
        branchId: sample?.branch_id,
        collectionStatus: sample?.collection_status,
        collectorUserId: sample?.collector_user_id ?? null,
        collectorName: sample?.collector_name ?? null,
        remaining,
        firstDueDate: current?.due_date,
        firstDueStatus: current ? firstDueStatus(current) : undefined,
      })
    }

    const q = search.trim().toLowerCase()
    return built.filter((contract) => {
      if (selectedBranchId && contract.branchId !== selectedBranchId) return false
      if (q) {
        const matchesSearch =
          contract.customerName.toLowerCase().includes(q) ||
          contract.invoiceNumber.toLowerCase().includes(q)
        if (!matchesSearch) return false
      }

      const due = contract.firstDueDate?.slice(0, 10) ?? ''
      if (dateFrom && (!due || due < dateFrom)) return false
      if (dateTo && (!due || due > dateTo)) return false
      if (dueStatusFilter && contract.firstDueStatus !== dueStatusFilter) return false
      return true
    })
  }, [installmentsQuery.data, search, dateFrom, dateTo, dueStatusFilter, selectedBranchId])

  const branchStats = useMemo((): AssignmentBranchStats[] => {
    const unpaid = (installmentsQuery.data ?? []).filter((row) => row.status !== 'paid')
    const byBranch = new Map<number, InstallmentItem[]>()
    for (const row of unpaid) {
      const branchId = row.branch_id
      if (!branchId) continue
      const list = byBranch.get(branchId) ?? []
      list.push(row)
      byBranch.set(branchId, list)
    }

    const branches = branchesQuery.data ?? []
    return branches
      .map((branch) => {
        const rows = (byBranch.get(branch.id) ?? []) as InstallmentCollectionRow[]
        const {
          total_contracts: contractsCount,
          overdue_contracts: overdueCount,
          due_soon_contracts: dueSoonCount,
          upcoming_contracts: upcomingCount,
        } = computeContractStats(rows)
        return { branch, contractsCount, overdueCount, dueSoonCount, upcomingCount }
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
  }, [branchesQuery.data, installmentsQuery.data])

  const selectedIds = Object.entries(selected)
    .filter(([, checked]) => checked)
    .map(([id]) => Number(id))

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['installments'] })
    queryClient.invalidateQueries({ queryKey: ['collection-assignments'] })
  }

  const assignMutation = useMutation({
    mutationFn: async ({
      invoiceIds,
      collectorUserId,
    }: {
      invoiceIds: number[]
      collectorUserId: number | null
    }) => {
      const { data } = await api.post('/collection-assignments', {
        sales_invoice_ids: invoiceIds,
        collector_user_id: collectorUserId,
      })
      return data
    },
    onSuccess: () => {
      setError('')
      setSelected({})
      setBulkCollectorId('')
      invalidate()
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const collectors = collectorsQuery.data ?? []
  const collectorOptions = [
    { value: '', label: 'كل المحصلين' },
    { value: 'unassigned', label: 'غير معيَّن' },
    ...collectors.map((collector) => ({ value: String(collector.id), label: collector.name })),
  ]

  const allChecked = contracts.length > 0 && contracts.every((contract) => selected[contract.invoiceId])
  const activeFilterCount = [
    search,
    collectorFilter,
    dateFrom,
    dateTo,
    dueStatusFilter,
    selectedBranchId,
  ].filter(Boolean).length
  const activeTier = dueStatusToTier(dueStatusFilter)

  const selectBranch = (branchId: number) => {
    setSelectedBranchId((current) => (current === branchId ? null : branchId))
    setSelected({})
  }

  const applyBranchStatFilter = (branchId: number, tier: ContractTierFilter) => {
    setSelectedBranchId(branchId)
    setDueStatusFilter(tier === 'all' ? '' : tier === 'due_soon' ? 'due' : tier)
    setSelected({})
  }

  return (
    <SalesPageShell
      title="توزيع التحصيل"
      actions={
        <Link
          to="/installments"
          className="rounded-lg border border-outline-variant px-md py-2 text-sm font-medium text-on-surface hover:border-primary/40"
        >
          شاشة التحصيل
        </Link>
      }
      filters={
        showChrome ? (
          <FilterBar
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={(value) => {
              setDateFrom(value)
              setSelected({})
            }}
            onDateToChange={(value) => {
              setDateTo(value)
              setSelected({})
            }}
            dateFromLabel="من تاريخ أول قسط"
            dateToLabel="إلى تاريخ أول قسط"
            selects={[
              {
                id: 'collector',
                label: 'المحصل',
                value: collectorFilter,
                onChange: (value) => {
                  setCollectorFilter(value)
                  setSelected({})
                },
                options: collectorOptions,
              },
              {
                id: 'due-status',
                label: 'حالة القسط',
                value: dueStatusFilter,
                onChange: (value) => {
                  setDueStatusFilter(value)
                  setSelected({})
                },
                options: [...firstDueStatusOptions],
              },
            ]}
            showClear={Boolean(search || collectorFilter || dateFrom || dateTo || dueStatusFilter || selectedBranchId)}
            onClear={() => {
              setSearch('')
              setCollectorFilter('')
              setDateFrom('')
              setDateTo('')
              setDueStatusFilter('')
              setSelectedBranchId(null)
            }}
          />
        ) : undefined
      }
    >
      <AsyncState
        isLoading={
          collectorsQuery.isLoading ||
          workloadQuery.isLoading ||
          installmentsQuery.isLoading ||
          branchesQuery.isLoading
        }
        isError={
          collectorsQuery.isError ||
          workloadQuery.isError ||
          installmentsQuery.isError ||
          branchesQuery.isError
        }
        error={
          collectorsQuery.error ??
          workloadQuery.error ??
          installmentsQuery.error ??
          branchesQuery.error
        }
      >
        {showChrome ? (
          <div id="assignment-branch-cards" className="mb-md grid min-w-0 grid-cols-1 gap-sm sm:grid-cols-2 xl:grid-cols-3">
            {branchStats.map((stats) => (
              <AssignmentBranchCard
                key={stats.branch.id}
                stats={stats}
                selected={selectedBranchId === stats.branch.id}
                activeFilter={activeTier}
                onSelectBranch={() => selectBranch(stats.branch.id)}
                onFilter={(tier) => applyBranchStatFilter(stats.branch.id, tier)}
              />
            ))}
          </div>
        ) : null}

        <div className="mb-md flex flex-col gap-sm sm:flex-row sm:flex-nowrap sm:items-center">
          <div className="relative min-w-0 w-full flex-1">
            <Icon
              name="search"
              size={18}
              className="pointer-events-none absolute start-2 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
            <input
              id="assignment-contract-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالعميل أو رقم العقد..."
              aria-label="بحث"
              className="h-9 w-full rounded-lg border border-outline-variant bg-surface-container-low ps-8 pe-sm text-sm text-on-surface"
            />
          </div>
          <button
            type="button"
            aria-expanded={showChrome}
            aria-controls="assignment-branch-cards"
            onClick={() => setShowChrome((open) => !open)}
            className="inline-flex h-9 shrink-0 items-center gap-xs rounded-lg border border-outline-variant bg-surface-container-low px-sm text-sm text-on-surface hover:bg-surface-container-high"
          >
            <Icon name={showChrome ? 'expand_less' : 'tune'} size={18} />
            {showChrome
              ? 'إخفاء الفلاتر'
              : activeFilterCount > 0
                ? `إظهار الفلاتر · ${activeFilterCount}`
                : 'إظهار الفلاتر'}
          </button>
        </div>

        <div className="mb-md flex min-w-0 gap-sm overflow-x-auto pb-xs">
          <div className="min-w-[10rem] shrink-0 rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
            <p className="text-xs text-on-surface-variant">غير معيَّن</p>
            <p className="mt-1 tabular-nums text-2xl font-bold text-on-surface">
              {workloadQuery.data?.unassigned_count ?? 0}
            </p>
          </div>
          {collectors.map((collector) => {
            const assigned = (workloadQuery.data?.data ?? []).find(
              (row) => row.collector_user_id === collector.id,
            )
            return (
              <div
                key={collector.id}
                className="min-w-[10rem] shrink-0 rounded-xl border border-outline-variant bg-surface-container-lowest p-md"
              >
                <p className="truncate text-xs text-on-surface-variant">{collector.name}</p>
                <p className="mt-1 tabular-nums text-2xl font-bold text-on-surface">
                  {assigned?.contract_count ?? 0}
                </p>
                <p className="text-[11px] text-on-surface-variant">عقد مفتوح</p>
              </div>
            )
          })}
        </div>

        {selectedIds.length > 0 && (
          <div className="mb-md flex flex-wrap items-center gap-sm rounded-xl border border-primary/30 bg-primary/5 p-sm">
            <span className="text-sm text-on-surface">{selectedIds.length} عقد محدد</span>
            <select
              value={bulkCollectorId}
              onChange={(e) => setBulkCollectorId(e.target.value ? Number(e.target.value) : '')}
              className="h-10 rounded-lg border border-outline-variant bg-surface-container-lowest px-sm text-sm"
            >
              <option value="">اختر محصلاً</option>
              {collectors.map((collector) => (
                <option key={collector.id} value={collector.id}>
                  {collector.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={bulkCollectorId === '' || assignMutation.isPending}
              onClick={() =>
                assignMutation.mutate({
                  invoiceIds: selectedIds,
                  collectorUserId: Number(bulkCollectorId),
                })
              }
              className="rounded-lg bg-primary px-md py-2 text-sm font-medium text-on-primary disabled:opacity-50"
            >
              تعيين
            </button>
            <button
              type="button"
              disabled={assignMutation.isPending}
              onClick={() => assignMutation.mutate({ invoiceIds: selectedIds, collectorUserId: null })}
              className="rounded-lg border border-outline-variant px-md py-2 text-sm"
            >
              فك التعيين
            </button>
          </div>
        )}

        {error && <p className="mb-sm text-sm text-error">{error}</p>}

        {contracts.length === 0 ? (
          <p className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md text-center text-on-surface-variant">
            لا توجد عقود أقساط مطابقة
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
            <table className="w-full min-w-[56rem] text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-xs text-on-surface-variant">
                  <th className="px-sm py-2">
                    <input
                      type="checkbox"
                      aria-label="تحديد كل العقود"
                      checked={allChecked}
                      onChange={(e) => {
                        const next: Record<number, boolean> = {}
                        if (e.target.checked) {
                          for (const contract of contracts) next[contract.invoiceId] = true
                        }
                        setSelected(next)
                      }}
                    />
                  </th>
                  <th className="px-sm py-2 text-start">العميل</th>
                  <th className="px-sm py-2 text-start">العقد</th>
                  <th className="px-sm py-2 text-start">تاريخ أول قسط مستحق</th>
                  <th className="px-sm py-2 text-start">حالة القسط</th>
                  <th className="px-sm py-2 text-start">حالة التحصيل</th>
                  <th className="px-sm py-2 text-start">المتبقي</th>
                  <th className="px-sm py-2 text-start">المحصل</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.invoiceId} className="border-b border-outline-variant/50">
                    <td className="px-sm py-2">
                      <input
                        type="checkbox"
                        aria-label={`تحديد عقد ${contract.invoiceNumber}`}
                        checked={Boolean(selected[contract.invoiceId])}
                        onChange={(e) =>
                          setSelected((prev) => ({ ...prev, [contract.invoiceId]: e.target.checked }))
                        }
                      />
                    </td>
                    <td className="px-sm py-2">
                      {contract.customerId ? (
                        <Link to={`/customers/${contract.customerId}`} className="text-primary hover:underline">
                          {contract.customerName}
                        </Link>
                      ) : (
                        contract.customerName
                      )}
                    </td>
                    <td className="px-sm py-2 font-medium">
                      {contract.invoiceId ? (
                        <Link
                          to={`/contracts/${contract.invoiceId}`}
                          dir="ltr"
                          className="text-primary hover:underline"
                        >
                          {contract.invoiceNumber}
                        </Link>
                      ) : (
                        contract.invoiceNumber
                      )}
                    </td>
                    <td className="px-sm py-2 tabular-nums">
                      {contract.firstDueDate ? formatDate(contract.firstDueDate) : '—'}
                    </td>
                    <td className="px-sm py-2">
                      {contract.firstDueStatus ? (
                        <StatusBadge
                          status={dueStatusBadgeStatus[contract.firstDueStatus]}
                          label={firstDueStatusLabels[contract.firstDueStatus]}
                        />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-sm py-2">
                      {contract.collectionStatus
                        ? (collectionStatusLabels[contract.collectionStatus] ?? contract.collectionStatus)
                        : 'بدون متابعة'}
                    </td>
                    <td className="px-sm py-2 tabular-nums">
                      {contract.remaining.toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م
                    </td>
                    <td className="px-sm py-2">
                      <select
                        value={contract.collectorUserId ?? ''}
                        disabled={assignMutation.isPending}
                        onChange={(e) =>
                          assignMutation.mutate({
                            invoiceIds: [contract.invoiceId],
                            collectorUserId: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="h-9 w-full min-w-[10rem] rounded-lg border border-outline-variant bg-surface-container-lowest px-sm text-sm"
                      >
                        <option value="">غير معيَّن</option>
                        {collectors.map((collector) => (
                          <option key={collector.id} value={collector.id}>
                            {collector.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AsyncState>
    </SalesPageShell>
  )
}
