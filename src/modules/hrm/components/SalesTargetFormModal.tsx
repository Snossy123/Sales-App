import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { Employee, HrmUserSalesTarget, PaginatedResponse } from '../../../api/types'
import { Modal } from '../../../components/Modal'
import { ToastBanner } from '../../../components/ToastBanner'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

interface SalesTargetFormModalProps {
  open: boolean
  onClose: () => void
  employeeId?: number
  target?: HrmUserSalesTarget | null
  onSaved: () => void
}

export function SalesTargetFormModal({
  open,
  onClose,
  employeeId,
  target,
  onSaved,
}: SalesTargetFormModalProps) {
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({
    employee_id: employeeId ?? ('' as number | ''),
    target_start: target?.target_start ?? '',
    target_end: target?.target_end ?? '',
    target_count: target?.target_count != null ? String(target.target_count) : '',
    commission_percent:
      target?.commission_percent != null ? String(target.commission_percent) : '',
  })

  const employeesQuery = useQuery({
    queryKey: ['employees', 'sales-target-form'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', {
        params: { per_page: 200, 'filter[status]': 'active' },
      })
      return data.data
    },
    enabled: open && !employeeId,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        employee_id: Number(employeeId ?? form.employee_id),
        target_start: form.target_start,
        target_end: form.target_end,
        target_count: Number(form.target_count),
        commission_percent: Number(form.commission_percent),
      }
      if (target?.id) {
        const { data } = await api.put<HrmUserSalesTarget>(`/hrm/sales-targets/${target.id}`, payload)
        return data
      }
      const { data } = await api.post<HrmUserSalesTarget>('/hrm/sales-targets', payload)
      return data
    },
    onSuccess: () => {
      onSaved()
      onClose()
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  return (
    <Modal open={open} onClose={onClose} title={target ? 'تعديل هدف مبيعات' : 'هدف مبيعات جديد'}>
      {toast && (
        <div className="mb-sm">
          <ToastBanner message={toast} onDismiss={() => setToast('')} />
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          saveMutation.mutate()
        }}
        className="grid gap-sm sm:grid-cols-2"
      >
        {!employeeId && (
          <select
            value={form.employee_id}
            onChange={(e) =>
              setForm({ ...form, employee_id: e.target.value ? Number(e.target.value) : '' })
            }
            required
            className={`${inputClass} sm:col-span-2`}
          >
            <option value="">اختر الموظف</option>
            {(employeesQuery.data ?? []).map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        )}
        <input
          type="date"
          value={form.target_start}
          onChange={(e) => setForm({ ...form, target_start: e.target.value })}
          required
          className={inputClass}
        />
        <input
          type="date"
          value={form.target_end}
          onChange={(e) => setForm({ ...form, target_end: e.target.value })}
          required
          className={inputClass}
        />
        <input
          type="number"
          min={1}
          placeholder="عدد التعاقدات المستهدف"
          value={form.target_count}
          onChange={(e) => setForm({ ...form, target_count: e.target.value })}
          required
          className={inputClass}
        />
        <input
          type="number"
          min={0}
          max={100}
          step="0.01"
          placeholder="نسبة العمولة %"
          value={form.commission_percent}
          onChange={(e) => setForm({ ...form, commission_percent: e.target.value })}
          required
          className={inputClass}
        />
        <div className="flex gap-sm sm:col-span-2">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="rounded-lg bg-primary px-md py-sm text-sm font-medium text-on-primary disabled:opacity-60"
          >
            حفظ
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-outline-variant px-md py-sm text-sm"
          >
            إلغاء
          </button>
        </div>
      </form>
    </Modal>
  )
}
