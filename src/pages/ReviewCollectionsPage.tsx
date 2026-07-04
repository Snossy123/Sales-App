import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
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
  collection_review_status: string
  collection_reviewed_at?: string | null
  total_collected: number
  payment_term?: string
}

const STATUS_OPTIONS = [
  { value: '', label: 'بانتظار المراجعة' },
  { value: 'pending', label: 'معلق' },
  { value: 'reviewed', label: 'تمت المراجعة' },
]

export function ReviewCollectionsPage() {
  const user = useAuthStore((s) => s.user)
  const listScopeKey = getListScopeQueryKey(user)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const query = useQuery({
    queryKey: ['review-collections', listScopeKey, statusFilter],
    queryFn: async () => {
      const params = mergeScopedListParams(user, {
        per_page: 50,
        ...(statusFilter ? { collection_review_status: statusFilter } : {}),
      })
      const { data } = await api.get<{ data: CollectionReviewRow[] }>('/review/collections', { params })
      return data.data ?? []
    },
    enabled: Boolean(user),
  })

  const filteredRows = useMemo(() => {
    const rows = query.data ?? []
    if (!search.trim()) return rows
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      const name = row.customer?.name?.toLowerCase() ?? ''
      const phone = row.customer?.phone ?? ''
      const invoice = row.invoice_number?.toLowerCase() ?? ''
      return name.includes(q) || phone.includes(q) || invoice.includes(q)
    })
  }, [query.data, search])

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
      { key: 'branch', header: 'الفرع', render: (row: CollectionReviewRow) => row.branch?.name ?? '—' },
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
            label={row.collection_review_status === 'reviewed' ? 'تمت المراجعة' : 'بانتظار المراجعة'}
          />
        ),
      },
    ],
    [],
  )

  return (
    <SalesPageShell
      title="مراجعة التحصيلات"
      subtitle="عقود تم تحصيل مدفوعات عليها — تأكيد صحة التحصيل دون صلاحية التحصيل"
      filters={
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="بحث برقم العقد أو اسم العميل..."
          selects={[
            {
              id: 'status',
              label: 'حالة المراجعة',
              value: statusFilter,
              options: STATUS_OPTIONS,
              onChange: setStatusFilter,
            },
          ]}
          showClear={Boolean(search || statusFilter)}
          onClear={() => {
            setSearch('')
            setStatusFilter('')
          }}
        />
      }
    >
      <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
        <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
          <DataTable<CollectionReviewRow & Record<string, unknown>>
            data={filteredRows as (CollectionReviewRow & Record<string, unknown>)[]}
            keyExtractor={(row) => row.id}
            pageSize={10}
            emptyMessage="لا توجد تحصيلات بانتظار المراجعة"
            columns={columns}
          />
        </AsyncState>
      </div>
    </SalesPageShell>
  )
}
