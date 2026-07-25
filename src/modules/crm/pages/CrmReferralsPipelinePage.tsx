import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type { PaginatedResponse, ReferralLead, ReferralLeadStatus } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { Icon } from '../../../components/Icon'
import { CrmLeadDrawer } from '../components/CrmLeadDrawer'
import { CRM_PRIMARY_BTN, CRM_SECONDARY_BTN, CrmPageShell } from '../components/CrmPageShell'
import { ReferralStatusModal } from '../components/ReferralStatusModal'
import { CrmChip } from '../components/ui/CrmChip'
import { CrmKanbanBoard, CrmKanbanColumn } from '../components/ui/CrmKanban'
import { CrmKpiCard } from '../components/ui/CrmKpiCard'
import { CrmLeadCard } from '../components/ui/CrmLeadCard'
import { CrmToolbar } from '../components/ui/CrmToolbar'
import {
  REFERRAL_STATUSES,
  REFERRAL_STATUSES_NEED_MODAL,
} from '../lib/referralLeads'

type AgentFilter = 'all' | number

export function CrmReferralsPipelinePage() {
  const queryClient = useQueryClient()
  const dragId = useRef<number | null>(null)
  const [agentFilter, setAgentFilter] = useState<AgentFilter>('all')
  const [drawerId, setDrawerId] = useState<number | null>(null)
  const [statusLead, setStatusLead] = useState<ReferralLead | null>(null)
  const [statusTarget, setStatusTarget] = useState<ReferralLeadStatus | null>(null)
  const [optimistic, setOptimistic] = useState<Record<number, ReferralLeadStatus>>({})

  const query = useQuery({
    queryKey: ['referral-leads'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ReferralLead>>('/crm/referral-leads', {
        params: {
          per_page: 200,
          include: 'referredByCustomer,referredByReferralLead,creator,assignee',
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

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: ReferralLeadStatus }) => {
      const { data } = await api.patch<ReferralLead>(`/crm/referral-leads/${id}/status`, { status })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-leads'] })
      queryClient.invalidateQueries({ queryKey: ['referral-leads-due'] })
    },
  })

  const leads = useMemo(() => {
    const raw = query.data ?? []
    return raw.map((lead) =>
      optimistic[lead.id] ? { ...lead, status: optimistic[lead.id] } : lead,
    )
  }, [query.data, optimistic])

  const agents = useMemo(() => {
    const map = new Map<number, string>()
    for (const lead of query.data ?? []) {
      const id = lead.assigned_to ?? lead.assignee?.id ?? lead.created_by
      const name = lead.assignee?.name ?? lead.creator?.name
      if (id && name) map.set(id, name)
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [query.data])

  const visible = useMemo(() => {
    if (agentFilter === 'all') return leads
    return leads.filter(
      (l) => (l.assigned_to ?? l.assignee?.id ?? l.created_by) === agentFilter,
    )
  }, [leads, agentFilter])

  const leadsByStatus = (status: ReferralLeadStatus) =>
    visible.filter((lead) => lead.status === status)

  const total = visible.length
  const installed = leadsByStatus('installed').length
  const scheduled = leadsByStatus('installation_scheduled').length
  const conv = total > 0 ? ((installed / total) * 100).toFixed(1) + '%' : '0%'

  const invalidate = () => {
    setOptimistic({})
    queryClient.invalidateQueries({ queryKey: ['referral-leads'] })
    queryClient.invalidateQueries({ queryKey: ['referral-leads-due'] })
  }

  const openStatusModal = (lead: ReferralLead, status: ReferralLeadStatus) => {
    setStatusLead(lead)
    setStatusTarget(status)
  }

  const handleDrop = (targetStatus: ReferralLeadStatus) => {
    const id = dragId.current
    dragId.current = null
    if (id == null) return
    const lead = (query.data ?? []).find((l) => l.id === id)
    if (!lead || lead.status === targetStatus) return

    setOptimistic((prev) => ({ ...prev, [id]: targetStatus }))

    if (REFERRAL_STATUSES_NEED_MODAL.includes(targetStatus)) {
      openStatusModal(lead, targetStatus)
      return
    }

    statusMutation.mutate(
      { id, status: targetStatus },
      {
        onSuccess: () => setOptimistic((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        }),
        onError: () => setOptimistic((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        }),
      },
    )
  }

  const closeStatusModal = () => {
    if (statusLead) {
      setOptimistic((prev) => {
        const next = { ...prev }
        delete next[statusLead.id]
        return next
      })
    }
    setStatusLead(null)
    setStatusTarget(null)
  }

  return (
    <CrmPageShell
      kicker="المبيعات"
      title="خط الترشيحات"
      subtitle="كل ترشيح من أول مكالمة حتى التركيب — اسحب البطاقات لتحديث الحالة فوراً."
      actions={
        <>
          <Link to="/crm/referrals/list" className={CRM_SECONDARY_BTN}>
            تصدير
          </Link>
          <Link to="/crm/referrals/add" className={CRM_PRIMARY_BTN}>
            <Icon name="add" size={18} />
            + ترشيح جديد
          </Link>
        </>
      }
    >
      <div className="flex flex-wrap gap-3.5" data-tour="crm-kpis">
        <CrmKpiCard
          variant="primary"
          label="إجمالي الترشيحات"
          value={total}
          hint="هذا الشهر"
        />
        <CrmKpiCard
          variant="danger"
          label="متابعات مستحقة اليوم"
          value={dueQuery.data?.length ?? 0}
          hint="تحتاج مكالمة قبل نهاية اليوم"
        />
        <CrmKpiCard
          variant="warning"
          label="مواعيد تركيب مجدولة"
          value={scheduled}
          hint="أقرب مواعيد التركيب"
        />
        <CrmKpiCard
          variant="success"
          label="معدل التحويل"
          value={conv}
          hint={`${installed} تركيب مكتمل`}
        />
      </div>

      <CrmToolbar
        hint="اسحب أي بطاقة بين الأعمدة لتغيير حالتها"
        end={
          <>
            <CrmChip
              label="كل الموظفين"
              active={agentFilter === 'all'}
              onClick={() => setAgentFilter('all')}
            />
            {agents.slice(0, 6).map((agent) => (
              <CrmChip
                key={agent.id}
                label={agent.name}
                active={agentFilter === agent.id}
                onClick={() => setAgentFilter(agent.id)}
              />
            ))}
          </>
        }
      />

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <CrmKanbanBoard columns={4}>
          {REFERRAL_STATUSES.map((stage) => {
            const columnLeads = leadsByStatus(stage.key)
            return (
              <CrmKanbanColumn
                key={stage.key}
                title={stage.label}
                count={columnLeads.length}
                dotColor={stage.hex}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  handleDrop(stage.key)
                }}
              >
                {columnLeads.map((lead) => (
                  <CrmLeadCard
                    key={lead.id}
                    lead={lead}
                    onOpen={() => setDrawerId(lead.id)}
                    onDragStart={() => {
                      dragId.current = lead.id
                    }}
                  />
                ))}
                {columnLeads.length === 0 ? (
                  <p className="py-8 text-center text-xs" style={{ color: 'var(--crm-text-faint)' }}>
                    لا توجد ترشيحات
                  </p>
                ) : null}
              </CrmKanbanColumn>
            )
          })}
        </CrmKanbanBoard>
      </AsyncState>

      <CrmLeadDrawer
        leadId={drawerId}
        onClose={() => setDrawerId(null)}
        onRequestStatusModal={(lead, status) => {
          setDrawerId(null)
          openStatusModal(lead, status)
        }}
        onScheduleInstall={(lead) => {
          setDrawerId(null)
          openStatusModal(lead, 'installation_scheduled')
        }}
      />

      <ReferralStatusModal
        lead={statusLead}
        initialStatus={statusTarget}
        onClose={closeStatusModal}
        onSuccess={invalidate}
      />
    </CrmPageShell>
  )
}
