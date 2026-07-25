import { useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type {
  Employee,
  OwnerLeaderboardResponse,
  OwnerLeaderboardRow,
  OwnerLeaderboardSort,
  PaginatedResponse,
} from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { Icon } from '../../../components/Icon'
import {
  CRM_PRIMARY_BTN,
  CrmFilterPanel,
  CrmPageShell,
} from '../components/CrmPageShell'
import { CrmChip } from '../components/ui/CrmChip'
import {
  CrmTable,
  CrmTableHeader,
  CrmTableHeaderCell,
  CrmTableRow,
} from '../components/ui/CrmTable'
import {
  defaultOwnerReportDateRange,
  downloadCsv,
  OWNER_REPORT_INPUT_CLASS,
} from '../lib/ownerReports'

const SORT_CHIPS: { id: OwnerLeaderboardSort; label: string; metric: string }[] = [
  { id: 'converted', label: 'محوّل', metric: 'تركيب مكتمل' },
  { id: 'leads', label: 'ترشيحات', metric: 'ترشيح' },
  { id: 'total_activities', label: 'الأنشطة', metric: 'نشاط' },
]

const MEDALS = [
  { medalBg: '#fef3e2', medalFg: '#b45309', bd: '#f6dcae', barColor: '#b45309' },
  { medalBg: '#eef1f7', medalFg: '#475569', bd: '#e5e9f2', barColor: '#64748b' },
  { medalBg: '#fbeade', medalFg: '#9a5b2a', bd: '#f0d6c1', barColor: '#9a5b2a' },
  { medalBg: '#eef1f7', medalFg: '#8a94a6', bd: '#e5e9f2', barColor: '#a9b2c3' },
]

const TABLE_COLS = '56px 1.5fr repeat(5, 1fr) 110px'

const sectionStyle: CSSProperties = {
  background: 'var(--crm-surface)',
  border: '1px solid var(--crm-border)',
  borderRadius: 'var(--crm-radius-md)',
  boxShadow: 'var(--crm-shadow)',
}

function metricValue(row: OwnerLeaderboardRow, sort: OwnerLeaderboardSort): number {
  return Number(row[sort]) || 0
}

function formatDisplayDate(iso: string) {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function medalFor(rank: number) {
  return MEDALS[Math.min(Math.max(rank - 1, 0), MEDALS.length - 1)]
}

export function CrmLeaderboardPage() {
  const navigate = useNavigate()
  const initialRange = useMemo(() => defaultOwnerReportDateRange(), [])
  const [draftFrom, setDraftFrom] = useState(initialRange.from)
  const [draftTo, setDraftTo] = useState(initialRange.to)
  const [applied, setApplied] = useState({
    from: initialRange.from,
    to: initialRange.to,
    sort: 'converted' as OwnerLeaderboardSort,
  })

  const employeesQuery = useQuery({
    queryKey: ['employees', 'crm-leaderboard'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', {
        params: { per_page: 100, 'filter[status]': 'active' },
      })
      return data.data.filter((emp) => emp.user_id != null)
    },
  })

  const branchByUserId = useMemo(() => {
    const map = new Map<number, string>()
    for (const emp of employeesQuery.data ?? []) {
      if (emp.user_id != null && emp.branch?.name) {
        map.set(emp.user_id, emp.branch.name)
      }
    }
    return map
  }, [employeesQuery.data])

  const query = useQuery({
    queryKey: ['crm-owner-leaderboard', applied.from, applied.to, applied.sort],
    queryFn: async () => {
      const { data } = await api.get<OwnerLeaderboardResponse>('/crm/reports/owner-leaderboard', {
        params: {
          from: applied.from,
          to: applied.to,
          sort: applied.sort,
          sort_dir: 'desc',
        },
      })
      return data
    },
  })

  const sortMeta =
    SORT_CHIPS.find((option) => option.id === applied.sort) ?? SORT_CHIPS[0]

  const topThree = useMemo(() => (query.data?.rows ?? []).slice(0, 3), [query.data?.rows])

  const podiumMax = useMemo(() => {
    if (topThree.length === 0) return 1
    return Math.max(...topThree.map((row) => metricValue(row, applied.sort)), 1)
  }, [topThree, applied.sort])

  const applyDates = () => {
    setApplied((prev) => ({ ...prev, from: draftFrom, to: draftTo }))
  }

  const setSort = (sort: OwnerLeaderboardSort) => {
    setApplied((prev) => ({ ...prev, sort }))
  }

  const handleExport = () => {
    if (!query.data?.rows.length) return
    downloadCsv(
      'crm-leaderboard.csv',
      ['الرتبة', 'الموظف', 'محوّل', 'ترشيحات', 'مكالمات', 'اجتماعات', 'مهام منجزة', 'معدل الإنجاز'],
      query.data.rows.map((row) => [
        row.rank,
        row.owner_name,
        row.converted,
        row.leads,
        row.calls,
        row.meetings,
        row.done_activities,
        `${row.completion_rate}%`,
      ]),
    )
  }

  return (
    <CrmPageShell
      kicker="التحليلات"
      title="لوحة المتصدرين"
      subtitle="ترتيب موظفي المبيعات حسب التحويل والنشاط."
      actions={
        <button
          type="button"
          onClick={handleExport}
          disabled={!query.data?.rows.length}
          className={`${CRM_PRIMARY_BTN} disabled:opacity-50`}
        >
          تصدير
        </button>
      }
      filters={
        <CrmFilterPanel>
          <span className="text-xs font-medium" style={{ color: 'var(--crm-text-faint)' }}>
            الترتيب حسب
          </span>
          <div className="flex flex-wrap gap-2">
            {SORT_CHIPS.map((chip) => (
              <CrmChip
                key={chip.id}
                label={chip.label}
                active={applied.sort === chip.id}
                onClick={() => setSort(chip.id)}
              />
            ))}
          </div>

          <div className="ms-auto flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={draftFrom}
              onChange={(e) => setDraftFrom(e.target.value)}
              className={OWNER_REPORT_INPUT_CLASS}
              dir="ltr"
            />
            <span style={{ color: 'var(--crm-text-faint)' }}>←</span>
            <input
              type="date"
              value={draftTo}
              onChange={(e) => setDraftTo(e.target.value)}
              className={OWNER_REPORT_INPUT_CLASS}
              dir="ltr"
            />
            <button type="button" onClick={applyDates} className={CRM_PRIMARY_BTN}>
              <Icon name="search" size={18} />
              تطبيق
            </button>
          </div>
        </CrmFilterPanel>
      }
    >
      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {query.data && (
          <div className="flex flex-col gap-3.5">
            <div
              className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-xs"
              style={{ ...sectionStyle, color: 'var(--crm-text-faint)' }}
            >
              <span>الترتيب حسب: {sortMeta.label}</span>
              <span>
                {formatDisplayDate(query.data.from)} ← {formatDisplayDate(query.data.to)}
              </span>
            </div>

            {topThree.length > 0 && (
              <section className="grid gap-3.5 sm:grid-cols-3">
                {topThree.map((row) => {
                  const medal = medalFor(row.rank)
                  const value = metricValue(row, applied.sort)
                  const barPct = Math.round((value / podiumMax) * 100)
                  const branch = branchByUserId.get(row.owner_id) || '—'
                  return (
                    <button
                      key={row.owner_id}
                      type="button"
                      onClick={() =>
                        navigate(
                          `/crm/reports/owners/${row.owner_id}?from=${applied.from}&to=${applied.to}`,
                        )
                      }
                      className="flex flex-col gap-2.5 p-[18px] text-start"
                      style={{
                        background: 'var(--crm-surface)',
                        border: `1px solid ${medal.bd}`,
                        borderRadius: 'var(--crm-radius-md)',
                        boxShadow: 'var(--crm-shadow)',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="flex h-[26px] w-[26px] items-center justify-center rounded-[9px] text-xs font-bold"
                          style={{ background: medal.medalBg, color: medal.medalFg }}
                        >
                          {row.rank}
                        </span>
                        <span className="text-[11.5px]" style={{ color: 'var(--crm-text-faint)' }}>
                          {branch}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] text-[12.5px] font-semibold"
                          style={{
                            background: 'var(--crm-primary-soft)',
                            color: 'var(--crm-primary)',
                          }}
                        >
                          {row.owner_name.trim().slice(0, 1) || '—'}
                        </span>
                        <span className="truncate text-sm font-bold">{row.owner_name}</span>
                      </div>
                      <div className="flex items-end gap-2.5">
                        <span className="text-[28px] font-bold tracking-[-0.03em] leading-none">
                          {value}
                        </span>
                        <span
                          className="pb-1.5 text-xs"
                          style={{ color: 'var(--crm-text-faint)' }}
                        >
                          {sortMeta.metric}
                        </span>
                      </div>
                      <div
                        className="h-2 overflow-hidden rounded-full"
                        style={{ background: 'var(--crm-neutral-soft)' }}
                      >
                        <div
                          className="h-full rounded-[13px]"
                          style={{
                            width: `${Math.max(barPct, value > 0 ? 8 : 0)}%`,
                            background: medal.barColor,
                          }}
                        />
                      </div>
                    </button>
                  )
                })}
              </section>
            )}

            <CrmTable
              header={
                <>
                  <div
                    className="flex flex-col gap-0.5 px-[18px] py-3.5"
                    style={{ borderBottom: '1px solid var(--crm-border-soft)' }}
                  >
                    <h2 className="m-0 text-[14.5px] font-bold">ترتيب الموظفين</h2>
                    <p className="m-0 text-xs" style={{ color: 'var(--crm-text-faint)' }}>
                      المحوّل = تركيب مكتمل · الأنشطة = مكالمات + اجتماعات + مهام
                    </p>
                  </div>
                  <CrmTableHeader columns={TABLE_COLS}>
                    <CrmTableHeaderCell>الرتبة</CrmTableHeaderCell>
                    <CrmTableHeaderCell>الموظف</CrmTableHeaderCell>
                    <CrmTableHeaderCell>محوّل</CrmTableHeaderCell>
                    <CrmTableHeaderCell>ترشيحات</CrmTableHeaderCell>
                    <CrmTableHeaderCell>مكالمات</CrmTableHeaderCell>
                    <CrmTableHeaderCell>اجتماعات</CrmTableHeaderCell>
                    <CrmTableHeaderCell>مهام منجزة</CrmTableHeaderCell>
                    <CrmTableHeaderCell>معدل الإنجاز</CrmTableHeaderCell>
                  </CrmTableHeader>
                </>
              }
            >
              {query.data.rows.length === 0 ? (
                <p
                  className="m-0 px-[18px] py-10 text-center text-[13px]"
                  style={{ color: 'var(--crm-text-faint)' }}
                >
                  لا توجد بيانات في هذه الفترة
                </p>
              ) : (
                query.data.rows.map((row) => {
                  const medal = medalFor(row.rank)
                  const branch = branchByUserId.get(row.owner_id) || '—'
                  const rate = Math.min(100, Math.max(0, row.completion_rate))
                  return (
                    <CrmTableRow
                      key={row.owner_id}
                      columns={TABLE_COLS}
                      onClick={() =>
                        navigate(
                          `/crm/reports/owners/${row.owner_id}?from=${applied.from}&to=${applied.to}`,
                        )
                      }
                    >
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-[9px] text-[11.5px] font-bold"
                        style={{ background: medal.medalBg, color: medal.medalFg }}
                      >
                        {row.rank}
                      </span>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] text-[11px] font-semibold"
                          style={{
                            background: 'var(--crm-neutral-soft)',
                            color: 'var(--crm-text-muted)',
                          }}
                        >
                          {row.owner_name.trim().slice(0, 1) || '—'}
                        </span>
                        <div className="flex min-w-0 flex-col gap-px">
                          <span
                            className="truncate text-[13px] font-semibold"
                            style={{ color: 'var(--crm-primary)' }}
                          >
                            {row.owner_name}
                          </span>
                          <span className="truncate text-[11px]" style={{ color: 'var(--crm-text-disabled)' }}>
                            {branch}
                          </span>
                        </div>
                      </div>
                      <span className="text-[12.5px] font-bold tabular-nums">{row.converted}</span>
                      <span
                        className="text-[12.5px] tabular-nums"
                        style={{ color: 'var(--crm-text-secondary)' }}
                      >
                        {row.leads}
                      </span>
                      <span
                        className="text-[12.5px] tabular-nums"
                        style={{ color: 'var(--crm-text-secondary)' }}
                      >
                        {row.calls}
                      </span>
                      <span
                        className="text-[12.5px] tabular-nums"
                        style={{ color: 'var(--crm-text-secondary)' }}
                      >
                        {row.meetings}
                      </span>
                      <span
                        className="text-[12.5px] tabular-nums"
                        style={{ color: 'var(--crm-text-secondary)' }}
                      >
                        {row.done_activities}
                      </span>
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-1.5 min-w-9 flex-1 overflow-hidden rounded-full"
                          style={{ background: 'var(--crm-neutral-soft)' }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(rate, rate > 0 ? 4 : 0)}%`,
                              background: 'var(--crm-success)',
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold tabular-nums">{rate}%</span>
                      </div>
                    </CrmTableRow>
                  )
                })
              )}
            </CrmTable>
          </div>
        )}
      </AsyncState>
    </CrmPageShell>
  )
}
