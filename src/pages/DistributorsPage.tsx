import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Distributor } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { Icon } from '../components/Icon'
import { ProfileAvatar } from '../components/ProfileAvatar'
import { Pagination } from '../components/Pagination'
import { SalesPageShell } from '../components/SalesPageShell'
import { StatusBadge } from '../components/StatusBadge'
import { EntityRowActions } from '../components/crud/EntityRowActions'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { getEntityCrudConfig } from '../lib/crud/entityCrudRegistry'
import {
  type ApiPaginated,
  distributorContractCustomerCount,
  distributorContractsCount,
  distributorLabel,
  formatDistributorAgreedAmount,
  distributorStatusOptions,
  distributorTypeLabel,
  paginatedMeta,
} from '../lib/sales'
import { getUserRole } from '../lib/permissions'
import { getListScopeQueryKey, mergeScopedListParams } from '../lib/dataScope'
import { useAuthStore } from '../stores/authStore'

function truncateAddress(value?: string | null, max = 40): string {
  if (!value) return '—'
  return value.length > max ? `${value.slice(0, max)}…` : value
}

export function DistributorsPage() {
  const user = useAuthStore((s) => s.user)
  const listScopeKey = getListScopeQueryKey(user)
  const canCreate = ['super_admin', 'admin', 'sales'].includes(getUserRole(user))
  const [search, setSearch] = useState('')
  const [codeSearch, setCodeSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search, 300)
  const debouncedCode = useDebouncedValue(codeSearch, 300)
  const crudConfig = getEntityCrudConfig('distributors')

  const query = useQuery({
    queryKey: ['distributors', debouncedSearch, debouncedCode, statusFilter, listScopeKey, page],
    queryFn: async () => {
      const params = mergeScopedListParams(user, {
        per_page: 25,
        page,
        include: 'customer',
      })
      if (debouncedSearch) params['filter[name]'] = debouncedSearch
      if (debouncedCode) params['filter[code]'] = debouncedCode
      if (statusFilter) params['filter[status]'] = statusFilter

      const { data } = await api.get<ApiPaginated<Distributor>>('/distributors', { params })
      return data
    },
  })

  const meta = query.data ? paginatedMeta(query.data) : null
  const rows = query.data?.data ?? []
  const hasFilters = Boolean(search || codeSearch || statusFilter)

  const clearFilters = () => {
    setSearch('')
    setCodeSearch('')
    setStatusFilter('')
    setPage(1)
  }

  return (
    <SalesPageShell
      title="الموزعين"
      subtitle="إدارة الموزعين وربط العملاء والفواتير بكل موزع"
      actions={
        canCreate ? (
          <Link
            to="/distributors/add"
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary disabled:opacity-50"
          >
            <Icon name="person_add" size={18} />
            موزع جديد
          </Link>
        ) : undefined
      }
      filters={
        <div className="space-y-sm">
          <div className="flex flex-wrap items-end gap-sm rounded-lg border border-outline-variant bg-surface-container-low p-sm">
            <div className="min-w-[160px]">
              <label className="mb-xs block text-xs font-medium text-on-surface-variant">
                كود الموزع
              </label>
              <input
                type="search"
                value={codeSearch}
                onChange={(e) => {
                  setCodeSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="DIST-001"
                dir="ltr"
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-2 text-sm"
              />
            </div>
          </div>
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
                options: distributorStatusOptions.map((o) => ({ value: o.value, label: o.label })),
              },
            ]}
            showClear={hasFilters}
            onClear={clearFilters}
          />
        </div>
      }
    >
      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<Distributor & Record<string, unknown>>
          data={rows as (Distributor & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          emptyMessage={hasFilters ? 'لا يوجد موزعين مطابقين' : 'لا يوجد موزعين'}
          columns={[
            { key: 'code', header: 'الكود', className: 'tabular-nums' },
            {
              key: 'name',
              header: 'الموزع',
              render: (row) => (
                <span className="inline-flex items-center gap-sm">
                  <ProfileAvatar
                    name={distributorLabel(row)}
                    photoUrl={row.profile_photo_url}
                    variant="distributor"
                    size="sm"
                  />
                  {distributorLabel(row)}
                </span>
              ),
            },
            {
              key: 'phone',
              header: 'الهاتف',
              className: 'tabular-nums',
              render: (row) => row.phone ?? '—',
            },
            {
              key: 'type',
              header: 'النوع',
              render: (row) => distributorTypeLabel(row.type),
            },
            {
              key: 'address',
              header: 'العنوان',
              render: (row) => truncateAddress(row.address),
            },
            {
              key: 'customer',
              header: 'العميل المرتبط',
              render: (row) => row.customer?.name ?? '—',
            },
            {
              key: 'agreed_amount',
              header: 'القيمة المتفق عليها',
              render: (row) => formatDistributorAgreedAmount(row.agreed_amount),
            },
            {
              key: 'confirmed_transactions_count',
              header: 'المعاملات',
              render: (row) => row.confirmed_transactions_count ?? 0,
            },
            {
              key: 'contract_customers_count',
              header: 'عملاء التعاقد',
              render: (row) => distributorContractCustomerCount(row),
            },
            {
              key: 'sales_invoices_count',
              header: 'التعاقدات',
              render: (row) => distributorContractsCount(row),
            },
            {
              key: 'status',
              header: 'الحالة',
              render: (row) => <StatusBadge status={row.status} />,
            },
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <EntityRowActions
                  row={row}
                  config={crudConfig}
                  queryKeys={[['distributors']]}
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
