import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { Department } from '../api/types'

interface AddStockFormProps {
  departments: Department[]
  initialDepartmentId?: number
  submitLabel?: string
  showCancel?: boolean
  onCancel?: () => void
  onSuccess?: () => void
}

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

export function invalidateStockQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['departments'] })
  queryClient.invalidateQueries({ queryKey: ['administrations'] })
  queryClient.invalidateQueries({ queryKey: ['branches'] })
  queryClient.invalidateQueries({ queryKey: ['inventory'] })
  queryClient.invalidateQueries({ queryKey: ['gps-stock'] })
  queryClient.invalidateQueries({ queryKey: ['gps-product'] })
  queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  queryClient.invalidateQueries({ queryKey: ['stock-receipts'] })
  queryClient.invalidateQueries({ queryKey: ['stock-transfers'] })
}

export function AddStockForm({
  departments,
  initialDepartmentId,
  submitLabel = 'تسجيل المخزون',
  showCancel = false,
  onCancel,
  onSuccess,
}: AddStockFormProps) {
  const queryClient = useQueryClient()
  const [departmentId, setDepartmentId] = useState<number | ''>(initialDepartmentId ?? '')
  const [quantity, setQuantity] = useState(10)

  const addStockMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<Department>('/department-stock/add', {
        department_id: departmentId,
        quantity,
      })
      return data
    },
    onSuccess: () => {
      invalidateStockQueries(queryClient)
      setQuantity(10)
      if (!initialDepartmentId) {
        setDepartmentId('')
      }
      onSuccess?.()
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    addStockMutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-sm">
      <div>
        <label htmlFor="add-stock-department" className="mb-1 block text-sm font-medium text-on-surface-variant">
          الإدارة
        </label>
        <select
          id="add-stock-department"
          value={departmentId}
          onChange={(e) => setDepartmentId(Number(e.target.value))}
          required
          disabled={Boolean(initialDepartmentId)}
          className={inputClass}
        >
          <option value="">اختر الإدارة</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name_ar || d.name}
              {d.department_stock != null ? ` (معلق: ${d.department_stock.pending})` : ''}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="add-stock-quantity" className="mb-1 block text-sm font-medium text-on-surface-variant">
          عدد القطع
        </label>
        <input
          id="add-stock-quantity"
          type="number"
          min={1}
          max={500}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          placeholder="عدد القطع"
          required
          className={`${inputClass} tabular-nums`}
        />
      </div>
      {addStockMutation.isError && (
        <p className="text-sm text-error">{getErrorMessage(addStockMutation.error)}</p>
      )}
      <div className="flex gap-sm">
        <button
          type="submit"
          disabled={addStockMutation.isPending}
          className="rounded-lg bg-primary px-md py-2 text-sm font-bold text-on-primary"
        >
          {addStockMutation.isPending ? 'جاري التسجيل...' : submitLabel}
        </button>
        {showCancel && onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg border px-md py-2 text-sm">
            إلغاء
          </button>
        )}
      </div>
    </form>
  )
}
