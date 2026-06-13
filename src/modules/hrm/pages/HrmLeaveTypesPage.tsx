import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { HrmLeaveType, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import { ToastBanner } from '../../../components/ToastBanner'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

export function HrmLeaveTypesPage() {
  const queryClient = useQueryClient()
  const [panelOpen, setPanelOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ leave_type: '', max_leave_count: '', leave_count_interval: 'year' })
  const [toast, setToast] = useState('')

  const query = useQuery({
    queryKey: ['hrm', 'leave-types'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<HrmLeaveType>>('/hrm/leave-types', { params: { per_page: 50 } })
      return data.data
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        leave_type: form.leave_type,
        max_leave_count: form.max_leave_count ? Number(form.max_leave_count) : undefined,
        leave_count_interval: form.leave_count_interval,
      }
      if (editId) {
        const { data } = await api.put<HrmLeaveType>(`/hrm/leave-types/${editId}`, payload)
        return data
      }
      const { data } = await api.post<HrmLeaveType>('/hrm/leave-types', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm', 'leave-types'] })
      setPanelOpen(false)
      setEditId(null)
      setToast('تم حفظ نوع الإجازة')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  return (
    <div>
      <PageHeader title="أنواع الإجازة" subtitle="تعريف أنواع الإجازات والحد الأقصى" actions={
        <button type="button" onClick={() => { setPanelOpen(true); setEditId(null); setForm({ leave_type: '', max_leave_count: '', leave_count_interval: 'year' }) }} className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary">
          <Icon name="add" size={18} /> نوع جديد
        </button>
      } />
      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<HrmLeaveType & Record<string, unknown>>
          data={(query.data ?? []) as (HrmLeaveType & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          columns={[
            { key: 'leave_type', header: 'النوع' },
            { key: 'max_leave_count', header: 'الحد الأقصى', className: 'tabular-nums' },
            { key: 'leave_count_interval', header: 'الفترة', render: (row) => row.leave_count_interval === 'month' ? 'شهري' : 'سنوي' },
            { key: 'actions', header: '', render: (row) => (
              <button type="button" onClick={() => { setEditId(row.id); setForm({ leave_type: row.leave_type, max_leave_count: String(row.max_leave_count ?? ''), leave_count_interval: row.leave_count_interval ?? 'year' }); setPanelOpen(false) }} className="text-xs text-primary hover:underline">تعديل</button>
            ) },
          ]}
        />
      </AsyncState>

      <Modal open={panelOpen || editId !== null} onClose={() => { setPanelOpen(false); setEditId(null) }} title={editId ? 'تعديل نوع إجازة' : 'نوع إجازة جديد'}>
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate() }} className="space-y-sm">
          <input placeholder="اسم النوع" value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })} required className={inputClass} />
          <input type="number" placeholder="الحد الأقصى" value={form.max_leave_count} onChange={(e) => setForm({ ...form, max_leave_count: e.target.value })} className={inputClass} dir="ltr" />
          <select value={form.leave_count_interval} onChange={(e) => setForm({ ...form, leave_count_interval: e.target.value })} className={inputClass}>
            <option value="year">سنوي</option>
            <option value="month">شهري</option>
          </select>
          <button type="submit" disabled={saveMutation.isPending} className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary">حفظ</button>
        </form>
      </Modal>
    </div>
  )
}
