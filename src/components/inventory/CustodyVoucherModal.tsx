import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../api/client'
import type { Customer, CustomerContractDevice, CustodyVoucher, Employee, PaginatedResponse, ProductUnit } from '../../api/types'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { CUSTODY_BUCKET_OPTIONS } from '../../lib/inventoryBuckets'
import { normalizeScannedDigits } from '../../lib/scanner'
import { CustodyVoucherDetails } from './CustodyVoucherDetails'
import { CustomerCreateModal } from '../customers/CustomerCreateModal'
import { Modal } from '../Modal'

interface CustodyVoucherModalProps {
  open: boolean
  mode: 'receive' | 'issue'
  branchId?: number | null
  onClose: () => void
  onSuccess?: () => void
}

type RecipientType = 'employee' | 'customer'

export function CustodyVoucherModal(props: CustodyVoucherModalProps) {
  if (!props.open) return null
  return <CustodyVoucherForm {...props} />
}

function CustodyVoucherForm({ open, mode, branchId, onClose, onSuccess }: CustodyVoucherModalProps) {
  const serialRef = useRef<HTMLInputElement>(null)
  const customerSearchRef = useRef<HTMLInputElement>(null)
  const [serialCode, setSerialCode] = useState('')
  const [deviceDropdownOpen, setDeviceDropdownOpen] = useState(false)
  const [deviceSearch, setDeviceSearch] = useState('')
  const lookupVersion = useRef(0)
  const [resolvedUnit, setResolvedUnit] = useState<ProductUnit | null>(null)
  const [needsRegister, setNeedsRegister] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [employeeId, setEmployeeId] = useState<number | ''>('')
  const [inventoryBucket, setInventoryBucket] = useState('custody_customer')
  const [notes, setNotes] = useState('')
  const [recipientType, setRecipientType] = useState<RecipientType>(mode === 'issue' ? 'customer' : 'employee')
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [addCustomerOpen, setAddCustomerOpen] = useState(false)
  const [savedVoucher, setSavedVoucher] = useState<CustodyVoucher | null>(null)
  const debouncedCustomerSearch = useDebouncedValue(customerSearch, 300)
  const customerQuery = debouncedCustomerSearch.trim()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (customerSearchRef.current) customerSearchRef.current.focus()
      else serialRef.current?.focus()
    }, 50)
    return () => window.clearTimeout(timer)
  }, [mode])

  useEffect(() => {
    if (!selectedCustomer) return
    const timer = window.setTimeout(() => serialRef.current?.focus(), 50)
    return () => window.clearTimeout(timer)
  }, [selectedCustomer])

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
    enabled:
      open &&
      !selectedCustomer &&
      customerQuery.length >= 2,
  })

  const confirmCustomer = (customer: Customer) => {
    resetDevice()
    setSelectedCustomer(customer)
    setCustomerId(customer.id)
    setAddCustomerOpen(false)
  }

  const resetDevice = () => {
    lookupVersion.current += 1
    setSerialCode('')
    setDeviceSearch('')
    setResolvedUnit(null)
    setNeedsRegister(false)
    setLookupError(null)
    setIsLookingUp(false)
    setDeviceDropdownOpen(false)
  }

  const clearCustomer = () => {
    resetDevice()
    setSelectedCustomer(null)
    setCustomerId('')
    setCustomerSearch('')
  }

  const customerDevicesQuery = useQuery({
    queryKey: ['customers', customerId, 'devices'],
    queryFn: async () => {
      const { data } = await api.get<{ data: CustomerContractDevice[] }>(`/customers/${customerId}/devices`)
      return data.data ?? []
    },
    enabled: open && Boolean(customerId),
  })

  const lookupUnit = async (raw: string) => {
    const version = ++lookupVersion.current
    const code = normalizeScannedDigits(raw)
    setSerialCode(code)
    setResolvedUnit(null)
    setNeedsRegister(false)
    setLookupError(null)

    if (!code) return

    setIsLookingUp(true)
    try {
      const { data } = await api.get<ProductUnit>('/product-units/lookup', { params: { code } })
      if (version !== lookupVersion.current) return
      setResolvedUnit(data)
      setNeedsRegister(false)
    } catch (error) {
      if (version !== lookupVersion.current) return
      const message = getErrorMessage(error)
      if (mode === 'receive') {
        setNeedsRegister(true)
        setLookupError(null)
      } else {
        setLookupError(message)
      }
    } finally {
      if (version === lookupVersion.current) setIsLookingUp(false)
    }
  }

  const handleSerialKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      setDeviceDropdownOpen(false)
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
          const serial = serialCode.trim()
          payload.register = {
            imei: serial,
            serial_number: serial,
            notes: notes || undefined,
          }
        }
        if (customerId) payload.customer_id = customerId
        const { data } = await api.post<CustodyVoucher>('/inventory/custody/receive', payload)
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
      const { data } = await api.post<CustodyVoucher>('/inventory/custody/issue', payload)
      return data
    },
    onSuccess: (voucher) => {
      setSavedVoucher(voucher)
      onSuccess?.()
    },
  })

  const unitReady = Boolean(resolvedUnit) || (mode === 'receive' && needsRegister && serialCode.trim())
  const customerReady = inventoryBucket !== 'custody_customer' || Boolean(customerId)
  const recipientReady =
    mode === 'receive'
      ? Boolean(inventoryBucket) && Boolean(employeeId) && customerReady
      : recipientType === 'employee'
        ? Boolean(employeeId)
        : Boolean(customerId)
  const canSubmit = Boolean(unitReady && recipientReady && branchId && !isLookingUp)

  return (
    <Modal
      open={open}
      onClose={() => {
        if (addCustomerOpen) return
        onClose()
      }}
      title={mode === 'receive' ? 'إذن استلام جهاز' : 'إذن صرف'}
    >
      {savedVoucher ? (
        <div className="space-y-3">
          <p className="text-sm text-secondary">تم حفظ الإذن {savedVoucher.voucher_number}.</p>
          <CustodyVoucherDetails voucher={savedVoucher} />
          <div className="flex justify-end">
            <button
              type="button"
              className="rounded-lg bg-primary px-4 py-2 text-sm text-on-primary"
              onClick={onClose}
            >
              إغلاق
            </button>
          </div>
        </div>
      ) : (
      <>
      <div className="space-y-4">
        {(
          selectedCustomer ? (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-on-surface">{selectedCustomer.name}</p>
                  <p className="text-sm tabular-nums text-on-surface-variant">{selectedCustomer.phone}</p>
                </div>
                <button
                  type="button"
                  className="text-sm font-bold text-primary hover:underline"
                  onClick={clearCustomer}
                >
                  تغيير العميل
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">العميل</label>
                <button
                  type="button"
                  className="text-xs font-bold text-primary hover:underline"
                  onClick={() => setAddCustomerOpen(true)}
                >
                  عميل جديد
                </button>
              </div>
              <input
                ref={customerSearchRef}
                type="search"
                autoFocus
                className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
                placeholder="ابحث بالاسم أو الموبايل"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
              <p className="text-xs text-on-surface-variant">حرفين على الأقل. لو مش لاقيه، أضف عميل جديد.</p>
              {customersQuery.isFetching && customerQuery.length >= 2 ? (
                <p className="text-xs text-on-surface-variant">جاري البحث...</p>
              ) : null}
              {customerQuery.length >= 2 && !customersQuery.isFetching && (customersQuery.data?.length ?? 0) === 0 ? (
                <div className="rounded-lg border border-dashed border-outline-variant px-3 py-4 text-center">
                  <p className="text-sm text-on-surface-variant">لا يوجد عميل مطابق</p>
                  <button
                    type="button"
                    className="mt-2 text-sm font-bold text-primary hover:underline"
                    onClick={() => setAddCustomerOpen(true)}
                  >
                    إضافة عميل جديد
                  </button>
                </div>
              ) : null}
              <div className="grid gap-2">
                {(customersQuery.data ?? []).map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    className="rounded-lg border border-outline-variant px-3 py-2 text-start text-sm hover:border-primary/50"
                    onClick={() => confirmCustomer(customer)}
                  >
                    <span className="font-medium">{customer.name}</span>
                    <span className="mt-0.5 block text-xs tabular-nums text-on-surface-variant">{customer.phone}</span>
                  </button>
                ))}
              </div>

            </div>
          )
        )}

        <>
        <div
          className="relative"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setDeviceDropdownOpen(false)
              if (serialCode && !resolvedUnit && !needsRegister && !isLookingUp) void lookupUnit(serialCode)
            }
          }}
        >
          <label htmlFor="custody-device" className="mb-1 block text-sm font-medium">مسح السريال / اختيار جهاز</label>
          <input
            id="custody-device"
            ref={serialRef}
            type="text"
            role="combobox"
            aria-expanded={deviceDropdownOpen}
            aria-controls="custody-device-options"
            aria-autocomplete="list"
            autoComplete="off"
            placeholder="اختر جهاز العميل أو امسح السريال"
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm focus:border-primary focus:outline-none"
            value={serialCode}
            onFocus={() => {
              setDeviceSearch('')
              setDeviceDropdownOpen(true)
            }}
            onChange={(e) => {
              lookupVersion.current += 1
              const code = normalizeScannedDigits(e.target.value)
              setSerialCode(code)
              setDeviceSearch(code)
              setDeviceDropdownOpen(true)
              setLookupError(null)
              setResolvedUnit(null)
              setNeedsRegister(false)
              setIsLookingUp(false)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setDeviceDropdownOpen(false)
              else if (event.key === 'ArrowDown') {
                event.preventDefault()
                setDeviceDropdownOpen(true)
                document.querySelector<HTMLButtonElement>('#custody-device-options button')?.focus()
              } else handleSerialKeyDown(event)
            }}
          />
          {deviceDropdownOpen && (
            <ul id="custody-device-options" role="listbox" aria-label="أجهزة العميل" className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-outline-variant bg-surface-container-lowest shadow-md">
              {customerDevicesQuery.isFetching ? (
                <li className="p-3 text-sm">جارٍ تحميل أجهزة العميل...</li>
              ) : customerDevicesQuery.isError ? (
                <li role="alert" className="p-3 text-sm text-error">{getErrorMessage(customerDevicesQuery.error)}</li>
              ) : (() => {
                const devices = (customerDevicesQuery.data ?? []).filter((device) =>
                  [device.serial_number, device.physical_serial, device.product_model?.name, device.product_model?.name_ar]
                    .some((value) => value?.toLowerCase().includes(deviceSearch.toLowerCase())),
                )
                return devices.length ? devices.map((device) => {
                  const code = device.serial_number || device.physical_serial
                  return (
                    <li key={device.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={Boolean(code && serialCode === code)}
                        disabled={!code}
                        className="block w-full px-3 py-2 text-start text-sm hover:bg-primary/10 focus:bg-primary/10 disabled:opacity-50"
                        onMouseDown={(event) => event.preventDefault()}
                        onKeyDown={(event) => {
                          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                            event.preventDefault()
                            const item = event.currentTarget.parentElement
                            const next = event.key === 'ArrowDown' ? item?.nextElementSibling : item?.previousElementSibling
                            next?.querySelector<HTMLButtonElement>('button')?.focus()
                          } else if (event.key === 'Escape') {
                            serialRef.current?.focus()
                            setDeviceDropdownOpen(false)
                          }
                        }}
                        onClick={() => {
                          if (!code) return
                          setDeviceDropdownOpen(false)
                          setDeviceSearch('')
                          void lookupUnit(code)
                        }}
                      >
                        {code || 'بدون سريال'} — {device.product_model?.name_ar || device.product_model?.name || 'جهاز'}
                      </button>
                    </li>
                  )
                }) : <li className="p-3 text-sm text-on-surface-variant">{customerId ? 'لا توجد أجهزة مطابقة. يمكنك مسح أو كتابة السريال ثم Enter.' : 'اختر العميل لعرض أجهزته أو امسح السريال.'}</li>
              })()}
            </ul>
          )}
          {isLookingUp && <p className="mt-1 text-xs text-on-surface-variant">جاري البحث...</p>}
          {lookupError && <p role="alert" className="mt-1 text-xs text-error">{lookupError}</p>}
        </div>

        {mode === 'receive' && needsRegister && (
          <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
            <p className="text-sm font-medium text-on-surface">الجهاز غير مسجل — سيتم تسجيله بالسريال الممسوح</p>
            <p className="mt-1 font-mono text-sm">{serialCode.trim()}</p>
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
                    onClick={() => setRecipientType(option.value)}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
            {recipientType === 'customer' ? (
              <p className="mt-2 text-xs text-on-surface-variant">سيتم إخراج الجهاز من عهدة الفرع وإرجاعه للعميل.</p>
            ) : null}
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
              {mode === 'receive' && !inventoryBucket ? (
                <p className="mt-2 text-xs text-on-surface-variant">اختر حالة الجهاز.</p>
              ) : null}
            </div>
          </>
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
        </>
      </div>
      <CustomerCreateModal
        open={addCustomerOpen}
        startWithDevices
        onClose={() => setAddCustomerOpen(false)}
        onCreated={confirmCustomer}
      />
      </>
      )}
    </Modal>
  )
}
