import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { Employee, HrmShift, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import { ToastBanner } from '../../../components/ToastBanner'

type ShiftRow = HrmShift & Record<string, unknown>
type Panel = 'create' | 'edit' | 'assign' | null

const emptyForm = {
  name: '',
  type: 'fixed_shift' as 'fixed_shift' | 'flexible_shift',
  start_time: '',
  end_time: '',
  is_allowed_auto_clockout: false,
  auto_clockout_time: '',
}

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

export function HrmShiftsPage() {
  const queryClient = useQueryClient()
  const [panel, setPanel] = useState<Panel>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [assignShiftId, setAssignShiftId] = useState<number | null>(null)
  const [assignForm, setAssignForm] = useState({ employee_ids: [] as number[], start_date: new Date().toISOString().split('T')[0] })
  const [successToast, setSuccessToast] = useState('')

  const query = useQuery({
    queryKey: ['hrm', 'shifts'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<HrmShift>>('/hrm/shifts', {
        params: { per_page: 50 },
      })
      return data.data
    },
  })

  const employeesQuery = useQuery({
    queryKey: ['employees', 'shifts-assign'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', { params: { per_page: 100 } })
      return data.data
    },
    enabled: panel === 'assign',
  })

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!assignShiftId) throw new Error('no shift')
      const { data } = await api.post(`/hrm/shifts/${assignShiftId}/assign-users`, {
        assignments: assignForm.employee_ids.map((employee_id) => ({
          employee_id,
          start_date: assignForm.start_date,
        })),
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm', 'shifts'] })
      setPanel(null)
      setAssignShiftId(null)
      setSuccessToast('تم تعيين الموظفين للوردية')
    },
  })

  const closePanel = () => {
    setPanel(null)
    setEditId(null)
    setAssignShiftId(null)
    setForm(emptyForm)
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        type: form.type,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        is_allowed_auto_clockout: form.is_allowed_auto_clockout,
        auto_clockout_time: form.auto_clockout_time || null,
      }
      if (panel === 'edit' && editId) {
        const { data } = await api.put<HrmShift>(`/hrm/shifts/${editId}`, payload)
        return data
      }
      const { data } = await api.post<HrmShift>('/hrm/shifts', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm', 'shifts'] })
      closePanel()
      setSuccessToast(panel === 'edit' ? 'تم تحديث الوردية' : 'تم إضافة الوردية')
    },
  })

  const openEdit = (shift: HrmShift) => {
    setEditId(shift.id)
    setForm({
      name: shift.name,
      type: (shift.type as 'fixed_shift' | 'flexible_shift') || 'fixed_shift',
      start_time: shift.start_time ?? '',
      end_time: shift.end_time ?? '',
      is_allowed_auto_clockout: shift.is_allowed_auto_clockout ?? false,
      auto_clockout_time: shift.auto_clockout_time ?? '',
    })
    setPanel('edit')
  }

  const rows = query.data ?? []

  return (
    <div>
      <PageHeader
        title="الورديات"
        subtitle="إدارة جداول العمل ومواعيد الورديات"
        actions={
          <button
            type="button"
            onClick={() => {
              setPanel('create')
              setEditId(null)
              setForm(emptyForm)
            }}
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
          >
            <Icon name="add" size={18} />
            إضافة وردية
          </button>
        }
      />

      {successToast && (
        <ToastBanner message={successToast} onDismiss={() => setSuccessToast('')} />
      )}

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<ShiftRow>
          data={rows as ShiftRow[]}
          keyExtractor={(row) => row.id}
          pageSize={10}
          emptyMessage="لا توجد ورديات"
          columns={[
            { key: 'name', header: 'الاسم' },
            {
              key: 'type',
              header: 'النوع',
              render: (row) => (row.type === 'flexible_shift' ? 'مرنة' : 'ثابتة'),
            },
            {
              key: 'start_time',
              header: 'البداية',
              render: (row) => row.start_time || '—',
            },
            {
              key: 'end_time',
              header: 'النهاية',
              render: (row) => row.end_time || '—',
            },
            {
              key: 'auto',
              header: 'خروج تلقائي',
              render: (row) => (row.is_allowed_auto_clockout ? 'نعم' : 'لا'),
            },
            {
              key: 'actions',
              header: 'إجراءات',
              render: (row) => (
                <div className="flex gap-2">
                  <button type="button" onClick={() => openEdit(row)} className="text-sm text-primary hover:underline">تعديل</button>
                  <button type="button" onClick={() => { setAssignShiftId(row.id); setPanel('assign') }} className="text-sm text-secondary hover:underline">تعيين</button>
                </div>
              ),
            },
          ]}
        />
      </AsyncState>

      <Modal
        open={panel === 'create' || panel === 'edit'}
        onClose={closePanel}
        title={panel === 'edit' ? 'تعديل وردية' : 'إضافة وردية'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveMutation.mutate()
          }}
          className="grid gap-sm sm:grid-cols-2"
        >
          <input
            placeholder="اسم الوردية"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className={`${inputClass} sm:col-span-2`}
          />
          <select
            value={form.type}
            onChange={(e) =>
              setForm({ ...form, type: e.target.value as 'fixed_shift' | 'flexible_shift' })
            }
            className={inputClass}
          >
            <option value="fixed_shift">ثابتة</option>
            <option value="flexible_shift">مرنة</option>
          </select>
          <input
            type="time"
            value={form.start_time}
            onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            className={inputClass}
            dir="ltr"
          />
          <input
            type="time"
            value={form.end_time}
            onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            className={inputClass}
            dir="ltr"
          />
          <label className="flex items-center gap-xs text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.is_allowed_auto_clockout}
              onChange={(e) => setForm({ ...form, is_allowed_auto_clockout: e.target.checked })}
            />
            تسجيل خروج تلقائي
          </label>
          {form.is_allowed_auto_clockout && (
            <input
              type="time"
              value={form.auto_clockout_time}
              onChange={(e) => setForm({ ...form, auto_clockout_time: e.target.value })}
              className={`${inputClass} sm:col-span-2`}
              dir="ltr"
            />
          )}
          {saveMutation.isError && (
            <p className="text-sm text-error sm:col-span-2">{getErrorMessage(saveMutation.error)}</p>
          )}
          <div className="flex gap-sm sm:col-span-2">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary"
            >
              حفظ
            </button>
            <button type="button" onClick={closePanel} className="rounded-lg border px-md py-2 text-sm">
              إلغاء
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={panel === 'assign'} onClose={closePanel} title="تعيين موظفين للوردية">
        <form onSubmit={(e) => { e.preventDefault(); assignMutation.mutate() }} className="space-y-sm">
          <input type="date" value={assignForm.start_date} onChange={(e) => setAssignForm({ ...assignForm, start_date: e.target.value })} required className={inputClass} dir="ltr" />
          <div className="max-h-48 overflow-y-auto rounded border border-outline-variant p-sm">
            {(employeesQuery.data ?? []).map((emp) => (
              <label key={emp.id} className="flex cursor-pointer items-center gap-xs py-0.5 text-sm">
                <input
                  type="checkbox"
                  checked={assignForm.employee_ids.includes(emp.id)}
                  onChange={() => setAssignForm((prev) => ({
                    ...prev,
                    employee_ids: prev.employee_ids.includes(emp.id)
                      ? prev.employee_ids.filter((id) => id !== emp.id)
                      : [...prev.employee_ids, emp.id],
                  }))}
                />
                {emp.name}
              </label>
            ))}
          </div>
          {assignMutation.isError && <p className="text-sm text-error">{getErrorMessage(assignMutation.error)}</p>}
          <button type="submit" disabled={assignMutation.isPending || !assignForm.employee_ids.length} className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary">تعيين</button>
        </form>
      </Modal>
    </div>
  )
}
