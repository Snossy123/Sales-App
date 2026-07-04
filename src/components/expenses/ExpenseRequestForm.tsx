import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../api/client'
import type { Branch, Distributor, Employee, PaginatedResponse } from '../../api/types'
import { Modal } from '../Modal'
import { useAuthStore } from '../../stores/authStore'

const EXPENSE_TYPES = [
  { value: 'petty_cash', label: 'نثرية' },
  { value: 'operating', label: 'تشغيل (موزع)' },
  { value: 'distributor_payout', label: 'صرف عمولة' },
  { value: 'employee_debt', label: 'مديونية موظف' },
]

interface ExpenseRequestFormProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function ExpenseRequestForm({ open, onClose, onSuccess }: ExpenseRequestFormProps) {
  const user = useAuthStore((s) => s.user)
  const [expenseType, setExpenseType] = useState('petty_cash')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [branchId, setBranchId] = useState<number | ''>(user?.branch_id ?? '')
  const [distributorId, setDistributorId] = useState<number | ''>('')
  const [employeeId, setEmployeeId] = useState<number | ''>('')

  const branchesQuery = useQuery({
    queryKey: ['branches', 'expense-form'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', { params: { per_page: 100 } })
      return data.data ?? []
    },
    enabled: open,
  })

  const distributorsQuery = useQuery({
    queryKey: ['distributors', 'expense-form'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Distributor>>('/distributors', { params: { per_page: 100 } })
      return data.data ?? []
    },
    enabled: open && ['operating', 'distributor_payout'].includes(expenseType),
  })

  const employeesQuery = useQuery({
    queryKey: ['employees', 'expense-form', branchId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', {
        params: { per_page: 100, 'filter[branch_id]': branchId },
      })
      return data.data ?? []
    },
    enabled: open && expenseType === 'employee_debt' && Boolean(branchId),
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/expense-requests', {
        branch_id: branchId,
        expense_type: expenseType,
        amount: Number(amount),
        notes: notes || undefined,
        distributor_id: distributorId || undefined,
        employee_id: employeeId || undefined,
      })
      return data
    },
    onSuccess: () => {
      onSuccess?.()
      onClose()
    },
  })

  const needsDistributor = ['operating', 'distributor_payout'].includes(expenseType)
  const needsEmployee = expenseType === 'employee_debt'

  return (
    <Modal open={open} onClose={onClose} title="طلب مصروف جديد">
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm">نوع المصروف</label>
          <select
            className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
            value={expenseType}
            onChange={(e) => setExpenseType(e.target.value)}
          >
            {EXPENSE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm">الفرع</label>
          <select
            className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">اختر الفرع</option>
            {(branchesQuery.data ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name_ar ?? b.name}
              </option>
            ))}
          </select>
        </div>
        {needsDistributor && (
          <div>
            <label className="mb-1 block text-sm">الموزع</label>
            <select
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
              value={distributorId}
              onChange={(e) => setDistributorId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">اختر الموزع</option>
              {(distributorsQuery.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {needsEmployee && (
          <div>
            <label className="mb-1 block text-sm">الموظف</label>
            <select
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">اختر الموظف</option>
              {(employeesQuery.data ?? []).map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm">المبلغ</label>
          <input
            type="number"
            min={0}
            className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm">ملاحظات / السبب</label>
          <textarea
            className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        {submitMutation.isError && (
          <p className="text-sm text-error">{getErrorMessage(submitMutation.error)}</p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={onClose}>
            إلغاء
          </button>
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 text-sm text-on-primary disabled:opacity-50"
            disabled={!branchId || !amount || submitMutation.isPending}
            onClick={() => submitMutation.mutate()}
          >
            إرسال للمراجعة
          </button>
        </div>
      </div>
    </Modal>
  )
}
