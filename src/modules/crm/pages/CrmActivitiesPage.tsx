import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type {
  ActivitiesBoardCallRow,
  ActivitiesBoardInstallationRow,
  ActivitiesBoardResponse,
  ActivitiesBoardTaskRow,
  Employee,
  PaginatedResponse,
  ReferralLead,
} from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { Icon } from '../../../components/Icon'
import { formatDate } from '../../../lib/accounting'
import { formatDatetime12hDisplay } from '../../../lib/datetime12h'
import {
  CRM_PRIMARY_BTN,
  CRM_SECONDARY_BTN,
  CrmFilterPanel,
  CrmPageShell,
} from '../components/CrmPageShell'
import { CrmStatusPill } from '../components/ui/CrmChip'
import {
  CrmTable,
  CrmTableHeader,
  CrmTableHeaderCell,
  CrmTableRow,
} from '../components/ui/CrmTable'
import {
  defaultOwnerReportDateRange,
  OWNER_REPORT_INPUT_CLASS,
} from '../lib/ownerReports'

const INSTALL_COLS = '1fr 1.3fr 1.2fr 1fr 1fr 1.1fr'

function statusMeta(status: string): { label: string; color: string; tint: string } {
  const normalized = status.toLowerCase()
  const map: Record<string, { label: string; color: string; tint: string }> = {
    pending: { label: 'بانتظار التعيين', color: '#dc2626', tint: '#fdecec' },
    assigned: { label: 'تم التعيين', color: '#b45309', tint: '#fef3e2' },
    in_progress: { label: 'قيد التنفيذ', color: '#b45309', tint: '#fef3e2' },
    completed: { label: 'تم التنفيذ', color: '#15803d', tint: '#e7f6ec' },
    done: { label: 'منجزة', color: '#15803d', tint: '#e7f6ec' },
    open: { label: 'مفتوحة', color: '#b45309', tint: '#fef3e2' },
    todo: { label: 'للتنفيذ', color: '#64748b', tint: '#eef1f7' },
    cancelled: { label: 'ملغى', color: '#64748b', tint: '#eef1f7' },
  }
  return map[normalized] ?? { label: status, color: '#64748b', tint: '#eef1f7' }
}

export function CrmActivitiesPage() {
  const initialRange = useMemo(() => defaultOwnerReportDateRange(), [])
  const [draft, setDraft] = useState({
    userId: '',
    referralLeadId: '',
    from: initialRange.from,
    to: initialRange.to,
    status: '',
    mobile: '',
    mobile2: '',
  })
  const [applied, setApplied] = useState(draft)

  const employeesQuery = useQuery({
    queryKey: ['employees', 'crm-activities-board'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', {
        params: { per_page: 100, 'filter[status]': 'active' },
      })
      return data.data.filter((emp) => emp.user_id != null)
    },
  })

  const referralLeadsQuery = useQuery({
    queryKey: ['referral-leads', 'crm-activities-board'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ReferralLead>>('/crm/referral-leads', {
        params: { per_page: 100 },
      })
      return data.data
    },
  })

  const query = useQuery({
    queryKey: ['crm-activities-board', applied],
    queryFn: async () => {
      const { data } = await api.get<ActivitiesBoardResponse>('/crm/activities-board', {
        params: {
          from: applied.from,
          to: applied.to,
          per_page: 50,
          ...(applied.userId ? { user_id: Number(applied.userId) } : {}),
          ...(applied.referralLeadId
            ? { referral_lead_id: Number(applied.referralLeadId) }
            : {}),
          ...(applied.status ? { status: applied.status } : {}),
          ...(applied.mobile ? { mobile: applied.mobile } : {}),
          ...(applied.mobile2 ? { mobile2: applied.mobile2 } : {}),
        },
      })
      return data
    },
  })

  const applyFilters = () => setApplied({ ...draft })
  const resetFilters = () => {
    const next = {
      userId: '',
      referralLeadId: '',
      from: initialRange.from,
      to: initialRange.to,
      status: '',
      mobile: '',
      mobile2: '',
    }
    setDraft(next)
    setApplied(next)
  }

  return (
    <CrmPageShell
      kicker="العمل اليومي"
      title="الأنشطة"
      subtitle="مهام التركيب والمكالمات والمهام في شاشة واحدة."
      headerExtra={
        query.data ? (
          <span className="text-xs" style={{ color: 'var(--crm-text-faint)' }}>
            {query.data.summary.total} نشاط في الفترة المحددة
          </span>
        ) : null
      }
      filters={
        <CrmFilterPanel>
          <div className="flex flex-wrap items-center gap-2.5">
            <label
              className="inline-flex h-[38px] items-center gap-2.5 px-2.5"
              style={{
                border: '1px solid var(--crm-border)',
                borderRadius: 9,
                background: 'var(--crm-surface-muted)',
              }}
            >
              <span className="text-[11.5px]" style={{ color: 'var(--crm-text-faint)' }}>
                من
              </span>
              <input
                type="date"
                value={draft.from}
                onChange={(e) => setDraft((prev) => ({ ...prev, from: e.target.value }))}
                className="border-none bg-transparent text-[12.5px] font-medium outline-none"
                dir="ltr"
              />
            </label>
            <label
              className="inline-flex h-[38px] items-center gap-2.5 px-2.5"
              style={{
                border: '1px solid var(--crm-border)',
                borderRadius: 9,
                background: 'var(--crm-surface-muted)',
              }}
            >
              <span className="text-[11.5px]" style={{ color: 'var(--crm-text-faint)' }}>
                إلى
              </span>
              <input
                type="date"
                value={draft.to}
                onChange={(e) => setDraft((prev) => ({ ...prev, to: e.target.value }))}
                className="border-none bg-transparent text-[12.5px] font-medium outline-none"
                dir="ltr"
              />
            </label>
            <select
              value={draft.userId}
              onChange={(e) => setDraft((prev) => ({ ...prev, userId: e.target.value }))}
              className={OWNER_REPORT_INPUT_CLASS}
            >
              <option value="">كل الموظفين</option>
              {(employeesQuery.data ?? []).map((emp) => (
                <option key={emp.id} value={String(emp.user_id)}>
                  {emp.name}
                </option>
              ))}
            </select>
            <select
              value={draft.referralLeadId}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, referralLeadId: e.target.value }))
              }
              className={OWNER_REPORT_INPUT_CLASS}
            >
              <option value="">كل الترشيحات</option>
              {(referralLeadsQuery.data ?? []).map((lead) => (
                <option key={lead.id} value={String(lead.id)}>
                  {lead.name || lead.phone}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={draft.mobile}
              onChange={(e) => setDraft((prev) => ({ ...prev, mobile: e.target.value }))}
              className={OWNER_REPORT_INPUT_CLASS}
              dir="ltr"
              placeholder="جوال"
            />
            <div className="flex-1" />
            <button type="button" onClick={applyFilters} className={CRM_PRIMARY_BTN}>
              <Icon name="search" size={18} />
              بحث
            </button>
            <button type="button" onClick={resetFilters} className={CRM_SECONDARY_BTN}>
              <Icon name="refresh" size={18} />
              إعادة
            </button>
          </div>
        </CrmFilterPanel>
      }
    >
      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {query.data ? (
          <>
            <InstallationsPanel rows={query.data.installations} count={query.data.summary.installations} />
            <div className="grid gap-3.5 lg:grid-cols-2">
              <TasksPanel rows={query.data.tasks} />
              <CallsPanel rows={query.data.calls} />
            </div>
          </>
        ) : null}
      </AsyncState>
    </CrmPageShell>
  )
}

function PanelShell({
  title,
  subtitle,
  actionTo,
  actionLabel,
  children,
}: {
  title: string
  subtitle: string
  actionTo: string
  actionLabel: string
  children: ReactNode
}) {
  return (
    <section
      className="overflow-hidden"
      style={{
        background: 'var(--crm-surface)',
        border: '1px solid var(--crm-border)',
        borderRadius: 'var(--crm-radius-md)',
        boxShadow: 'var(--crm-shadow)',
      }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-[18px] py-3.5"
        style={{ borderBottom: '1px solid var(--crm-border-soft)' }}
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-[14.5px] font-bold">{title}</span>
          <span className="text-xs" style={{ color: 'var(--crm-text-faint)' }}>
            {subtitle}
          </span>
        </div>
        <Link
          to={actionTo}
          className="text-[12.5px] font-semibold"
          style={{ color: 'var(--crm-primary)' }}
        >
          {actionLabel}
        </Link>
      </div>
      {children}
    </section>
  )
}

function InstallationsPanel({
  rows,
  count,
}: {
  rows: ActivitiesBoardInstallationRow[]
  count: number
}) {
  return (
    <PanelShell
      title="مهام التركيب"
      subtitle={`تركيب الأجهزة من الدعم الفني · ${count} مهمة`}
      actionTo="/support/tasks"
      actionLabel="فتح الدعم الفني"
    >
      {rows.length === 0 ? (
        <p className="px-[18px] py-8 text-center text-sm" style={{ color: 'var(--crm-text-faint)' }}>
          لا توجد مهام تركيب
        </p>
      ) : (
        <CrmTable
          header={
            <CrmTableHeader columns={INSTALL_COLS}>
              <CrmTableHeaderCell>العقد</CrmTableHeaderCell>
              <CrmTableHeaderCell>العميل</CrmTableHeaderCell>
              <CrmTableHeaderCell>السيريال</CrmTableHeaderCell>
              <CrmTableHeaderCell>تاريخ التنفيذ</CrmTableHeaderCell>
              <CrmTableHeaderCell>الفني</CrmTableHeaderCell>
              <CrmTableHeaderCell>الحالة</CrmTableHeaderCell>
            </CrmTableHeader>
          }
        >
          {rows.map((row) => {
            const meta = statusMeta(row.status)
            return (
              <CrmTableRow key={row.id} columns={INSTALL_COLS}>
                <span className="text-[12.5px] font-semibold" style={{ color: 'var(--crm-primary)' }}>
                  {row.invoice_number || '—'}
                </span>
                <span className="text-[12.5px]">{row.customer_name || '—'}</span>
                <span className="text-[12.5px]" style={{ color: 'var(--crm-text-muted)' }}>
                  {row.serial_number || '—'}
                </span>
                <span className="text-[12.5px]" style={{ color: 'var(--crm-text-secondary)' }}>
                  {formatDate(row.executed_at)}
                </span>
                <span className="text-[12.5px]" style={{ color: 'var(--crm-text-secondary)' }}>
                  {row.employee_name || '—'}
                </span>
                <CrmStatusPill label={meta.label} color={meta.color} tint={meta.tint} />
              </CrmTableRow>
            )
          })}
        </CrmTable>
      )}
    </PanelShell>
  )
}

function TasksPanel({ rows }: { rows: ActivitiesBoardTaskRow[] }) {
  return (
    <PanelShell
      title="المهام"
      subtitle="متابعات وقوائم أعمال"
      actionTo="/crm/tasks"
      actionLabel="فتح المهام"
    >
      {rows.length === 0 ? (
        <p className="px-[18px] py-8 text-center text-sm" style={{ color: 'var(--crm-text-faint)' }}>
          لا توجد مهام
        </p>
      ) : (
        rows.map((row) => {
          const meta = statusMeta(row.status)
          return (
            <div
              key={row.id}
              className="flex items-center gap-2.5 px-[18px] py-2.5"
              style={{ borderBottom: '1px solid var(--crm-border-soft)' }}
            >
              <span
                className="h-[7px] w-[7px] shrink-0 rounded-full"
                style={{ background: meta.color }}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[12.5px] font-semibold">{row.subject}</span>
                <span className="text-[11.5px]" style={{ color: 'var(--crm-text-faint)' }}>
                  {row.owner_name} · {formatDatetime12hDisplay(row.date)}
                </span>
              </div>
              <span className="text-[11.5px] font-semibold" style={{ color: meta.color }}>
                {meta.label}
              </span>
            </div>
          )
        })
      )}
    </PanelShell>
  )
}

function CallsPanel({ rows }: { rows: ActivitiesBoardCallRow[] }) {
  return (
    <PanelShell
      title="المكالمات"
      subtitle="سجل المكالمات الهاتفية"
      actionTo="/crm/call-logs"
      actionLabel="فتح السجل"
    >
      {rows.length === 0 ? (
        <p className="px-[18px] py-8 text-center text-sm" style={{ color: 'var(--crm-text-faint)' }}>
          لا توجد مكالمات
        </p>
      ) : (
        rows.map((row) => {
          const meta = statusMeta(row.status)
          const name = row.referral_lead_name || row.subject || '—'
          const phone = row.phones[0] ?? '—'
          return (
            <div
              key={row.id}
              className="flex items-center gap-2.5 px-[18px] py-2.5"
              style={{ borderBottom: '1px solid var(--crm-border-soft)' }}
            >
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
                  className="text-[11.5px] tabular-nums"
                  dir="ltr"
                  style={{ color: 'var(--crm-text-faint)' }}
                >
                  {phone} · {formatDatetime12hDisplay(row.date)}
                </span>
              </div>
              <span className="text-[11.5px] font-semibold" style={{ color: meta.color }}>
                {meta.label}
              </span>
            </div>
          )
        })
      )}
    </PanelShell>
  )
}
