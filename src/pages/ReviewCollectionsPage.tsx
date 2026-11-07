import { useBranchFilterOptions } from '../hooks/useBranchFilterOptions'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { Pagination } from '../components/Pagination'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { FilterBar } from '../components/FilterBar'
import { SalesPageShell } from '../components/SalesPageShell'
import { StatusBadge } from '../components/StatusBadge'
import { getListScopeQueryKey, mergeScopedListParams } from '../lib/dataScope'
import { formatMoney } from '../lib/theme'
import { useAuthStore } from '../stores/authStore'

interface CollectionReviewRow {
  id: number
  invoice_number: string
  customer?: { name?: string; phone?: string }
  branch?: { name?: string }
  action_branch?: { name?: string; name_ar?: string } | null
  collection_review_status: string | null
  collection_reviewed_at?: string | null
  total_collected: number
  payment_term?: string
}

const COLLECTION_CATEGORIES = [
  { key: 'postponed', label: 'تأجيلات' },
  { key: 'paid', label: 'تم الدفع اليوم' },
] as const

type CollectionCategory = typeof COLLECTION_CATEGORIES[number]['key']
interface CollectionReviewResponse {
  data: CollectionReviewRow[]
  current_page: number
  last_page: number
  total: number
  collection_stats: Record<CollectionCategory, number>
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'كل حالات المراجعة' },
  { value: 'pending', label: 'بانتظار المراجعة' },
  { value: 'reviewed', label: 'تمت المراجعة' },
]

function todayDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

export function ReviewCollectionsPage() {
  const branchOptions = useBranchFilterOptions()
  const [branchFilter, setBranchFilter] = useState('')
  const user = useAuthStore((s) => s.user)
  const listScopeKey = getListScopeQueryKey(user)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [category, setCategory] = useState<CollectionCategory | ''>('')
  const [date, setDate] = useState(todayDate)
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search, 300)
  const filterKey = JSON.stringify([listScopeKey, statusFilter, branchFilter, category, debouncedSearch, date])
  const [previousFilterKey, setPreviousFilterKey] = useState(filterKey)
  if (previousFilterKey !== filterKey) {
    setPreviousFilterKey(filterKey)
    setPage(1)
  }

  const query = useQuery({
    queryKey: ['review-collections', listScopeKey, statusFilter, branchFilter, category, debouncedSearch, date, page],
    queryFn: async () => {
      const params = mergeScopedListParams(user, {
        date: date || undefined,
        per_page: 10,
        page,
        search: debouncedSearch.trim() || undefined,
        collection_category: category || undefined,
        ...(branchFilter ? { action_branch_id: branchFilter } : {}),
        ...(statusFilter ? { collection_review_status: statusFilter } : {}),
      })
      const { data } = await api.get<CollectionReviewResponse>('/review/collections', { params })
      return data
    },
    enabled: Boolean(user),
  })

  const columns = useMemo(
    () => [
      {
        key: 'invoice_number',
        header: 'رقم العقد',
        render: (row: CollectionReviewRow) => (
          <Link to={`/review/collections/${row.id}`} className="font-medium text-primary hover:underline">
            {row.invoice_number}
          </Link>
        ),
      },
      {
        key: 'customer',
        header: 'العميل',
        render: (row: CollectionReviewRow) => (
          <div>
            <div>{row.customer?.name ?? '—'}</div>
            <div className="text-xs text-on-surface-variant">{row.customer?.phone ?? ''}</div>
          </div>
        ),
      },
      { key: 'action_branch', header: 'فرع تنفيذ البيع', render: (row: CollectionReviewRow) => row.action_branch?.name_ar || row.action_branch?.name || 'غير مسجل' },
      {
        key: 'total_collected',
        header: 'إجمالي المحصّل',
        render: (row: CollectionReviewRow) => formatMoney(row.total_collected),
      },
      {
        key: 'status',
        header: 'حالة المراجعة',
        render: (row: CollectionReviewRow) => (
          <StatusBadge
            status={row.collection_review_status === 'reviewed' ? 'success' : 'warning'}
            label={row.collection_review_status === 'reviewed' ? 'تمت المراجعة' : row.collection_review_status === 'pending' ? 'بانتظار المراجعة' : 'لم تتم المراجعة'}
          />
        ),
      },
    ],
    [],
  )

  return (
    <SalesPageShell
      title="مراجعة التحصيلات"
      subtitle="متابعة إجراءات قسم الأقساط ومراجعة صحة التحصيل"
      filters={
        <FilterBar
          dateFrom={date}
          onDateFromChange={setDate}
          dateFromLabel="يوم إجراءات التحصيل"
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="بحث برقم العقد أو اسم العميل..."
          selects={[
            { id: 'action-branch', label: 'فرع تنفيذ البيع', value: branchFilter, options: branchOptions, onChange: setBranchFilter },
            {
              id: 'status',
              label: 'حالة المراجعة',
              value: statusFilter,
              options: STATUS_OPTIONS,
              onChange: setStatusFilter,
            },
          ]}
          showClear={Boolean(search || statusFilter !== 'all' || branchFilter || category || date !== todayDate())}
          onClear={() => {
            setDate(todayDate())
            setSearch('')
            setStatusFilter('all')
            setCategory('')
            setBranchFilter('')
          }}
        />
      }
    >
      <div className="mb-md grid grid-cols-2 gap-sm">
        {COLLECTION_CATEGORIES.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={category === item.key}
            onClick={() => setCategory(category === item.key ? '' : item.key)}
            className={`rounded-xl border p-4 text-start ${category === item.key
              ? 'border-transparent bg-primary text-on-primary'
              : 'border-outline-variant bg-surface-container-low text-on-surface hover:border-primary/40'}`}
          >
            <p className="text-sm">{date && date !== todayDate() ? item.label.replace('اليوم', 'في اليوم المحدد') : item.label}</p>
            <p className="mt-2 text-2xl font-bold tabular-nums">{query.data?.collection_stats[item.key] ?? '—'}</p>
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
        <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
          <DataTable<CollectionReviewRow & Record<string, unknown>>
            data={(query.data?.data ?? []) as (CollectionReviewRow & Record<string, unknown>)[]}
            keyExtractor={(row) => row.id}
            emptyMessage="لا توجد عقود مطابقة للفلاتر المحددة"
            columns={columns}
          />
          {query.data && (
            <Pagination currentPage={query.data.current_page} lastPage={query.data.last_page} total={query.data.total} onPageChange={setPage} />
          )}
        </AsyncState>
      </div>
    </SalesPageShell>
  )
}
