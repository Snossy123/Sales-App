import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../api/client'
import type { Customer, Employee, PaginatedResponse, ProductUnit } from '../../api/types'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
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

type RecipientType = 'employee' | 'customer'

export function CustodyVoucherModal({ open, mode, branchId, onClose, onSuccess }: CustodyVoucherModalProps) {
  const serialRef = useRef<HTMLInputElement>(null)
  const [serialCode, setSerialCode] = useState('')
  const [resolvedUnit, setResolvedUnit] = useState<ProductUnit | null>(null)
  const [needsRegister, setNeedsRegister] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [employeeId, setEmployeeId] = useState<number | ''>('')
  const [inventoryBucket, setInventoryBucket] = useState('custody_customer')
  const [notes, setNotes] = useState('')
  const [registerImei, setRegisterImei] = useState('')
  const [registerSerial, setRegisterSerial] = useState('')
  const [recipientType, setRecipientType] = useState<RecipientType>('employee')
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [customerSearch, setCustomerSearch] = useState('')
  const debouncedCustomerSearch = useDebouncedValue(customerSearch, 300)

  useEffect(() => {
    if (!open) return
    setSerialCode('')
    setResolvedUnit(null)
    setNeedsRegister(false)
    setLookupError(null)
    setEmployeeId('')
    setInventoryBucket('custody_customer')
    setNotes('')
    setRegisterImei('')
    setRegisterSerial('')
    setRecipientType('employee')
    setCustomerId('')
    setCustomerSearch('')
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
    enabled: open && (mode === 'receive' || recipientType === 'employee'),
  })

  const customersQuery = useQuery({
    queryKey: ['customers', 'custody-issue', debouncedCustomerSearch],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 20 }
      const q = debouncedCustomerSearch.trim()
      if (q) {
        if (/^01\d{8,9}$/.test(q.replace(/\s/g, ''))) {
          params['filter[phone]'] = q.replace(/\s/g, '')
        } else {
          params['filter[name]'] = q
        }
      }
      const { data } = await api.get<PaginatedResponse<Customer>>('/customers', { params })
      return data.data ?? []
    },
    enabled: open && mode === 'issue' && recipientType === 'customer',
  })

  const lookupUnit = async (raw: string) => {
    const code = normalizeScannedInput(raw)
    setSerialCode(code)
    setResolvedUnit(null)
    setNeedsRegister(false)
    setLookupError(null)

    if (!code) return

    setIsLookingUp(true)
    try {
      const { data } = await api.get<ProductUnit>('/product-units/lookup', { params: { code } })
      setResolvedUnit(data)
      setNeedsRegister(false)
    } catch (error) {
      const message = getErrorMessage(error)
      if (mode === 'receive') {
        setNeedsRegister(true)
        setRegisterSerial(code)
        setRegisterImei(code)
        setLookupError(null)
      } else {
        setLookupError(message)
      }
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
      if (mode === 'receive') {
        const payload: Record<string, unknown> = {
          serial_code: serialCode,
          employee_id: employeeId,
          branch_id: branchId,
          inventory_bucket: inventoryBucket,
          notes: notes || undefined,
        }
        if (needsRegister) {
          payload.register = {
            imei: registerImei.trim(),
            serial_number: registerSerial.trim() || serialCode,
            notes: notes || undefined,
          }
        }
        const { data } = await api.post('/inventory/custody/receive', payload)
        return data
      }

      const payload: Record<string, unknown> = {
        serial_code: serialCode,
        branch_id: branchId,
        recipient_type: recipientType,
        notes: notes || undefined,
      }
      if (recipientType === 'employee') {
        payload.employee_id = employeeId
        payload.inventory_bucket = inventoryBucket
      } else {
        payload.customer_id = customerId
      }
      const { data } = await api.post('/inventory/custody/issue', payload)
      return data
    },
    onSuccess: () => onSuccess?.(),
  })

  const unitReady = Boolean(resolvedUnit) || (mode === 'receive' && needsRegister && registerImei.trim())
  const recipientReady =
    mode === 'receive'
      ? Boolean(employeeId)
      : recipientType === 'employee'
        ? Boolean(employeeId)
        : Boolean(customerId)
  const canSubmit = Boolean(unitReady && recipientReady && branchId && !isLookingUp)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'receive' ? 'إذن استلام جهاز' : 'إذن صرف'}
    >
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
              setNeedsRegister(false)
            }}
            onKeyDown={handleSerialKeyDown}
            onBlur={() => {
              if (serialCode && !resolvedUnit && !needsRegister && !isLookingUp) {
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

        {mode === 'receive' && needsRegister && (
          <div className="space-y-3 rounded-lg border border-outline-variant bg-surface-container-low p-3">
            <p className="text-sm font-medium text-on-surface">الجهاز غير مسجل — أدخل بياناته</p>
            <div>
              <label className="mb-1 block text-xs text-on-surface-variant">السريال</label>
              <input
                type="text"
                className="w-full rounded-lg border border-outline-variant px-3 py-2 font-mono text-sm"
                value={registerSerial}
                onChange={(e) => setRegisterSerial(normalizeScannedInput(e.target.value))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-on-surface-variant">IMEI</label>
              <input
                type="text"
                className="w-full rounded-lg border border-outline-variant px-3 py-2 font-mono text-sm"
                value={registerImei}
                onChange={(e) => setRegisterImei(normalizeScannedInput(e.target.value))}
                placeholder="رقم الـ IMEI"
              />
            </div>
          </div>
        )}

        {mode === 'issue' && (
          <div>
            <label className="mb-2 block text-sm">صرف إلى</label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: 'employee' as const, label: 'موظف' },
                  { value: 'customer' as const, label: 'عميل' },
                ] as const
              ).map((option) => {
                const active = recipientType === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary/50'
                    }`}
                    onClick={() => {
                      setRecipientType(option.value)
                      setCustomerId('')
                      if (option.value === 'customer') setEmployeeId('')
                    }}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {(mode === 'receive' || (mode === 'issue' && recipientType === 'employee')) && (
          <>
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

            <div>
              <label className="mb-2 block text-sm">
                {mode === 'receive' ? 'حالة الجهاز' : 'تصنيف العهدة'}
              </label>
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
          </>
        )}

        {mode === 'issue' && recipientType === 'customer' && (
          <div className="space-y-2">
            <label className="mb-1 block text-sm">العميل</label>
            <input
              type="search"
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
              placeholder="ابحث بالاسم أو الموبايل"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
            <select
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">اختر العميل</option>
              {(customersQuery.data ?? []).map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} — {customer.phone}
                </option>
              ))}
            </select>
            <p className="text-xs text-on-surface-variant">سيتم إخراج الجهاز من عهدة الفرع وإرجاعه للعميل.</p>
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
            {submitMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
