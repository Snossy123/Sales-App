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

function customerPhones(customer: Customer): string[] {
  return [customer.phone, customer.phone_2, customer.phone_3].filter(
    (phone): phone is string => Boolean(phone?.trim()),
  )
}

function customerGuarantorLabel(customer: Customer): string {
  const guarantor = customer.guarantors?.[0]
  if (!guarantor?.name?.trim()) return 'بدون ضامن'
  return guarantor.name
}

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
        include: 'guarantors',
      })
      const searchTerm = debouncedSearch.trim()
      if (searchTerm) {
        if (/^[\d+\s-]+$/.test(searchTerm)) {
          params['filter[phone]'] = searchTerm.replace(/\s/g, '')
        } else {
          params['filter[name]'] = searchTerm
        }
      }
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
          searchPlaceholder="بحث بالاسم أو الهاتف..."
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
                <Link
                  to={`/customers/${row.id}`}
                  className="inline-flex min-w-0 items-center gap-sm font-medium text-primary hover:underline"
                >
                  <ProfileAvatar
                    name={row.name}
                    photoUrl={row.profile_photo_url}
                    variant="customer"
                    size="sm"
                  />
                  <span className="truncate">{row.name}</span>
                </Link>
              ),
            },
            {
              key: 'phones',
              header: 'للتواصل',
              render: (row) => {
                const phones = customerPhones(row)
                if (phones.length === 0) return '—'
                return (
                  <div className="flex flex-col gap-0.5 text-xs tabular-nums" dir="ltr">
                    {phones.map((phone) => (
                      <a key={phone} href={`tel:${phone}`} className="text-primary hover:underline">
                        {phone}
                      </a>
                    ))}
                  </div>
                )
              },
            },
            {
              key: 'national_id',
              header: 'الرقم القومي',
              className: 'tabular-nums',
              render: (row) => row.national_id?.trim() || '—',
            },
            {
              key: 'address',
              header: 'العنوان',
              render: (row) => (
                <span className="line-clamp-2 max-w-[14rem] text-on-surface-variant">
                  {row.address?.trim() || '—'}
                </span>
              ),
            },
            {
              key: 'guarantor',
              header: 'الضامن',
              render: (row) => customerGuarantorLabel(row),
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
