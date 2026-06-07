import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Department, GpsProduct, InventoryOverviewRow, PaginatedResponse } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { ChartCard } from '../components/ChartCard'
import { DataTable } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { Icon } from '../components/Icon'
import { InsightBanner } from '../components/InsightBanner'
import { KpiCard } from '../components/KpiCard'
import { PageHeader } from '../components/PageHeader'
import { Pagination } from '../components/Pagination'
import { DonutChartPanel } from '../components/charts/DonutChartPanel'
import { StackedBarChartPanel } from '../components/charts/StackedBarChartPanel'
import {
  computeInventoryBranchStackData,
  computeInventoryDeptDonutData,
  computeInventoryInsights,
  computeInventoryKpis,
  filterInventoryRows,
} from '../lib/pageStats'

const PER_PAGE = 10

export function InventoryPage() {
  const [deptFilter, setDeptFilter] = useState('')
  const [branchSearch, setBranchSearch] = useState('')
  const [rowTypeFilter, setRowTypeFilter] = useState('')
  const [page, setPage] = useState(1)

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
      if (deptFilter) params['filter[department_id]'] = Number(deptFilter)
      const { data } = await api.get<PaginatedResponse<InventoryOverviewRow>>('/inventory/overview', {
        params,
      })
      return data.data
    },
  })

  const filtered = useMemo(
    () => filterInventoryRows(overviewQuery.data ?? [], branchSearch, rowTypeFilter),
    [overviewQuery.data, branchSearch, rowTypeFilter],
  )

  const paginated = useMemo(() => {
    const start = (page - 1) * PER_PAGE
    return filtered.slice(start, start + PER_PAGE)
  }, [filtered, page])

  const lastPage = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const kpis = useMemo(() => computeInventoryKpis(overviewQuery.data ?? []), [overviewQuery.data])
  const stackData = useMemo(() => computeInventoryBranchStackData(overviewQuery.data ?? []), [overviewQuery.data])
  const donutData = useMemo(() => computeInventoryDeptDonutData(overviewQuery.data ?? []), [overviewQuery.data])
  const insights = useMemo(() => computeInventoryInsights(overviewQuery.data ?? []), [overviewQuery.data])

  const hasFilters = Boolean(deptFilter || branchSearch || rowTypeFilter)

  return (
    <div>
      <PageHeader
        title="مخزون GPS"
        subtitle="عرض شامل لكل إدارة وفرع — الكمية المعلقة تظهر قبل التوزيع على الفروع"
      />

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

      <AsyncState
        isLoading={overviewQuery.isLoading || productQuery.isLoading}
        isError={overviewQuery.isError}
        error={overviewQuery.error}
      >
        {overviewQuery.data && (
          <>
            <div className="mb-md grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="إجمالي الكمية" value={kpis.totalQuantity} icon="inventory" />
              <KpiCard label="إجمالي المحجوز" value={kpis.totalReserved} icon="lock" />
              <KpiCard label="إجمالي المباع" value={kpis.totalSold} icon="sell" />
              <KpiCard label="إجمالي المعلق" value={kpis.totalPending} icon="pending" />
            </div>

            <div className="mb-md grid grid-cols-1 gap-md lg:grid-cols-2">
              <ChartCard title="مخزون الفروع" subtitle="الكمية / المحجوز / المباع">
                <StackedBarChartPanel
                  data={stackData}
                  xKey="name"
                  series={[
                    { key: 'quantity', label: 'الكمية', color: 'var(--color-chart-1)' },
                    { key: 'reserved', label: 'المحجوز', color: 'var(--color-chart-3)' },
                    { key: 'sold', label: 'المباع', color: 'var(--color-chart-2)' },
                  ]}
                />
              </ChartCard>
              <ChartCard title="توزيع المخزون بين الإدارات">
                <DonutChartPanel data={donutData} />
              </ChartCard>
            </div>

            {insights.length > 0 && (
              <div className="mb-md space-y-md">
                {insights.map((insight) => (
                  <InsightBanner key={insight.message} message={insight.message} variant={insight.variant} />
                ))}
              </div>
            )}
          </>
        )}
      </AsyncState>

      <FilterBar
        search={branchSearch}
        onSearchChange={(v) => { setBranchSearch(v); setPage(1) }}
        searchPlaceholder="بحث بالفرع أو الإدارة..."
        selects={[
          {
            id: 'department',
            label: 'الإدارة',
            value: deptFilter,
            onChange: (v) => { setDeptFilter(v); setPage(1) },
            options: [
              { value: '', label: 'كل الإدارات' },
              ...(departmentsQuery.data?.map((d) => ({
                value: String(d.id),
                label: d.name_ar || d.name,
              })) ?? []),
            ],
          },
          {
            id: 'rowType',
            label: 'نوع الصف',
            value: rowTypeFilter,
            onChange: (v) => { setRowTypeFilter(v); setPage(1) },
            options: [
              { value: '', label: 'الكل' },
              { value: 'pending', label: 'معلق' },
              { value: 'branch', label: 'موزّع على فرع' },
            ],
          },
        ]}
        showClear={hasFilters}
        onClear={() => { setDeptFilter(''); setBranchSearch(''); setRowTypeFilter(''); setPage(1) }}
      />

      <AsyncState
        isLoading={overviewQuery.isLoading || productQuery.isLoading}
        isError={overviewQuery.isError}
        error={overviewQuery.error}
      >
        <DataTable<InventoryOverviewRow & Record<string, unknown>>
          data={paginated as (InventoryOverviewRow & Record<string, unknown>)[]}
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
                  <span className="font-medium text-tertiary">— (معلق)</span>
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
        <Pagination
          currentPage={page}
          lastPage={lastPage}
          total={filtered.length}
          onPageChange={setPage}
        />
      </AsyncState>
    </div>
  )
}
