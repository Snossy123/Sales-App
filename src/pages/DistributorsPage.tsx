import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { Distributor } from '../api/types'
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
  distributorLabel,
  distributorStatusOptions,
  paginatedMeta,
} from '../lib/sales'
import { getUserRole } from '../lib/permissions'
import { useAuthStore } from '../stores/authStore'

const emptyForm = {
  code: '',
  name: '',
  name_ar: '',
  phone: '',
}

export function DistributorsPage() {
  const queryClient = useQueryClient()
  const branchId = useAuthStore((s) => s.branchId)
  const user = useAuthStore((s) => s.user)
  const canCreate = ['super_admin', 'admin', 'sales'].includes(getUserRole(user))
  const [search, setSearch] = useState('')
  const [codeSearch, setCodeSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const debouncedSearch = useDebouncedValue(search, 300)
  const debouncedCode = useDebouncedValue(codeSearch, 300)

  const query = useQuery({
    queryKey: ['distributors', debouncedSearch, debouncedCode, statusFilter, branchId, page],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 25,
        page,
        include: 'branch',
      }
      if (debouncedSearch) params['filter[name]'] = debouncedSearch
      if (debouncedCode) params['filter[code]'] = debouncedCode
      if (statusFilter) params['filter[status]'] = statusFilter
      if (branchId) params['filter[branch_id]'] = branchId

      const { data } = await api.get<ApiPaginated<Distributor>>('/distributors', { params })
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<Distributor>('/distributors', {
        ...form,
        branch_id: branchId,
        status: 'active',
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distributors'] })
      setForm(emptyForm)
      setShowForm(false)
    },
  })

  const handleCreate = (e: FormEvent) => {
    e.preventDefault()
    if (!branchId) return
    createMutation.mutate()
  }

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
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            disabled={!branchId}
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary disabled:opacity-50"
          >
            <Icon name="person_add" size={18} />
            موزع جديد
          </button>
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
      {!branchId && (
        <p className="mb-md text-sm text-on-surface-variant">يرجى اختيار فرع لعرض الموزعين.</p>
      )}

      {showForm && canCreate && branchId && (
        <form
          onSubmit={handleCreate}
          className="mb-md grid gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-md sm:grid-cols-2"
        >
          <input
            placeholder="كود الموزع *"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
            dir="ltr"
            className="rounded border border-outline-variant px-sm py-2 text-sm"
          />
          <input
            placeholder="الاسم بالعربية"
            value={form.name_ar}
            onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
            className="rounded border border-outline-variant px-sm py-2 text-sm"
          />
          <input
            placeholder="الاسم (إنجليزي)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="rounded border border-outline-variant px-sm py-2 text-sm"
          />
          <input
            placeholder="الهاتف"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            dir="ltr"
            className="rounded border border-outline-variant px-sm py-2 text-sm"
          />
          {createMutation.isError && (
            <p className="text-sm text-error sm:col-span-2">
              {getErrorMessage(createMutation.error)}
            </p>
          )}
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-lg bg-secondary py-2 text-sm font-bold text-on-secondary sm:col-span-2"
          >
            حفظ الموزع
          </button>
        </form>
      )}

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
              render: (row) => distributorLabel(row),
            },
            {
              key: 'branch',
              header: 'الفرع',
              render: (row) => row.branch?.name_ar ?? row.branch?.name ?? '—',
            },
            {
              key: 'phone',
              header: 'الهاتف',
              className: 'tabular-nums',
              render: (row) => row.phone ?? '—',
            },
            {
              key: 'customers_count',
              header: 'العملاء',
              render: (row) => row.customers_count ?? 0,
            },
            {
              key: 'sales_invoices_count',
              header: 'الفواتير',
              render: (row) => row.sales_invoices_count ?? 0,
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
                <Link
                  to={`/distributors/${row.id}`}
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
