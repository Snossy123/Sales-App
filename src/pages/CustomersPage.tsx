import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Customer, PaginatedResponse } from '../api/types'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { AsyncState } from '../components/AsyncState'
import { Icon } from '../components/Icon'

export function CustomersPage() {
  const [search, setSearch] = useState('')

  const query = useQuery({
    queryKey: ['customers', search],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 50 }
      if (search) params['filter[name]'] = search

      const { data } = await api.get<PaginatedResponse<Customer>>('/customers', {
        params,
      })
      return data
    },
  })

  return (
    <div>
      <h1 className="mb-md text-2xl font-bold text-on-surface">العملاء</h1>

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
