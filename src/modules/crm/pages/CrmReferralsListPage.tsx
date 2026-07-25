import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { Employee, PaginatedResponse, ReferralLead, ReferralLeadStatus } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DateTimeInput12h } from '../../../components/DateTimeInput12h'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { CrmLeadDrawer } from '../components/CrmLeadDrawer'
import {
  CRM_INPUT,
  CRM_PRIMARY_BTN,
  CRM_SECONDARY_BTN,
  CrmFilterPanel,
  CrmPageShell,
} from '../components/CrmPageShell'
import { ReferralStatusModal } from '../components/ReferralStatusModal'
import { CrmBulkActionBar } from '../components/ui/CrmBulkActionBar'
import { CrmChip } from '../components/ui/CrmChip'
import { CrmStatusPill } from '../components/ui/CrmChip'
import {
  CrmCheckbox,
  CrmTable,
  CrmTableFooter,
  CrmTableHeader,
  CrmTableHeaderCell,
  CrmTableRow,
} from '../components/ui/CrmTable'
import {
  formatReferralDateTime,
  formatReferralRelativeDue,
  leadDisplayCode,
  REFERRAL_STATUSES,
  referralStatusMeta,
  referrerLabel,
} from '../lib/referralLeads'

const COLS = '44px 1.4fr 1fr 1.3fr 1fr 1fr 1fr 90px'

export function CrmReferralsListPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ReferralLeadStatus | '' | 'all'>('all')
  const [selected, setSelected] = useState<Record<number, boolean>>({})
  const [drawerId, setDrawerId] = useState<number | null>(null)
  const [statusLead, setStatusLead] = useState<ReferralLead | null>(null)
  const [statusTarget, setStatusTarget] = useState<ReferralLeadStatus | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [assignUserId, setAssignUserId] = useState<number | ''>('')
  const [followUpAt, setFollowUpAt] = useState('')
  const [bulkError, setBulkError] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim(), 300)

  const query = useQuery({
    queryKey: ['referral-leads', 'list', debouncedSearch],
    queryFn: async () => {
      const params: Record<string, string | number | boolean> = {
        per_page: 200,
        include:
          'referredByCustomer,referredByReferralLead,creator,assignee,convertedCustomer',
      }

      if (debouncedSearch) {
        if (/^\d/.test(debouncedSearch)) {
          params['filter[phone]'] = debouncedSearch
        } else {
          params['filter[name]'] = debouncedSearch
        }
      }

      const { data } = await api.get<PaginatedResponse<ReferralLead>>('/crm/referral-leads', {
        params,
      })
      return data.data
    },
  })

  const employeesQuery = useQuery({
    queryKey: ['employees', 'crm-bulk-assign'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', {
        params: { per_page: 100, 'filter[status]': 'active' },
      })
      return data.data.filter((e) => e.user_id != null)
    },
  })

  const allRows = query.data ?? []
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allRows.length }
    for (const s of REFERRAL_STATUSES) {
      counts[s.key] = allRows.filter((r) => r.status === s.key).length
    }
    return counts
  }, [allRows])

  const rows = useMemo(
    () => (status === 'all' ? allRows : allRows.filter((r) => r.status === status)),
    [allRows, status],
  )

  const selIds = Object.keys(selected)
    .filter((k) => selected[Number(k)])
    .map(Number)
  const allOn = rows.length > 0 && selIds.length >= rows.length

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['referral-leads'] })
    queryClient.invalidateQueries({ queryKey: ['referral-leads-due'] })
  }

  const bulkMutation = useMutation({
    mutationFn: async (action: 'installed' | 'assign' | 'schedule') => {
      setBulkError('')
      if (action === 'installed') {
        await Promise.all(
          selIds.map((id) =>
            api.patch(`/crm/referral-leads/${id}/status`, { status: 'installed' }),
          ),
        )
        return
      }
      if (action === 'assign') {
        if (!assignUserId) throw new Error('اختر موظفاً')
        await Promise.all(
          selIds.map((id) =>
            api.patch(`/crm/referral-leads/${id}`, { assigned_to: assignUserId }),
          ),
        )
        return
      }
      if (!followUpAt) throw new Error('حدد موعد المتابعة')
      await Promise.all(
        selIds.map((id) => api.patch(`/crm/referral-leads/${id}`, { follow_up_at: followUpAt })),
      )
    },
    onSuccess: () => {
      setSelected({})
      setAssignOpen(false)
      setScheduleOpen(false)
      setAssignUserId('')
      setFollowUpAt('')
      invalidate()
    },
    onError: (err) => setBulkError(getErrorMessage(err)),
  })

  const toggleAll = () => {
    if (allOn) {
      setSelected({})
      return
    }
    const next: Record<number, boolean> = {}
    rows.forEach((r) => {
      next[r.id] = true
    })
    setSelected(next)
  }

  return (
    <CrmPageShell
      kicker="المبيعات"
      title="قائمة الترشيحات"
      subtitle="فلترة فورية وتحديد متعدد لإسناد أو جدولة عدة ترشيحات في خطوة واحدة."
      actions={
        <>
          <Link to="/crm/referrals" className={CRM_SECONDARY_BTN}>
            خط الترشيحات
          </Link>
          <Link to="/crm/referrals/add" className={CRM_PRIMARY_BTN}>
            <Icon name="add" size={18} />
            + ترشيح جديد
          </Link>
        </>
      }
      filters={
        <CrmFilterPanel>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو رقم الهاتف…"
            className={`${CRM_INPUT} min-w-[200px] flex-1`}
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <CrmChip
              label="الكل"
              count={statusCounts.all}
              dot="#a9b2c3"
              active={status === 'all'}
              onClick={() => setStatus('all')}
            />
            {REFERRAL_STATUSES.map((item) => (
              <CrmChip
                key={item.key}
                label={item.label}
                count={statusCounts[item.key] ?? 0}
                dot={item.hex}
                active={status === item.key}
                onClick={() => setStatus(item.key)}
              />
            ))}
          </div>
        </CrmFilterPanel>
      }
    >
      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <CrmTable
          header={
            <CrmTableHeader columns={COLS}>
              <CrmCheckbox checked={allOn} onChange={toggleAll} />
              <CrmTableHeaderCell>الاسم</CrmTableHeaderCell>
              <CrmTableHeaderCell>الهاتف</CrmTableHeaderCell>
              <CrmTableHeaderCell>الحالة</CrmTableHeaderCell>
              <CrmTableHeaderCell>المُحيل</CrmTableHeaderCell>
              <CrmTableHeaderCell>المتابعة</CrmTableHeaderCell>
              <CrmTableHeaderCell>التركيب</CrmTableHeaderCell>
              <CrmTableHeaderCell>إجراء</CrmTableHeaderCell>
            </CrmTableHeader>
          }
          footer={
            <CrmTableFooter>
              <span className="text-xs" style={{ color: 'var(--crm-text-faint)' }}>
                عرض {rows.length} ترشيح
              </span>
            </CrmTableFooter>
          }
        >
          {rows.length === 0 ? (
            <p className="px-3.5 py-8 text-center text-sm" style={{ color: 'var(--crm-text-faint)' }}>
              لا توجد ترشيحات مطابقة
            </p>
          ) : (
            rows.map((row) => {
              const meta = referralStatusMeta(row.status)
              const due = formatReferralRelativeDue(row.follow_up_at)
              const on = !!selected[row.id]
              return (
                <CrmTableRow key={row.id} columns={COLS} selected={on}>
                  <CrmCheckbox
                    checked={on}
                    onChange={() =>
                      setSelected((prev) => ({ ...prev, [row.id]: !prev[row.id] }))
                    }
                  />
                  <button
                    type="button"
                    className="flex flex-col gap-0.5 text-start"
                    onClick={() => setDrawerId(row.id)}
                  >
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--crm-primary)' }}>
                      {row.name || 'بدون اسم'}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--crm-text-disabled)' }}>
                      {leadDisplayCode(row)}
                    </span>
                  </button>
                  <span className="text-[12.5px] tabular-nums" dir="ltr" style={{ color: 'var(--crm-text-secondary)' }}>
                    {row.phone}
                  </span>
                  <CrmStatusPill label={meta.label} color={meta.color} tint={meta.tint} />
                  <span className="text-[12.5px]" style={{ color: 'var(--crm-text-secondary)' }}>
                    {referrerLabel(row)}
                  </span>
                  <span
                    className="text-[12.5px] font-medium"
                    style={{ color: due.overdue ? 'var(--crm-danger)' : 'var(--crm-text-secondary)' }}
                  >
                    {due.label}
                  </span>
                  <span className="text-[12.5px]" style={{ color: 'var(--crm-text-secondary)' }}>
                    {formatReferralDateTime(row.installation_scheduled_at)}
                  </span>
                  <button
                    type="button"
                    className="text-[12.5px] font-semibold"
                    style={{ color: 'var(--crm-primary)' }}
                    onClick={() => setDrawerId(row.id)}
                  >
                    عرض
                  </button>
                </CrmTableRow>
              )
            })
          )}
        </CrmTable>
      </AsyncState>

      <CrmBulkActionBar
        count={selIds.length}
        busy={bulkMutation.isPending}
        onClear={() => setSelected({})}
        onAssign={() => {
          setBulkError('')
          setAssignOpen(true)
        }}
        onSchedule={() => {
          setBulkError('')
          setScheduleOpen(true)
        }}
        onMarkInstalled={() => bulkMutation.mutate('installed')}
      />

      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="إسناد لموظف">
        <div className="crm-scope space-y-3">
          <select
            value={assignUserId}
            onChange={(e) => setAssignUserId(e.target.value ? Number(e.target.value) : '')}
            className={`w-full ${CRM_INPUT}`}
          >
            <option value="">اختر الموظف</option>
            {(employeesQuery.data ?? []).map((emp) => (
              <option key={emp.id} value={emp.user_id!}>
                {emp.name}
              </option>
            ))}
          </select>
          {bulkError ? (
            <p className="text-sm" style={{ color: 'var(--crm-danger)' }}>
              {bulkError}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={bulkMutation.isPending}
              className={CRM_PRIMARY_BTN}
              onClick={() => bulkMutation.mutate('assign')}
            >
              إسناد
            </button>
            <button type="button" className={CRM_SECONDARY_BTN} onClick={() => setAssignOpen(false)}>
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={scheduleOpen} onClose={() => setScheduleOpen(false)} title="جدولة متابعة">
        <div className="crm-scope space-y-3">
          <DateTimeInput12h value={followUpAt} onChange={setFollowUpAt} />
          {bulkError ? (
            <p className="text-sm" style={{ color: 'var(--crm-danger)' }}>
              {bulkError}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={bulkMutation.isPending}
              className={CRM_PRIMARY_BTN}
              onClick={() => bulkMutation.mutate('schedule')}
            >
              حفظ
            </button>
            <button
              type="button"
              className={CRM_SECONDARY_BTN}
              onClick={() => setScheduleOpen(false)}
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      <CrmLeadDrawer
        leadId={drawerId}
        onClose={() => setDrawerId(null)}
        onRequestStatusModal={(lead, nextStatus) => {
          setDrawerId(null)
          setStatusLead(lead)
          setStatusTarget(nextStatus)
        }}
      />

      <ReferralStatusModal
        lead={statusLead}
        initialStatus={statusTarget}
        onClose={() => {
          setStatusLead(null)
          setStatusTarget(null)
        }}
        onSuccess={invalidate}
      />
    </CrmPageShell>
  )
}
