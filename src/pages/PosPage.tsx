import { Link } from 'react-router-dom'
import { useMemo, useState, useEffect, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type {
  Branch,
  CheckoutPayload,
  Customer,
  Distributor,
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
import { useAuthStore } from '../stores/authStore'
import { useOrgSettingsStore } from '../stores/orgSettingsStore'

type VehicleType = 'car' | 'tuk_tuk' | 'motorcycle' | 'other'
type IntervalType = 'monthly' | 'weekly'
type RenewalType = 'annual' | 'permanent'

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export function PosPage() {
  usePageTour('pos')
  const queryClient = useQueryClient()
  const warehouseId = useAuthStore((s) => s.warehouseId)
  const authBranchId = useAuthStore((s) => s.branchId)
  const salesSettings = useOrgSettingsStore((s) => s.sales)
  const allowNegativeInventory = salesSettings?.allow_negative_inventory ?? false

  const [selectedBranchId, setSelectedBranchId] = useState<number | ''>(authBranchId ?? '')
  const [distributorSearch, setDistributorSearch] = useState('')
  const [distributorId, setDistributorId] = useState<number | ''>('')
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [paymentTerm, setPaymentTerm] = useState<'cash' | 'installment'>('installment')
  const [quantity, setQuantity] = useState(1)
  const [installationFee, setInstallationFee] = useState(500)
  const [installmentAmount, setInstallmentAmount] = useState(500)
  const [installmentCount, setInstallmentCount] = useState(6)
  const [intervalType, setIntervalType] = useState<IntervalType>('monthly')
  const [firstDueDate, setFirstDueDate] = useState(() => new Date().toISOString().split('T')[0])
  const [technicianName, setTechnicianName] = useState('')
  const [vehicleType, setVehicleType] = useState<VehicleType | ''>('')
  const [vehiclePlateLetters, setVehiclePlateLetters] = useState('')
  const [vehiclePlateNumbers, setVehiclePlateNumbers] = useState('')
  const [chassisNumber, setChassisNumber] = useState('')
  const [engineNumber, setEngineNumber] = useState('')
  const [renewalType, setRenewalType] = useState<RenewalType>('annual')
  const [contractDate, setContractDate] = useState(() => new Date().toISOString().split('T')[0])
  const [lastInvoiceId, setLastInvoiceId] = useState<number | null>(null)
  const [successMsg, setSuccessMsg] = useState('')

  const branchId = selectedBranchId || authBranchId

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
    queryKey: ['distributors', 'pos', branchId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Distributor>>('/distributors', {
        params: {
          per_page: 100,
          'filter[status]': 'active',
          ...(branchId ? { 'filter[branch_id]': branchId } : {}),
        },
      })
      return data.data
    },
    enabled: Boolean(branchId),
  })

  const filteredDistributors = useMemo(() => {
    const q = distributorSearch.trim().toLowerCase()
    const list = distributorsQuery.data ?? []
    if (!q) return list
    return list.filter(
      (d) =>
        d.code.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        (d.name_ar ?? '').toLowerCase().includes(q),
    )
  }, [distributorsQuery.data, distributorSearch])

  const customersQuery = useQuery({
    queryKey: ['customers', 'pos', distributorId, branchId],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 100,
        'filter[status]': 'active',
      }
      if (distributorId) params['filter[distributor_id]'] = Number(distributorId)
      if (branchId) params['filter[branch_id]'] = branchId

      const { data } = await api.get<PaginatedResponse<Customer>>('/customers', { params })
      return data.data
    },
    enabled: Boolean(distributorId),
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

  const checkoutMutation = useMutation({
    mutationFn: async (payload: CheckoutPayload) => {
      const { data } = await api.post<SalesInvoice>('/sales-invoices/checkout', payload)
      return data
    },
    onSuccess: (invoice) => {
      setLastInvoiceId(invoice.id)
      setSuccessMsg(
        `تم إنشاء التعاقد #${invoice.invoice_number ?? invoice.id} — الأقساط جاهزة${invoice.review_status === 'pending' ? ' (مراجعة لاحقة)' : ''}`,
      )
      setQuantity(1)
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['gps-stock'] })
      queryClient.invalidateQueries({ queryKey: ['product-units'] })
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['installments'] })
    },
  })

  const unitPrice = productQuery.data?.sell_price ?? 0
  const available = stockQuery.data?.available ?? unitsQuery.data?.length ?? 0
  const maxQuantity = allowNegativeInventory ? 999 : available
  const devicesTotal = quantity * Number(unitPrice)
  const totalEstimate = devicesTotal + Number(installationFee)
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
    const total = quantity * Number(unitPrice) + Number(installationFee)
    if (total <= 0) return
    setInstallmentAmount(suggestInstallmentAmount(total, installmentCount, minDownPercent))
  }, [unitPrice, quantity, installationFee, installmentCount, minDownPercent])
  const subscriptionRenewalDate =
    renewalType === 'annual' ? addDays(contractDate, 365) : undefined

  const handleCheckout = (e: FormEvent) => {
    e.preventDefault()
    if (!customerId || !warehouseId || quantity <= 0) return
    if (!allowNegativeInventory && quantity > available) return

    const units = unitsQuery.data ?? []
    const selectedUnits = units.slice(0, quantity)

    let lines: CheckoutPayload['lines']
    if (selectedUnits.length >= quantity) {
      lines = selectedUnits.map((unit) => ({
        product_unit_id: unit.id,
        unit_price: Number(unitPrice),
      }))
    } else if (allowNegativeInventory) {
      lines = [{ quantity, unit_price: Number(unitPrice) }]
    } else {
      return
    }

    const payload: CheckoutPayload = {
      customer_id: Number(customerId),
      warehouse_id: warehouseId,
      branch_id: branchId ?? undefined,
      payment_term: paymentTerm,
      installation_fee: installationFee,
      invoice_date: contractDate,
      technician_name: technicianName.trim() || undefined,
      vehicle_type: vehicleType || undefined,
      vehicle_plate_letters: vehiclePlateLetters.trim() || undefined,
      vehicle_plate_numbers: vehiclePlateNumbers.trim() || undefined,
      chassis_number: chassisNumber.trim() || undefined,
      engine_number: engineNumber.trim() || undefined,
      renewal_type: renewalType,
      subscription_renewal_date: subscriptionRenewalDate,
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
      subtitle="إنشاء تعاقد GPS — الأقساط تُنشأ فوراً دون انتظار المراجعة"
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
                }}
                className="w-full rounded border border-outline-variant px-sm py-2"
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
                placeholder="ابحث بالكود أو الاسم..."
                className="mb-sm w-full rounded border border-outline-variant px-sm py-2"
              />
              <select
                value={distributorId}
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : ''
                  setDistributorId(value)
                  setCustomerId('')
                }}
                required
                className="w-full rounded border border-outline-variant px-sm py-2 focus:border-primary focus:outline-none"
              >
                <option value="">اختر الموزع</option>
                {filteredDistributors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} — {distributorLabel(d)}
                  </option>
                ))}
              </select>
            </div>

            <div data-tour="pos-customer">
              <label className="mb-xs block text-sm text-on-surface-variant">العميل</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : '')}
                required
                disabled={!distributorId}
                className="w-full rounded border border-outline-variant px-sm py-2 focus:border-primary focus:outline-none disabled:opacity-50"
              >
                <option value="">
                  {distributorId ? 'اختر العميل' : 'اختر الموزع أولاً'}
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
                className="w-full rounded border border-outline-variant px-sm py-2"
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

            <div>
              <label className="mb-xs block text-sm text-on-surface-variant">رسوم التركيب (ج.م)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={installationFee}
                onChange={(e) => setInstallationFee(Number(e.target.value))}
                className="w-full rounded border border-outline-variant px-sm py-2 tabular-nums"
              />
            </div>

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
                          setFirstDueDate(
                            addDays(contractDate, type === 'weekly' ? 7 : 30),
                          )
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
                      className="w-full rounded border border-outline-variant px-sm py-2 tabular-nums"
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
                      className="w-full rounded border border-outline-variant px-sm py-2 tabular-nums"
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
                      className="w-full rounded border border-outline-variant px-sm py-2"
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
              <label className="mb-xs block text-sm text-on-surface-variant">الفني</label>
              <input
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                className="w-full rounded border border-outline-variant px-sm py-2"
              />
            </div>

            <div>
              <label className="mb-xs block text-sm text-on-surface-variant">نوع المركبة</label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as VehicleType | '')}
                className="w-full rounded border border-outline-variant px-sm py-2"
              >
                <option value="">—</option>
                <option value="car">سيارة</option>
                <option value="tuk_tuk">توك توك</option>
                <option value="motorcycle">دراجة نارية</option>
                <option value="other">أخرى</option>
              </select>
            </div>

            {(vehicleType === 'car' || vehicleType === 'motorcycle') && (
              <div className="grid gap-sm sm:grid-cols-2">
                <div>
                  <label className="mb-xs block text-xs text-on-surface-variant">حروف اللوحة</label>
                  <input
                    value={vehiclePlateLetters}
                    onChange={(e) => setVehiclePlateLetters(e.target.value)}
                    className="w-full rounded border border-outline-variant px-sm py-2"
                  />
                </div>
                <div>
                  <label className="mb-xs block text-xs text-on-surface-variant">أرقام اللوحة</label>
                  <input
                    value={vehiclePlateNumbers}
                    onChange={(e) => setVehiclePlateNumbers(e.target.value)}
                    dir="ltr"
                    className="w-full rounded border border-outline-variant px-sm py-2"
                  />
                </div>
              </div>
            )}

            {vehicleType === 'tuk_tuk' && (
              <div className="grid gap-sm sm:grid-cols-2">
                <div>
                  <label className="mb-xs block text-xs text-on-surface-variant">رقم الشاسيه</label>
                  <input
                    value={chassisNumber}
                    onChange={(e) => setChassisNumber(e.target.value)}
                    dir="ltr"
                    className="w-full rounded border border-outline-variant px-sm py-2"
                  />
                </div>
                <div>
                  <label className="mb-xs block text-xs text-on-surface-variant">رقم الموتور</label>
                  <input
                    value={engineNumber}
                    onChange={(e) => setEngineNumber(e.target.value)}
                    dir="ltr"
                    className="w-full rounded border border-outline-variant px-sm py-2"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-xs block text-sm text-on-surface-variant">نوع التجديد</label>
              <div className="flex gap-sm">
                {(['annual', 'permanent'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setRenewalType(type)}
                    className={`flex-1 rounded-lg border py-sm text-sm font-medium ${
                      renewalType === type
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-outline-variant bg-surface-container-low'
                    }`}
                  >
                    {type === 'annual' ? 'سنوي' : 'دائم'}
                  </button>
                ))}
              </div>
              {renewalType === 'annual' && subscriptionRenewalDate && (
                <p className="mt-xs text-xs text-on-surface-variant">
                  تاريخ التجديد: {subscriptionRenewalDate}
                </p>
              )}
              {renewalType === 'permanent' && (
                <p className="mt-xs text-xs text-on-surface-variant">سيُذكر في العقد: دائم</p>
              )}
            </div>
          </div>

          <div
            data-tour="pos-product"
            className="space-y-md rounded-lg border border-outline-variant bg-surface-container-lowest p-md"
          >
            <h2 className="font-semibold text-on-surface">جهاز GPS</h2>
            {allowNegativeInventory && (
              <p className="rounded-lg bg-amber-500/10 px-sm py-xs text-xs text-amber-800">
                المخزون السالب مفعّل — يمكن التعاقد بدون وحدات متاحة
              </p>
            )}
            <AsyncState
              isLoading={productQuery.isLoading || stockQuery.isLoading}
              isError={productQuery.isError || stockQuery.isError}
              error={productQuery.error ?? stockQuery.error}
            >
              {productQuery.data && (
                <div className="rounded-lg border border-outline-variant/60 bg-surface-container-low p-md">
                  <div className="mb-md flex items-center gap-sm">
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
                    <label className="mb-xs block text-sm text-on-surface-variant">الكمية</label>
                    <input
                      type="number"
                      min={1}
                      max={maxQuantity}
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full rounded border border-outline-variant px-sm py-2 tabular-nums"
                    />
                  </div>
                </div>
              )}
            </AsyncState>

            <div className="border-t border-outline-variant pt-md">
              <div className="mb-sm space-y-1 text-sm text-on-surface-variant">
                <div className="flex justify-between tabular-nums">
                  <span>قيمة الأجهزة</span>
                  <span>{devicesTotal.toLocaleString('ar-EG')} ج.م</span>
                </div>
                <div className="flex justify-between tabular-nums">
                  <span>رسوم التركيب</span>
                  <span>{Number(installationFee).toLocaleString('ar-EG')} ج.م</span>
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
              {successMsg && (
                <div className="mb-sm rounded-lg bg-secondary/10 p-sm text-sm text-secondary">
                  <p>{successMsg}</p>
                  {lastInvoiceId && (
                    <Link
                      to={contractPrintPath(lastInvoiceId, true)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-sm inline-flex items-center gap-1 font-bold text-primary hover:underline"
                    >
                      <Icon name="print" size={18} />
                      طباعة عقد التقسيط
                    </Link>
                  )}
                </div>
              )}
              <button
                type="submit"
                data-tour="pos-submit"
                disabled={
                  checkoutMutation.isPending ||
                  !customerId ||
                  !branchId ||
                  quantity <= 0 ||
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
