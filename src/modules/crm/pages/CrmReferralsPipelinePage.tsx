import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type { PaginatedResponse, ReferralLead } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { Icon } from '../../../components/Icon'
import { KpiCard } from '../../../components/KpiCard'
import { PageHeader } from '../../../components/PageHeader'
import { ReferralStatusModal } from '../components/ReferralStatusModal'
import {
  formatReferralDateTime,
  REFERRAL_STATUSES,
  referrerLabel,
} from '../lib/referralLeads'

export function CrmReferralsPipelinePage() {
  const queryClient = useQueryClient()
  const [statusLead, setStatusLead] = useState<ReferralLead | null>(null)

  const query = useQuery({
    queryKey: ['referral-leads'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ReferralLead>>('/crm/referral-leads', {
        params: {
          per_page: 200,
          include: 'referredByCustomer,referredByReferralLead,creator',
        },
      })
      return data.data
    },
  })

  const dueQuery = useQuery({
    queryKey: ['referral-leads-due'],
    queryFn: async () => {
      const { data } = await api.get<ReferralLead[]>('/crm/referral-leads/follow-ups/due')
      return data
    },
  })

  const leadsByStatus = (status: string) =>
    (query.data ?? []).filter((lead) => lead.status === status)

  const summary = {
    total: query.data?.length ?? 0,
    due: dueQuery.data?.length ?? 0,
    installed: leadsByStatus('installed').length,
    scheduled: leadsByStatus('installation_scheduled').length,
  }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['referral-leads'] })
    queryClient.invalidateQueries({ queryKey: ['referral-leads-due'] })
  }

  return (
    <div>
      <PageHeader
        title="الترشيحات"
        subtitle="متابعة أرقام الترشيح من العملاء حتى التركيب"
        actions={
          <Link
            to="/crm/referrals/add"
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
          >
            <Icon name="add" size={18} />
            ترشيح جديد
          </Link>
        }
      />

      <div className="mb-md grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="إجمالي الترشيحات" value={summary.total} icon="groups" />
        <KpiCard label="متابعات مستحقة" value={summary.due} icon="event" />
        <KpiCard label="مواعيد مجدولة" value={summary.scheduled} icon="schedule" />
        <KpiCard label="تم التركيب" value={summary.installed} icon="check_circle" />
      </div>

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <div className="pipeline-scroll flex gap-md overflow-x-auto pb-md">
          {REFERRAL_STATUSES.map((stage) => {
            const leads = leadsByStatus(stage.key)
            return (
              <div
                key={stage.key}
                className="min-w-[260px] flex-shrink-0 rounded-lg border border-outline-variant bg-surface-container-lowest"
              >
                <div
                  className={`rounded-t-lg border-b border-outline-variant px-sm py-sm ${stage.color}`}
                >
                  <h3 className="text-sm font-bold text-on-surface">{stage.label}</h3>
                  <span className="text-xs text-on-surface-variant">{leads.length}</span>
                </div>
                <ul className="max-h-[calc(100vh-360px)] space-y-sm overflow-y-auto p-sm">
                  {leads.map((lead) => (
                    <li
                      key={lead.id}
                      className="rounded-lg border border-outline-variant/80 bg-surface-container-lowest p-sm shadow-sm"
                    >
                      <p className="font-medium text-on-surface">{lead.name || 'بدون اسم'}</p>
                      <p className="tabular-nums text-xs text-on-surface-variant" dir="ltr">
                        {lead.phone}
                      </p>
                      <p className="mt-xs text-xs text-on-surface-variant">
                        المُحيل: {referrerLabel(lead)}
                      </p>
                      {lead.follow_up_at && (
                        <p className="mt-xs text-xs text-primary">
                          متابعة: {formatReferralDateTime(lead.follow_up_at)}
                        </p>
                      )}
                      {lead.installation_scheduled_at && (
                        <p className="mt-xs text-xs text-secondary">
                          تركيب: {formatReferralDateTime(lead.installation_scheduled_at)}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => setStatusLead(lead)}
                        className="mt-sm text-xs font-medium text-primary hover:underline"
                      >
                        تغيير الحالة
                      </button>
                    </li>
                  ))}
                  {leads.length === 0 && (
                    <li className="py-md text-center text-xs text-on-surface-variant">
                      لا يوجد
                    </li>
                  )}
                </ul>
              </div>
            )
          })}
        </div>
      </AsyncState>

      <ReferralStatusModal
        lead={statusLead}
        onClose={() => setStatusLead(null)}
        onSuccess={invalidate}
      />
    </div>
  )
}
