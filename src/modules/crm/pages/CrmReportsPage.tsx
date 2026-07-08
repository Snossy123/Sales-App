import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type { ReferralLeadReport, ReferralLeadReportByUser } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { KpiCard } from '../../../components/KpiCard'
import { PageHeader } from '../../../components/PageHeader'
import {
  buildStatusBreakdown,
  formatReportDateLabel,
  getReferralReportDateRange,
  getReferralReportPeriodOptions,
  userConversionRate,
  type ReferralReportPeriod,
} from '../lib/referralReports'

const inputClass =
  'rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-2 text-sm text-on-surface'

export function CrmReportsPage() {
  const [period, setPeriod] = useState<ReferralReportPeriod>('quarter')
  const [dateRange, setDateRange] = useState(() => getReferralReportDateRange('quarter'))

  const applyPeriod = (next: ReferralReportPeriod) => {
    setPeriod(next)
    if (next !== 'custom') {
      setDateRange(getReferralReportDateRange(next))
    }
  }

  const query = useQuery({
    queryKey: ['crm-report-referrals', dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data } = await api.get<ReferralLeadReport>('/crm/reports/referrals', {
        params: { from: dateRange.from, to: dateRange.to },
      })
      return data
    },
  })

  const breakdown = useMemo(
    () => (query.data ? buildStatusBreakdown(query.data.summary) : []),
    [query.data],
  )

  const byUser = (query.data?.by_user ?? []) as ReferralLeadReportByUser[]

  return (
    <div className="space-y-md">
      <PageHeader
        title="تقارير الترشيحات"
        subtitle="أداء الموظفين ومعدل التحويل من الترشيح إلى تركيب فعلي"
      />

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
        <div className="flex flex-col gap-md lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-xs text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              الفترة الزمنية
            </p>
            <div className="flex flex-wrap gap-1 rounded-lg border border-outline-variant bg-surface-container-low p-0.5">
              {getReferralReportPeriodOptions().map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => applyPeriod(option.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    period === option.id
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {period === 'custom' && (
            <div className="flex flex-wrap items-center gap-sm">
              <label className="flex flex-col gap-xs text-xs text-on-surface-variant">
                من
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
                  className={inputClass}
                  dir="ltr"
                />
              </label>
              <label className="flex flex-col gap-xs text-xs text-on-surface-variant">
                إلى
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
                  className={inputClass}
                  dir="ltr"
                />
              </label>
            </div>
          )}

          {query.data && (
            <p className="text-sm text-on-surface-variant">
              {formatReportDateLabel(query.data.from)}
              <span className="mx-xs">←</span>
              {formatReportDateLabel(query.data.to)}
            </p>
          )}
        </div>
      </section>

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {query.data && (
          <>
            <section className="overflow-hidden rounded-xl border border-secondary/20 bg-gradient-to-l from-secondary/10 via-surface-container-lowest to-surface-container-lowest p-md shadow-sm">
              <div className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface-variant">معدل التحويل الكلي</p>
                  <p className="mt-xs tabular-nums text-4xl font-bold text-secondary">
                    {query.data.summary.conversion_rate}%
                  </p>
                  <p className="mt-sm max-w-xl text-sm text-on-surface-variant">
                    {query.data.summary.installed} تركيب مكتمل من أصل {query.data.summary.total} ترشيح
                    في الفترة المحددة
                  </p>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                  <Icon name="trending_up" size={32} />
                </div>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-md lg:grid-cols-5">
              <KpiCard label="إجمالي الترشيحات" value={query.data.summary.total} icon="groups" />
              <KpiCard label="لم يردوا" value={query.data.summary.no_answer} icon="phone_missed" />
              <KpiCard
                label="غير مهتمين"
                value={query.data.summary.not_interested}
                icon="thumb_down"
              />
              <KpiCard
                label="مواعيد مجدولة"
                value={query.data.summary.installation_scheduled}
                icon="schedule"
              />
              <KpiCard
                label="تم التركيب"
                value={query.data.summary.installed}
                icon="check_circle"
                alert={query.data.summary.installed === 0 && query.data.summary.total > 0}
              />
            </section>

            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
              <div className="mb-md flex items-center justify-between gap-sm">
                <div>
                  <h2 className="text-base font-bold text-on-surface">توزيع الحالات</h2>
                  <p className="text-xs text-on-surface-variant">
                    نسبة كل مرحلة من إجمالي الترشيحات
                  </p>
                </div>
              </div>
              <div className="space-y-sm">
                {breakdown.map((item) => (
                  <div key={item.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-md">
                    <div>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-on-surface">{item.label}</span>
                        <span className="tabular-nums text-on-surface-variant">
                          {item.count} ({item.percent}%)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
                        <div
                          className={`h-full rounded-full transition-all ${item.barColor}`}
                          style={{ width: `${Math.max(item.percent, item.count > 0 ? 4 : 0)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
              <div className="border-b border-outline-variant px-md py-sm">
                <h2 className="text-base font-bold text-on-surface">أداء الموظفين</h2>
                <p className="text-xs text-on-surface-variant">
                  عدد الترشيحات المضافة وحالاتها لكل موظف CRM
                </p>
              </div>
              <div className="p-md pt-0">
                <DataTable<ReferralLeadReportByUser & Record<string, unknown>>
                  data={byUser as (ReferralLeadReportByUser & Record<string, unknown>)[]}
                  keyExtractor={(row) => row.user_id}
                  pageSize={10}
                  emptyMessage="لا توجد ترشيحات في هذه الفترة"
                  columns={[
                    {
                      key: 'user_name',
                      header: 'الموظف',
                      render: (row) => (
                        <span className="font-medium text-on-surface">{row.user_name}</span>
                      ),
                    },
                    {
                      key: 'total',
                      header: 'الترشيحات',
                      className: 'tabular-nums font-semibold',
                    },
                    {
                      key: 'no_answer',
                      header: 'لم يرد',
                      className: 'tabular-nums',
                    },
                    {
                      key: 'not_interested',
                      header: 'غير مهتم',
                      className: 'tabular-nums',
                    },
                    {
                      key: 'installation_scheduled',
                      header: 'مواعيد',
                      className: 'tabular-nums',
                    },
                    {
                      key: 'installed',
                      header: 'تركيب',
                      className: 'tabular-nums text-secondary font-semibold',
                    },
                    {
                      key: 'conversion',
                      header: 'التحويل',
                      className: 'tabular-nums',
                      render: (row) => `${userConversionRate(row)}%`,
                    },
                  ]}
                />
              </div>
            </section>
          </>
        )}
      </AsyncState>
    </div>
  )
}
