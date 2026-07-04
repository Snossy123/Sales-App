import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../api/client'
import type { Employee, PaginatedResponse, ProductUnit } from '../../api/types'
import { Modal } from '../Modal'

const BUCKET_OPTIONS = [
  { value: 'custody_customer', label: 'أجهزة عملاء' },
  { value: 'custody_software', label: 'سوفت' },
  { value: 'custody_maintenance', label: 'صيانة' },
  { value: 'custody_branch_tracking', label: 'متابعة فرع' },
]

interface CustodyVoucherModalProps {
  open: boolean
  mode: 'receive' | 'issue'
  branchId?: number | null
  onClose: () => void
  onSuccess?: () => void
}

export function CustodyVoucherModal({ open, mode, branchId, onClose, onSuccess }: CustodyVoucherModalProps) {
  const [productUnitId, setProductUnitId] = useState<number | ''>('')
  const [employeeId, setEmployeeId] = useState<number | ''>('')
  const [inventoryBucket, setInventoryBucket] = useState('custody_customer')
  const [notes, setNotes] = useState('')

  const unitsQuery = useQuery({
    queryKey: ['product-units', 'custody', branchId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ProductUnit>>('/product-units', {
        params: { per_page: 100 },
      })
      return data.data ?? []
    },
    enabled: open,
  })

  const employeesQuery = useQuery({
    queryKey: ['employees', 'custody', branchId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', {
        params: { per_page: 100, ...(branchId ? { 'filter[branch_id]': branchId } : {}) },
      })
      return data.data ?? []
    },
    enabled: open,
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        product_unit_id: productUnitId,
        employee_id: employeeId,
        branch_id: branchId,
        notes: notes || undefined,
        ...(mode === 'issue' ? { inventory_bucket: inventoryBucket } : {}),
      }
      const path = mode === 'receive' ? '/inventory/custody/receive' : '/inventory/custody/issue'
      const { data } = await api.post(path, payload)
      return data
    },
    onSuccess: () => onSuccess?.(),
  })

  return (
    <Modal open={open} onClose={onClose} title={mode === 'receive' ? 'إذن استلام جهاز عميل' : 'إذن صرف عهدة'}>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm">الجهاز</label>
          <select
            className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
            value={productUnitId}
            onChange={(e) => setProductUnitId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">اختر الجهاز</option>
            {(unitsQuery.data ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.serial_number ?? u.imei ?? `#${u.id}`}
              </option>
            ))}
          </select>
        </div>
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
        {mode === 'issue' && (
          <div>
            <label className="mb-1 block text-sm">تصنيف العهدة</label>
            <select
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
              value={inventoryBucket}
              onChange={(e) => setInventoryBucket(e.target.value)}
            >
              {BUCKET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm">ملاحظات</label>
          <textarea
            className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
            rows={2}
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
            disabled={!productUnitId || !employeeId || !branchId || submitMutation.isPending}
            onClick={() => submitMutation.mutate()}
          >
            حفظ
          </button>
        </div>
      </div>
    </Modal>
  )
}
