import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { Branch, Department, PaginatedResponse } from '../api/types'
import { invalidateStockQueries } from './AddStockForm'
import { Modal } from './Modal'

interface ReturnStockModalProps {
  open: boolean
  onClose: () => void
  departments: Department[]
  initialDepartmentId?: number
  initialBranchId?: number
  onSuccess?: () => void
}

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

export function ReturnStockModal({
  open,
  onClose,
  departments,
  initialDepartmentId,
  initialBranchId,
  onSuccess,
}: ReturnStockModalProps) {
  const queryClient = useQueryClient()
  const [returnDeptId, setReturnDeptId] = useState<number | ''>(initialDepartmentId ?? '')
  const [returnBranchId, setReturnBranchId] = useState<number | ''>(initialBranchId ?? '')
  const [returnQty, setReturnQty] = useState(5)

  const effectiveDeptId = returnDeptId || initialDepartmentId || ''

  const branchesQuery = useQuery({
    queryKey: ['branches', 'return', effectiveDeptId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', {
        params: { per_page: 100, 'filter[administration_id]': effectiveDeptId },
      })
      return data.data
    },
    enabled: Boolean(effectiveDeptId) && open,
  })

  const returnMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/department-stock/return', {
        department_id: returnDeptId || initialDepartmentId,
        branch_id: returnBranchId || initialBranchId,
        quantity: returnQty,
      })
      return data
    },
    onSuccess: () => {
      invalidateStockQueries(queryClient)
      onSuccess?.()
      handleClose()
    },
  })

  const handleClose = () => {
    setReturnDeptId(initialDepartmentId ?? '')
    setReturnBranchId(initialBranchId ?? '')
    setReturnQty(5)
    returnMutation.reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="استرجاع من فرع" size="lg">
      <form
        onSubmit={(e) => { e.preventDefault(); returnMutation.mutate() }}
        className="grid gap-sm sm:grid-cols-3"
      >
        <select
          value={returnDeptId || initialDepartmentId || ''}
          onChange={(e) => { setReturnDeptId(Number(e.target.value)); setReturnBranchId('') }}
          required
          disabled={Boolean(initialDepartmentId)}
          className={inputClass}
        >
          <option value="">الإدارة</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name_ar || d.name}
            </option>
          ))}
        </select>
        <select
          value={returnBranchId || initialBranchId || ''}
          onChange={(e) => setReturnBranchId(Number(e.target.value))}
          required
          disabled={Boolean(initialBranchId) || !effectiveDeptId}
          className={inputClass}
        >
          <option value="">الفرع</option>
          {branchesQuery.data?.map((b) => (
            <option key={b.id} value={b.id}>{b.name_ar || b.name}</option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          value={returnQty}
          onChange={(e) => setReturnQty(Number(e.target.value))}
          placeholder="الكمية"
          className={`${inputClass} tabular-nums`}
        />
        {returnMutation.isError && (
          <p className="text-sm text-error sm:col-span-3">{getErrorMessage(returnMutation.error)}</p>
        )}
        <div className="flex gap-sm sm:col-span-3">
          <button
            type="submit"
            disabled={returnMutation.isPending}
            className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary"
          >
            {returnMutation.isPending ? 'جاري الاسترجاع...' : 'استرجاع'}
          </button>
          <button type="button" onClick={handleClose} className="rounded-lg border px-md py-2 text-sm">
            إلغاء
          </button>
        </div>
      </form>
    </Modal>
  )
}
