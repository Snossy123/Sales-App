import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type { CrmDashboardStats, Lead, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { KpiCard } from '../../../components/KpiCard'
import { PageHeader } from '../../../components/PageHeader'
import { useAuthStore } from '../../../stores/authStore'

const STAGES = [
  { key: 'new', label: 'جديد', color: 'bg-surface-container-high' },
  { key: 'contacted', label: 'تم التواصل', color: 'bg-primary/10' },
  { key: 'negotiation', label: 'تفاوض', color: 'bg-[#ef9900]/10' },
  { key: 'qualified', label: 'مؤهل', color: 'bg-secondary-container/40' },
  { key: 'won', label: 'فوز', color: 'bg-secondary/10' },
  { key: 'lost', label: 'خسارة', color: 'bg-error/10' },
] as const

export function CrmPipelinePage() {
  const queryClient = useQueryClient()
  const branchId = useAuthStore((s) => s.branchId)

  const dashboardQuery = useQuery({
    queryKey: ['crm-dashboard'],
    queryFn: async () => {
      const { data } = await api.get<CrmDashboardStats>('/crm/dashboard')
      return data
    },
  })

  const query = useQuery({
    queryKey: ['leads', branchId],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 200,
        include: 'branch,assignee',
      }
      if (branchId) params['filter[branch_id]'] = branchId

      const { data } = await api.get<PaginatedResponse<Lead>>('/leads', { params })
      return data.data
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const { data } = await api.put<Lead>(`/leads/${id}`, { status })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard'] })
    },
  })

  const leadsByStage = (stage: string) =>
    (query.data ?? []).filter((l) => l.status === stage)

  const stats = dashboardQuery.data

  return (
    <div>
      <PageHeader
        title="خط أنابيب العملاء المحتملين"
        subtitle="إدارة مراحل العملاء المحتملين وتحويلهم"
      />

      <AsyncState
        isLoading={dashboardQuery.isLoading}
        isError={dashboardQuery.isError}
        error={dashboardQuery.error}
      >
        <div className="mb-md grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="متابعات اليوم"
            value={stats?.today_follow_ups ?? 0}
            icon="event"
          />
          <KpiCard
            label="تحويلات الشهر"
            value={stats?.converted_this_month ?? 0}
            icon="person_add"
          />
          <KpiCard
            label="نسبة التحويل"
            value={`${stats?.conversion_rate ?? 0}%`}
            icon="trending_up"
          />
          <KpiCard
            label="إجمالي العملاء المحتملين"
            value={Object.values(stats?.leads_by_status ?? {}).reduce((a, b) => a + b, 0)}
            icon="groups"
          />
        </div>
      </AsyncState>

      <AsyncState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
      >
        <div className="pipeline-scroll flex gap-md overflow-x-auto pb-md">
          {STAGES.map((stage) => {
            const leads = leadsByStage(stage.key)
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
                <ul className="max-h-[calc(100vh-320px)] space-y-sm overflow-y-auto p-sm">
                  {leads.map((lead) => (
                    <li
                      key={lead.id}
                      className="rounded-lg border border-outline-variant/80 bg-surface-container-lowest p-sm shadow-sm"
                    >
                      <p className="font-medium text-on-surface">{lead.name}</p>
                      <p className="tabular-nums text-xs text-on-surface-variant">
                        {lead.phone}
                      </p>
                      {lead.expected_value != null && (
                        <p className="mt-xs tabular-nums text-xs font-medium text-secondary">
                          {Number(lead.expected_value).toLocaleString('ar-EG')} ج.م
                        </p>
                      )}
                      {lead.source && (
                        <p className="mt-xs text-xs text-on-surface-variant">
                          {lead.source}
                        </p>
                      )}
                      <select
                        value={lead.status}
                        onChange={(e) =>
                          updateMutation.mutate({ id: lead.id, status: e.target.value })
                        }
                        className="mt-sm w-full rounded border border-outline-variant px-1 py-1 text-xs"
                      >
                        {STAGES.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                      </select>
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
    </div>
  )
}
