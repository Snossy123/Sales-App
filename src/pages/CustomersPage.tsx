import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { Customer, PaginatedResponse } from '../api/types'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { AsyncState } from '../components/AsyncState'
import { Icon } from '../components/Icon'
import { useAuthStore } from '../stores/authStore'
import { getUserRole } from '../lib/permissions'

export function CustomersPage() {
  const queryClient = useQueryClient()
  const branchId = useAuthStore((s) => s.branchId)
  const user = useAuthStore((s) => s.user)
  const canCreate = ['admin', 'sales'].includes(getUserRole(user))
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', national_id: '', address: '' })

  const query = useQuery({
    queryKey: ['customers', search, branchId],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 50 }
      if (search) params['filter[name]'] = search
      if (branchId) params['filter[branch_id]'] = branchId

      const { data } = await api.get<PaginatedResponse<Customer>>('/customers', { params })
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<Customer>('/customers', {
        ...form,
        branch_id: branchId,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setForm({ name: '', phone: '', national_id: '', address: '' })
      setShowForm(false)
    },
  })

  const handleCreate = (e: FormEvent) => {
    e.preventDefault()
    createMutation.mutate()
  }

  return (
    <div>
      <div className="mb-md flex flex-wrap items-center justify-between gap-sm">
        <h1 className="text-2xl font-bold text-on-surface">العملاء</h1>
        {canCreate && (
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
          >
            <Icon name="person_add" size={18} />
            عميل جديد
          </button>
        )}
      </div>

      {showForm && canCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-md grid gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-md sm:grid-cols-2"
        >
          <input
            placeholder="الاسم"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="rounded border border-outline-variant px-sm py-2 text-sm"
          />
          <input
            placeholder="الهاتف"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
            dir="ltr"
            className="rounded border border-outline-variant px-sm py-2 text-sm"
          />
          <input
            placeholder="الرقم القومي"
            value={form.national_id}
            onChange={(e) => setForm({ ...form, national_id: e.target.value })}
            dir="ltr"
            className="rounded border border-outline-variant px-sm py-2 text-sm"
          />
          <input
            placeholder="العنوان"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
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
            حفظ العميل
          </button>
        </form>
      )}

      <div className="mb-md">
        <input
          type="search"
          placeholder="بحث بالاسم"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[240px] rounded border border-outline-variant px-sm py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      <AsyncState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
      >
        <DataTable<Customer & Record<string, unknown>>
          data={(query.data?.data ?? []) as (Customer & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
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
      </AsyncState>
    </div>
  )
}
