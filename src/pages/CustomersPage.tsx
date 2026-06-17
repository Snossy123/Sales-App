import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Customer } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { Icon } from '../components/Icon'
import { Pagination } from '../components/Pagination'
import { SalesPageShell } from '../components/SalesPageShell'
import { StatusBadge } from '../components/StatusBadge'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { type ApiPaginated, customerStatusOptions, paginatedMeta } from '../lib/sales'
import { getUserRole } from '../lib/permissions'
import { useAuthStore } from '../stores/authStore'

export function CustomersPage() {
  const branchId = useAuthStore((s) => s.branchId)
  const user = useAuthStore((s) => s.user)
  const canCreate = ['super_admin', 'admin', 'sales'].includes(getUserRole(user))
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search, 300)

  const query = useQuery({
    queryKey: ['customers', debouncedSearch, statusFilter, branchId, page],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 25,
        page,
      }
      if (debouncedSearch) params['filter[name]'] = debouncedSearch
      if (statusFilter) params['filter[status]'] = statusFilter
      if (branchId) params['filter[branch_id]'] = branchId

      const { data } = await api.get<ApiPaginated<Customer>>('/customers', { params })
      return data
    },
  })

  const meta = query.data ? paginatedMeta(query.data) : null
  const rows = query.data?.data ?? []
  const hasFilters = Boolean(search || statusFilter)

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('')
    setPage(1)
  }

  return (
    <SalesPageShell
      title="العملاء"
      subtitle="إدارة بيانات العملاء والبحث السريع"
      actions={
        canCreate ? (
          <Link
            to="/customers/add"
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
          >
            <Icon name="person_add" size={18} />
            عميل جديد
          </Link>
        ) : undefined
      }
      filters={
        <FilterBar
          search={search}
          onSearchChange={(value) => {
            setSearch(value)
            setPage(1)
          }}
          searchPlaceholder="بحث بالاسم..."
          selects={[
            {
              id: 'status',
              label: 'الحالة',
              value: statusFilter,
              onChange: (value) => {
                setStatusFilter(value)
                setPage(1)
              },
              options: customerStatusOptions.map((o) => ({ value: o.value, label: o.label })),
            },
          ]}
          showClear={hasFilters}
          onClear={clearFilters}
        />
      }
    >
      <AsyncState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
      >
        <DataTable<Customer & Record<string, unknown>>
          data={rows as (Customer & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          emptyMessage={hasFilters ? 'لا يوجد عملاء مطابقون' : 'لا يوجد عملاء'}
          columns={[
            { key: 'name', header: 'الاسم' },
            { key: 'phone', header: 'الهاتف', className: 'tabular-nums' },
            {
              key: 'status',
              header: 'الحالة',
              render: (row) => <StatusBadge status={row.status} />,
            },
            {
              key: 'credit_score',
              header: 'التقييم',
              render: (row) => row.credit_score ?? '—',
            },
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <Link
                  to={`/customers/${row.id}`}
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <Icon name="visibility" size={18} />
                  عرض
                </Link>
              ),
            },
          ]}
        />
        {meta && meta.last_page > 1 && (
          <Pagination
            currentPage={meta.current_page}
            lastPage={meta.last_page}
            total={meta.total}
            onPageChange={setPage}
          />
        )}
      </AsyncState>
    </SalesPageShell>
  )
}
