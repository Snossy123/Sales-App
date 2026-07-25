import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, getErrorMessage } from '../../../api/client'
import type { ReferralLead, ReferralLeadStatus } from '../../../api/types'
import {
  formatReferralDateTime,
  leadDisplayCode,
  REFERRAL_STATUSES,
  REFERRAL_STATUSES_NEED_MODAL,
  referralStatusMeta,
  referrerLabel,
} from '../lib/referralLeads'
import { CRM_PRIMARY_BTN, CRM_SECONDARY_BTN } from './CrmPageShell'

interface CrmLeadDrawerProps {
  leadId: number | null
  onClose: () => void
  onRequestStatusModal: (lead: ReferralLead, status: ReferralLeadStatus) => void
  onScheduleInstall?: (lead: ReferralLead) => void
}

export function CrmLeadDrawer({
  leadId,
  onClose,
  onRequestStatusModal,
  onScheduleInstall,
}: CrmLeadDrawerProps) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['referral-leads', leadId],
    enabled: leadId != null,
    queryFn: async () => {
      const { data } = await api.get<ReferralLead>(`/crm/referral-leads/${leadId}`)
      return data
    },
  })

  const statusMutation = useMutation({
    mutationFn: async (status: ReferralLeadStatus) => {
      if (!leadId) throw new Error('no lead')
      const { data } = await api.patch<ReferralLead>(`/crm/referral-leads/${leadId}/status`, {
        status,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-leads'] })
      queryClient.invalidateQueries({ queryKey: ['referral-leads-due'] })
    },
  })

  if (leadId == null) return null

  const lead = query.data
  const ini = (lead?.name || lead?.phone || '؟').slice(0, 1)
  const error = statusMutation.isError ? getErrorMessage(statusMutation.error) : null

  const handleStatusClick = (status: ReferralLeadStatus) => {
    if (!lead || status === lead.status) return
    if (REFERRAL_STATUSES_NEED_MODAL.includes(status)) {
      onRequestStatusModal({ ...lead, status }, status)
      return
    }
    statusMutation.mutate(status)
  }

  return (
    <div className="crm-scope fixed inset-0 z-[70] flex">
      <button
        type="button"
        aria-label="إغلاق"
        className="flex-1 border-none"
        style={{ background: 'rgba(32,30,29,.34)' }}
        onClick={onClose}
      />
      <aside
        className="flex w-full max-w-[440px] flex-col"
        style={{
          background: 'var(--crm-surface)',
          borderInlineEnd: '1px solid var(--crm-border)',
          boxShadow: 'var(--crm-shadow-bulk)',
        }}
      >
        <div
          className="flex items-start gap-2.5 p-[18px]"
          style={{ borderBottom: '1px solid var(--crm-border-soft)' }}
        >
          <span
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[13px] text-sm font-semibold"
            style={{ background: 'var(--crm-primary-soft)', color: 'var(--crm-primary)' }}
          >
            {ini}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-base font-bold tracking-[-0.02em]">
              {lead?.name || 'بدون اسم'}
            </span>
            <span className="text-[12.5px]" style={{ color: 'var(--crm-text-faint)' }}>
              <span dir="ltr" className="tabular-nums">
                {lead?.phone}
              </span>
              {lead ? ` · ${leadDisplayCode(lead)}` : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] text-[13px]"
            style={{
              border: '1px solid var(--crm-border)',
              color: 'var(--crm-text-muted)',
              background: 'var(--crm-surface)',
            }}
          >
            ✕
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-[18px] overflow-y-auto p-[18px]">
          {query.isLoading ? (
            <p className="text-sm" style={{ color: 'var(--crm-text-faint)' }}>
              جاري التحميل…
            </p>
          ) : query.isError ? (
            <p className="text-sm" style={{ color: 'var(--crm-danger)' }}>
              تعذر تحميل الترشيح
            </p>
          ) : lead ? (
            <>
              <div className="flex flex-col gap-2.5">
                <span className="text-[11.5px] font-semibold" style={{ color: 'var(--crm-text-faint)' }}>
                  الحالة الحالية
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {REFERRAL_STATUSES.map((st) => {
                    const active = lead.status === st.key
                    const meta = referralStatusMeta(st.key)
                    return (
                      <button
                        key={st.key}
                        type="button"
                        disabled={statusMutation.isPending}
                        onClick={() => handleStatusClick(st.key)}
                        className="inline-flex h-8 items-center gap-2.5 px-2.5 text-xs font-semibold disabled:opacity-50"
                        style={{
                          borderRadius: 'var(--crm-radius-sm)',
                          border: `1px solid ${active ? meta.color : 'var(--crm-border)'}`,
                          background: active ? meta.tint : 'var(--crm-surface)',
                          color: active ? meta.color : 'var(--crm-text-muted)',
                        }}
                      >
                        <span className="crm-status-dot" style={{ background: meta.color, width: 6, height: 6 }} />
                        {st.label}
                      </button>
                    )
                  })}
                </div>
                {error ? (
                  <p className="text-xs" style={{ color: 'var(--crm-danger)' }}>
                    {error}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: 'المُحيل', value: referrerLabel(lead) },
                  { label: 'المسند إليه', value: lead.assignee?.name || lead.creator?.name || '—' },
                  { label: 'المتابعة القادمة', value: formatReferralDateTime(lead.follow_up_at) },
                  {
                    label: 'موعد التركيب',
                    value: formatReferralDateTime(lead.installation_scheduled_at),
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col gap-1.5 p-2.5"
                    style={{
                      background: 'var(--crm-surface-muted)',
                      border: '1px solid var(--crm-border-soft)',
                      borderRadius: 'var(--crm-radius-md)',
                    }}
                  >
                    <span className="text-[11px]" style={{ color: 'var(--crm-text-faint)' }}>
                      {item.label}
                    </span>
                    <span className="text-[13px] font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2.5">
                <span className="text-[11.5px] font-semibold" style={{ color: 'var(--crm-text-faint)' }}>
                  سجل النشاط
                </span>
                {(lead.timeline ?? []).length === 0 ? (
                  <p className="text-[12.5px]" style={{ color: 'var(--crm-text-faint)' }}>
                    لا يوجد نشاط بعد
                  </p>
                ) : (
                  (lead.timeline ?? []).slice(0, 12).map((event, i) => {
                    const meta = referralStatusMeta(
                      typeof event.meta?.status === 'string' ? event.meta.status : lead.status,
                    )
                    const color =
                      event.type === 'call'
                        ? 'var(--crm-primary)'
                        : event.type === 'status'
                          ? meta.color
                          : 'var(--crm-text-disabled)'
                    return (
                      <div key={`${event.at}-${i}`} className="flex gap-2.5">
                        <div className="flex shrink-0 flex-col items-center gap-1.5 pt-1.5">
                          <span className="crm-status-dot" style={{ background: color }} />
                          <span
                            className="min-h-[18px] w-px flex-1"
                            style={{ background: 'var(--crm-border-soft)' }}
                          />
                        </div>
                        <div className="flex flex-col gap-0.5 pb-1.5">
                          <span className="text-[12.5px] font-semibold">{event.title}</span>
                          <span className="text-[11.5px]" style={{ color: 'var(--crm-text-faint)' }}>
                            {[event.actor, formatReferralDateTime(event.at)].filter(Boolean).join(' · ')}
                            {event.body ? ` — ${event.body}` : ''}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <Link
                to={`/crm/referrals/${lead.id}`}
                className="text-[13px] font-semibold"
                style={{ color: 'var(--crm-primary)' }}
                onClick={onClose}
              >
                فتح الملف الكامل ←
              </Link>
            </>
          ) : null}
        </div>

        {lead ? (
          <div
            className="flex gap-2.5 px-[18px] py-3.5"
            style={{ borderTop: '1px solid var(--crm-border-soft)' }}
          >
            <Link
              to={`/crm/call-logs?referral_lead_id=${lead.id}`}
              className={`${CRM_PRIMARY_BTN} flex-1 justify-center`}
              onClick={onClose}
            >
              تسجيل مكالمة
            </Link>
            <button
              type="button"
              className={`${CRM_SECONDARY_BTN} flex-1 justify-center`}
              onClick={() => {
                if (onScheduleInstall) onScheduleInstall(lead)
                else onRequestStatusModal(lead, 'installation_scheduled')
              }}
            >
              جدولة تركيب
            </button>
          </div>
        ) : null}
      </aside>
    </div>
  )
}
