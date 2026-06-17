import { Link } from 'react-router-dom'
import { useMemo, useState, useEffect, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type {
  Branch,
  CheckoutPayload,
  Customer,
  Distributor,
  Employee,
  GpsProduct,
  GpsStock,
  PaginatedResponse,
  ProductUnit,
  SalesInvoice,
} from '../api/types'
import {
  contractPrintPath,
  computeInstallmentDownPayment,
  computeMinDownPayment,
  distributorLabel,
  suggestInstallmentAmount,
} from '../lib/sales'
import { AsyncState } from '../components/AsyncState'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'
import { StartTourButton } from '../components/tour/StartTourButton'
import { usePageTour } from '../hooks/usePageTour'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useAuthStore } from '../stores/authStore'
import { useOrgSettingsStore } from '../stores/orgSettingsStore'
import { DiscountInput } from '../components/pos/DiscountInput'
import {
  createDeviceLine,
  DeviceLineCard,
  type DeviceLineDraft,
} from '../components/pos/DeviceLineCard'
import type { DiscountMode } from '../lib/discount'

type IntervalType = 'monthly' | 'weekly'

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

const selectClass = 'w-full rounded border border-outline-variant px-sm py-2 focus:border-primary focus:outline-none'

export function PosPage() {
  usePageTour('pos')
  const queryClient = useQueryClient()
  const warehouseId = useAuthStore((s) => s.warehouseId)
  const authBranchId = useAuthStore((s) => s.branchId)
  const salesSettings = useOrgSettingsStore((s) => s.sales)
  const allowNegativeInventory = salesSettings?.allow_negative_inventory ?? false
  const enableInstallationFee = salesSettings?.enable_installation_fee ?? true
  const defaultInstallationFee = salesSettings?.default_installation_fee ?? 500
  const allowDisableFeeInSale = salesSettings?.allow_disable_installation_fee_in_sale ?? true

  const [selectedBranchId, setSelectedBranchId] = useState<number | ''>(authBranchId ?? '')
  const [distributorSearch, setDistributorSearch] = useState('')
  const [distributorId, setDistributorId] = useState<number | ''>('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [paymentTerm, setPaymentTerm] = useState<'cash' | 'installment'>('installment')
  const [quantity, setQuantity] = useState(1)
  const [deviceLines, setDeviceLines] = useState<DeviceLineDraft[]>([])
  const [applyInstallationFee, setApplyInstallationFee] = useState(true)
  const [installationFee, setInstallationFee] = useState(defaultInstallationFee)
  const [feeDiscountAmount, setFeeDiscountAmount] = useState(0)
  const [feeDiscountPercent, setFeeDiscountPercent] = useState(0)
  const [feeDiscountMode, setFeeDiscountMode] = useState<DiscountMode>('amount')
  const [installmentAmount, setInstallmentAmount] = useState(500)
  const [installmentCount, setInstallmentCount] = useState(6)
  const [intervalType, setIntervalType] = useState<IntervalType>('monthly')
  const [firstDueDate, setFirstDueDate] = useState(() => new Date().toISOString().split('T')[0])
  const [technicianId, setTechnicianId] = useState<number | ''>('')
  const [contractDate, setContractDate] = useState(() => new Date().toISOString().split('T')[0])
  const [lastInvoice, setLastInvoice] = useState<SalesInvoice | null>(null)
  const [successMsg, setSuccessMsg] = useState('')

  const debouncedDistributorSearch = useDebouncedValue(distributorSearch, 300)
  const debouncedCustomerSearch = useDebouncedValue(customerSearch, 300)
  const branchId = selectedBranchId || authBranchId

  useEffect(() => {
    setInstallationFee(defaultInstallationFee)
  }, [defaultInstallationFee])

  const branchesQuery = useQuery({
    queryKey: ['branches', 'pos'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', {
        params: { per_page: 100, 'filter[is_active]': 1 },
      })
      return data.data
    },
  })

  const distributorsQuery = useQuery({
    queryKey: ['distributors', 'pos', branchId, debouncedDistributorSearch],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 50,
        'filter[status]': 'active',
      }
      if (branchId) params['filter[branch_id]'] = branchId
      const q = debouncedDistributorSearch.trim()
      if (q) {
        if (/^\d+$/.test(q)) {
          params['filter[code]'] = q
        } else {
          params['filter[name]'] = q
        }
      }
      const { data } = await api.get<PaginatedResponse<Distributor>>('/distributors', { params })
      return data.data
    },
    enabled: Boolean(branchId),
  })

  const customersQuery = useQuery({
    queryKey: ['customers', 'pos', branchId, debouncedCustomerSearch],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 50,
        'filter[status]': 'active',
      }
      if (branchId) params['filter[branch_id]'] = branchId
      const q = debouncedCustomerSearch.trim()
      if (q) {
        if (/^01\d{8,9}$/.test(q.replace(/\s/g, ''))) {
          params['filter[phone]'] = q.replace(/\s/g, '')
        } else {
          params['filter[name]'] = q
        }
      }
      const { data } = await api.get<PaginatedResponse<Customer>>('/customers', { params })
      return data.data
    },
    enabled: Boolean(branchId),
  })

  const employeesQuery = useQuery({
    queryKey: ['employees', 'pos', branchId],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 100,
        'filter[status]': 'active',
      }
      if (branchId) params['filter[branch_id]'] = branchId
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', { params })
      return data.data
    },
    enabled: Boolean(branchId),
  })

  const productQuery = useQuery({
    queryKey: ['gps-product'],
    queryFn: async () => {
      const { data } = await api.get<GpsProduct>('/gps-product')
      return data
    },
  })

  const stockQuery = useQuery({
    queryKey: ['gps-stock', 'pos', warehouseId],
    queryFn: async () => {
      const { data } = await api.get<GpsStock>('/gps-stock', {
        params: { 'filter[warehouse_id]': warehouseId },
      })
      return data
    },
    enabled: Boolean(warehouseId),
  })

  const unitsQuery = useQuery({
    queryKey: ['product-units', 'pos', warehouseId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ProductUnit>>('/product-units', {
        params: {
          per_page: 100,
          'filter[warehouse_id]': warehouseId,
          'filter[state]': 'available',
        },
      })
      return data.data
    },
    enabled: Boolean(warehouseId),
  })

  const unitPrice = productQuery.data?.sell_price ?? 0
  const available = stockQuery.data?.available ?? unitsQuery.data?.length ?? 0
  const maxQuantity = allowNegativeInventory ? 999 : available

  useEffect(() => {
    const units = unitsQuery.data ?? []
    setDeviceLines((prev) => {
      const next: DeviceLineDraft[] = []
      for (let i = 0; i < quantity; i++) {
        const existing = prev[i]
        const unit = units[i]
        if (existing) {
          next.push({
            ...existing,
            productUnitId: unit?.id ?? existing.productUnitId,
            imei: unit?.imei ?? existing.imei,
            unitPrice: Number(unitPrice),
            serialNumber: existing.serialNumber || unit?.serial_number || '',
          })
        } else {
          next.push(createDeviceLine(Number(unitPrice), unit))
        }
      }
      return next
    })
  }, [quantity, unitPrice, unitsQuery.data])

  const grossInstallationFee =
    enableInstallationFee && applyInstallationFee ? Number(installationFee) : 0
  const netInstallationFee = Math.max(0, grossInstallationFee - feeDiscountAmount)
  const devicesSubtotal = deviceLines.reduce(
    (sum, line) => sum + Math.max(0, line.unitPrice - line.discountAmount),
    0,
  )
  const totalEstimate = devicesSubtotal + netInstallationFee
  const minDownPercent = salesSettings?.min_down_payment_percent ?? 10
  const computedDownPayment = useMemo(
    () => computeInstallmentDownPayment(totalEstimate, installmentAmount, installmentCount),
    [totalEstimate, installmentAmount, installmentCount],
  )
  const minDownPayment = useMemo(
    () => computeMinDownPayment(totalEstimate, minDownPercent),
    [totalEstimate, minDownPercent],
  )
  const installmentsExceedTotal =
    paymentTerm === 'installment' && installmentAmount * installmentCount > totalEstimate + 0.009
  const downPaymentTooLow =
    paymentTerm === 'installment' &&
    !installmentsExceedTotal &&
    computedDownPayment < minDownPayment - 0.009

  useEffect(() => {
    if (totalEstimate <= 0) return
    setInstallmentAmount(suggestInstallmentAmount(totalEstimate, installmentCount, minDownPercent))
  }, [totalEstimate, installmentCount, minDownPercent])

  const checkoutMutation = useMutation({
    mutationFn: async (payload: CheckoutPayload) => {
      const { data } = await api.post<SalesInvoice>('/sales-invoices/checkout', payload)
      return data
    },
    onSuccess: (invoice) => {
      setLastInvoice(invoice)
      setSuccessMsg(
        `تم إنشاء التعاقد #${invoice.invoice_number ?? invoice.id} — ${invoice.lines?.length ?? 1} جهاز`,
      )
      setQuantity(1)
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['gps-stock'] })
      queryClient.invalidateQueries({ queryKey: ['product-units'] })
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['installments'] })
    },
  })

  const updateDeviceLine = (index: number, line: DeviceLineDraft) => {
    setDeviceLines((prev) => prev.map((item, i) => (i === index ? line : item)))
  }

  const handleCheckout = (e: FormEvent) => {
    e.preventDefault()
    if (!customerId || !distributorId || !warehouseId || quantity <= 0 || deviceLines.length === 0) return
    if (!allowNegativeInventory && quantity > available) return

    const units = unitsQuery.data ?? []
    const lines: CheckoutPayload['lines'] = deviceLines.map((line, index) => {
      const unit = units[index]
      const renewalDate =
        line.renewalType === 'annual' ? addDays(contractDate, 365) : undefined
      return {
        product_unit_id: line.productUnitId ?? unit?.id,
        unit_price: line.unitPrice,
        discount: line.discountAmount,
        serial_number: line.serialNumber.trim() || undefined,
        sim_number: line.simNumber.trim() || undefined,
        vehicle_type: line.vehicleType || undefined,
        vehicle_plate_letters: line.vehiclePlateLetters.trim() || undefined,
        vehicle_plate_numbers: line.vehiclePlateNumbers.trim() || undefined,
        chassis_number: line.chassisNumber.trim() || undefined,
        engine_number: line.engineNumber.trim() || undefined,
        renewal_type: line.renewalType,
        subscription_renewal_date: renewalDate,
      }
    })

    if (!allowNegativeInventory && lines.some((l) => !l.product_unit_id)) return

    const payload: CheckoutPayload = {
      customer_id: Number(customerId),
      distributor_id: Number(distributorId),
      warehouse_id: warehouseId,
      branch_id: branchId ?? undefined,
      payment_term: paymentTerm,
      installation_fee: grossInstallationFee,
      discount_amount: feeDiscountAmount,
      invoice_date: contractDate,
      technician_id: technicianId ? Number(technicianId) : undefined,
      lines,
    }

    if (paymentTerm === 'installment') {
      payload.installment_plan = {
        installment_count: installmentCount,
        installment_amount: installmentAmount,
        interval_type: intervalType,
        interval_days: intervalType === 'weekly' ? 7 : 30,
        first_due_date: firstDueDate,
      }
    }

    checkoutMutation.mutate(payload)
  }

  return (
    <SalesPageShell
      title="تعاقد جديد"
      subtitle="تعاقد GPS لكل جهاز — سريال وشريحة وخصم ومركبة لكل قطعة"
      actions={<StartTourButton tourId="pos" />}
    >
      {!warehouseId ? (
        <p className="text-on-surface-variant">يرجى اختيار مخزن قبل إتمام التعاقد.</p>
      ) : (
        <form onSubmit={handleCheckout} className="grid gap-md lg:grid-cols-2">
          <div className="space-y-md rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
            <h2 className="font-semibold text-on-surface">بيانات العملية</h2>

            <div>
              <label className="mb-xs block text-sm text-on-surface-variant">الفرع</label>
              <select
                value={selectedBranchId}
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : ''
                  setSelectedBranchId(value)
                  setDistributorId('')
                  setCustomerId('')
                  setTechnicianId('')
                }}
                className={selectClass}
              >
                <option value="">اختر الفرع</option>
                {(branchesQuery.data ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name_ar || b.name}
                  </option>
                ))}
              </select>
            </div>

            <div data-tour="pos-distributor">
              <label className="mb-xs block text-sm text-on-surface-variant">بحث الموزع</label>
              <input
                value={distributorSearch}
                onChange={(e) => setDistributorSearch(e.target.value)}
                placeholder="ابحث بالكود أو الاسم أو الهاتف..."
                className={`mb-sm ${selectClass}`}
              />
              <select
                value={distributorId}
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : ''
                  setDistributorId(value)
                  setCustomerId('')
                }}
                required
                className={selectClass}
              >
                <option value="">
                  {distributorsQuery.isLoading ? 'جاري البحث...' : 'اختر الموزع'}
                </option>
                {(distributorsQuery.data ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} — {distributorLabel(d)}
                    {d.phone ? ` — ${d.phone}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div data-tour="pos-customer">
              <label className="mb-xs block text-sm text-on-surface-variant">بحث العميل</label>
              <input
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="ابحث بالاسم أو رقم الموبايل..."
                disabled={!branchId}
                className={`mb-sm ${selectClass} disabled:opacity-50`}
              />
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : '')}
                required
                disabled={!branchId}
                className={`${selectClass} disabled:opacity-50`}
              >
                <option value="">
                  {!branchId
                    ? 'اختر الفرع أولاً'
                    : customersQuery.isLoading
                      ? 'جاري البحث...'
                      : 'اختر العميل'}
                </option>
                {customersQuery.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.phone}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-xs block text-sm text-on-surface-variant">تاريخ التعاقد</label>
              <input
                type="date"
                value={contractDate}
                onChange={(e) => setContractDate(e.target.value)}
                className={selectClass}
              />
            </div>

            <div data-tour="pos-payment">
              <label className="mb-xs block text-sm text-on-surface-variant">طريقة الدفع</label>
              <div className="flex gap-sm">
                {(['cash', 'installment'] as const).map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setPaymentTerm(term)}
                    className={`flex-1 rounded-lg border py-sm text-sm font-medium transition-colors ${
                      paymentTerm === term
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-outline-variant bg-surface-container-low hover:bg-surface-container-high'
                    }`}
                  >
                    {term === 'cash' ? 'نقدي' : 'تقسيط'}
                  </button>
                ))}
              </div>
            </div>

            {enableInstallationFee && (
              <div className="space-y-sm rounded-lg border border-outline-variant/60 p-sm">
                <div className="flex items-center justify-between gap-sm">
                  <label className="text-sm font-medium text-on-surface">رسوم التركيب</label>
                  {allowDisableFeeInSale && (
                    <label className="flex items-center gap-xs text-sm">
                      <input
                        type="checkbox"
                        checked={applyInstallationFee}
                        onChange={(e) => setApplyInstallationFee(e.target.checked)}
                      />
                      تطبيق الرسوم
                    </label>
                  )}
                </div>
                {applyInstallationFee && (
                  <>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={installationFee}
                      onChange={(e) => setInstallationFee(Number(e.target.value))}
                      className={`${selectClass} tabular-nums`}
                    />
                    <DiscountInput
                      label="خصم رسوم التركيب"
                      baseAmount={Number(installationFee)}
                      amount={feeDiscountAmount}
                      percent={feeDiscountPercent}
                      mode={feeDiscountMode}
                      onChange={({ amount, percent, mode }) => {
                        setFeeDiscountAmount(amount)
                        setFeeDiscountPercent(percent)
                        setFeeDiscountMode(mode)
                      }}
                    />
                    <p className="text-sm tabular-nums text-on-surface-variant">
                      صافي الرسوم: <strong>{netInstallationFee.toLocaleString('ar-EG')} ج.م</strong>
                    </p>
                  </>
                )}
              </div>
            )}

            {paymentTerm === 'installment' && (
              <>
                <div>
                  <label className="mb-xs block text-sm text-on-surface-variant">نوع القسط</label>
                  <div className="flex gap-sm">
                    {(['monthly', 'weekly'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setIntervalType(type)
                          setFirstDueDate(addDays(contractDate, type === 'weekly' ? 7 : 30))
                        }}
                        className={`flex-1 rounded-lg border py-sm text-sm font-medium ${
                          intervalType === type
                            ? 'border-primary bg-primary text-on-primary'
                            : 'border-outline-variant bg-surface-container-low'
                        }`}
                      >
                        {type === 'monthly' ? 'شهري' : 'أسبوعي'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-sm sm:grid-cols-2">
                  <div>
                    <label className="mb-xs block text-xs text-on-surface-variant">قيمة القسط</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={installmentAmount}
                      onChange={(e) => setInstallmentAmount(Number(e.target.value))}
                      className={`${selectClass} tabular-nums`}
                    />
                  </div>
                  <div>
                    <label className="mb-xs block text-xs text-on-surface-variant">عدد الأقساط</label>
                    <input
                      type="number"
                      min={1}
                      max={salesSettings?.max_installment_months ?? 24}
                      value={installmentCount}
                      onChange={(e) => setInstallmentCount(Number(e.target.value))}
                      className={`${selectClass} tabular-nums`}
                    />
                  </div>
                  <div>
                    <label className="mb-xs block text-xs text-on-surface-variant">المقدم (يُحسب تلقائياً)</label>
                    <div className="rounded border border-outline-variant bg-surface-container-low px-sm py-2 text-sm font-medium tabular-nums">
                      {computedDownPayment.toLocaleString('ar-EG')} ج.م
                    </div>
                  </div>
                  <div>
                    <label className="mb-xs block text-xs text-on-surface-variant">أول استحقاق</label>
                    <input
                      type="date"
                      value={firstDueDate}
                      onChange={(e) => setFirstDueDate(e.target.value)}
                      className={selectClass}
                    />
                  </div>
                </div>
                {installmentsExceedTotal && (
                  <p className="text-sm text-error">
                    مجموع الأقساط يتجاوز الإجمالي — قلّل قيمة القسط أو عدد الأقساط.
                  </p>
                )}
                {downPaymentTooLow && (
                  <p className="text-sm text-error">
                    المقدم المحسوب أقل من الحد الأدنى ({minDownPercent}% = {minDownPayment.toLocaleString('ar-EG')} ج.م)
                  </p>
                )}
              </>
            )}

            <div>
              <label className="mb-xs block text-sm text-on-surface-variant">الفني (دعم)</label>
              <select
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value ? Number(e.target.value) : '')}
                className={selectClass}
              >
                <option value="">اختر موظف الدعم الفني</option>
                {(employeesQuery.data ?? []).map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                    {emp.job_title ? ` — ${emp.job_title}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div data-tour="pos-product" className="space-y-md">
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
              <h2 className="mb-md font-semibold text-on-surface">أجهزة GPS</h2>
              {allowNegativeInventory && (
                <p className="mb-sm rounded-lg bg-amber-500/10 px-sm py-xs text-xs text-amber-800">
                  المخزون السالب مفعّل — يمكن التعاقد بدون وحدات متاحة
                </p>
              )}
              <AsyncState
                isLoading={productQuery.isLoading || stockQuery.isLoading}
                isError={productQuery.isError || stockQuery.isError}
                error={productQuery.error ?? stockQuery.error}
              >
                {productQuery.data && (
                  <div className="mb-md rounded-lg border border-outline-variant/60 bg-surface-container-low p-md">
                    <div className="mb-sm flex items-center gap-sm">
                      <Icon name="gps_fixed" className="text-primary" />
                      <span className="font-medium">
                        {productQuery.data.name_ar || productQuery.data.name}
                      </span>
                    </div>
                    <p className="mb-sm text-sm text-on-surface-variant">
                      متاح: <strong className="tabular-nums">{available}</strong> قطعة
                    </p>
                    <p className="mb-md tabular-nums text-sm">
                      سعر الوحدة: {Number(unitPrice).toLocaleString('ar-EG')} ج.م
                    </p>
                    <div>
                      <label className="mb-xs block text-sm text-on-surface-variant">عدد الأجهزة</label>
                      <input
                        type="number"
                        min={1}
                        max={maxQuantity}
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className={`${selectClass} tabular-nums`}
                      />
                    </div>
                  </div>
                )}
              </AsyncState>

              <div className="space-y-md">
                {deviceLines.map((line, index) => (
                  <DeviceLineCard
                    key={line.key}
                    index={index}
                    line={line}
                    contractDate={contractDate}
                    onChange={(next) => updateDeviceLine(index, next)}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
              <div className="mb-sm space-y-1 text-sm text-on-surface-variant">
                <div className="flex justify-between tabular-nums">
                  <span>قيمة الأجهزة (بعد الخصم)</span>
                  <span>{devicesSubtotal.toLocaleString('ar-EG')} ج.م</span>
                </div>
                <div className="flex justify-between tabular-nums">
                  <span>رسوم التركيب (صافي)</span>
                  <span>{netInstallationFee.toLocaleString('ar-EG')} ج.م</span>
                </div>
                {paymentTerm === 'installment' && (
                  <>
                    <div className="flex justify-between tabular-nums">
                      <span>مجموع الأقساط</span>
                      <span>{(installmentAmount * installmentCount).toLocaleString('ar-EG')} ج.م</span>
                    </div>
                    <div className="flex justify-between tabular-nums">
                      <span>المقدم</span>
                      <span>{computedDownPayment.toLocaleString('ar-EG')} ج.م</span>
                    </div>
                  </>
                )}
              </div>
              <p className="mb-sm text-lg font-bold tabular-nums">
                الإجمالي: {totalEstimate.toLocaleString('ar-EG')} ج.م
              </p>
              {checkoutMutation.isError && (
                <p className="mb-sm text-sm text-error">
                  {getErrorMessage(checkoutMutation.error)}
                </p>
              )}
              {successMsg && lastInvoice && (
                <div className="mb-sm rounded-lg bg-secondary/10 p-sm text-sm text-secondary">
                  <p>{successMsg}</p>
                  <div className="mt-sm flex flex-col gap-1">
                    {(lastInvoice.lines ?? []).map((line, index) => (
                      <Link
                        key={line.id}
                        to={contractPrintPath(lastInvoice.id, { lineId: line.id, autoPrint: false })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                      >
                        <Icon name="print" size={18} />
                        طباعة عقد الجهاز {index + 1}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              <button
                type="submit"
                data-tour="pos-submit"
                disabled={
                  checkoutMutation.isPending ||
                  !customerId ||
                  !distributorId ||
                  !branchId ||
                  quantity <= 0 ||
                  deviceLines.length === 0 ||
                  (!allowNegativeInventory && quantity > available) ||
                  installmentsExceedTotal ||
                  downPaymentTooLow
                }
                className="flex w-full items-center justify-center gap-xs rounded-lg bg-secondary py-4 text-base font-bold text-on-secondary transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Icon name="check_circle" />
                {checkoutMutation.isPending ? 'جاري الحفظ...' : 'إتمام التعاقد'}
              </button>
            </div>
          </div>
        </form>
      )}
    </SalesPageShell>
  )
}
