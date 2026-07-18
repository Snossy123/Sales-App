import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type { CeoDashboard } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { ChartCard } from '../../../components/ChartCard'
import {
  DashboardPeriodFilter,
  type DashboardPeriod,
} from '../../../components/DashboardPeriodFilter'
import { Icon } from '../../../components/Icon'
import { KpiCard } from '../../../components/KpiCard'
import { PageHeader } from '../../../components/PageHeader'
import { BarChartPanel } from '../../../components/charts/BarChartPanel'
import { CHART_COLORS } from '../../../lib/chartColors'
import { formatMoney } from '../../../lib/theme'
import { useOrgSettingsStore } from '../../../stores/orgSettingsStore'

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: 'جديد',
  contacted: 'تم التواصل',
  negotiation: 'تفاوض',
  qualified: 'انتظار التعاقد',
  won: 'تم التعاقد',
  lost: 'غير مهتم',
}

const SUPPORT_STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  assigned: 'مُسند',
  in_progress: 'جارٍ التنفيذ',
  completed: 'مكتمل',
  cancelled: 'ملغى',
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function CrmCeoDashboardPage() {
  const general = useOrgSettingsStore((s) => s.general)
  const currency = general?.currency ?? 'EGP'
  const locale = general?.default_locale === 'en' ? 'en-US' : 'ar-EG'
  const fmtMoney = (value: number) => formatMoney(value, currency, locale)

  const [period, setPeriod] = useState<DashboardPeriod>('month')
  const apiPeriod = period === 'all' ? 'month' : period

  const query = useQuery({
    queryKey: ['crm-ceo-dashboard', apiPeriod],
    queryFn: async () => {
      const { data } = await api.get<CeoDashboard>('/crm/ceo/dashboard', {
        params: { period: apiPeriod },
      })
      return data
    },
    refetchInterval: 45_000,
  })

  const chartData = useMemo(
    () => (query.data?.sales_chart ?? []).map((row) => ({ label: row.label, amount: row.amount })),
    [query.data?.sales_chart],
  )

  const target = query.data?.target_achievement
  const targetPercent = target?.percent ?? 0

  return (
    <div className="space-y-md">
      <PageHeader
        title="لوحة المدير"
        subtitle="نظرة تنفيذية على المبيعات والتارجت والعملاء والتركيبات وأداء الفريق"
      />

      <DashboardPeriodFilter value={period === 'all' ? 'month' : period} onChange={setPeriod} />

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {query.data && (
          <div className="space-y-lg">
            <section className="grid gap-md sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="إجمالي المبيعات"
                value={fmtMoney(query.data.total_sales)}
                icon="payments"
              />
              <KpiCard
                label="نسبة تحقيق التارجت"
                value={`${targetPercent}%`}
                icon="track_changes"
                trend={
                  target
                    ? `${target.achieved_count} / ${target.target_count} تعاقد`
                    : undefined
                }
                trendUp={targetPercent >= 50}
              />
              <KpiCard
                label="العملاء الساخنين"
                value={query.data.hot_leads.length}
                icon="local_fire_department"
              />
              <KpiCard
                label="التركيبات اليوم"
                value={query.data.installations_today.count}
                icon="handyman"
                alert={query.data.installations_today.count === 0}
              />
            </section>

            {target && target.target_count > 0 && (
              <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
                <div className="mb-sm flex items-center justify-between gap-sm">
                  <h2 className="flex items-center gap-sm text-sm font-bold text-on-surface">
                    <Icon name="track_changes" size={18} className="text-primary" />
                    تقدّم التارجت
                  </h2>
                  <span className="tabular-nums text-sm text-on-surface-variant">
                    {target.achieved_count}/{target.target_count}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-surface-container">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, targetPercent)}%` }}
                  />
                </div>
              </section>
            )}

            <section className="grid gap-md lg:grid-cols-2">
              <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
                <div className="mb-sm flex items-center justify-between">
                  <h2 className="flex items-center gap-sm text-sm font-bold text-on-surface">
                    <Icon name="local_fire_department" size={18} className="text-error" />
                    العملاء الساخنين
                  </h2>
                  <span className="text-xs text-on-surface-variant">Hot Leads</span>
                </div>
                {query.data.hot_leads.length === 0 ? (
                  <p className="py-lg text-center text-sm text-on-surface-variant">لا يوجد عملاء ساخنون حالياً</p>
                ) : (
                  <ul className="divide-y divide-outline-variant">
                    {query.data.hot_leads.map((lead) => (
                      <li key={lead.id} className="flex flex-wrap items-center justify-between gap-sm py-sm">
                        <div>
                          <p className="font-medium text-on-surface">{lead.name}</p>
                          <p className="text-xs text-on-surface-variant">
                            {lead.phone}
                            {lead.assignee ? ` · ${lead.assignee.name}` : ''}
                          </p>
                        </div>
                        <div className="text-end">
                          <p className="text-xs text-on-surface-variant">
                            {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
                          </p>
                          {lead.expected_value != null && (
                            <p className="tabular-nums text-sm font-semibold text-on-surface">
                              {fmtMoney(lead.expected_value)}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
                <div className="mb-sm flex items-center justify-between">
                  <h2 className="flex items-center gap-sm text-sm font-bold text-on-surface">
                    <Icon name="schedule" size={18} className="text-[#FF9800]" />
                    المتأخرون في المتابعة
                  </h2>
                  <Link
                    to="/crm/referrals/follow-ups"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    عرض الكل
                  </Link>
                </div>
                {query.data.overdue_follow_ups.length === 0 ? (
                  <p className="py-lg text-center text-sm text-on-surface-variant">لا توجد متابعات متأخرة</p>
                ) : (
                  <ul className="divide-y divide-outline-variant">
                    {query.data.overdue_follow_ups.map((item) => (
                      <li key={`${item.source}-${item.id}`} className="py-sm">
                        <p className="font-medium text-on-surface">{item.title}</p>
                        <p className="text-xs text-on-surface-variant">
                          {formatDateTime(item.start_datetime)}
                          {item.customer?.name
                            ? ` · ${item.customer.name}`
                            : item.lead?.name
                              ? ` · ${item.lead.name}`
                              : item.referral?.name
                                ? ` · ${item.referral.name}`
                                : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className="grid gap-md lg:grid-cols-2">
              <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
                <div className="mb-sm flex items-center justify-between">
                  <h2 className="flex items-center gap-sm text-sm font-bold text-on-surface">
                    <Icon name="handyman" size={18} className="text-primary" />
                    التركيبات اليوم
                  </h2>
                  <Link to="/support/tasks" className="text-xs font-medium text-primary hover:underline">
                    المهام
                  </Link>
                </div>
                {query.data.installations_today.items.length === 0 ? (
                  <p className="py-lg text-center text-sm text-on-surface-variant">لا توجد تركيبات مجدولة اليوم</p>
                ) : (
                  <ul className="divide-y divide-outline-variant">
                    {query.data.installations_today.items.map((item) => (
                      <li key={item.id} className="flex flex-wrap items-center justify-between gap-sm py-sm">
                        <div>
                          <p className="font-medium text-on-surface">{item.customer_name ?? 'عميل'}</p>
                          <p className="text-xs text-on-surface-variant">
                            {formatDateTime(item.scheduled_at)}
                          </p>
                        </div>
                        <span className="rounded-md bg-surface-container px-sm py-0.5 text-xs text-on-surface-variant">
                          {SUPPORT_STATUS_LABELS[item.status] ?? item.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
                <h2 className="mb-sm flex items-center gap-sm text-sm font-bold text-on-surface">
                  <Icon name="emoji_events" size={18} className="text-primary" />
                  أفضل 5 موظفين
                </h2>
                {query.data.top_employees.length === 0 ? (
                  <p className="py-lg text-center text-sm text-on-surface-variant">لا توجد مبيعات في الفترة</p>
                ) : (
                  <ol className="space-y-sm">
                    {query.data.top_employees.map((emp, index) => (
                      <li
                        key={emp.user_id}
                        className="flex items-center justify-between gap-sm rounded-lg bg-surface-container-low px-sm py-sm"
                      >
                        <div className="flex items-center gap-sm">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium text-on-surface">{emp.name}</p>
                            <p className="text-xs text-on-surface-variant">
                              {emp.invoices_count} فاتورة
                            </p>
                          </div>
                        </div>
                        <p className="tabular-nums text-sm font-semibold text-on-surface">
                          {fmtMoney(emp.sales_total)}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </section>

            <ChartCard title="رسم بياني للمبيعات لحظياً" subtitle="يُحدَّث تلقائياً كل 45 ثانية">
              <BarChartPanel
                data={chartData}
                xKey="label"
                series={[{ key: 'amount', label: 'المبيعات', color: CHART_COLORS[0] }]}
                height={260}
              />
            </ChartCard>
          </div>
        )}
      </AsyncState>
    </div>
  )
}
