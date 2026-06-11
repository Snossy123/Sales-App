import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { Branch, HrmHoliday, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import { ToastBanner } from '../../../components/ToastBanner'
import { useAuthStore } from '../../../stores/authStore'

type HolidayRow = HrmHoliday & Record<string, unknown>
type Panel = 'create' | 'edit' | null

const emptyForm = {
  name: '',
  start_date: '',
  end_date: '',
  branch_id: '' as number | '',
  note: '',
}

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

export function HrmHolidaysPage() {
  const queryClient = useQueryClient()
  const branchId = useAuthStore((s) => s.branchId)
  const [panel, setPanel] = useState<Panel>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [successToast, setSuccessToast] = useState('')

  const holidaysQuery = useQuery({
    queryKey: ['hrm', 'holidays', branchId],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 50,
        include: 'branch',
      }
      if (branchId) params['filter[branch_id]'] = branchId

      const { data } = await api.get<PaginatedResponse<HrmHoliday>>('/hrm/holidays', { params })
      return data.data
    },
  })

  const branchesQuery = useQuery({
    queryKey: ['branches', 'holiday-options'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', { params: { per_page: 100 } })
      return data.data
    },
    enabled: panel !== null,
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
        start_date: form.start_date,
        end_date: form.end_date,
        branch_id: form.branch_id ? Number(form.branch_id) : null,
        note: form.note || null,
      }
      if (panel === 'edit' && editId) {
        const { data } = await api.put<HrmHoliday>(`/hrm/holidays/${editId}`, payload)
        return data
      }
      const { data } = await api.post<HrmHoliday>('/hrm/holidays', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm', 'holidays'] })
      closePanel()
      setSuccessToast(panel === 'edit' ? 'تم تحديث العطلة' : 'تم إضافة العطلة')
    },
  })

  const openEdit = (holiday: HrmHoliday) => {
    setEditId(holiday.id)
    setForm({
      name: holiday.name,
      start_date: holiday.start_date,
      end_date: holiday.end_date,
      branch_id: holiday.branch_id ?? '',
      note: holiday.note ?? '',
    })
    setPanel('edit')
  }

  const rows = holidaysQuery.data ?? []

  return (
    <div>
      <PageHeader
        title="العطلات الرسمية"
        subtitle="إدارة أيام الإجازات والعطلات الرسمية"
        actions={
          <button
            type="button"
            onClick={() => {
              setPanel('create')
              setEditId(null)
              setForm({ ...emptyForm, branch_id: branchId ?? '' })
            }}
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
          >
            <Icon name="add" size={18} />
            إضافة عطلة
          </button>
        }
      />

      {successToast && (
        <ToastBanner message={successToast} onDismiss={() => setSuccessToast('')} />
      )}

      <AsyncState
        isLoading={holidaysQuery.isLoading}
        isError={holidaysQuery.isError}
        error={holidaysQuery.error}
      >
        <DataTable<HolidayRow>
          data={rows as HolidayRow[]}
          keyExtractor={(row) => row.id}
          emptyMessage="لا توجد عطلات مسجلة"
          columns={[
            { key: 'name', header: 'الاسم' },
            { key: 'start_date', header: 'من' },
            { key: 'end_date', header: 'إلى' },
            {
              key: 'branch',
              header: 'الفرع',
              render: (row) => row.branch?.name_ar || row.branch?.name || 'كل الفروع',
            },
            {
              key: 'note',
              header: 'ملاحظة',
              render: (row) => row.note || '—',
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
        title={panel === 'edit' ? 'تعديل عطلة' : 'إضافة عطلة'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveMutation.mutate()
          }}
          className="grid gap-sm sm:grid-cols-2"
        >
          <input
            placeholder="اسم العطلة"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className={`${inputClass} sm:col-span-2`}
          />
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            required
            className={inputClass}
            dir="ltr"
          />
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            required
            className={inputClass}
            dir="ltr"
          />
          <select
            value={form.branch_id}
            onChange={(e) =>
              setForm({ ...form, branch_id: e.target.value ? Number(e.target.value) : '' })
            }
            className={`${inputClass} sm:col-span-2`}
          >
            <option value="">كل الفروع</option>
            {branchesQuery.data?.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name_ar || branch.name}
              </option>
            ))}
          </select>
          <textarea
            placeholder="ملاحظة (اختياري)"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            rows={2}
            className={`${inputClass} sm:col-span-2`}
          />
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
