import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { Customer, Distributor } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { Icon } from '../components/Icon'
import { Pagination } from '../components/Pagination'
import { SalesPageShell } from '../components/SalesPageShell'
import { StatusBadge } from '../components/StatusBadge'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import {
  type ApiPaginated,
  customerStatusOptions,
  paginatedMeta,
  distributorLabel,
} from '../lib/sales'
import { emptyCustomerForm } from '../lib/customerForm'
import { getUserRole } from '../lib/permissions'
import { useAuthStore } from '../stores/authStore'

export function CustomersPage() {
  const queryClient = useQueryClient()
  const branchId = useAuthStore((s) => s.branchId)
  const user = useAuthStore((s) => s.user)
  const canCreate = ['super_admin', 'admin', 'sales'].includes(getUserRole(user))
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [distributorFilter, setDistributorFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyCustomerForm)
  const debouncedSearch = useDebouncedValue(search, 300)

  const query = useQuery({
    queryKey: ['customers', debouncedSearch, statusFilter, distributorFilter, branchId, page],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 25,
        page,
        include: 'distributor',
      }
      if (debouncedSearch) params['filter[name]'] = debouncedSearch
      if (statusFilter) params['filter[status]'] = statusFilter
      if (distributorFilter) params['filter[distributor_id]'] = Number(distributorFilter)
      if (branchId) params['filter[branch_id]'] = branchId

      const { data } = await api.get<ApiPaginated<Customer>>('/customers', { params })
      return data
    },
  })

  const distributorsQuery = useQuery({
    queryKey: ['distributors', 'options', branchId],
    queryFn: async () => {
      const { data } = await api.get<ApiPaginated<Distributor>>('/distributors', {
        params: {
          per_page: 100,
          'filter[status]': 'active',
          ...(branchId ? { 'filter[branch_id]': branchId } : {}),
        },
      })
      return data.data
    },
    enabled: Boolean(branchId),
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<Customer>('/customers', {
        ...form,
        distributor_id: Number(form.distributor_id),
        branch_id: branchId,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setForm(emptyCustomerForm)
      setShowForm(false)
    },
  })

  const handleCreate = (e: FormEvent) => {
    e.preventDefault()
    createMutation.mutate()
  }

  const meta = query.data ? paginatedMeta(query.data) : null
  const rows = query.data?.data ?? []
  const hasFilters = Boolean(search || statusFilter || distributorFilter)

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('')
    setDistributorFilter('')
    setPage(1)
  }

  const distributorOptions = (distributorsQuery.data ?? []).map((d) => ({
    value: String(d.id),
    label: `${d.code} — ${distributorLabel(d)}`,
  }))

  return (
    <SalesPageShell
      title="العملاء"
      subtitle="إدارة بيانات العملاء والبحث السريع"
      actions={
        canCreate ? (
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
          >
            <Icon name="person_add" size={18} />
            عميل جديد
          </button>
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
              id: 'distributor',
              label: 'الموزع',
              value: distributorFilter,
              onChange: (value) => {
                setDistributorFilter(value)
                setPage(1)
              },
              options: [{ value: '', label: 'كل الموزعين' }, ...distributorOptions],
            },
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
      {showForm && canCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-md space-y-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-md"
        >
          <h3 className="text-sm font-bold text-on-surface">بيانات العميل — كما في عقد التقسيط</h3>
          <div className="grid gap-sm sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-xs block text-on-surface-variant">السيد *</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full rounded border border-outline-variant px-sm py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-xs block text-on-surface-variant">الرقم القومي</span>
              <input
                value={form.national_id}
                onChange={(e) => setForm({ ...form, national_id: e.target.value })}
                dir="ltr"
                className="w-full rounded border border-outline-variant px-sm py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-xs block text-on-surface-variant">رقم العميل 1 *</span>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
                dir="ltr"
                className="w-full rounded border border-outline-variant px-sm py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-xs block text-on-surface-variant">رقم العميل 2</span>
              <input
                value={form.phone_2}
                onChange={(e) => setForm({ ...form, phone_2: e.target.value })}
                dir="ltr"
                className="w-full rounded border border-outline-variant px-sm py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-xs block text-on-surface-variant">رقم الشريحة</span>
              <input
                value={form.sim_number}
                onChange={(e) => setForm({ ...form, sim_number: e.target.value })}
                dir="ltr"
                className="w-full rounded border border-outline-variant px-sm py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-xs block text-on-surface-variant">اسم المستخدم</span>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                dir="ltr"
                className="w-full rounded border border-outline-variant px-sm py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-xs block text-on-surface-variant">السريال</span>
              <input
                value={form.device_serial}
                onChange={(e) => setForm({ ...form, device_serial: e.target.value })}
                dir="ltr"
                className="w-full rounded border border-outline-variant px-sm py-2"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-xs block text-on-surface-variant">العنوان</span>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full rounded border border-outline-variant px-sm py-2"
              />
            </label>
            <label className="block text-sm sm:col-span-2 lg:col-span-3">
              <span className="mb-xs block text-on-surface-variant">الموزع *</span>
              <select
                value={form.distributor_id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    distributor_id: e.target.value ? Number(e.target.value) : '',
                  })
                }
                required
                className="w-full rounded border border-outline-variant px-sm py-2"
              >
                <option value="">اختر الموزع</option>
                {(distributorsQuery.data ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} — {distributorLabel(d)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {createMutation.isError && (
            <p className="text-sm text-error">{getErrorMessage(createMutation.error)}</p>
          )}
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full rounded-lg bg-secondary py-2 text-sm font-bold text-on-secondary sm:w-auto sm:px-xl"
          >
            حفظ العميل
          </button>
        </form>
      )}

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
              key: 'distributor',
              header: 'الموزع',
              render: (row) => distributorLabel(row.distributor),
            },
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
