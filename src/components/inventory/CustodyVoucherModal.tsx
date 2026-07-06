import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../api/client'
import type { Employee, PaginatedResponse, ProductUnit } from '../../api/types'
import { CUSTODY_BUCKET_OPTIONS, productUnitDisplayCode } from '../../lib/inventoryBuckets'
import { normalizeScannedInput } from '../../lib/scanner'
import { Modal } from '../Modal'
import { InventoryUnitTags } from './InventoryUnitTags'

interface CustodyVoucherModalProps {
  open: boolean
  mode: 'receive' | 'issue'
  branchId?: number | null
  onClose: () => void
  onSuccess?: () => void
}

export function CustodyVoucherModal({ open, mode, branchId, onClose, onSuccess }: CustodyVoucherModalProps) {
  const serialRef = useRef<HTMLInputElement>(null)
  const [serialCode, setSerialCode] = useState('')
  const [resolvedUnit, setResolvedUnit] = useState<ProductUnit | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [employeeId, setEmployeeId] = useState<number | ''>('')
  const [inventoryBucket, setInventoryBucket] = useState('custody_customer')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return
    setSerialCode('')
    setResolvedUnit(null)
    setLookupError(null)
    setEmployeeId('')
    setInventoryBucket('custody_customer')
    setNotes('')
    const timer = window.setTimeout(() => serialRef.current?.focus(), 50)
    return () => window.clearTimeout(timer)
  }, [open, mode])

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

  const lookupUnit = async (raw: string) => {
    const code = normalizeScannedInput(raw)
    setSerialCode(code)
    setResolvedUnit(null)
    setLookupError(null)

    if (!code) return

    setIsLookingUp(true)
    try {
      const { data } = await api.get<ProductUnit>('/product-units/lookup', { params: { code } })
      setResolvedUnit(data)
    } catch (error) {
      setLookupError(getErrorMessage(error))
    } finally {
      setIsLookingUp(false)
    }
  }

  const handleSerialKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      void lookupUnit(serialCode)
    }
  }

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        serial_code: serialCode,
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

  const canSubmit = Boolean(resolvedUnit && employeeId && branchId && !isLookingUp)

  return (
    <Modal open={open} onClose={onClose} title={mode === 'receive' ? 'إذن استلام جهاز عميل' : 'إذن صرف عهدة'}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">مسح السريال</label>
          <input
            ref={serialRef}
            type="text"
            autoComplete="off"
            placeholder="امسح أو اكتب السريال ثم Enter"
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-mono text-sm tracking-wide focus:border-primary focus:outline-none"
            value={serialCode}
            onChange={(e) => {
              setSerialCode(normalizeScannedInput(e.target.value))
              setLookupError(null)
              setResolvedUnit(null)
            }}
            onKeyDown={handleSerialKeyDown}
            onBlur={() => {
              if (serialCode && !resolvedUnit && !isLookingUp) {
                void lookupUnit(serialCode)
              }
            }}
          />
          {isLookingUp && <p className="mt-1 text-xs text-on-surface-variant">جاري البحث...</p>}
          {lookupError && <p className="mt-1 text-xs text-error">{lookupError}</p>}
        </div>

        {resolvedUnit && (
          <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-mono text-sm font-semibold">{productUnitDisplayCode(resolvedUnit)}</p>
                <p className="text-xs text-on-surface-variant">
                  {resolvedUnit.product_model?.name_ar ?? resolvedUnit.product_model?.name ?? '—'}
                </p>
              </div>
              <InventoryUnitTags state={resolvedUnit.state} inventoryBucket={resolvedUnit.inventory_bucket} />
            </div>
            {resolvedUnit.custody_employee?.name && (
              <p className="mt-2 text-xs text-on-surface-variant">
                عهدة حالية: {resolvedUnit.custody_employee.name}
              </p>
            )}
          </div>
        )}

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
            <label className="mb-2 block text-sm">تصنيف العهدة</label>
            <div className="flex flex-wrap gap-2">
              {CUSTODY_BUCKET_OPTIONS.map((option) => {
                const active = inventoryBucket === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary/50'
                    }`}
                    onClick={() => setInventoryBucket(option.value)}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
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
            disabled={!canSubmit || submitMutation.isPending}
            onClick={() => submitMutation.mutate()}
          >
            حفظ
          </button>
        </div>
      </div>
    </Modal>
  )
}
