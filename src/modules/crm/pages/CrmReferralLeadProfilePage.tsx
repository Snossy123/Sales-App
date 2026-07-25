import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { ReferralLead, ReferralLeadStatus, ReferralLeadTimelineEvent } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { Icon } from '../../../components/Icon'
import {
  CRM_PRIMARY_BTN,
  CRM_SECONDARY_BTN,
  CrmPageShell,
} from '../components/CrmPageShell'
import { ReferralStatusModal } from '../components/ReferralStatusModal'
import {
  formatReferralDateTime,
  leadDisplayCode,
  REFERRAL_STATUSES,
  REFERRAL_STATUSES_NEED_MODAL,
  referralStatusMeta,
  referrerLabel,
} from '../lib/referralLeads'

export function CrmReferralLeadProfilePage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [statusTarget, setStatusTarget] = useState<ReferralLeadStatus | null>(null)

  const query = useQuery({
    queryKey: ['crm-referral-lead', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<ReferralLead>(`/crm/referral-leads/${id}`)
      return data
    },
  })

  const statusMutation = useMutation({
    mutationFn: async (status: ReferralLeadStatus) => {
      if (!id) throw new Error('no lead')
      const { data } = await api.patch<ReferralLead>(`/crm/referral-leads/${id}/status`, {
        status,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-referral-lead', id] })
      queryClient.invalidateQueries({ queryKey: ['referral-leads'] })
    },
  })

  const lead = query.data
  const timeline = lead?.timeline ?? []
  const ini = (lead?.name || lead?.phone || '؟').slice(0, 1)

  const handleStatusClick = (status: ReferralLeadStatus) => {
    if (!lead || status === lead.status) return
    if (REFERRAL_STATUSES_NEED_MODAL.includes(status)) {
      setStatusTarget(status)
      return
    }
    statusMutation.mutate(status)
  }

  return (
    <CrmPageShell
      kicker="الترشيحات"
      title={lead?.name?.trim() || lead?.phone || 'ملف الترشيح'}
      subtitle={
        lead
          ? `${leadDisplayCode(lead)} · سجل كل التعاملات على الترشيح`
          : 'سجل كل التعاملات على الترشيح في النظام'
      }
      headerExtra={
        lead ? (
          <span
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[13px] text-sm font-semibold"
            style={{ background: 'var(--crm-primary-soft)', color: 'var(--crm-primary)' }}
          >
            {ini}
          </span>
        ) : null
      }
      actions={
        <>
          {lead ? (
            <Link
              to={`/crm/call-logs?referral_lead_id=${lead.id}`}
              className={CRM_PRIMARY_BTN}
            >
              تسجيل مكالمة
            </Link>
          ) : null}
          <Link to="/crm/referrals" className={CRM_SECONDARY_BTN}>
            <Icon name="arrow_forward" size={18} />
            الترشيحات
          </Link>
        </>
      }
    >
      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {lead && (
          <>
            <section className="flex flex-col gap-2.5">
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
                      <span
                        className="crm-status-dot"
                        style={{ background: meta.color, width: 6, height: 6 }}
                      />
                      {st.label}
                    </button>
                  )
                })}
              </div>
              {statusMutation.isError ? (
                <p className="m-0 text-xs" style={{ color: 'var(--crm-danger)' }}>
                  {getErrorMessage(statusMutation.error)}
                </p>
              ) : null}
            </section>

            <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
              {[
                { label: 'الهاتف', value: lead.phone, ltr: true },
                { label: 'المُحيل', value: referrerLabel(lead) },
                {
                  label: 'المسند إليه',
                  value: lead.assignee?.name || lead.creator?.name || '—',
                },
                {
                  label: 'المتابعة القادمة',
                  value: formatReferralDateTime(lead.follow_up_at),
                },
                {
                  label: 'موعد التركيب',
                  value: formatReferralDateTime(lead.installation_scheduled_at),
                },
                {
                  label: 'عميل محوّل',
                  value: lead.converted_customer ? (
                    <Link
                      to={`/customers/${lead.converted_customer.id}`}
                      className="font-semibold"
                      style={{ color: 'var(--crm-primary)' }}
                    >
                      {lead.converted_customer.name}
                    </Link>
                  ) : (
                    '—'
                  ),
                },
                {
                  label: 'تاريخ الإنشاء',
                  value: formatReferralDateTime(lead.created_at),
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
                  <span
                    className="text-[13px] font-semibold"
                    dir={item.ltr ? 'ltr' : undefined}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
              {lead.notes ? (
                <div
                  className="col-span-2 flex flex-col gap-1.5 p-2.5 lg:col-span-3"
                  style={{
                    background: 'var(--crm-surface-muted)',
                    border: '1px solid var(--crm-border-soft)',
                    borderRadius: 'var(--crm-radius-md)',
                  }}
                >
                  <span className="text-[11px]" style={{ color: 'var(--crm-text-faint)' }}>
                    ملاحظات
                  </span>
                  <span className="whitespace-pre-wrap text-[13px] font-semibold">{lead.notes}</span>
                </div>
              ) : null}
            </section>

            <section
              className="flex flex-col gap-2.5 p-[18px]"
              style={{
                background: 'var(--crm-surface)',
                border: '1px solid var(--crm-border)',
                borderRadius: 'var(--crm-radius-md)',
                boxShadow: 'var(--crm-shadow)',
              }}
            >
              <span className="text-[11.5px] font-semibold" style={{ color: 'var(--crm-text-faint)' }}>
                سجل النشاط
              </span>
              {timeline.length === 0 ? (
                <p className="m-0 py-6 text-center text-[12.5px]" style={{ color: 'var(--crm-text-faint)' }}>
                  لا يوجد نشاط بعد
                </p>
              ) : (
                timeline.map((event, i) => (
                  <TimelineRow key={`${event.type}-${event.at}-${i}`} event={event} lead={lead} />
                ))
              )}
            </section>
          </>
        )}
      </AsyncState>

      <ReferralStatusModal
        lead={statusTarget && lead ? lead : null}
        initialStatus={statusTarget}
        onClose={() => setStatusTarget(null)}
        onSuccess={() => {
          setStatusTarget(null)
          queryClient.invalidateQueries({ queryKey: ['crm-referral-lead', id] })
          queryClient.invalidateQueries({ queryKey: ['referral-leads'] })
        }}
      />
    </CrmPageShell>
  )
}

function TimelineRow({
  event,
  lead,
}: {
  event: ReferralLeadTimelineEvent
  lead: ReferralLead
}) {
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
    <div className="flex gap-2.5">
      <div className="flex shrink-0 flex-col items-center gap-1.5 pt-1.5">
        <span className="crm-status-dot" style={{ background: color }} />
        <span className="min-h-[18px] w-px flex-1" style={{ background: 'var(--crm-border-soft)' }} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pb-1.5">
        <span className="text-[12.5px] font-semibold">{event.title}</span>
        <span className="text-[11.5px]" style={{ color: 'var(--crm-text-faint)' }}>
          {[event.actor, formatReferralDateTime(event.at)].filter(Boolean).join(' · ')}
          {event.body ? ` — ${event.body}` : ''}
        </span>
        {event.type === 'call' && typeof event.meta?.audio_url === 'string' && (
          <audio controls preload="none" className="mt-1.5 h-10 w-full max-w-md" src={event.meta.audio_url}>
            <track kind="captions" />
          </audio>
        )}
        {event.type === 'task' && event.meta?.task_id != null && (
          <Link
            to="/crm/tasks"
            className="mt-1 text-[12.5px] font-semibold"
            style={{ color: 'var(--crm-primary)' }}
          >
            فتح المهام #{String(event.meta.task_id)}
          </Link>
        )}
      </div>
    </div>
  )
}
