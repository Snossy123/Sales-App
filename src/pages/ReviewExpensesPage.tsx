import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { PaginatedResponse } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { KpiCard } from '../components/KpiCard'
import { Pagination } from '../components/Pagination'
import { SalesPageShell } from '../components/SalesPageShell'
import { StatusBadge } from '../components/StatusBadge'
import { formatMoney } from '../lib/theme'

interface ExpenseRow {
  id: number
  reference_number?: string
  expense_type: string
  amount: number
  status: string
  notes?: string
  created_at?: string
  branch?: { name?: string }
  employee?: { name?: string }
  distributor?: { name?: string }
}

interface ExpensesListResponse extends PaginatedResponse<ExpenseRow> {
  total_amount?: string | number
}

const TYPE_LABELS: Record<string, string> = {
  operating: 'تشغيل',
  petty_cash: 'نثرية',
  distributor_payout: 'صرف عمولة',
  employee_debt: 'مديونية موظف',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'بانتظار المراجعة',
  approved: 'معتمد',
  rejected: 'مرفوض',
  paid: 'مدفوع',
}

type ExpensePeriod = 'day' | 'week' | 'month' | 'year' | 'custom'

const periodOptions: { id: ExpensePeriod; label: string }[] = [
  { id: 'day', label: 'يوم' },
  { id: 'week', label: 'أسبوع' },
  { id: 'month', label: 'شهر' },
  { id: 'year', label: 'سنة' },
  { id: 'custom', label: 'مخصص' },
]

function formatCreatedAt(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const day = date.toLocaleDateString('en-GB', { numberingSystem: 'latn' })
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    numberingSystem: 'latn',
  })
  return `${day} ${time}`
}

export function ReviewExpensesPage() {
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('pending')
  const [period, setPeriod] = useState<ExpensePeriod>('day')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const customReady = period !== 'custom' || Boolean(dateFrom || dateTo)

  const query = useQuery({
    queryKey: ['review-expenses', typeFilter, statusFilter, period, dateFrom, dateTo, search, page],
    enabled: customReady,
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 15, page }
      if (typeFilter) params['filter[expense_type]'] = typeFilter
      if (statusFilter) params['filter[status]'] = statusFilter
      if (search.trim()) params.search = search.trim()
      if (period === 'custom') {
        if (dateFrom) params.created_from = dateFrom
        if (dateTo) params.created_to = dateTo
      } else {
        params.period = period
      }
      const { data } = await api.get<ExpensesListResponse>('/review/expenses', { params })
      return data
    },
  })

  const rows = query.data?.data ?? []
  const hasFilters =
    Boolean(search.trim()) ||
    Boolean(typeFilter) ||
    statusFilter !== 'pending' ||
    period !== 'day' ||
    Boolean(dateFrom || dateTo)

  const columns = useMemo(
    () => [
      {
        key: 'ref',
        header: 'المرجع',
        render: (row: ExpenseRow) => (
          <Link to={`/review/expenses/${row.id}`} className="text-primary hover:underline">
            {row.reference_number ?? `#${row.id}`}
          </Link>
        ),
      },
      {
        key: 'type',
        header: 'النوع',
        render: (row: ExpenseRow) => TYPE_LABELS[row.expense_type] ?? row.expense_type,
      },
      { key: 'amount', header: 'المبلغ', render: (row: ExpenseRow) => formatMoney(Number(row.amount)) },
      { key: 'branch', header: 'الفرع', render: (row: ExpenseRow) => row.branch?.name ?? '—' },
      { key: 'created_at', header: 'تاريخ الطلب', render: (row: ExpenseRow) => formatCreatedAt(row.created_at) },
      {
        key: 'status',
        header: 'الحالة',
        render: (row: ExpenseRow) => (
          <StatusBadge
            status={row.status === 'rejected' ? 'error' : row.status === 'paid' ? 'success' : 'warning'}
            label={STATUS_LABELS[row.status] ?? row.status}
          />
        ),
      },
    ],
    [],
  )

  return (
    <SalesPageShell title="مراجعة المصروفات" subtitle="طلبات المصروفات — تشغيل، نثرية، صرف عمولة، مديونية موظف">
      <div className="mb-md flex flex-wrap items-center gap-sm">
        <span className="text-xs font-medium text-on-surface-variant">الفترة:</span>
        <div className="flex flex-wrap gap-1 rounded-lg border border-outline-variant bg-surface-container-low p-0.5">
          {periodOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                setPeriod(opt.id)
                setPage(1)
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                period === opt.id
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <FilterBar
        search={search}
        onSearchChange={(value) => {
          setSearch(value)
          setPage(1)
        }}
        searchPlaceholder="بحث بالمرجع أو الملاحظات"
        dateFrom={period === 'custom' ? dateFrom : undefined}
        dateTo={period === 'custom' ? dateTo : undefined}
        onDateFromChange={
          period === 'custom'
            ? (value) => {
                setDateFrom(value)
                setPage(1)
              }
            : undefined
        }
        onDateToChange={
          period === 'custom'
            ? (value) => {
                setDateTo(value)
                setPage(1)
              }
            : undefined
        }
        selects={[
          {
            id: 'type',
            label: 'النوع',
            value: typeFilter,
            onChange: (value) => {
              setTypeFilter(value)
              setPage(1)
            },
            options: [
              { value: '', label: 'كل الأنواع' },
              ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
            ],
          },
          {
            id: 'status',
            label: 'الحالة',
            value: statusFilter,
            onChange: (value) => {
              setStatusFilter(value)
              setPage(1)
            },
            options: [
              { value: '', label: 'الكل' },
              ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
            ],
          },
        ]}
        showClear={hasFilters}
        onClear={() => {
          setTypeFilter('')
          setStatusFilter('pending')
          setPeriod('day')
          setDateFrom('')
          setDateTo('')
          setSearch('')
          setPage(1)
        }}
      />

      {customReady && query.data ? (
        <div className="mb-md max-w-sm">
          <KpiCard label="إجمالي المصروفات" value={`${formatMoney(Number(query.data.total_amount ?? 0))} ج.م`} icon="payments" />
        </div>
      ) : null}

      {customReady ? (
        <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
          <DataTable data={rows} keyExtractor={(row) => row.id} columns={columns} emptyMessage="لا توجد طلبات مصروفات" />
          {query.data ? (
            <Pagination
              currentPage={query.data.current_page}
              lastPage={query.data.last_page}
              total={query.data.total}
              onPageChange={setPage}
            />
          ) : null}
        </AsyncState>
      ) : (
        <p className="text-sm text-on-surface-variant">حدد تاريخ البداية أو النهاية لعرض المصروفات.</p>
      )}
    </SalesPageShell>
  )
}
