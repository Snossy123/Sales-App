import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Department, GpsProduct, InventoryOverviewRow, PaginatedResponse } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { Icon } from '../components/Icon'

export function InventoryPage() {
  const [deptFilter, setDeptFilter] = useState<number | ''>('')

  const productQuery = useQuery({
    queryKey: ['gps-product'],
    queryFn: async () => {
      const { data } = await api.get<GpsProduct>('/gps-product')
      return data
    },
  })

  const departmentsQuery = useQuery({
    queryKey: ['departments', 'filter'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Department>>('/departments', {
        params: { per_page: 100 },
      })
      return data.data
    },
  })

  const overviewQuery = useQuery({
    queryKey: ['inventory', 'overview', deptFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 100 }
      if (deptFilter) params['filter[department_id]'] = deptFilter
      const { data } = await api.get<PaginatedResponse<InventoryOverviewRow>>('/inventory/overview', {
        params,
      })
      return data.data
    },
  })

  return (
    <div>
      <h1 className="mb-md text-2xl font-bold text-on-surface">مخزون GPS</h1>
      <p className="mb-md text-sm text-on-surface-variant">
        عرض شامل لكل إدارة وفرع — الكمية المعلقة تظهر قبل التوزيع على الفروع
      </p>

      {productQuery.data && (
        <div className="mb-md flex flex-wrap items-center gap-md rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name="gps_fixed" size={28} />
          </div>
          <div>
            <p className="font-bold text-on-surface">
              {productQuery.data.name_ar || productQuery.data.name}
            </p>
            <p className="text-sm text-on-surface-variant">
              {productQuery.data.brand} — {productQuery.data.model_code} — سعر البيع:{' '}
              {Number(productQuery.data.sell_price).toLocaleString('ar-EG')} ج.م
            </p>
          </div>
        </div>
      )}

      <div className="mb-md">
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value ? Number(e.target.value) : '')}
          className="rounded border border-outline-variant px-sm py-2 text-sm"
        >
          <option value="">كل الإدارات</option>
          {departmentsQuery.data?.map((d) => (
            <option key={d.id} value={d.id}>{d.name_ar || d.name}</option>
          ))}
        </select>
      </div>

      <AsyncState
        isLoading={overviewQuery.isLoading || productQuery.isLoading}
        isError={overviewQuery.isError}
        error={overviewQuery.error}
      >
        <DataTable<InventoryOverviewRow & Record<string, unknown>>
          data={(overviewQuery.data ?? []) as (InventoryOverviewRow & Record<string, unknown>)[]}
          keyExtractor={(row) =>
            row.row_type === 'department_pending'
              ? `pending-${row.department_id}`
              : `branch-${row.branch_id}`
          }
          columns={[
            { key: 'department_name_ar', header: 'الإدارة' },
            {
              key: 'branch_name_ar',
              header: 'الفرع',
              render: (row) =>
                row.row_type === 'department_pending' ? (
                  <span className="text-[#653e00]">— (معلق)</span>
                ) : (
                  (row.branch_name_ar as string) || '—'
                ),
            },
            {
              key: 'quantity',
              header: 'الكمية',
              className: 'tabular-nums font-medium',
              render: (row) => row.quantity,
            },
            {
              key: 'reserved',
              header: 'المحجوز',
              className: 'tabular-nums',
              render: (row) =>
                row.row_type === 'department_pending' ? '—' : row.reserved,
            },
            {
              key: 'sold',
              header: 'المباع',
              className: 'tabular-nums',
              render: (row) =>
                row.row_type === 'department_pending' ? '—' : row.sold,
            },
          ]}
        />
      </AsyncState>
    </div>
  )
}
