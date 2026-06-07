import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { Branch, Department, PaginatedResponse } from '../api/types'
import { Modal } from './Modal'

interface DistributeStockModalProps {
  open: boolean
  onClose: () => void
  departments: Department[]
  initialDepartmentId?: number
  onSuccess?: () => void
}

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

export function DistributeStockModal({
  open,
  onClose,
  departments,
  initialDepartmentId,
  onSuccess,
}: DistributeStockModalProps) {
  const queryClient = useQueryClient()
  const [distDeptId, setDistDeptId] = useState<number | ''>(initialDepartmentId ?? '')
  const [distBranchId, setDistBranchId] = useState<number | ''>('')
  const [distQty, setDistQty] = useState(5)

  const effectiveDeptId = distDeptId || initialDepartmentId || ''

  const branchesQuery = useQuery({
    queryKey: ['branches', 'all', effectiveDeptId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', {
        params: { per_page: 100, 'filter[department_id]': effectiveDeptId },
      })
      return data.data
    },
    enabled: Boolean(effectiveDeptId) && open,
  })

  const distributeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/department-stock/distribute', {
        department_id: distDeptId || initialDepartmentId,
        branch_id: distBranchId,
        quantity: distQty,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['gps-stock'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onSuccess?.()
      handleClose()
    },
  })

  const handleClose = () => {
    setDistDeptId(initialDepartmentId ?? '')
    setDistBranchId('')
    setDistQty(5)
    distributeMutation.reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="توزيع على فرع" size="lg">
      <form
        onSubmit={(e) => { e.preventDefault(); distributeMutation.mutate() }}
        className="grid gap-sm sm:grid-cols-3"
      >
        <select
          value={distDeptId || initialDepartmentId || ''}
          onChange={(e) => { setDistDeptId(Number(e.target.value)); setDistBranchId('') }}
          required
          disabled={Boolean(initialDepartmentId)}
          className={inputClass}
        >
          <option value="">الإدارة</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name_ar || d.name} (معلق: {d.department_stock?.pending ?? 0})
            </option>
          ))}
        </select>
        <select
          value={distBranchId}
          onChange={(e) => setDistBranchId(Number(e.target.value))}
          required
          disabled={!effectiveDeptId}
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
          value={distQty}
          onChange={(e) => setDistQty(Number(e.target.value))}
          placeholder="الكمية"
          className={`${inputClass} tabular-nums`}
        />
        {distributeMutation.isError && (
          <p className="text-sm text-error sm:col-span-3">{getErrorMessage(distributeMutation.error)}</p>
        )}
        <div className="flex gap-sm sm:col-span-3">
          <button
            type="submit"
            disabled={distributeMutation.isPending}
            className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary"
          >
            {distributeMutation.isPending ? 'جاري التوزيع...' : 'توزيع'}
          </button>
          <button type="button" onClick={handleClose} className="rounded-lg border px-md py-2 text-sm">
            إلغاء
          </button>
        </div>
      </form>
    </Modal>
  )
}
