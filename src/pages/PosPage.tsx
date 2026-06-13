import { Link } from 'react-router-dom'
import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type {
  CheckoutPayload,
  Customer,
  Distributor,
  GpsProduct,
  GpsStock,
  PaginatedResponse,
  ProductUnit,
  SalesInvoice,
} from '../api/types'
import { distributorLabel, contractPrintPath } from '../lib/sales'
import { AsyncState } from '../components/AsyncState'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'
import { StartTourButton } from '../components/tour/StartTourButton'
import { usePageTour } from '../hooks/usePageTour'
import { useAuthStore } from '../stores/authStore'

export function PosPage() {
  usePageTour('pos')
  const queryClient = useQueryClient()
  const warehouseId = useAuthStore((s) => s.warehouseId)
  const branchId = useAuthStore((s) => s.branchId)
  const [distributorId, setDistributorId] = useState<number | ''>('')
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [paymentTerm, setPaymentTerm] = useState<'cash' | 'installment'>('installment')
  const [quantity, setQuantity] = useState(1)
  const [installationFee, setInstallationFee] = useState(500)
  const [downPayment, setDownPayment] = useState(2500)
  const [installmentCount, setInstallmentCount] = useState(6)
  const [firstDueDate, setFirstDueDate] = useState(
    () => new Date().toISOString().split('T')[0],
  )
  const [technicianName, setTechnicianName] = useState('')
  const [vehicleInfo, setVehicleInfo] = useState('')
  const [subscriptionRenewalDate, setSubscriptionRenewalDate] = useState('')
  const [lastInvoiceId, setLastInvoiceId] = useState<number | null>(null)
  const [successMsg, setSuccessMsg] = useState('')

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

  const customersQuery = useQuery({
    queryKey: ['customers', 'pos', distributorId],
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
        `تم إنشاء التعاقد #${invoice.invoice_number ?? invoice.id} — بانتظار مراجعة قسم التأكيد`,
      )
      setQuantity(1)
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['gps-stock'] })
      queryClient.invalidateQueries({ queryKey: ['product-units'] })
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] })
    },
  })

  const unitPrice = productQuery.data?.sell_price ?? 0
  const available = stockQuery.data?.available ?? unitsQuery.data?.length ?? 0
  const devicesTotal = quantity * Number(unitPrice)
  const totalEstimate = devicesTotal + Number(installationFee)

  const handleCheckout = (e: FormEvent) => {
    e.preventDefault()
    if (!customerId || !warehouseId || quantity <= 0 || quantity > available) return

    const units = unitsQuery.data ?? []
    const selectedUnits = units.slice(0, quantity)
    if (selectedUnits.length < quantity) return

    const payload: CheckoutPayload = {
      customer_id: Number(customerId),
      warehouse_id: warehouseId,
      branch_id: branchId ?? undefined,
      payment_term: paymentTerm,
      installation_fee: installationFee,
      technician_name: technicianName.trim() || undefined,
      vehicle_info: vehicleInfo.trim() || undefined,
      subscription_renewal_date: subscriptionRenewalDate || undefined,
      lines: selectedUnits.map((unit) => ({
        product_unit_id: unit.id,
        unit_price: Number(unitPrice),
      })),
    }

    if (paymentTerm === 'installment') {
      payload.installment_plan = {
        down_payment: downPayment,
        installment_count: installmentCount,
        first_due_date: firstDueDate,
        interval_days: 30,
      }
    }

    checkoutMutation.mutate(payload)
  }

  return (
    <SalesPageShell
      title="تعاقد جديد"
      subtitle="إنشاء تعاقد GPS مع رسوم التركيب وإرساله للمراجعة"
      actions={<StartTourButton tourId="pos" />}
    >
      {!warehouseId ? (
        <p className="text-on-surface-variant">يرجى اختيار مخزن قبل إتمام التعاقد.</p>
      ) : (
        <form onSubmit={handleCheckout} className="grid gap-md lg:grid-cols-2">
          <div className="space-y-md rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
            <h2 className="font-semibold text-on-surface">بيانات العملية</h2>

            <div data-tour="pos-distributor">
              <label className="mb-xs block text-sm text-on-surface-variant">الموزع</label>
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
                {distributorsQuery.data?.map((d) => (
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
              <div className="grid gap-sm sm:grid-cols-3">
                <div>
                  <label className="mb-xs block text-xs text-on-surface-variant">مقدم</label>
                  <input
                    type="number"
                    min={0}
                    value={downPayment}
                    onChange={(e) => setDownPayment(Number(e.target.value))}
                    className="w-full rounded border border-outline-variant px-sm py-2 tabular-nums"
                  />
                </div>
                <div>
                  <label className="mb-xs block text-xs text-on-surface-variant">عدد الأقساط</label>
                  <input
                    type="number"
                    min={1}
                    value={installmentCount}
                    onChange={(e) => setInstallmentCount(Number(e.target.value))}
                    className="w-full rounded border border-outline-variant px-sm py-2 tabular-nums"
                  />
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
            )}

            <div className="grid gap-sm sm:grid-cols-2">
              <div>
                <label className="mb-xs block text-sm text-on-surface-variant">الفني</label>
                <input
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  className="w-full rounded border border-outline-variant px-sm py-2"
                />
              </div>
              <div>
                <label className="mb-xs block text-sm text-on-surface-variant">المركبة</label>
                <input
                  value={vehicleInfo}
                  onChange={(e) => setVehicleInfo(e.target.value)}
                  className="w-full rounded border border-outline-variant px-sm py-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-xs block text-sm text-on-surface-variant">
                  تاريخ تجديد اشتراك الجهاز
                </label>
                <input
                  type="date"
                  value={subscriptionRenewalDate}
                  onChange={(e) => setSubscriptionRenewalDate(e.target.value)}
                  className="w-full rounded border border-outline-variant px-sm py-2"
                />
              </div>
            </div>
          </div>

          <div
            data-tour="pos-product"
            className="space-y-md rounded-lg border border-outline-variant bg-surface-container-lowest p-md"
          >
            <h2 className="font-semibold text-on-surface">جهاز GPS</h2>
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
                      max={available}
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
                  quantity <= 0 ||
                  quantity > available
                }
                className="flex w-full items-center justify-center gap-xs rounded-lg bg-secondary py-4 text-base font-bold text-on-secondary transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Icon name="send" />
                {checkoutMutation.isPending ? 'جاري الإرسال...' : 'إرسال للمراجعة'}
              </button>
            </div>
          </div>
        </form>
      )}
    </SalesPageShell>
  )
}
