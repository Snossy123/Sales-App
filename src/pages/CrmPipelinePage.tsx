import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Lead, PaginatedResponse } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { Icon } from '../components/Icon'
import { getListScopeQueryKey, mergeScopedListParams } from '../lib/dataScope'
import { useAuthStore } from '../stores/authStore'

const STAGES = [
  { key: 'new', label: 'جديد', color: 'bg-surface-container-high' },
  { key: 'contacted', label: 'تم التواصل', color: 'bg-primary/10' },
  { key: 'negotiation', label: 'تفاوض', color: 'bg-[#ef9900]/10' },
  { key: 'qualified', label: 'انتظار التعاقد', color: 'bg-secondary-container/40' },
  { key: 'won', label: 'تم التعاقد', color: 'bg-secondary/10' },
  { key: 'lost', label: 'غير مهتم', color: 'bg-error/10' },
] as const

function formatDeviceCountLabel(count: number): string {
  if (count === 1) return '1 جهاز'
  if (count === 2) return '2 جهازان'
  return `${count} أجهزة`
}

export function CrmPipelinePage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const listScopeKey = getListScopeQueryKey(user)

  const query = useQuery({
    queryKey: ['leads', listScopeKey],
    queryFn: async () => {
      const params = mergeScopedListParams(user, {
        per_page: 200,
        include: 'branch,assignee',
      })

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
    },
  })

  const leadsByStage = (stage: string) =>
    (query.data ?? [])
      .filter((l) => l.status === stage)
      .sort((a, b) => (b.device_count ?? 0) - (a.device_count ?? 0))

  return (
    <div>
      <h1 className="mb-md text-2xl font-bold text-on-surface">العملاء المحتملين</h1>

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
                <ul className="max-h-[calc(100vh-220px)] space-y-sm overflow-y-auto p-sm">
                  {leads.map((lead) => (
                    <li
                      key={lead.id}
                      className="rounded-lg border border-outline-variant/80 bg-surface-container-lowest p-sm shadow-sm"
                    >
                      <p className="font-medium text-on-surface">{lead.name}</p>
                      <p className="tabular-nums text-xs text-on-surface-variant">
                        {lead.phone}
                      </p>
                      {lead.device_count != null && lead.device_count > 0 && (
                        <p className="mt-xs flex items-center gap-xs text-xs font-medium text-secondary">
                          <Icon name="devices" size={14} />
                          <span className="tabular-nums">
                            {formatDeviceCountLabel(lead.device_count)}
                          </span>
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
