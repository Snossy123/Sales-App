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
import { ProfileAvatar } from '../components/ProfileAvatar'
import { SalesPageShell } from '../components/SalesPageShell'
import { StatusBadge } from '../components/StatusBadge'
import { EntityRowActions } from '../components/crud/EntityRowActions'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { getEntityCrudConfig } from '../lib/crud/entityCrudRegistry'
import { type ApiPaginated, customerStatusOptions, paginatedMeta } from '../lib/sales'
import { getUserRole } from '../lib/permissions'
import { getListScopeQueryKey, mergeScopedListParams } from '../lib/dataScope'
import { useAuthStore } from '../stores/authStore'

export function CustomersPage() {
  const user = useAuthStore((s) => s.user)
  const listScopeKey = getListScopeQueryKey(user)
  const canCreate = ['super_admin', 'admin', 'sales'].includes(getUserRole(user))
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search, 300)
  const crudConfig = getEntityCrudConfig('customers')

  const query = useQuery({
    queryKey: ['customers', debouncedSearch, statusFilter, listScopeKey, page],
    queryFn: async () => {
      const params = mergeScopedListParams(user, {
        per_page: 25,
        page,
      })
      if (debouncedSearch) params['filter[name]'] = debouncedSearch
      if (statusFilter) params['filter[status]'] = statusFilter

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
            {
              key: 'name',
              header: 'الاسم',
              render: (row) => (
                <span className="inline-flex items-center gap-sm">
                  <ProfileAvatar
                    name={row.name}
                    photoUrl={row.profile_photo_url}
                    variant="customer"
                    size="sm"
                  />
                  {row.name}
                </span>
              ),
            },
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
                <EntityRowActions
                  row={row}
                  config={crudConfig}
                  queryKeys={[['customers']]}
                />
              ),
            },
          ]}
        />
        {meta && (
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
