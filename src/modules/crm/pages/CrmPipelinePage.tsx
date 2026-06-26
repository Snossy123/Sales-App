import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { CrmDashboardStats, Lead, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { Icon } from '../../../components/Icon'
import { KpiCard } from '../../../components/KpiCard'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import { DeleteConfirmDialog } from '../../../components/crud/DeleteConfirmDialog'
import { StartTourButton } from '../../../components/tour/StartTourButton'
import { usePageTour } from '../../../hooks/usePageTour'
import { getEntityCrudConfig } from '../../../lib/crud/entityCrudRegistry'
import { useSoftDelete } from '../../../lib/crud/useSoftDelete'
import { getListScopeQueryKey, mergeScopedListParams } from '../../../lib/dataScope'
import { useAuthStore } from '../../../stores/authStore'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

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
  usePageTour('crm')
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const listScopeKey = getListScopeQueryKey(user)
  const crudConfig = getEntityCrudConfig('leads')
  const [editLead, setEditLead] = useState<Lead | null>(null)
  const [editForm, setEditForm] = useState({ name: '', phone: '', source: '' })
  const [deleteLead, setDeleteLead] = useState<Lead | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [editError, setEditError] = useState('')

  const dashboardQuery = useQuery({
    queryKey: ['crm-dashboard'],
    queryFn: async () => {
      const { data } = await api.get<CrmDashboardStats>('/crm/dashboard')
      return data
    },
  })

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
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard'] })
    },
  })

  const saveEditMutation = useMutation({
    mutationFn: async () => {
      if (!editLead) throw new Error('no lead')
      const { data } = await api.put<Lead>(`/leads/${editLead.id}`, {
        name: editForm.name,
        phone: editForm.phone,
        source: editForm.source || null,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard'] })
      setEditLead(null)
      setEditError('')
    },
    onError: (err) => setEditError(getErrorMessage(err)),
  })

  const deleteMutation = useSoftDelete({
    resource: 'leads',
    queryKeys: [['leads'], ['crm-dashboard']],
    onSuccess: () => {
      setDeleteLead(null)
      setDeleteError('')
    },
    onError: (message) => setDeleteError(message),
  })

  const openEdit = (lead: Lead) => {
    setEditLead(lead)
    setEditForm({
      name: lead.name,
      phone: lead.phone,
      source: lead.source ?? '',
    })
    setEditError('')
  }

  const leadsByStage = (stage: string) =>
    (query.data ?? [])
      .filter((l) => l.status === stage)
      .sort((a, b) => (b.device_count ?? 0) - (a.device_count ?? 0))

  const stats = dashboardQuery.data

  return (
    <div>
      <PageHeader
        title="العملاء المحتملين"
        subtitle="إدارة مراحل العملاء المحتملين وتحويلهم"
        actions={<StartTourButton tourId="crm" />}
      />

      <AsyncState
        isLoading={dashboardQuery.isLoading}
        isError={dashboardQuery.isError}
        error={dashboardQuery.error}
      >
        <div
          data-tour="crm-kpis"
          className="mb-md grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4"
        >
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
        <div data-tour="crm-pipeline" className="pipeline-scroll flex gap-md overflow-x-auto pb-md">
          {STAGES.map((stage) => {
            const leads = leadsByStage(stage.key)
            const isFirstStage = stage.key === 'new'
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
                      data-tour={isFirstStage ? 'crm-lead-card' : undefined}
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
                      <div className="mt-sm flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(lead)}
                          className="text-xs text-primary hover:underline"
                        >
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteLead(lead)
                            setDeleteError('')
                          }}
                          className="text-xs text-error hover:underline"
                        >
                          حذف
                        </button>
                      </div>
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

      <Modal
        open={editLead !== null}
        onClose={() => setEditLead(null)}
        title="تعديل عميل محتمل"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveEditMutation.mutate()
          }}
          className="space-y-sm"
        >
          <input
            placeholder="الاسم"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            required
            className={inputClass}
          />
          <input
            placeholder="الهاتف"
            value={editForm.phone}
            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            required
            className={inputClass}
            dir="ltr"
          />
          <input
            placeholder="المصدر"
            value={editForm.source}
            onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
            className={inputClass}
          />
          {editError && <p className="text-sm text-error">{editError}</p>}
          <div className="flex gap-sm">
            <button
              type="submit"
              disabled={saveEditMutation.isPending}
              className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary"
            >
              حفظ
            </button>
            <button
              type="button"
              onClick={() => setEditLead(null)}
              className="rounded-lg border px-md py-2 text-sm"
            >
              إلغاء
            </button>
          </div>
        </form>
      </Modal>

      <DeleteConfirmDialog
        open={deleteLead !== null}
        message={
          deleteLead
            ? crudConfig.deleteConfirmMessage?.(deleteLead) ?? `حذف "${crudConfig.label(deleteLead)}"؟`
            : ''
        }
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteLead && deleteMutation.mutate(deleteLead.id)}
        onCancel={() => setDeleteLead(null)}
      />
      {deleteError && <p className="mt-sm text-sm text-error">{deleteError}</p>}
    </div>
  )
}
