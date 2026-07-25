import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type { CeoDashboard, CeoDashboardLeadsBreakdown } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { LineChartPanel } from '../../../components/charts/LineChartPanel'
import { formatMoney } from '../../../lib/theme'
import { useOrgSettingsStore } from '../../../stores/orgSettingsStore'
import { CrmPageShell } from '../components/CrmPageShell'
import { CeoCard } from '../components/ceo-dashboard/CeoCard'
import { CeoEmployeeRankList } from '../components/ceo-dashboard/CeoEmployeeRankList'
import { CeoFollowUpList } from '../components/ceo-dashboard/CeoFollowUpList'
import { CeoFunnelBars } from '../components/ceo-dashboard/CeoFunnelBars'
import { CeoInstallationList } from '../components/ceo-dashboard/CeoInstallationList'
import { CeoKpiCard } from '../components/ceo-dashboard/CeoKpiCard'
import {
  CeoPeriodToggle,
  type CeoDashboardPeriod,
  type CeoDateRange,
} from '../components/ceo-dashboard/CeoPeriodToggle'
import { CeoTargetGauge } from '../components/ceo-dashboard/CeoTargetGauge'

function toLocalIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function defaultCustomDateRange(): CeoDateRange {
  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - 30)
  return { from: toLocalIsoDate(from), to: toLocalIsoDate(to) }
}

const LEAD_BREAKDOWN_ROWS: {
  key: keyof Omit<CeoDashboardLeadsBreakdown, 'total'>
  label: string
  color: string
}[] = [
  { key: 'in_progress', label: 'قيد المتابعة', color: '#2563eb' },
  { key: 'not_contacted', label: 'لم يتم التواصل', color: '#64748b' },
  { key: 'contracted', label: 'تم التعاقد', color: '#15803d' },
  { key: 'not_interested', label: 'غير مهتم', color: '#dc2626' },
]

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function percentOf(value: number, total: number) {
  if (total <= 0) return 0
  return Math.round((value / total) * 1000) / 10
}

function installationSummary(byStatus?: Record<string, number>) {
  if (!byStatus) return null
  const completed = byStatus.completed ?? 0
  const inProgress = byStatus.in_progress ?? 0
  const assigned = byStatus.assigned ?? 0
  const parts: string[] = []
  if (completed) parts.push(`${completed} مكتملة`)
  if (inProgress) parts.push(`${inProgress} جارٍ`)
  if (assigned) parts.push(`${assigned} مُسند`)
  if (parts.length === 0) return null
  return `منها ${parts.join(' · ')}`
}

function periodChangeLabel(period: CeoDashboardPeriod) {
  switch (period) {
    case 'day':
      return 'عن اليوم السابق'
    case 'week':
      return 'عن الأسبوع السابق'
    case 'year':
      return 'عن السنة السابقة'
    case 'custom':
    case 'all':
      return 'عن الفترة السابقة'
    default:
      return 'عن الشهر السابق'
  }
}

export function CrmCeoDashboardPage() {
  const general = useOrgSettingsStore((s) => s.general)
  const currency = general?.currency ?? 'EGP'
  const locale = general?.default_locale === 'en' ? 'en-US' : 'ar-EG'
  const fmtMoney = (value: number) => formatMoney(value, currency, locale)
  const fmtAmount = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)

  const [period, setPeriod] = useState<CeoDashboardPeriod>('month')
  const [dateRange, setDateRange] = useState<CeoDateRange>(defaultCustomDateRange)

  const applyPeriod = (next: CeoDashboardPeriod) => {
    setPeriod(next)
    if (next === 'custom' && (!dateRange.from || !dateRange.to)) {
      setDateRange(defaultCustomDateRange())
    }
  }

  const queryEnabled =
    period !== 'custom' || Boolean(dateRange.from && dateRange.to)

  const query = useQuery({
    queryKey: [
      'crm-ceo-dashboard',
      period,
      period === 'custom' ? dateRange.from : null,
      period === 'custom' ? dateRange.to : null,
    ],
    enabled: queryEnabled,
    queryFn: async () => {
      const params =
        period === 'custom'
          ? { period: 'custom', from: dateRange.from, to: dateRange.to }
          : { period: period === 'all' ? 'month' : period }

      const { data } = await api.get<CeoDashboard>('/crm/ceo/dashboard', {
        params,
      })
      return data
    },
    refetchInterval: 45_000,
  })

  const chartData = useMemo(
    () => (query.data?.sales_chart ?? []).map((row) => ({ label: row.label, amount: row.amount })),
    [query.data?.sales_chart],
  )

  const leadsBreakdown = query.data?.leads_breakdown
  const leadsTotal = leadsBreakdown?.total ?? 0

  const target = query.data?.target_achievement
  const targetPercent = target?.percent ?? 0
  const funnelStages = useMemo(() => {
    if (query.data?.funnel?.length) {
      const colors: Record<string, string> = {
        not_contacted: '#64748b',
        in_progress: '#2563eb',
        contracted: '#15803d',
        not_interested: '#dc2626',
      }
      // Prefer mock order: in_progress, not_contacted, contracted, not_interested
      const order = ['in_progress', 'not_contacted', 'contracted', 'not_interested']
      const mapped = query.data.funnel.map((stage) => ({
        ...stage,
        color: colors[stage.key],
      }))
      return [...mapped].sort(
        (a, b) => order.indexOf(a.key) - order.indexOf(b.key),
      )
    }
    if (!leadsBreakdown) return []
    return LEAD_BREAKDOWN_ROWS.map((row) => ({
      key: row.key,
      label: row.label,
      count: leadsBreakdown[row.key],
      percent: percentOf(leadsBreakdown[row.key], leadsTotal),
      color: row.color,
    }))
  }, [query.data?.funnel, leadsBreakdown, leadsTotal])

  const installSummary = installationSummary(query.data?.installations_today.by_status)

  return (
    <CrmPageShell
      kicker="التحليلات"
      title="لوحة المدير"
      subtitle="نظرة تنفيذية على المبيعات والتارجت والعملاء والتركيبات وأداء الفريق"
      actions={
        <CeoPeriodToggle
          value={period}
          onChange={applyPeriod}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      }
    >
      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {query.data && leadsBreakdown && (
          <div className="flex flex-col gap-3.5">
            <section className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
              <CeoKpiCard
                variant="primary"
                label="إجمالي المبيعات"
                value={
                  <>
                    {fmtAmount(query.data.total_sales)}{' '}
                    <span className="text-sm font-semibold" style={{ color: '#c9dcfc' }}>
                      ج.م
                    </span>
                  </>
                }
                icon="payments"
                changePercent={query.data.sales_change_percent}
                changeLabel={periodChangeLabel(period)}
              />
              <CeoKpiCard
                label="تحقيق التارجت"
                value={
                  <span className="flex items-baseline gap-2">
                    <span>{targetPercent}%</span>
                    {target && (
                      <span
                        className="text-xs font-semibold"
                        style={{ color: 'var(--crm-text-muted)' }}
                      >
                        {target.achieved_count} / {target.target_count} تعاقد
                      </span>
                    )}
                  </span>
                }
                icon="track_changes"
                iconTone="primary"
                progress={targetPercent}
              />
              <CeoKpiCard
                label="عدد الترشيحات"
                value={leadsBreakdown.total}
                icon="group"
                iconTone="purple"
                subtitle="ترشيحات في النطاق الحالي"
              />
              <CeoKpiCard
                label="التركيبات اليوم"
                value={query.data.installations_today.count}
                icon="handyman"
                iconTone="green"
                subtitle={installSummary ?? 'لا توجد تركيبات اليوم'}
              />
            </section>

            <section className="grid gap-3.5 lg:grid-cols-[1fr_1.15fr]">
              {target && target.target_count > 0 ? (
                <CeoCard
                  title="هدف المبيعات"
                  subtitle="نسبة إنجاز التارجت لهذه الفترة"
                  headerClassName="mb-1.5"
                >
                  <CeoTargetGauge
                    percent={targetPercent}
                    achieved={target.achieved_count}
                    target={target.target_count}
                  />
                </CeoCard>
              ) : (
                <CeoCard
                  title="هدف المبيعات"
                  subtitle="نسبة إنجاز التارجت لهذه الفترة"
                >
                  <p
                    className="flex flex-1 items-center justify-center py-10 text-[13px]"
                    style={{ color: 'var(--crm-text-faint)' }}
                  >
                    لا يوجد تارجت محدد لهذه الفترة
                  </p>
                </CeoCard>
              )}

              <CeoCard
                title="قمع الإحالات"
                subtitle={`توزيع مراحل الترشيحات — ${leadsTotal} ترشيح`}
              >
                <CeoFunnelBars stages={funnelStages} />
              </CeoCard>
            </section>

            <section className="grid gap-3.5 lg:grid-cols-[1.6fr_1fr]">
              <CeoCard
                title="المبيعات عبر الوقت"
                subtitle="قيمة المبيعات اليومية (ج.م) — يُحدّث كل 45 ثانية"
                action={
                  <div
                    className="flex items-center gap-1.5 text-xs font-semibold"
                    style={{ color: 'var(--crm-text-muted)' }}
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: 'var(--crm-primary)' }}
                    />
                    المبيعات
                  </div>
                }
              >
                <LineChartPanel
                  data={chartData}
                  xKey="label"
                  series={[{ key: 'amount', label: 'المبيعات', color: '#2563eb' }]}
                  height={260}
                  fillArea
                  ringPoints
                />
              </CeoCard>

              <CeoCard
                title="أداء الموظفين"
                subtitle="الأعلى حسب قيمة المبيعات في الفترة"
              >
                <CeoEmployeeRankList
                  employees={query.data.top_employees}
                  formatMoney={fmtMoney}
                />
              </CeoCard>
            </section>

            <section className="grid gap-3.5 lg:grid-cols-[1.15fr_1fr]">
              <CeoFollowUpList
                items={query.data.overdue_follow_ups}
                formatDateTime={formatDateTime}
              />
              <CeoInstallationList
                items={query.data.installations_today.items}
                count={query.data.installations_today.count}
                formatDateTime={formatDateTime}
              />
            </section>
          </div>
        )}
      </AsyncState>
    </CrmPageShell>
  )
}
