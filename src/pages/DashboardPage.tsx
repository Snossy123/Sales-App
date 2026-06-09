import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { DashboardStats, Department, PaginatedResponse } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { ChartCard } from '../components/ChartCard'
import { InsightBanner } from '../components/InsightBanner'
import { KpiCard } from '../components/KpiCard'
import { PageHeader } from '../components/PageHeader'
import { BarChartPanel } from '../components/charts/BarChartPanel'
import { DonutChartPanel } from '../components/charts/DonutChartPanel'
import {
  computeDashboardInsights,
  computeDashboardInstallmentDonut,
  computeDashboardStockBarData,
} from '../lib/pageStats'
import { getUserRole } from '../lib/permissions'
import { useAuthStore } from '../stores/authStore'

function formatMoney(value: number) {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(value)
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const role = getUserRole(user)
  const showReviews = role === 'super_admin' || role === 'admin' || role === 'reviewer'

  const query = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get<DashboardStats>('/dashboard')
      return data
    },
  })

  const departmentsQuery = useQuery({
    queryKey: ['departments', 'dashboard'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Department>>('/departments', {
        params: { per_page: 100 },
      })
      return data.data
    },
  })

  const stockBarData = useMemo(
    () => computeDashboardStockBarData(departmentsQuery.data ?? []),
    [departmentsQuery.data],
  )

  const installmentDonut = useMemo(
    () => (query.data ? computeDashboardInstallmentDonut(query.data) : []),
    [query.data],
  )

  const insights = useMemo(
    () =>
      query.data
        ? computeDashboardInsights(query.data, showReviews)
        : [],
    [query.data, showReviews],
  )

  return (
    <div>
      <PageHeader
        title="لوحة التحكم"
        subtitle="نظرة عامة على مخزون GPS والمبيعات والأقساط"
      />

      <AsyncState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
      >
        {query.data && (
          <>
            <div className="mb-md grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="مخزون GPS المتاح"
                value={query.data.available_units}
                icon="gps_fixed"
              />
              {showReviews && (
                <KpiCard
                  label="فواتير بانتظار المراجعة"
                  value={query.data.pending_reviews ?? 0}
                  icon="fact_check"
                />
              )}
              <KpiCard
                label="مبيعات اليوم"
                value={formatMoney(query.data.sales_today)}
                icon="payments"
              />
              <KpiCard
                label="فواتير اليوم"
                value={query.data.invoices_today}
                icon="receipt_long"
              />
              <KpiCard
                label="إجمالي العملاء"
                value={query.data.customers_count}
                icon="group"
              />
              <KpiCard
                label="أقساط متأخرة"
                value={query.data.overdue_installments}
                icon="warning"
              />
              <KpiCard
                label="مستحقة هذا الأسبوع"
                value={query.data.due_this_week}
                icon="event"
              />
              <KpiCard
                label="رصيد مستحق"
                value={formatMoney(query.data.outstanding_balance)}
                icon="account_balance"
              />
            </div>

            <div className="mb-md grid grid-cols-1 gap-md lg:grid-cols-2">
              <ChartCard title="مخزون الإدارات" subtitle="إجمالي ومعلق">
                <BarChartPanel
                  data={stockBarData}
                  xKey="name"
                  series={[
                    { key: 'quantity', label: 'إجمالي', color: 'var(--color-chart-1)' },
                    { key: 'pending', label: 'معلق', color: 'var(--color-chart-3)' },
                  ]}
                />
              </ChartCard>
              <ChartCard title="ملخص الأقساط" subtitle="متأخرة / مستحقة / رصيد">
                <DonutChartPanel data={installmentDonut} />
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
      </AsyncState>
    </div>
  )
}
