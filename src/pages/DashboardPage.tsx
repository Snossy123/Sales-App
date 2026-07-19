import { Link } from 'react-router-dom'
import { useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { DashboardInstallmentSummary, DashboardStats, InventoryOverviewRow, PaginatedResponse, Branch } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { ChartCard } from '../components/ChartCard'
import { CollapsibleSection } from '../components/CollapsibleSection'
import { DataTable, type Column } from '../components/DataTable'
import {
  DashboardPeriodFilter,
  invoicesLabelForPeriod,
  salesLabelForPeriod,
  type DashboardPeriod,
} from '../components/DashboardPeriodFilter'
import { Icon } from '../components/Icon'
import { InsightBanner } from '../components/InsightBanner'
import { KpiCard } from '../components/KpiCard'
import { PageHeader } from '../components/PageHeader'
import { StartTourButton } from '../components/tour/StartTourButton'
import { StatusBadge } from '../components/StatusBadge'
import { usePageTour } from '../hooks/usePageTour'
import { BarChartPanel } from '../components/charts/BarChartPanel'
import { DonutChartPanel } from '../components/charts/DonutChartPanel'
import { StackedBarChartPanel } from '../components/charts/StackedBarChartPanel'
import { CHART_COLORS } from '../lib/chartColors'
import {
  computeDashboardInsights,
  computeDashboardInstallmentDonut,
  computeDashboardStockBarFromOverview,
} from '../lib/pageStats'
import { getUserRole } from '../lib/permissions'
import { canPickBranch, getScopedBranchIds } from '../lib/dataScope'
import { formatMoney } from '../lib/theme'
import { useOrgSettingsStore } from '../stores/orgSettingsStore'
import { useAuthStore } from '../stores/authStore'

function formatDate(value: string, locale = 'ar-EG') {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value))
}

function daysOverdueFromRow(row: DashboardInstallmentSummary): number {
  if (row.days_overdue != null) return row.days_overdue
  const due = new Date(row.due_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)))
}

const quickActions = [
  { to: '/pos', icon: 'point_of_sale', label: 'بيع جديد', roles: ['super_admin', 'admin', 'sales'] },
  { to: '/customers/add', icon: 'group_add', label: 'عميل جديد', roles: ['super_admin', 'admin', 'sales'] },
  { to: '/invoices/review', icon: 'fact_check', label: 'مراجعة التعاقدات', roles: ['super_admin', 'admin', 'reviewer'] },
  { to: '/installments', icon: 'payments', label: 'تحصيل الأقساط', roles: ['super_admin', 'collector'] },
  { to: '/inventory', icon: 'inventory_2', label: 'المخزون', roles: ['super_admin', 'admin', 'sales'] },
]

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-sm text-sm font-bold tracking-wide text-on-surface-variant">{children}</h2>
  )
}

export function DashboardPage() {
  usePageTour('dashboard')
  const user = useAuthStore((s) => s.user)
  const general = useOrgSettingsStore((s) => s.general)
  const currency = general?.currency ?? 'EGP'
  const locale = general?.default_locale === 'en' ? 'en-US' : 'ar-EG'
  const role = getUserRole(user)
  const showReviews = role === 'super_admin' || role === 'admin' || role === 'reviewer'
  const userCanPickBranch = canPickBranch(user)
  const fmtMoney = (value: number) => formatMoney(value, currency, locale)
  const fmtDate = (value: string) => formatDate(value, locale)
  const visibleActions = quickActions.filter((a) => a.roles.includes(role))

  const [period, setPeriod] = useState<DashboardPeriod>('day')
  const [branchFilter, setBranchFilter] = useState<number | ''>('')
  const [overdueOpen, setOverdueOpen] = useState(true)
  const showInventoryCharts = role === 'super_admin' || role === 'admin'

  const branchesQuery = useQuery({
    queryKey: ['branches', 'dashboard-filter', user?.id],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', {
        params: { per_page: 100, 'filter[is_active]': 1 },
      })
      return data.data
    },
    enabled: Boolean(user),
  })

  const branchOptions = useMemo(() => {
    const branches = branchesQuery.data ?? []
    const scopedIds = getScopedBranchIds(user, branches)
    if (!scopedIds) return branches
    return branches.filter((branch) => scopedIds.includes(branch.id))
  }, [branchesQuery.data, user])

  const showBranchFilter = branchOptions.length > 1 || userCanPickBranch

  const query = useQuery({
    queryKey: ['dashboard', period, branchFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { period }
      if (branchFilter !== '') params.branch_id = branchFilter
      const { data } = await api.get<DashboardStats>('/dashboard', { params })
      return data
    },
  })

  const inventoryOverviewQuery = useQuery({
    queryKey: ['inventory', 'overview', 'dashboard'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<InventoryOverviewRow>>('/inventory/overview', {
        params: { per_page: 100 },
      })
      return data.data
    },
    enabled: showInventoryCharts,
  })

  const stockBarData = useMemo(
    () => computeDashboardStockBarFromOverview(inventoryOverviewQuery.data ?? []),
    [inventoryOverviewQuery.data],
  )

  const installmentDonut = useMemo(
    () => (query.data ? computeDashboardInstallmentDonut(query.data) : []),
    [query.data],
  )

  const paymentTermChart = useMemo(
    () =>
      (query.data?.sales_by_payment_term ?? []).map((row) => ({
        label: row.label,
        cash: row.cash,
        installment: row.installment,
      })),
    [query.data?.sales_by_payment_term],
  )

  const sourceDonut = useMemo(
    () =>
      (query.data?.sales_by_source ?? [])
        .filter((row) => row.amount > 0)
        .map((row, i) => ({
          label: row.label,
          value: row.amount,
          color: CHART_COLORS[i % CHART_COLORS.length],
        })),
    [query.data?.sales_by_source],
  )

  const last3Months = query.data?.last_3_months ?? []
  const prev = query.data?.previous_period

  const formatChangeTrend = (change: number | null | undefined) => {
    if (change == null) return undefined
    const sign = change > 0 ? '+' : ''
    return `${sign}${change}% عن الفترة السابقة`
  }

  const insights = useMemo(
    () => (query.data ? computeDashboardInsights(query.data, showReviews) : []),
    [query.data, showReviews],
  )

  const overdueList = query.data?.overdue_installments_list ?? []
  const hasOverdue = (query.data?.overdue_installments ?? 0) > 0

  const overdueColumns = useMemo(
    () =>
      [
        {
          key: 'customer_name',
          header: 'العميل',
          render: (row: Record<string, unknown>) => {
            const inv = row.sales_invoice as { customer?: { name?: string } } | undefined
            return String(row.customer_name ?? inv?.customer?.name ?? '—')
          },
        },
        {
          key: 'amount',
          header: 'قيمة القسط',
          render: (row: Record<string, unknown>) => fmtMoney(Number(row.amount)),
        },
        {
          key: 'installment_count',
          header: 'عدد الأقساط',
          render: (row: Record<string, unknown>) =>
            row.installment_count != null ? String(row.installment_count) : '—',
        },
        {
          key: 'remaining',
          header: 'المتبقي',
          render: (row: Record<string, unknown>) => {
            const remaining =
              row.remaining ?? Number(row.amount) - Number(row.paid_amount ?? 0)
            return fmtMoney(Number(remaining))
          },
        },
        {
          key: 'status',
          header: 'الحالة',
          render: () => <StatusBadge status="overdue" />,
        },
        {
          key: 'due_date',
          header: 'تاريخ الاستحقاق',
          render: (row: Record<string, unknown>) => fmtDate(String(row.due_date)),
        },
        {
          key: 'days_overdue',
          header: 'أيام من الاستحقاق',
          render: (row: Record<string, unknown>) => {
            const days = daysOverdueFromRow(row as unknown as DashboardInstallmentSummary)
            return (
              <span className="font-medium tabular-nums text-error">{days} يوم</span>
            )
          },
        },
      ] satisfies Column<Record<string, unknown>>[],
    [fmtMoney, fmtDate],
  )

  const todayLabel = new Intl.DateTimeFormat('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  return (
    <div>
      <PageHeader
        title="لوحة التحكم"
        subtitle={`${todayLabel} — نظرة عامة على المبيعات والمخزون والأقساط`}
        actions={<StartTourButton tourId="dashboard" />}
      />

      {visibleActions.length > 0 && (
        <div
          data-tour="dashboard-quick-actions"
          className="mb-md grid grid-cols-2 gap-sm sm:grid-cols-3 lg:grid-cols-5"
        >
          {visibleActions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="flex items-center gap-sm rounded-xl border border-outline-variant bg-surface-container-lowest px-sm py-sm text-sm font-medium text-on-surface transition-colors hover:border-primary/30 hover:bg-primary/5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon name={action.icon} size={20} className="no-flip" />
              </div>
              {action.label}
            </Link>
          ))}
        </div>
      )}

      <DashboardPeriodFilter
        value={period}
        onChange={setPeriod}
        branchValue={branchFilter}
        onBranchChange={setBranchFilter}
        branches={branchOptions}
        showBranchFilter={showBranchFilter && branchOptions.length > 0}
      />

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {query.data && (
          <>
            {insights.length > 0 && (
              <div className="mb-md space-y-sm">
                {insights.map((insight) => (
                  <InsightBanner
                    key={insight.message}
                    message={insight.message}
                    variant={insight.variant}
                    to={insight.to}
                  />
                ))}
              </div>
            )}

            {hasOverdue && (
              <section
                data-tour="dashboard-overdue"
                className="mb-md overflow-hidden rounded-xl border border-error/30 bg-error/5"
              >
                <div className="flex flex-wrap items-center justify-between gap-sm p-md pb-0">
                  <button
                    type="button"
                    onClick={() => setOverdueOpen((v) => !v)}
                    className="flex flex-1 items-center gap-sm text-start"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-error/15 text-error">
                      <Icon name="warning" size={22} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-xs">
                        <h2 className="text-base font-bold text-on-surface">الأقساط المتأخرة في السداد</h2>
                        <Icon
                          name="expand_more"
                          size={22}
                          className={`text-on-surface-variant transition-transform ${overdueOpen ? 'rotate-180' : ''}`}
                        />
                      </div>
                      <p className="text-xs text-on-surface-variant">
                        {query.data.overdue_installments} قسط تجاوز تاريخ الاستحقاق
                      </p>
                    </div>
                  </button>
                  <Link
                    to="/installments"
                    className="shrink-0 rounded-lg bg-error px-md py-sm text-sm font-bold text-on-error hover:opacity-90"
                  >
                    متابعة التحصيل
                  </Link>
                </div>

                {overdueOpen && (
                  <div className="p-md pt-sm">
                    <DataTable
                      data={overdueList as unknown as Record<string, unknown>[]}
                      keyExtractor={(row) => Number(row.id)}
                      pageSize={10}
                      columns={overdueColumns}
                      emptyMessage="لا توجد أقساط متأخرة"
                    />
                  </div>
                )}
              </section>
            )}

            <SectionTitle>المخزون والمبيعات</SectionTitle>
            <div
              data-tour="dashboard-kpis"
              className="mb-md grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4"
            >
              <KpiCard label="مخزون GPS المتاح" value={query.data.available_units} icon="gps_fixed" />
              <KpiCard
                label={salesLabelForPeriod(period)}
                value={fmtMoney(query.data.sales_today)}
                icon="payments"
                trend={formatChangeTrend(prev?.sales_change_percent)}
                trendUp={(prev?.sales_change_percent ?? 0) >= 0}
              />
              <KpiCard
                label={invoicesLabelForPeriod(period)}
                value={query.data.invoices_today}
                icon="receipt_long"
                trend={formatChangeTrend(prev?.invoices_change_percent)}
                trendUp={(prev?.invoices_change_percent ?? 0) >= 0}
              />
              <KpiCard label="إجمالي العملاء" value={query.data.customers_count} icon="group" />
            </div>

            <SectionTitle>الأقساط والتحصيل</SectionTitle>
            <div className="mb-md grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
              {showReviews && (
                <KpiCard
                  label="تعاقدات بانتظار المراجعة"
                  value={query.data.pending_reviews ?? 0}
                  icon="fact_check"
                  trend={(query.data.pending_reviews ?? 0) > 0 ? 'تحتاج مراجعة' : undefined}
                  trendUp={false}
                  alert={(query.data.pending_reviews ?? 0) > 0}
                />
              )}
              <KpiCard
                label="أقساط متأخرة"
                value={query.data.overdue_installments}
                icon="warning"
                trend={query.data.overdue_installments > 0 ? 'يتطلب متابعة' : undefined}
                trendUp={false}
              />
              <KpiCard label="مستحقة هذا الأسبوع" value={query.data.due_this_week} icon="event" />
              <KpiCard
                label="رصيد مستحق"
                value={fmtMoney(query.data.outstanding_balance)}
                icon="account_balance"
              />
            </div>

            <CollapsibleSection
              title="التحليلات والرسوم البيانية"
              summary={
                stockBarData.length > 0
                  ? `${stockBarData.length} إدارة`
                  : 'ملخص الأقساط والتعاقدات'
              }
              defaultOpen
            >
              <div
                data-tour="dashboard-charts"
                className="mb-md grid grid-cols-1 gap-md xl:grid-cols-3"
              >
                {showInventoryCharts && (
                  <ChartCard title="مخزون الإدارات" subtitle="إجمالي ومعلق" className="xl:col-span-1">
                    <BarChartPanel
                      data={stockBarData}
                      xKey="name"
                      series={[
                        { key: 'quantity', label: 'إجمالي', color: 'var(--color-chart-1)' },
                        { key: 'pending', label: 'معلق', color: 'var(--color-chart-3)' },
                      ]}
                    />
                  </ChartCard>
                )}

                {installmentDonut.length > 0 && (
                  <ChartCard title="ملخص الأقساط" subtitle="حسب الحالة" className="xl:col-span-1">
                    <DonutChartPanel data={installmentDonut} />
                  </ChartCard>
                )}

                {sourceDonut.length > 0 && (
                  <ChartCard title="المبيعات حسب المصدر" subtitle="مصدر اكتساب العميل" className="xl:col-span-1">
                    <DonutChartPanel data={sourceDonut} />
                  </ChartCard>
                )}

                {paymentTermChart.length > 0 && (
                  <ChartCard
                    title="كاش مقابل تقسيط"
                    subtitle="آخر 6 أشهر"
                    className="xl:col-span-2"
                  >
                    <StackedBarChartPanel
                      data={paymentTermChart}
                      xKey="label"
                      series={[
                        { key: 'cash', label: 'كاش', color: CHART_COLORS[0] },
                        { key: 'installment', label: 'تقسيط', color: CHART_COLORS[2] },
                      ]}
                      height={220}
                    />
                  </ChartCard>
                )}

                {last3Months.length > 0 && (
                  <ChartCard title="آخر 3 أشهر" subtitle="مبيعات · تعاقدات · تحصيل" className="xl:col-span-1">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-outline-variant text-xs text-on-surface-variant">
                            <th className="px-xs py-sm text-start font-medium">الشهر</th>
                            <th className="px-xs py-sm text-start font-medium">المبيعات</th>
                            <th className="px-xs py-sm text-start font-medium">تعاقدات</th>
                            <th className="px-xs py-sm text-start font-medium">تحصيل</th>
                          </tr>
                        </thead>
                        <tbody>
                          {last3Months.map((row) => (
                            <tr key={row.month} className="border-b border-outline-variant/60 last:border-0">
                              <td className="px-xs py-sm font-medium text-on-surface">{row.label}</td>
                              <td className="px-xs py-sm tabular-nums text-on-surface">
                                {fmtMoney(row.sales)}
                              </td>
                              <td className="px-xs py-sm tabular-nums text-on-surface">
                                {row.invoices_count}
                              </td>
                              <td className="px-xs py-sm tabular-nums text-on-surface">
                                {fmtMoney(row.collections)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ChartCard>
                )}

                <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md xl:col-span-1">
                  <div className="mb-sm flex items-center justify-between">
                    <h3 className="text-sm font-bold text-on-surface">تعاقدات بانتظار المراجعة</h3>
                    {showReviews && (query.data.pending_reviews ?? 0) > 0 && (
                      <Link to="/invoices/review" className="text-xs font-medium text-error hover:underline">
                        عرض الكل
                      </Link>
                    )}
                  </div>
                  {(query.data.pending_review_invoices ?? []).length > 0 ? (
                    <div className="flex flex-col gap-xs">
                      {query.data.pending_review_invoices!.map((inv) => (
                        <Link
                          key={inv.id}
                          to={`/invoices/review/${inv.id}`}
                          className="flex items-center justify-between rounded-lg border-s-2 border-error bg-surface-container-low px-sm py-xs text-sm transition-colors hover:bg-surface-container"
                        >
                          <div>
                            <p className="font-medium text-on-surface">{inv.customer?.name ?? '—'}</p>
                            <p className="text-xs text-on-surface-variant">
                              {inv.lines?.length ?? 0} جهاز
                            </p>
                          </div>
                          <span className="tabular-nums font-medium text-on-surface">
                            {fmtMoney(Number(inv.total))}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="py-md text-center text-sm text-on-surface-variant">لا توجد تعاقدات معلقة</p>
                  )}
                </div>
              </div>
            </CollapsibleSection>

            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
              <div className="mb-sm flex items-center justify-between">
                <h3 className="text-sm font-bold text-on-surface">آخر الفواتير</h3>
                <Link to="/invoices" className="text-xs font-medium text-primary hover:underline">
                  عرض الكل
                </Link>
              </div>
              <DataTable<Record<string, unknown>>
                data={(query.data.recent_invoices ?? []) as unknown as Record<string, unknown>[]}
                keyExtractor={(row) => Number(row.id)}
                pageSize={10}
                columns={[
                  {
                    key: 'invoice_number',
                    header: 'الفاتورة',
                    render: (row) => String(row.invoice_number ?? '—'),
                  },
                  {
                    key: 'customer',
                    header: 'العميل',
                    render: (row) =>
                      (row.customer as { name?: string } | undefined)?.name ?? '—',
                  },
                  {
                    key: 'total',
                    header: 'الإجمالي',
                    render: (row) => fmtMoney(Number(row.total)),
                  },
                  {
                    key: 'status',
                    header: 'الحالة',
                    render: (row) => <StatusBadge status={String(row.status)} />,
                  },
                ]}
                emptyMessage="لا توجد فواتير"
              />
            </div>
          </>
        )}
      </AsyncState>
    </div>
  )
}
