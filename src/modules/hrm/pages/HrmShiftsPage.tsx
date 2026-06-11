import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { HrmShift, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import { ToastBanner } from '../../../components/ToastBanner'

type ShiftRow = HrmShift & Record<string, unknown>
type Panel = 'create' | 'edit' | null

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

  const closePanel = () => {
    setPanel(null)
    setEditId(null)
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
                <button
                  type="button"
                  onClick={() => openEdit(row)}
                  className="text-sm text-primary hover:underline"
                >
                  تعديل
                </button>
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
    </div>
  )
}
