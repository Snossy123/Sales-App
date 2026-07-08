import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type { ReferralLead } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { PageHeader } from '../../../components/PageHeader'
import { StatusBadge } from '../../../components/StatusBadge'
import { ReferralStatusModal } from '../components/ReferralStatusModal'
import {
  formatReferralDateTime,
  referralStatusLabel,
  referrerLabel,
} from '../lib/referralLeads'

export function CrmReferralsFollowUpsPage() {
  const queryClient = useQueryClient()
  const [statusLead, setStatusLead] = useState<ReferralLead | null>(null)

  const query = useQuery({
    queryKey: ['referral-leads-due'],
    queryFn: async () => {
      const { data } = await api.get<ReferralLead[]>('/crm/referral-leads/follow-ups/due', {
        params: { include: 'referredByCustomer,referredByReferralLead,creator' },
      })
      return data
    },
  })

  const rows = query.data ?? []

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['referral-leads-due'] })
    queryClient.invalidateQueries({ queryKey: ['referral-leads'] })
  }

  return (
    <div>
      <PageHeader
        title="متابعات الترشيحات"
        subtitle="أرقام تحتاج إعادة اتصال اليوم أو قبله"
        actions={
          <Link
            to="/crm/referrals"
            className="rounded-lg border border-outline-variant px-md py-sm text-sm"
          >
            العودة للترشيحات
          </Link>
        }
      />

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<ReferralLead & Record<string, unknown>>
          data={rows as (ReferralLead & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          pageSize={20}
          emptyMessage="لا توجد متابعات مستحقة"
          columns={[
            {
              key: 'phone',
              header: 'الهاتف',
              className: 'tabular-nums',
              render: (row) => <span dir="ltr">{row.phone}</span>,
            },
            {
              key: 'name',
              header: 'الاسم',
              render: (row) => row.name || '—',
            },
            {
              key: 'referrer',
              header: 'المُحيل',
              render: (row) => referrerLabel(row),
            },
            {
              key: 'follow_up_at',
              header: 'موعد المتابعة',
              className: 'tabular-nums',
              render: (row) => formatReferralDateTime(row.follow_up_at),
            },
            {
              key: 'status',
              header: 'الحالة',
              render: (row) => (
                <StatusBadge status={row.status} label={referralStatusLabel(row.status)} />
              ),
            },
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <button
                  type="button"
                  onClick={() => setStatusLead(row)}
                  className="text-sm text-primary hover:underline"
                >
                  تحديث
                </button>
              ),
            },
          ]}
        />
      </AsyncState>

      <ReferralStatusModal
        lead={statusLead}
        onClose={() => setStatusLead(null)}
        onSuccess={invalidate}
      />
    </div>
  )
}
