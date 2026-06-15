import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Department, GpsProduct, InventoryOverviewRow, PaginatedResponse } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { ChartCard } from '../components/ChartCard'
import { CollapsibleSection } from '../components/CollapsibleSection'
import { DataTable } from '../components/DataTable'
import { DistributeStockModal } from '../components/DistributeStockModal'
import { FilterBar } from '../components/FilterBar'
import { GpsProductCard } from '../components/GpsProductCard'
import { Icon } from '../components/Icon'
import { InsightBanner } from '../components/InsightBanner'
import { KpiCard } from '../components/KpiCard'
import { PageHeader } from '../components/PageHeader'
import { Pagination } from '../components/Pagination'
import { ToastBanner } from '../components/ToastBanner'
import { DonutChartPanel } from '../components/charts/DonutChartPanel'
import { StackedBarChartPanel } from '../components/charts/StackedBarChartPanel'
import { getUserRole } from '../lib/permissions'
import {
  computeInventoryBranchStackData,
  computeInventoryDeptDonutData,
  computeInventoryInsights,
  computeInventoryKpis,
  filterInventoryRows,
} from '../lib/pageStats'
import { useAuthStore } from '../stores/authStore'

const PER_PAGE = 10

export function InventoryPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const role = getUserRole(user)
  const isAdmin = role === 'super_admin' || role === 'admin'
  const [deptFilter, setDeptFilter] = useState('')
  const [branchSearch, setBranchSearch] = useState('')
  const [rowTypeFilter, setRowTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [distributeOpen, setDistributeOpen] = useState(false)
  const [distributeDeptId, setDistributeDeptId] = useState<number | undefined>()
  const [successToast, setSuccessToast] = useState('')

  useEffect(() => {
    const state = location.state as { stockAdded?: boolean } | null
    if (state?.stockAdded) {
      setSuccessToast('تم تسجيل المخزون بنجاح — يمكنك الآن توزيعه على الفروع')
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.pathname, location.state, navigate])

  const productQuery = useQuery({
    queryKey: ['gps-product'],
    queryFn: async () => {
      const { data } = await api.get<GpsProduct>('/gps-product')
      return data
    },
  })

  const departmentsQuery = useQuery({
    queryKey: ['departments', 'inventory'],
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
  const kpis = useMemo(() => computeInventoryKpis(filtered), [filtered])
  const stackData = useMemo(() => computeInventoryBranchStackData(filtered), [filtered])
  const donutData = useMemo(() => computeInventoryDeptDonutData(filtered), [filtered])
  const insights = useMemo(() => computeInventoryInsights(filtered), [filtered])
  const hasFilters = Boolean(deptFilter || branchSearch || rowTypeFilter)

  const analyticsSummary = hasFilters
    ? `${filtered.length} نتيجة`
    : '4 مؤشرات'

  const openDistribute = (departmentId: number) => {
    setDistributeDeptId(departmentId)
    setDistributeOpen(true)
  }

  const closeDistribute = () => {
    setDistributeOpen(false)
    setDistributeDeptId(undefined)
  }

  return (
    <div>
      <PageHeader
        title="مخزون GPS"
        subtitle="عرض شامل لكل إدارة وفرع — الكمية المعلقة تظهر قبل التوزيع على الفروع"
        actions={
          isAdmin ? (
            <Link
              to="/inventory/add"
              className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
            >
              <Icon name="add" size={18} />
              تسجيل مخزون جديد
            </Link>
          ) : undefined
        }
      />

      {productQuery.data && (
        <GpsProductCard product={productQuery.data} canEditPrice={isAdmin} />
      )}

      {successToast && (
        <ToastBanner message={successToast} onDismiss={() => setSuccessToast('')} />
      )}

      <CollapsibleSection
        title="التحليلات والرسوم البيانية"
        summary={analyticsSummary}
        isLoading={overviewQuery.isLoading}
      >
        {!overviewQuery.isLoading && overviewQuery.data && (
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
              <div className="space-y-md">
                {insights.map((insight) => (
                  <InsightBanner key={insight.message} message={insight.message} variant={insight.variant} />
                ))}
              </div>
            )}
          </>
        )}
      </CollapsibleSection>

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
          emptyMessage={hasFilters ? 'لا توجد نتائج مطابقة للفلاتر' : 'لا توجد بيانات'}
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
              key: 'available',
              header: 'المتاح',
              className: 'tabular-nums font-medium',
              render: (row) =>
                row.row_type === 'department_pending'
                  ? row.quantity
                  : row.quantity - row.reserved,
            },
            {
              key: 'sold',
              header: 'المباع',
              className: 'tabular-nums',
              render: (row) =>
                row.row_type === 'department_pending' ? '—' : row.sold,
            },
            {
              key: 'actions',
              header: 'إجراءات',
              render: (row) => {
                if (row.row_type === 'department_pending' && isAdmin) {
                  return (
                    <button
                      type="button"
                      onClick={() => openDistribute(row.department_id as number)}
                      className="text-sm text-primary hover:underline"
                    >
                      توزيع
                    </button>
                  )
                }
                if (row.row_type === 'branch') {
                  const deptId = row.department_id as number
                  return (
                    <Link
                      to={`/branches?department=${deptId}`}
                      className="text-sm text-primary hover:underline"
                    >
                      عرض الفروع
                    </Link>
                  )
                }
                return '—'
              },
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

      <DistributeStockModal
        open={distributeOpen}
        onClose={closeDistribute}
        departments={departmentsQuery.data ?? []}
        initialDepartmentId={distributeDeptId}
        onSuccess={() => setSuccessToast('تم التوزيع على الفرع')}
      />
    </div>
  )
}
