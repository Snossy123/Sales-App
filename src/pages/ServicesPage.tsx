import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Service } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { Icon } from '../components/Icon'
import { Pagination } from '../components/Pagination'
import { SalesPageShell } from '../components/SalesPageShell'
import { StatusBadge } from '../components/StatusBadge'
import { EntityRowActions } from '../components/crud/EntityRowActions'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { getEntityCrudConfig } from '../lib/crud/entityCrudRegistry'
import { type ApiPaginated, paginatedMeta } from '../lib/sales'
import { contractTemplateLabel } from '../lib/contractTemplates'
import { getUserRole } from '../lib/permissions'
import { useAuthStore } from '../stores/authStore'

export function ServicesPage() {
  const user = useAuthStore((s) => s.user)
  const canManage = ['super_admin', 'admin'].includes(getUserRole(user))
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search, 300)
  const crudConfig = getEntityCrudConfig('services')

  const query = useQuery({
    queryKey: ['services', debouncedSearch, statusFilter, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 25, page }
      if (debouncedSearch) params['filter[name]'] = debouncedSearch
      if (statusFilter) params['filter[is_active]'] = statusFilter
      const { data } = await api.get<ApiPaginated<Service>>('/services', { params })
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
      title="الخدمات"
      subtitle="إدارة الخدمات والرسوم التي تقدمها الشركة"
      actions={
        canManage ? (
          <div className="flex flex-wrap items-center gap-sm">
            <Link
              to="/contract-templates"
              className="flex items-center gap-xs rounded-lg border border-outline-variant px-md py-sm text-sm font-bold text-on-surface-variant"
            >
              <Icon name="description" size={18} />
              نماذج العقود
            </Link>
            <Link
              to="/services/add"
              className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
            >
              <Icon name="add_circle" size={18} />
              خدمة جديدة
            </Link>
          </div>
        ) : undefined
      }
      filters={
        <FilterBar
          search={search}
          onSearchChange={(value) => {
            setSearch(value)
            setPage(1)
          }}
          searchPlaceholder="بحث باسم الخدمة..."
          selects={[
            {
              id: 'status',
              label: 'الحالة',
              value: statusFilter,
              onChange: (value) => {
                setStatusFilter(value)
                setPage(1)
              },
              options: [
                { value: '1', label: 'مفعّلة' },
                { value: '0', label: 'موقوفة' },
              ],
            },
          ]}
          showClear={hasFilters}
          onClear={clearFilters}
        />
      }
    >
      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<Service & Record<string, unknown>>
          data={rows as (Service & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          emptyMessage={hasFilters ? 'لا توجد خدمات مطابقة' : 'لا توجد خدمات بعد'}
          columns={[
            {
              key: 'name',
              header: 'الخدمة',
              render: (row) => row.name_ar || row.name,
            },
            {
              key: 'cash_price',
              header: 'كاش',
              className: 'tabular-nums',
              render: (row) =>
                `${Number(row.cash_price ?? row.default_price).toLocaleString('ar-EG')} ج.م`,
            },
            {
              key: 'installment_price',
              header: 'قسط',
              className: 'tabular-nums',
              render: (row) =>
                `${Number(row.installment_price ?? row.default_price).toLocaleString('ar-EG')} ج.م`,
            },
            {
              key: 'contract_template_key',
              header: 'نموذج العقد',
              render: (row) => contractTemplateLabel(row.contract_template_key),
            },
            {
              key: 'is_active',
              header: 'الحالة',
              render: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} />,
            },
            {
              key: 'actions',
              header: '',
              render: (row) =>
                canManage ? (
                  <EntityRowActions
                    row={row}
                    config={crudConfig}
                    queryKeys={[['services']]}
                    showView={false}
                  />
                ) : (
                  '—'
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
