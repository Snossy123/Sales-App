import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { CrmCallLog, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import { ToastBanner } from '../../../components/ToastBanner'
import { CrmSubNav } from '../components/CrmSubNav'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

export function CrmCallLogsPage() {
  const queryClient = useQueryClient()
  const [panelOpen, setPanelOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ mobile_number: '', mobile_name: '', lead_id: '' as number | '', call_type: 'outbound', duration: '' })

  const query = useQuery({
    queryKey: ['crm', 'call-logs'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<CrmCallLog>>('/crm/call-logs', { params: { per_page: 50, include: 'lead,user' } })
      return data.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<CrmCallLog>('/crm/call-logs', {
        mobile_number: form.mobile_number,
        mobile_name: form.mobile_name || undefined,
        lead_id: form.lead_id ? Number(form.lead_id) : undefined,
        call_type: form.call_type,
        duration: form.duration ? Number(form.duration) : undefined,
        start_time: new Date().toISOString(),
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'call-logs'] })
      setPanelOpen(false)
      setToast('تم تسجيل المكالمة')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  return (
    <div>
      <PageHeader title="سجل المكالمات" subtitle="تتبع المكالمات الواردة والصادرة" actions={
        <button type="button" onClick={() => setPanelOpen(true)} className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary">
          <Icon name="add" size={18} /> تسجيل مكالمة
        </button>
      } />
      <CrmSubNav />
      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}
      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<CrmCallLog & Record<string, unknown>>
          data={(query.data ?? []) as (CrmCallLog & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          columns={[
            { key: 'mobile_name', header: 'الاسم', render: (row) => row.mobile_name ?? row.lead?.name ?? '—' },
            { key: 'mobile_number', header: 'الرقم', render: (row) => row.mobile_number ?? '—' },
            { key: 'duration', header: 'المدة (ث)', render: (row) => row.duration ?? '—' },
            { key: 'user', header: 'المستخدم', render: (row) => row.user?.name ?? '—' },
          ]}
        />
      </AsyncState>
      <Modal open={panelOpen} onClose={() => setPanelOpen(false)} title="تسجيل مكالمة">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }} className="space-y-sm">
          <input placeholder="رقم الهاتف" value={form.mobile_number} onChange={(e) => setForm({ ...form, mobile_number: e.target.value })} required className={inputClass} dir="ltr" />
          <input placeholder="اسم جهة الاتصال" value={form.mobile_name} onChange={(e) => setForm({ ...form, mobile_name: e.target.value })} className={inputClass} />
          <input type="number" placeholder="المدة بالثواني" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className={inputClass} dir="ltr" />
          <button type="submit" disabled={createMutation.isPending} className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary">حفظ</button>
        </form>
      </Modal>
    </div>
  )
}
