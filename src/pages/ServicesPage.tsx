import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { Service } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { Icon } from '../components/Icon'
import { Pagination } from '../components/Pagination'
import { SalesPageShell } from '../components/SalesPageShell'
import { StatusBadge } from '../components/StatusBadge'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { type ApiPaginated, paginatedMeta } from '../lib/sales'
import { SERVICE_CATEGORIES, serviceCategoryLabel } from '../lib/services'
import { getUserRole } from '../lib/permissions'
import { useAuthStore } from '../stores/authStore'

export function ServicesPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canManage = ['super_admin', 'admin'].includes(getUserRole(user))
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [deleteError, setDeleteError] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)

  const query = useQuery({
    queryKey: ['services', debouncedSearch, categoryFilter, statusFilter, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 25, page }
      if (debouncedSearch) params['filter[name]'] = debouncedSearch
      if (categoryFilter) params['filter[category]'] = categoryFilter
      if (statusFilter) params['filter[is_active]'] = statusFilter
      const { data } = await api.get<ApiPaginated<Service>>('/services', { params })
      return data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/services/${id}`)
    },
    onSuccess: () => {
      setDeleteError('')
      queryClient.invalidateQueries({ queryKey: ['services'] })
    },
    onError: (error) => setDeleteError(getErrorMessage(error)),
  })

  const handleDelete = (service: Service) => {
    if (!window.confirm(`حذف الخدمة "${service.name_ar || service.name}"؟`)) return
    deleteMutation.mutate(service.id)
  }

  const meta = query.data ? paginatedMeta(query.data) : null
  const rows = query.data?.data ?? []
  const hasFilters = Boolean(search || categoryFilter || statusFilter)

  const clearFilters = () => {
    setSearch('')
    setCategoryFilter('')
    setStatusFilter('')
    setPage(1)
  }

  return (
    <SalesPageShell
      title="الخدمات"
      subtitle="إدارة الخدمات والرسوم التي تقدمها الشركة"
      actions={
        canManage ? (
          <Link
            to="/services/add"
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
          >
            <Icon name="add_circle" size={18} />
            خدمة جديدة
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
          searchPlaceholder="بحث باسم الخدمة..."
          selects={[
            {
              id: 'category',
              label: 'التصنيف',
              value: categoryFilter,
              onChange: (value) => {
                setCategoryFilter(value)
                setPage(1)
              },
              options: SERVICE_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
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
      {deleteError && <p className="mb-md text-sm text-error">{deleteError}</p>}

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<Service & Record<string, unknown>>
          data={rows as (Service & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          emptyMessage={hasFilters ? 'لا توجد خدمات مطابقة' : 'لا توجد خدمات بعد'}
          columns={[
            { key: 'code', header: 'الكود', className: 'tabular-nums', render: (row) => row.code ?? '—' },
            {
              key: 'name',
              header: 'الخدمة',
              render: (row) => row.name_ar || row.name,
            },
            {
              key: 'category',
              header: 'التصنيف',
              render: (row) => serviceCategoryLabel(row.category),
            },
            {
              key: 'default_price',
              header: 'السعر الافتراضي',
              className: 'tabular-nums',
              render: (row) => `${Number(row.default_price).toLocaleString('ar-EG')} ج.م`,
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
                  <div className="flex items-center gap-md">
                    <Link
                      to={`/services/${row.id}/edit`}
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <Icon name="edit" size={18} />
                      تعديل
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(row)}
                      disabled={deleteMutation.isPending}
                      className="inline-flex items-center gap-1 text-sm text-error hover:underline disabled:opacity-50"
                    >
                      <Icon name="delete" size={18} />
                      حذف
                    </button>
                  </div>
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
