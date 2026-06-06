import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type {
  CheckoutPayload,
  Customer,
  PaginatedResponse,
  ProductUnit,
  SalesInvoice,
} from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { Icon } from '../components/Icon'
import { useAuthStore } from '../stores/authStore'

export function PosPage() {
  const queryClient = useQueryClient()
  const warehouseId = useAuthStore((s) => s.warehouseId)
  const branchId = useAuthStore((s) => s.branchId)
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [paymentTerm, setPaymentTerm] = useState<'cash' | 'installment'>('cash')
  const [selectedUnits, setSelectedUnits] = useState<number[]>([])
  const [downPayment, setDownPayment] = useState(0)
  const [installmentCount, setInstallmentCount] = useState(6)
  const [firstDueDate, setFirstDueDate] = useState(
    () => new Date().toISOString().split('T')[0],
  )
  const [successMsg, setSuccessMsg] = useState('')

  const customersQuery = useQuery({
    queryKey: ['customers', 'pos'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Customer>>('/customers', {
        params: { per_page: 100, 'filter[status]': 'active' },
      })
      return data.data
    },
  })

  const unitsQuery = useQuery({
    queryKey: ['product-units', 'pos', warehouseId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ProductUnit>>('/product-units', {
        params: {
          per_page: 100,
          include: 'productModel',
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
      setSuccessMsg(`تم إنشاء الفاتورة #${invoice.id} بنجاح`)
      setSelectedUnits([])
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['product-units'] })
    },
  })

  const toggleUnit = (id: number) => {
    setSelectedUnits((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id],
    )
  }

  const handleCheckout = (e: FormEvent) => {
    e.preventDefault()
    if (!customerId || !warehouseId || selectedUnits.length === 0) return

    const lines = selectedUnits.map((product_unit_id) => {
      const unit = unitsQuery.data?.find((u) => u.id === product_unit_id)
      return {
        product_unit_id,
        unit_price: unit?.sell_price ? Number(unit.sell_price) : undefined,
      }
    })

    const payload: CheckoutPayload = {
      customer_id: Number(customerId),
      warehouse_id: warehouseId,
      branch_id: branchId ?? undefined,
      payment_term: paymentTerm,
      lines,
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

  const totalEstimate = selectedUnits.reduce((sum, id) => {
    const unit = unitsQuery.data?.find((u) => u.id === id)
    return sum + (unit?.sell_price ? Number(unit.sell_price) : 0)
  }, 0)

  return (
    <div>
      <h1 className="mb-md text-2xl font-bold text-on-surface">نقطة البيع</h1>

      {!warehouseId ? (
        <p className="text-on-surface-variant">يرجى اختيار مخزن قبل إتمام البيع.</p>
      ) : (
        <form onSubmit={handleCheckout} className="grid gap-md lg:grid-cols-2">
          <div className="space-y-md rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
            <h2 className="font-semibold text-on-surface">بيانات العملية</h2>

            <div>
              <label className="mb-xs block text-sm text-on-surface-variant">العميل</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : '')}
                required
                className="w-full rounded border border-outline-variant px-sm py-2 focus:border-primary focus:outline-none"
              >
                <option value="">اختر العميل</option>
                {customersQuery.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.phone}
                  </option>
                ))}
              </select>
            </div>

            <div>
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
          </div>

          <div className="space-y-md rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
            <h2 className="font-semibold text-on-surface">الوحدات المتاحة</h2>
            <AsyncState
              isLoading={unitsQuery.isLoading}
              isError={unitsQuery.isError}
              error={unitsQuery.error}
            >
              <ul className="max-h-80 space-y-xs overflow-y-auto">
                {unitsQuery.data?.map((unit) => (
                  <li key={unit.id}>
                    <label className="flex cursor-pointer items-center gap-sm rounded border border-outline-variant/60 p-sm hover:bg-surface-container-low">
                      <input
                        type="checkbox"
                        checked={selectedUnits.includes(unit.id)}
                        onChange={() => toggleUnit(unit.id)}
                        className="h-4 w-4"
                      />
                      <span className="flex-grow text-sm">
                        {unit.product_model?.name_ar || unit.product_model?.name}
                      </span>
                      <span className="tabular-nums text-xs text-on-surface-variant" dir="ltr">
                        {unit.imei}
                      </span>
                      <span className="tabular-nums text-sm font-medium">
                        {unit.sell_price != null
                          ? Number(unit.sell_price).toLocaleString('ar-EG')
                          : '—'}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </AsyncState>

            <div className="border-t border-outline-variant pt-md">
              <p className="mb-sm text-lg font-bold tabular-nums">
                الإجمالي: {totalEstimate.toLocaleString('ar-EG')} ج.م
              </p>
              {checkoutMutation.isError && (
                <p className="mb-sm text-sm text-error">
                  {getErrorMessage(checkoutMutation.error)}
                </p>
              )}
              {successMsg && (
                <p className="mb-sm text-sm text-secondary">{successMsg}</p>
              )}
              <button
                type="submit"
                disabled={
                  checkoutMutation.isPending ||
                  !customerId ||
                  selectedUnits.length === 0
                }
                className="flex w-full items-center justify-center gap-xs rounded-lg bg-secondary py-4 text-base font-bold text-on-secondary transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Icon name="payments" />
                {checkoutMutation.isPending ? 'جاري الحفظ...' : 'إتمام البيع'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
