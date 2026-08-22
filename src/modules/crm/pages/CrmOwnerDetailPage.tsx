import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type {
  Employee,
  OwnerDetailResponse,
  PaginatedResponse,
} from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { Icon } from '../../../components/Icon'
import { formatDatetime12hDisplay } from '../../../lib/datetime12h'
import {
  CRM_PRIMARY_BTN,
  CRM_SECONDARY_BTN,
  CrmFilterPanel,
  CrmPageShell,
} from '../components/CrmPageShell'
import { CrmStatusPill } from '../components/ui/CrmChip'
import { CrmKpiCard } from '../components/ui/CrmKpiCard'
import { referralStatusMeta } from '../lib/referralLeads'
import {
  defaultOwnerReportDateRange,
  downloadCsv,
  OWNER_REPORT_INPUT_CLASS,
} from '../lib/ownerReports'

const ACTIVITY_STATUS_LABELS: Record<string, string> = {
  open: 'مفتوحة',
  todo: 'للتنفيذ',
  in_progress: 'قيد التنفيذ',
  done: 'منجزة',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
  canceled: 'ملغاة',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'منخفض',
  medium: 'متوسط',
  high: 'مرتفع',
}

const sectionStyle: CSSProperties = {
  background: 'var(--crm-surface)',
  border: '1px solid var(--crm-border)',
  borderRadius: 'var(--crm-radius-md)',
  boxShadow: 'var(--crm-shadow)',
}

const listRowClass =
  'flex items-center gap-2.5 px-[18px] py-2.5 transition-colors'

function ListRow({ children }: { children: ReactNode }) {
  return (
    <div
      className={listRowClass}
      style={{ borderBottom: '1px solid var(--crm-border-soft)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--crm-surface-muted)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
    >
      {children}
    </div>
  )
}

function formatDisplayDate(iso: string) {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function formatDayLabel(iso: string) {
  const date = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('ar-EG', { numberingSystem: 'latn', day: 'numeric', month: 'short' })
}

function buildDailyActivity(data: OwnerDetailResponse) {
  const counts = new Map<string, number>()

  for (const activity of data.activities) {
    if (!activity.date) continue
    counts.set(activity.date, (counts.get(activity.date) ?? 0) + 1)
  }

  for (const call of data.calls ?? []) {
    const day = (call.date || call.start_time || call.created_at || '').slice(0, 10)
    if (!day) continue
    counts.set(day, (counts.get(day) ?? 0) + 1)
  }

  const rows = [...counts.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 7)

  const max = Math.max(1, ...rows.map(([, n]) => n))

  return rows.map(([day, n]) => ({
    day: formatDayLabel(day),
    n,
    pct: Math.round((n / max) * 100),
  }))
}

export function CrmOwnerDetailPage() {
  const { userId: routeUserId } = useParams<{ userId?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const initialRange = useMemo(() => defaultOwnerReportDateRange(), [])

  const initialUserId = routeUserId || searchParams.get('user_id') || ''
  const [draftFrom, setDraftFrom] = useState(searchParams.get('from') || initialRange.from)
  const [draftTo, setDraftTo] = useState(searchParams.get('to') || initialRange.to)
  const [draftOwnerId, setDraftOwnerId] = useState(initialUserId)
  const [applied, setApplied] = useState({
    from: searchParams.get('from') || initialRange.from,
    to: searchParams.get('to') || initialRange.to,
    userId: initialUserId,
  })

  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')

  useEffect(() => {
    if (!routeUserId) return
    const from = fromParam || initialRange.from
    const to = toParam || initialRange.to
    setDraftOwnerId(routeUserId)
    setDraftFrom(from)
    setDraftTo(to)
    setApplied({ userId: routeUserId, from, to })
  }, [routeUserId, fromParam, toParam, initialRange.from, initialRange.to])

  const employeesQuery = useQuery({
    queryKey: ['employees', 'crm-owner-detail'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', {
        params: { per_page: 100, 'filter[status]': 'active' },
      })
      return data.data.filter((emp) => emp.user_id != null)
    },
  })

  const query = useQuery({
    queryKey: ['crm-owner-detail', applied.userId, applied.from, applied.to],
    enabled: Boolean(applied.userId),
    queryFn: async () => {
      const { data } = await api.get<OwnerDetailResponse>(
        `/crm/reports/owners/${applied.userId}`,
        { params: { from: applied.from, to: applied.to } },
      )
      return data
    },
  })

  const applyFilters = () => {
    const next = {
      from: draftFrom,
      to: draftTo,
      userId: draftOwnerId,
    }
    setApplied(next)

    const params = new URLSearchParams()
    params.set('from', next.from)
    params.set('to', next.to)
    if (next.userId) params.set('user_id', next.userId)
    setSearchParams(params, { replace: true })

    if (next.userId) {
      navigate(`/crm/reports/owners/${next.userId}?${params.toString()}`, { replace: true })
    }
  }

  const selectedEmployee = useMemo(
    () =>
      (employeesQuery.data ?? []).find((emp) => String(emp.user_id) === String(applied.userId)),
    [employeesQuery.data, applied.userId],
  )

  const dailyActivity = useMemo(
    () => (query.data ? buildDailyActivity(query.data) : []),
    [query.data],
  )

  const employeeName = query.data?.user.name
  const summary = query.data?.summary
  const initial = (employeeName || '?').slice(0, 1)

  const roleBits = [
    selectedEmployee?.job_title || selectedEmployee?.job?.name || 'مبيعات',
    selectedEmployee?.branch?.name,
  ].filter(Boolean)

  const handleExport = () => {
    if (!query.data || !summary) return
    downloadCsv(
      `crm-owner-${applied.userId}.csv`,
      ['الاسم', 'الهاتف', 'الحالة', 'المصدر', 'محوّل'],
      query.data.leads.map((row) => [
        row.name || '',
        row.phone || '',
        referralStatusMeta(String(row.status)).label,
        row.source || '',
        row.converted ? 'نعم' : 'لا',
      ]),
    )
  }

  return (
    <CrmPageShell
      kicker="التحليلات"
      title="أداء الموظف"
      subtitle="الترشيحات والمكالمات والمهام لموظف واحد خلال الفترة."
      actions={
        <button
          type="button"
          onClick={handleExport}
          disabled={!query.data}
          className={`${CRM_PRIMARY_BTN} disabled:opacity-50`}
        >
          تصدير التقرير
        </button>
      }
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

            <label className="flex min-w-[180px] flex-col gap-1.5">
              <span className="text-[11.5px] font-semibold" style={{ color: 'var(--crm-text-faint)' }}>
                الموظف
              </span>
              <select
                value={draftOwnerId}
                onChange={(e) => setDraftOwnerId(e.target.value)}
                className={OWNER_REPORT_INPUT_CLASS}
              >
                <option value="">اختر موظفاً</option>
                {(employeesQuery.data ?? []).map((emp) => (
                  <option key={emp.id} value={String(emp.user_id)}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={applyFilters}
              disabled={!draftOwnerId}
              className={`${CRM_PRIMARY_BTN} disabled:opacity-50`}
            >
              <Icon name="search" size={18} />
              تطبيق
            </button>
          </div>
        </CrmFilterPanel>
      }
    >
      {!applied.userId ? (
        <section
          className="px-[18px] py-10 text-center text-[13px]"
          style={{
            ...sectionStyle,
            borderStyle: 'dashed',
            color: 'var(--crm-text-faint)',
          }}
        >
          اختر موظفاً ثم اضغط تطبيق لعرض الأداء
        </section>
      ) : (
        <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
          {query.data && summary && (
            <div className="flex flex-col gap-3.5">
              <section
                className="flex flex-wrap items-center gap-3.5 px-[18px] py-[18px]"
                style={sectionStyle}
              >
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center text-base font-semibold text-white"
                  style={{
                    borderRadius: 'var(--crm-radius-md)',
                    background: 'var(--crm-primary)',
                  }}
                >
                  {initial}
                </span>
                <div className="flex min-w-[200px] flex-1 flex-col gap-0.5">
                  <span className="text-[17px] font-bold tracking-[-0.02em]">
                    {employeeName}
                  </span>
                  <span className="text-[12.5px]" style={{ color: 'var(--crm-text-faint)' }}>
                    {roleBits.join(' — ')}
                    {' · '}
                    {formatDisplayDate(query.data.from)} ← {formatDisplayDate(query.data.to)}
                  </span>
                </div>
                <Link
                  to={`/crm/reports?from=${applied.from}&to=${applied.to}`}
                  className={CRM_SECONDARY_BTN}
                >
                  رجوع للتقارير
                </Link>
              </section>

              <section className="flex flex-wrap gap-3.5">
                <CrmKpiCard label="الترشيحات" value={summary.leads} />
                <CrmKpiCard label="إجمالي الأنشطة" value={summary.total_activities} />
                <CrmKpiCard label="مكالمات" value={summary.calls} />
                <CrmKpiCard label="محوّل" value={summary.converted} />
                <CrmKpiCard label="معدل التحويل" value={`${summary.conversion_rate}%`} />
              </section>

              <div className="grid items-start gap-3.5 [grid-template-columns:minmax(340px,1.4fr)_minmax(300px,1fr)] max-[960px]:grid-cols-1">
                <section className="overflow-hidden" style={sectionStyle}>
                  <div
                    className="flex items-center justify-between gap-2.5 px-[18px] py-3.5"
                    style={{ borderBottom: '1px solid var(--crm-border-soft)' }}
                  >
                    <h2 className="m-0 text-sm font-bold">ترشيحات الموظف</h2>
                    <Link
                      to="/crm/referrals/list"
                      className="text-[12.5px] font-semibold"
                      style={{ color: 'var(--crm-primary)' }}
                    >
                      فتح القائمة
                    </Link>
                  </div>

                  {query.data.leads.length === 0 ? (
                    <p
                      className="m-0 px-[18px] py-8 text-center text-[13px]"
                      style={{ color: 'var(--crm-text-faint)' }}
                    >
                      لا توجد ترشيحات في هذه الفترة
                    </p>
                  ) : (
                    query.data.leads.slice(0, 12).map((row) => {
                      const meta = referralStatusMeta(String(row.status))
                      const refLabel = row.source || row.company || '—'
                      return (
                        <Link
                          key={row.id}
                          to={`/crm/referrals/${row.id}`}
                          className="flex items-center gap-2.5 px-[18px] py-2.5 no-underline transition-colors"
                          style={{
                            borderBottom: '1px solid var(--crm-border-soft)',
                            color: 'inherit',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--crm-surface-muted)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="truncate text-[12.5px] font-semibold">
                              {row.name || 'بدون اسم'}
                            </span>
                            <span
                              className="truncate text-[11.5px]"
                              style={{ color: 'var(--crm-text-faint)' }}
                            >
                              <span dir="ltr">{row.phone || '—'}</span>
                              {' · المُحيل '}
                              {refLabel}
                            </span>
                          </div>
                          <CrmStatusPill label={meta.label} color={meta.color} tint={meta.tint} />
                        </Link>
                      )
                    })
                  )}
                </section>

                <section className="overflow-hidden" style={sectionStyle}>
                  <div
                    className="px-[18px] py-3.5"
                    style={{ borderBottom: '1px solid var(--crm-border-soft)' }}
                  >
                    <h2 className="m-0 text-sm font-bold">النشاط اليومي</h2>
                  </div>
                  <div className="flex flex-col gap-3.5 p-[18px]">
                    {dailyActivity.length === 0 ? (
                      <p
                        className="m-0 py-6 text-center text-[13px]"
                        style={{ color: 'var(--crm-text-faint)' }}
                      >
                        لا يوجد نشاط يومي في هذه الفترة
                      </p>
                    ) : (
                      dailyActivity.map((row) => (
                        <div key={row.day} className="flex items-center gap-2.5">
                          <span
                            className="w-[58px] shrink-0 text-[11.5px]"
                            style={{ color: 'var(--crm-text-faint)' }}
                          >
                            {row.day}
                          </span>
                          <div
                            className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full"
                            style={{ background: 'var(--crm-neutral-soft)' }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(row.pct, row.n > 0 ? 6 : 0)}%`,
                                background: 'var(--crm-primary)',
                              }}
                            />
                          </div>
                          <span className="w-[26px] text-start text-xs font-semibold tabular-nums">
                            {row.n}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>

              <div className="grid items-start gap-3.5 [grid-template-columns:minmax(340px,1fr)_minmax(340px,1fr)] max-[960px]:grid-cols-1">
                <section className="overflow-hidden" style={sectionStyle}>
                  <div
                    className="flex items-center justify-between gap-2.5 px-[18px] py-3.5"
                    style={{ borderBottom: '1px solid var(--crm-border-soft)' }}
                  >
                    <h2 className="m-0 text-sm font-bold">المهام</h2>
                    <Link
                      to="/crm/tasks"
                      className="text-[12.5px] font-semibold"
                      style={{ color: 'var(--crm-primary)' }}
                    >
                      فتح المهام
                    </Link>
                  </div>

                  {query.data.activities.length === 0 ? (
                    <p
                      className="m-0 px-[18px] py-8 text-center text-[13px]"
                      style={{ color: 'var(--crm-text-faint)' }}
                    >
                      لا توجد مهام في هذه الفترة
                    </p>
                  ) : (
                    query.data.activities.slice(0, 12).map((row) => {
                      const statusLabel =
                        ACTIVITY_STATUS_LABELS[row.status] || row.status
                      const priorityLabel = row.priority
                        ? PRIORITY_LABELS[row.priority] || row.priority
                        : null
                      const when = [row.date, row.time].filter(Boolean).join(' · ') || '—'
                      return (
                        <ListRow key={`${row.type}-${row.id}`}>
                          <span
                            className="h-[7px] w-[7px] shrink-0 rounded-full"
                            style={{ background: 'var(--crm-primary)' }}
                          />
                          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="truncate text-[12.5px] font-semibold">
                              {row.subject}
                            </span>
                            <span
                              className="truncate text-[11.5px]"
                              style={{ color: 'var(--crm-text-faint)' }}
                            >
                              {row.lead_name || '—'} · {when}
                              {priorityLabel ? ` · ${priorityLabel}` : ''}
                            </span>
                          </div>
                          <span
                            className="shrink-0 text-[11.5px] font-semibold"
                            style={{ color: 'var(--crm-text-secondary)' }}
                          >
                            {statusLabel}
                          </span>
                        </ListRow>
                      )
                    })
                  )}
                </section>

                <section className="overflow-hidden" style={sectionStyle}>
                  <div
                    className="flex items-center justify-between gap-2.5 px-[18px] py-3.5"
                    style={{ borderBottom: '1px solid var(--crm-border-soft)' }}
                  >
                    <h2 className="m-0 text-sm font-bold">المكالمات</h2>
                    <Link
                      to="/crm/call-logs"
                      className="text-[12.5px] font-semibold"
                      style={{ color: 'var(--crm-primary)' }}
                    >
                      فتح السجل
                    </Link>
                  </div>

                  {(query.data.calls ?? []).length === 0 ? (
                    <p
                      className="m-0 px-[18px] py-8 text-center text-[13px]"
                      style={{ color: 'var(--crm-text-faint)' }}
                    >
                      لا توجد مكالمات في هذه الفترة
                    </p>
                  ) : (
                    (query.data.calls ?? []).slice(0, 12).map((row) => {
                      const name = row.mobile_name || row.mobile_number || '—'
                      const when = formatDatetime12hDisplay(
                        row.start_time || row.created_at || row.date,
                      )
                      return (
                        <ListRow key={row.id}>
                          <span
                            className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[9px] text-[11px] font-semibold"
                            style={{
                              background: 'var(--crm-neutral-soft)',
                              color: 'var(--crm-text-muted)',
                            }}
                          >
                            {String(name).slice(0, 1)}
                          </span>
                          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="truncate text-[12.5px] font-semibold">{name}</span>
                            <span
                              className="truncate text-[11.5px]"
                              style={{ color: 'var(--crm-text-faint)' }}
                            >
                              <span dir="ltr">{row.mobile_number || '—'}</span>
                              {' · '}
                              {when}
                            </span>
                            {row.statement ? (
                              <span
                                className="line-clamp-1 text-[11.5px]"
                                style={{ color: 'var(--crm-text-muted)' }}
                              >
                                {row.statement}
                              </span>
                            ) : null}
                          </div>
                        </ListRow>
                      )
                    })
                  )}
                </section>
              </div>
            </div>
          )}
        </AsyncState>
      )}
    </CrmPageShell>
  )
}
