import { useMemo, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type { ReferralLeadReport, ReferralLeadReportByUser } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import {
  CRM_PRIMARY_BTN,
  CRM_SECONDARY_BTN,
  CrmFilterPanel,
  CrmPageShell,
} from '../components/CrmPageShell'
import { CrmChip } from '../components/ui/CrmChip'
import { CrmKpiCard } from '../components/ui/CrmKpiCard'
import {
  CrmTable,
  CrmTableHeader,
  CrmTableHeaderCell,
  CrmTableRow,
} from '../components/ui/CrmTable'
import { referralStatusMeta } from '../lib/referralLeads'
import { downloadCsv } from '../lib/ownerReports'
import {
  buildStatusBreakdown,
  formatReportDateLabel,
  getReferralReportDateRange,
  getReferralReportPeriodOptions,
  userConversionRate,
  type ReferralReportPeriod,
} from '../lib/referralReports'

const sectionStyle: CSSProperties = {
  background: 'var(--crm-surface)',
  border: '1px solid var(--crm-border)',
  borderRadius: 'var(--crm-radius-md)',
  boxShadow: 'var(--crm-shadow)',
}

const PERF_COLS = '1.4fr repeat(5, 1fr) 120px'
const QUARTER_GOAL = 20

export function CrmReportsPage() {
  const navigate = useNavigate()
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

  const goalProgress = query.data
    ? Math.min(100, Math.round((query.data.summary.conversion_rate / QUARTER_GOAL) * 100))
    : 0

  const handleExport = () => {
    if (!query.data) return
    downloadCsv(
      'crm-referral-report.csv',
      ['الموظف', 'الترشيحات', 'لم يرد', 'غير مهتم', 'مواعيد', 'تركيب', 'التحويل %'],
      byUser.map((row) => [
        row.user_name,
        row.total,
        row.no_answer,
        row.not_interested,
        row.installation_scheduled,
        row.installed,
        userConversionRate(row),
      ]),
    )
  }

  return (
    <CrmPageShell
      kicker="التحليلات"
      title="تقارير الترشيحات"
      subtitle="معدل التحويل من الترشيح إلى تركيب فعلي وأداء كل موظف."
      actions={
        <>
          <button type="button" onClick={handleExport} className={CRM_SECONDARY_BTN}>
            تصدير
          </button>
          <Link to="/crm/reports/owner-detail" className={CRM_PRIMARY_BTN}>
            تقرير مفصّل
          </Link>
        </>
      }
      filters={
        <CrmFilterPanel>
          <span className="text-xs font-medium" style={{ color: 'var(--crm-text-faint)' }}>
            الفترة
          </span>
          <div className="flex flex-wrap gap-2">
            {getReferralReportPeriodOptions().map((option) => (
              <CrmChip
                key={option.id}
                label={option.label}
                active={period === option.id}
                onClick={() => applyPeriod(option.id)}
              />
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <label
                className="inline-flex h-[38px] items-center gap-2 px-2.5 text-[11.5px]"
                style={{
                  border: '1px solid var(--crm-border)',
                  borderRadius: 9,
                  background: 'var(--crm-surface-muted)',
                  color: 'var(--crm-text-faint)',
                }}
              >
                من
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
                  className="border-none bg-transparent text-[12.5px] font-medium outline-none"
                  style={{ color: 'var(--crm-text)' }}
                  dir="ltr"
                />
              </label>
              <label
                className="inline-flex h-[38px] items-center gap-2 px-2.5 text-[11.5px]"
                style={{
                  border: '1px solid var(--crm-border)',
                  borderRadius: 9,
                  background: 'var(--crm-surface-muted)',
                  color: 'var(--crm-text-faint)',
                }}
              >
                إلى
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
                  className="border-none bg-transparent text-[12.5px] font-medium outline-none"
                  style={{ color: 'var(--crm-text)' }}
                  dir="ltr"
                />
              </label>
            </div>
          )}

          <div className="flex-1" />

          {query.data && (
            <p className="text-xs" style={{ color: 'var(--crm-text-faint)' }}>
              {formatReportDateLabel(query.data.from)}
              <span className="mx-1.5">←</span>
              {formatReportDateLabel(query.data.to)}
            </p>
          )}
        </CrmFilterPanel>
      }
    >
      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {query.data && (
          <>
            <div className="grid gap-3.5 lg:grid-cols-[minmax(280px,1fr)_minmax(340px,1.6fr)]">
              <div
                className="flex flex-col justify-between gap-[18px] p-7"
                style={{
                  background: 'var(--crm-primary)',
                  border: '1px solid var(--crm-primary)',
                  borderRadius: 'var(--crm-radius-md)',
                  boxShadow: 'var(--crm-shadow-primary)',
                  color: '#fff',
                }}
              >
                <div className="flex flex-col gap-1.5">
                  <span className="text-[12.5px] font-medium" style={{ color: '#dbe6fd' }}>
                    معدل التحويل الكلي
                  </span>
                  <span className="text-[46px] font-bold leading-none tracking-[-0.04em]">
                    {query.data.summary.conversion_rate}%
                  </span>
                  <span className="text-[12.5px]" style={{ color: '#c9dcfc' }}>
                    {query.data.summary.installed} تركيب مكتمل من أصل {query.data.summary.total}{' '}
                    ترشيح
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-[11.5px]">
                    <span style={{ color: '#c9dcfc' }}>الهدف الربعي {QUARTER_GOAL}%</span>
                    <span className="font-semibold text-white">{goalProgress}% من الهدف</span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full"
                    style={{ background: 'rgba(255,255,255,.28)' }}
                  >
                    <div
                      className="h-full rounded-full bg-white transition-all"
                      style={{ width: `${goalProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              <section className="flex flex-col gap-3.5 p-[18px]" style={sectionStyle}>
                <div className="flex flex-col gap-0.5">
                  <h2 className="m-0 text-[14.5px] font-bold">توزيع الحالات</h2>
                  <p className="m-0 text-xs" style={{ color: 'var(--crm-text-faint)' }}>
                    نسبة كل مرحلة من إجمالي الترشيحات
                  </p>
                </div>
                <div className="flex flex-col gap-3.5">
                  {breakdown.map((item) => {
                    const meta = referralStatusMeta(item.key)
                    return (
                      <div key={item.key} className="flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="crm-status-dot"
                              style={{ background: meta.color, width: 7, height: 7 }}
                            />
                            <span className="text-[12.5px] font-medium">{item.label}</span>
                          </div>
                          <span className="text-[12.5px]" style={{ color: 'var(--crm-text-muted)' }}>
                            <span className="font-bold" style={{ color: 'var(--crm-text)' }}>
                              {item.count}
                            </span>
                            {' · '}
                            {item.percent}%
                          </span>
                        </div>
                        <div
                          className="h-2 overflow-hidden rounded-full"
                          style={{ background: 'var(--crm-neutral-soft)' }}
                        >
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.max(item.percent, item.count > 0 ? 4 : 0)}%`,
                              background: meta.color,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            </div>

            <div className="flex flex-wrap gap-3.5">
              <CrmKpiCard label="إجمالي الترشيحات" value={query.data.summary.total} />
              <CrmKpiCard
                label="لم يردوا"
                value={query.data.summary.no_answer}
                dot={referralStatusMeta('no_answer').color}
              />
              <CrmKpiCard
                label="غير مهتمين"
                value={query.data.summary.not_interested}
                variant="danger"
              />
              <CrmKpiCard
                label="مواعيد مجدولة"
                value={query.data.summary.installation_scheduled}
                variant="warning"
              />
              <CrmKpiCard
                label="تم التركيب"
                value={query.data.summary.installed}
                variant="success"
              />
            </div>

            <section className="overflow-hidden" style={sectionStyle}>
              <div
                className="flex flex-col gap-0.5 px-[18px] py-3.5"
                style={{ borderBottom: '1px solid var(--crm-border-soft)' }}
              >
                <h2 className="m-0 text-[14.5px] font-bold">أداء الموظفين</h2>
                <p className="m-0 text-xs" style={{ color: 'var(--crm-text-faint)' }}>
                  اضغط على الموظف لعرض تقريره التفصيلي
                </p>
              </div>

              {byUser.length === 0 ? (
                <p
                  className="px-[18px] py-8 text-center text-sm"
                  style={{ color: 'var(--crm-text-faint)' }}
                >
                  لا توجد ترشيحات في هذه الفترة
                </p>
              ) : (
                <CrmTable
                  header={
                    <CrmTableHeader columns={PERF_COLS}>
                      <CrmTableHeaderCell>الموظف</CrmTableHeaderCell>
                      <CrmTableHeaderCell>الترشيحات</CrmTableHeaderCell>
                      <CrmTableHeaderCell>لم يرد</CrmTableHeaderCell>
                      <CrmTableHeaderCell>غير مهتم</CrmTableHeaderCell>
                      <CrmTableHeaderCell>مواعيد</CrmTableHeaderCell>
                      <CrmTableHeaderCell>تركيب</CrmTableHeaderCell>
                      <CrmTableHeaderCell>التحويل</CrmTableHeaderCell>
                    </CrmTableHeader>
                  }
                >
                  {byUser.map((row) => {
                    const rate = userConversionRate(row)
                    const href = row.user_id
                      ? `/crm/reports/owners/${row.user_id}?from=${dateRange.from}&to=${dateRange.to}`
                      : null
                    const ini = (row.user_name || '?').slice(0, 1)
                    return (
                      <CrmTableRow
                        key={row.user_id ?? row.user_name}
                        columns={PERF_COLS}
                        onClick={href ? () => navigate(href) : undefined}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] text-[11px] font-semibold"
                            style={{
                              background: 'var(--crm-primary-soft)',
                              color: 'var(--crm-primary)',
                            }}
                          >
                            {ini}
                          </span>
                          <span
                            className="text-[13px] font-semibold"
                            style={{ color: 'var(--crm-primary)' }}
                          >
                            {row.user_name}
                          </span>
                        </div>
                        <span className="text-[12.5px] font-semibold tabular-nums">{row.total}</span>
                        <span
                          className="text-[12.5px] tabular-nums"
                          style={{ color: 'var(--crm-text-secondary)' }}
                        >
                          {row.no_answer}
                        </span>
                        <span
                          className="text-[12.5px] tabular-nums"
                          style={{ color: 'var(--crm-text-secondary)' }}
                        >
                          {row.not_interested}
                        </span>
                        <span
                          className="text-[12.5px] tabular-nums"
                          style={{ color: 'var(--crm-text-secondary)' }}
                        >
                          {row.installation_scheduled}
                        </span>
                        <span
                          className="text-[12.5px] tabular-nums"
                          style={{ color: 'var(--crm-text-secondary)' }}
                        >
                          {row.installed}
                        </span>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="h-1.5 min-w-10 flex-1 overflow-hidden rounded-[13px]"
                            style={{ background: 'var(--crm-neutral-soft)' }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, Math.max(rate, rate > 0 ? 4 : 0))}%`,
                                background: 'var(--crm-primary)',
                              }}
                            />
                          </div>
                          <span className="text-xs font-semibold tabular-nums">{rate}%</span>
                        </div>
                      </CrmTableRow>
                    )
                  })}
                </CrmTable>
              )}
            </section>
          </>
        )}
      </AsyncState>
    </CrmPageShell>
  )
}
