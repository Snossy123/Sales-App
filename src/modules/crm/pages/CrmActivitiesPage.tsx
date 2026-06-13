import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { CrmActivity, Lead, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import { ToastBanner } from '../../../components/ToastBanner'
import { CrmSubNav } from '../components/CrmSubNav'

const ACTIVITY_TYPES = [
  { value: 'call', label: 'مكالمة' },
  { value: 'visit', label: 'زيارة' },
  { value: 'whatsapp', label: 'واتساب' },
  { value: 'note', label: 'ملاحظة' },
] as const

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

export function CrmActivitiesPage() {
  const queryClient = useQueryClient()
  const [panelOpen, setPanelOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ lead_id: '' as number | '', type: 'call', subject: '', description: '' })

  const query = useQuery({
    queryKey: ['crm-activities'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<CrmActivity>>('/crm-activities', { params: { per_page: 50, include: 'lead,user' } })
      return data.data
    },
  })

  const leadsQuery = useQuery({
    queryKey: ['leads', 'activities'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Lead>>('/leads', { params: { per_page: 100 } })
      return data.data
    },
    enabled: panelOpen,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<CrmActivity>('/crm-activities', {
        lead_id: form.lead_id ? Number(form.lead_id) : undefined,
        type: form.type,
        subject: form.subject || undefined,
        description: form.description || undefined,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-activities'] })
      setPanelOpen(false)
      setForm({ lead_id: '', type: 'call', subject: '', description: '' })
      setToast('تم تسجيل النشاط')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  return (
    <div>
      <PageHeader title="أنشطة CRM" subtitle="سجل المكالمات والزيارات والملاحظات" actions={
        <button type="button" onClick={() => setPanelOpen(true)} className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary">
          <Icon name="add" size={18} /> نشاط جديد
        </button>
      } />
      <CrmSubNav />
      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}
      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<CrmActivity & Record<string, unknown>>
          data={(query.data ?? []) as (CrmActivity & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          columns={[
            { key: 'type', header: 'النوع', render: (row) => ACTIVITY_TYPES.find((t) => t.value === row.type)?.label ?? row.type },
            { key: 'subject', header: 'الموضوع', render: (row) => row.subject ?? '—' },
            { key: 'lead', header: 'العميل المحتمل', render: (row) => row.lead?.name ?? '—' },
            { key: 'user', header: 'بواسطة', render: (row) => row.user?.name ?? '—' },
          ]}
        />
      </AsyncState>
      <Modal open={panelOpen} onClose={() => setPanelOpen(false)} title="نشاط جديد">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }} className="space-y-sm">
          <select value={form.lead_id} onChange={(e) => setForm({ ...form, lead_id: e.target.value ? Number(e.target.value) : '' })} className={inputClass}>
            <option value="">اختر عميل محتمل</option>
            {(leadsQuery.data ?? []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputClass}>
            {ACTIVITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input placeholder="الموضوع" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={inputClass} />
          <textarea placeholder="التفاصيل" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} rows={3} />
          <button type="submit" disabled={createMutation.isPending} className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary">حفظ</button>
        </form>
      </Modal>
    </div>
  )
}
