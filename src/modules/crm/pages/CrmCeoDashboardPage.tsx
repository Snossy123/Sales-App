import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type { CeoDashboard, CeoDashboardLeadsBreakdown } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import {
  type DashboardPeriod,
} from '../../../components/DashboardPeriodFilter'
import { LineChartPanel } from '../../../components/charts/LineChartPanel'
import { formatMoney } from '../../../lib/theme'
import { useOrgSettingsStore } from '../../../stores/orgSettingsStore'
import { CeoCard } from '../components/ceo-dashboard/CeoCard'
import { CeoEmployeeRankList } from '../components/ceo-dashboard/CeoEmployeeRankList'
import { CeoFollowUpList } from '../components/ceo-dashboard/CeoFollowUpList'
import { CeoFunnelBars } from '../components/ceo-dashboard/CeoFunnelBars'
import { CeoInstallationList } from '../components/ceo-dashboard/CeoInstallationList'
import { CeoKpiCard } from '../components/ceo-dashboard/CeoKpiCard'
import { CeoPeriodToggle } from '../components/ceo-dashboard/CeoPeriodToggle'
import { CeoTargetGauge } from '../components/ceo-dashboard/CeoTargetGauge'

const LEAD_BREAKDOWN_ROWS: {
  key: keyof Omit<CeoDashboardLeadsBreakdown, 'total'>
  label: string
  color: string
}[] = [
  { key: 'in_progress', label: 'قيد المتابعة', color: '#2a5bd7' },
  { key: 'not_contacted', label: 'لم يتم التواصل', color: '#64748b' },
  { key: 'contracted', label: 'تم التعاقد', color: '#16a34a' },
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

function periodChangeLabel(period: DashboardPeriod) {
  switch (period) {
    case 'day':
      return 'عن اليوم السابق'
    case 'week':
      return 'عن الأسبوع السابق'
    case 'year':
      return 'عن السنة السابقة'
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

  const leadsBreakdown = query.data?.leads_breakdown
  const leadsTotal = leadsBreakdown?.total ?? 0

  const target = query.data?.target_achievement
  const targetPercent = target?.percent ?? 0
  const funnelStages = useMemo(() => {
    if (query.data?.funnel?.length) {
      const colors: Record<string, string> = {
        not_contacted: '#64748b',
        in_progress: '#2a5bd7',
        contracted: '#16a34a',
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
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-[25px] font-bold tracking-tight text-[#141821]">لوحة المدير</h1>
          <p className="m-0 text-[13.5px] text-[#8890a0]">
            نظرة تنفيذية على المبيعات والتارجت والعملاء والتركيبات وأداء الفريق
          </p>
        </div>
        <CeoPeriodToggle value={period} onChange={setPeriod} />
      </div>

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {query.data && leadsBreakdown && (
          <div className="flex flex-col gap-4">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <CeoKpiCard
                variant="primary"
                label="إجمالي المبيعات"
                value={
                  <>
                    {fmtAmount(query.data.total_sales)}{' '}
                    <span className="text-[15px] font-semibold text-[#cbdafb]">ج.م</span>
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
                      <span className="text-[12.5px] font-semibold text-[#8890a0]">
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
                label="عدد الليدز"
                value={leadsBreakdown.total}
                icon="group"
                iconTone="purple"
                subtitle="عملاء محتملون في النطاق الحالي"
              />
              <CeoKpiCard
                label="التركيبات اليوم"
                value={query.data.installations_today.count}
                icon="handyman"
                iconTone="green"
                subtitle={installSummary ?? 'لا توجد تركيبات اليوم'}
              />
            </section>

            <section className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
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
                  <p className="flex flex-1 items-center justify-center py-10 text-sm text-[#8890a0]">
                    لا يوجد تارجت محدد لهذه الفترة
                  </p>
                </CeoCard>
              )}

              <CeoCard
                title="قمع الإحالات"
                subtitle={`توزيع مراحل العملاء المحتملين — ${leadsTotal} عملاء`}
              >
                <CeoFunnelBars stages={funnelStages} />
              </CeoCard>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
              <CeoCard
                title="المبيعات عبر الوقت"
                subtitle="قيمة المبيعات اليومية (ج.م) — يُحدّث كل 45 ثانية"
                action={
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#8890a0]">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />
                    المبيعات
                  </div>
                }
              >
                <LineChartPanel
                  data={chartData}
                  xKey="label"
                  series={[{ key: 'amount', label: 'المبيعات', color: 'var(--color-primary, #2a5bd7)' }]}
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

            <section className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
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
    </div>
  )
}
