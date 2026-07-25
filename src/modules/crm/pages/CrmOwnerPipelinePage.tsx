import { useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type {
  OwnerPipelineOwnerRow,
  OwnerPipelineResponse,
  OwnerPipelineStatusRow,
} from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { DonutChartPanel } from '../../../components/charts/DonutChartPanel'
import { Icon } from '../../../components/Icon'
import {
  CRM_PRIMARY_BTN,
  CrmFilterPanel,
  CrmPageShell,
} from '../components/CrmPageShell'
import { CrmStatusPill } from '../components/ui/CrmChip'
import { CHART_COLORS } from '../../../lib/chartColors'
import { referralStatusMeta } from '../lib/referralLeads'
import {
  defaultOwnerReportDateRange,
  OWNER_REPORT_INPUT_CLASS,
} from '../lib/ownerReports'

const sectionStyle: CSSProperties = {
  background: 'var(--crm-surface)',
  border: '1px solid var(--crm-border)',
  borderRadius: 'var(--crm-radius-md)',
  boxShadow: 'var(--crm-shadow)',
}

export function CrmOwnerPipelinePage() {
  const initialRange = useMemo(() => defaultOwnerReportDateRange(), [])
  const [draftFrom, setDraftFrom] = useState(initialRange.from)
  const [draftTo, setDraftTo] = useState(initialRange.to)
  const [applied, setApplied] = useState({
    from: initialRange.from,
    to: initialRange.to,
  })

  const query = useQuery({
    queryKey: ['crm-owner-pipeline', applied.from, applied.to],
    queryFn: async () => {
      const { data } = await api.get<OwnerPipelineResponse>('/crm/reports/owner-pipeline', {
        params: { from: applied.from, to: applied.to },
      })
      return data
    },
  })

  const donutData = useMemo(() => {
    return (query.data?.by_status ?? []).map((row, index) => {
      const meta = referralStatusMeta(row.status)
      return {
        label: row.label,
        value: row.leads,
        color: meta.color || CHART_COLORS[index % CHART_COLORS.length],
      }
    })
  }, [query.data?.by_status])

  return (
    <CrmPageShell
      kicker="التحليلات"
      title="خط الأنابيب"
      subtitle="توزيع الترشيحات حسب الحالة"
      filters={
        <CrmFilterPanel>
          <div className="flex w-full flex-wrap items-end gap-2.5">
            <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
              <span className="text-[11.5px] font-semibold" style={{ color: 'var(--crm-text-faint)' }}>
                نطاق التاريخ
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={draftFrom}
                  onChange={(e) => setDraftFrom(e.target.value)}
                  className={`${OWNER_REPORT_INPUT_CLASS} w-full`}
                  dir="ltr"
                />
                <span style={{ color: 'var(--crm-text-faint)' }}>—</span>
                <input
                  type="date"
                  value={draftTo}
                  onChange={(e) => setDraftTo(e.target.value)}
                  className={`${OWNER_REPORT_INPUT_CLASS} w-full`}
                  dir="ltr"
                />
              </div>
            </label>

            <button
              type="button"
              onClick={() => setApplied({ from: draftFrom, to: draftTo })}
              className={CRM_PRIMARY_BTN}
            >
              <Icon name="search" size={18} />
              تطبيق
            </button>
          </div>
        </CrmFilterPanel>
      }
    >
      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {query.data && (
          <>
            <section className="grid gap-3.5 lg:grid-cols-2">
              <div className="overflow-hidden p-[18px]" style={sectionStyle}>
                <div className="mb-3.5 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-[3px]"
                      style={{ background: 'var(--crm-primary)' }}
                    />
                    <h2 className="m-0 text-[14.5px] font-bold">الترشيحات حسب الحالة</h2>
                  </div>
                  <span
                    className="rounded-[8px] px-2.5 py-1 text-[11.5px] font-semibold"
                    style={{
                      background: 'var(--crm-primary-soft)',
                      color: 'var(--crm-primary)',
                    }}
                  >
                    الإجمالي: {query.data.total}
                  </span>
                </div>
                <DonutChartPanel data={donutData} size={200} />
              </div>

              <div className="overflow-hidden" style={sectionStyle}>
                <div
                  className="flex items-center gap-2 px-[18px] py-3.5"
                  style={{ borderBottom: '1px solid var(--crm-border-soft)' }}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-[3px]"
                    style={{ background: 'var(--crm-primary)' }}
                  />
                  <h2 className="m-0 text-[14.5px] font-bold">التفصيل</h2>
                </div>
                <DataTable<OwnerPipelineStatusRow & Record<string, unknown>>
                  data={query.data.by_status as (OwnerPipelineStatusRow & Record<string, unknown>)[]}
                  keyExtractor={(row) => row.status}
                  emptyMessage="لا توجد ترشيحات في هذه الفترة"
                  columns={[
                    {
                      key: 'status',
                      header: 'الحالة',
                      render: (row) => {
                        const meta = referralStatusMeta(row.status)
                        return (
                          <CrmStatusPill label={row.label} color={meta.color} tint={meta.tint} />
                        )
                      },
                    },
                    {
                      key: 'leads',
                      header: 'الترشيحات',
                      className: 'tabular-nums font-semibold',
                    },
                    {
                      key: 'share',
                      header: 'النسبة',
                      className: 'tabular-nums',
                      render: (row) => `${row.share}%`,
                    },
                  ]}
                />
              </div>
            </section>

            <section className="overflow-hidden" style={sectionStyle}>
              <div
                className="flex items-center gap-2 px-[18px] py-3.5"
                style={{ borderBottom: '1px solid var(--crm-border-soft)' }}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-[3px]"
                  style={{ background: 'var(--crm-primary)' }}
                />
                <h2 className="m-0 text-[14.5px] font-bold">الترشيحات حسب الموظف</h2>
              </div>
              <DataTable<OwnerPipelineOwnerRow & Record<string, unknown>>
                data={query.data.by_owner as (OwnerPipelineOwnerRow & Record<string, unknown>)[]}
                keyExtractor={(row) => row.owner_id}
                pageSize={15}
                emptyMessage="لا توجد ترشيحات في هذه الفترة"
                columns={[
                  {
                    key: 'owner_name',
                    header: 'الموظف',
                    render: (row) => (
                      <Link
                        to={`/crm/reports/owners/${row.owner_id}?from=${applied.from}&to=${applied.to}`}
                        className="font-semibold"
                        style={{ color: 'var(--crm-primary)' }}
                      >
                        {row.owner_name}
                      </Link>
                    ),
                  },
                  {
                    key: 'total_leads',
                    header: 'إجمالي الترشيحات',
                    className: 'tabular-nums font-semibold',
                  },
                  {
                    key: 'status_breakdown',
                    header: 'توزيع الحالات',
                    render: (row) => (
                      <div className="flex flex-wrap gap-1.5">
                        {row.status_breakdown.map((item) => {
                          const meta = referralStatusMeta(item.status)
                          return (
                            <CrmStatusPill
                              key={`${row.owner_id}-${item.status}`}
                              label={`${item.label} — ${item.count}`}
                              color={meta.color}
                              tint={meta.tint}
                            />
                          )
                        })}
                        {row.status_breakdown.length === 0 ? '—' : null}
                      </div>
                    ),
                  },
                ]}
              />
            </section>
          </>
        )}
      </AsyncState>
    </CrmPageShell>
  )
}
