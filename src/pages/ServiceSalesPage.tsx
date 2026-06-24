import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type {
  Customer,
  Distributor,
  PaginatedResponse,
  SalesInvoice,
  Service,
  ServiceCategory,
  ServiceCheckoutPayload,
} from '../api/types'
import {
  type ApiPaginated,
  computeInstallmentCount,
  computeMinDownPayment,
  distributorLabel,
} from '../lib/sales'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'
import {
  createDefaultServicePayment,
  ServicePaymentSection,
  validateServicePayment,
  type ServicePaymentState,
} from '../components/services/ServicePaymentSection'
import { useAuthStore } from '../stores/authStore'
import { useOrgSettingsStore } from '../stores/orgSettingsStore'

interface ServiceLine {
  id: number
  service_id?: number
  description: string
  quantity: number
  unit_price: number
}

interface ServiceSalesPageProps {
  title: string
  subtitle: string
  saleCategory: 'accessories' | 'maintenance'
  defaultLines?: Omit<ServiceLine, 'id'>[]
  notesPlaceholder?: string
  useCatalog?: boolean
  catalogCategories?: ServiceCategory[]
}

let lineId = 0
function createLine(partial: Omit<ServiceLine, 'id'>): ServiceLine {
  lineId += 1
  return { id: lineId, ...partial }
}

export function ServiceSalesPage({
  title,
  subtitle,
  saleCategory,
  defaultLines = [],
  notesPlaceholder,
  useCatalog = false,
  catalogCategories,
}: ServiceSalesPageProps) {
  const queryClient = useQueryClient()
  const branchId = useAuthStore((s) => s.branchId)
  const salesSettings = useOrgSettingsStore((s) => s.sales)
  const minDownPercent = salesSettings?.min_down_payment_percent ?? 10
  const maxInstallmentCount = salesSettings?.max_installment_months ?? 24

  const [distributorId, setDistributorId] = useState<number | ''>('')
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<ServiceLine[]>(() =>
    defaultLines.length > 0 ? defaultLines.map((line) => createLine(line)) : [],
  )
  const [selectedServiceId, setSelectedServiceId] = useState<number | ''>('')
  const [successMsg, setSuccessMsg] = useState('')
  const [lastInstallmentSale, setLastInstallmentSale] = useState(false)

  const total = useMemo(
    () => lines.reduce((sum, line) => sum + Number(line.quantity) * Number(line.unit_price), 0),
    [lines],
  )

  const [payment, setPayment] = useState<ServicePaymentState>(() =>
    createDefaultServicePayment(0, minDownPercent),
  )

  useEffect(() => {
    if (payment.paymentTerm === 'cash') return
    setPayment((prev) => ({
      ...prev,
      downPayment: Math.max(prev.downPayment, computeMinDownPayment(total, minDownPercent)),
    }))
  }, [total, minDownPercent, payment.paymentTerm])

  const paymentValidation = validateServicePayment(
    payment,
    total,
    minDownPercent,
    maxInstallmentCount,
  )

  const distributorsQuery = useQuery({
    queryKey: ['distributors', saleCategory, branchId],
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
    queryKey: ['customers', saleCategory, branchId],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 100,
        'filter[status]': 'active',
      }
      if (branchId) params['filter[branch_id]'] = branchId

      const { data } = await api.get<PaginatedResponse<Customer>>('/customers', { params })
      return data.data
    },
    enabled: Boolean(branchId),
  })

  const servicesQuery = useQuery({
    queryKey: ['services', 'sales', catalogCategories],
    queryFn: async () => {
      const { data } = await api.get<ApiPaginated<Service>>('/services', {
        params: { per_page: 100, 'filter[is_active]': '1' },
      })
      return data
    },
    enabled: useCatalog,
  })

  const catalogServices = useMemo(() => {
    const rows = servicesQuery.data?.data ?? []
    if (!catalogCategories?.length) return rows
    return rows.filter((service) => catalogCategories.includes(service.category))
  }, [servicesQuery.data, catalogCategories])

  const saleMutation = useMutation({
    mutationFn: async () => {
      const payload: ServiceCheckoutPayload = {
        customer_id: Number(customerId),
        distributor_id: Number(distributorId),
        branch_id: branchId ?? undefined,
        sale_category: saleCategory,
        payment_term: payment.paymentTerm,
        notes: notes.trim() || undefined,
        items: lines.map(({ service_id, description, quantity, unit_price }) => ({
          service_id,
          description,
          quantity,
          unit_price,
        })),
      }

      if (payment.paymentTerm === 'installment') {
        payload.installment_plan = {
          down_payment: payment.downPayment,
          installment_amount: payment.installmentAmount,
          installment_count: computeInstallmentCount(
            total,
            payment.installmentAmount,
            payment.downPayment,
            maxInstallmentCount,
          ),
          interval_type: payment.intervalType,
          interval_days: payment.intervalType === 'weekly' ? 7 : 30,
          first_due_date: payment.firstDueDate,
        }
      }

      const { data } = await api.post<SalesInvoice>('/sales-invoices/service-checkout', payload)
      return data
    },
    onSuccess: (invoice) => {
      const isInstallment = payment.paymentTerm === 'installment'
      setLastInstallmentSale(isInstallment)
      setSuccessMsg(`تم تسجيل العملية — فاتورة ${invoice.invoice_number ?? `#${invoice.id}`}`)
      setNotes('')
      setLines(defaultLines.length > 0 ? defaultLines.map((line) => createLine(line)) : [])
      setSelectedServiceId('')
      setPayment(createDefaultServicePayment(0, minDownPercent))
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['installments'] })
    },
  })

  const updateLine = (id: number, patch: Partial<ServiceLine>) => {
    setLines((prev) => prev.map((line) => (line.id === id ? { ...line, ...patch } : line)))
  }

  const addCatalogLine = () => {
    if (!selectedServiceId) return
    const service = catalogServices.find((item) => item.id === Number(selectedServiceId))
    if (!service) return

    setLines((prev) => [
      ...prev,
      createLine({
        service_id: service.id,
        description: service.name_ar || service.name,
        quantity: 1,
        unit_price: Number(service.default_price),
      }),
    ])
    setSelectedServiceId('')
  }

  const addManualLine = () => {
    setLines((prev) => [...prev, createLine({ description: '', quantity: 1, unit_price: 0 })])
  }

  const removeLine = (id: number) => {
    setLines((prev) => prev.filter((line) => line.id !== id))
  }

  const canSubmit =
    Boolean(customerId && distributorId) &&
    lines.length > 0 &&
    lines.every((line) => line.description.trim() && line.unit_price > 0) &&
    total > 0 &&
    (payment.paymentTerm === 'cash' || paymentValidation.valid)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    saleMutation.mutate()
  }

  return (
    <SalesPageShell title={title} subtitle={subtitle}>
      <form onSubmit={handleSubmit} className="grid gap-md lg:grid-cols-2">
        <div className="space-y-md">
          <div className="space-y-md rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
            <h2 className="font-semibold text-on-surface">بيانات العملية</h2>

            <div>
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

            <div>
              <label className="mb-xs block text-sm text-on-surface-variant">العميل</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : '')}
                required
                disabled={!branchId}
                className="w-full rounded border border-outline-variant px-sm py-2 focus:border-primary focus:outline-none disabled:opacity-50"
              >
                <option value="">{branchId ? 'اختر العميل' : 'اختر الفرع أولاً'}</option>
                {customersQuery.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.phone}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-xs block text-sm text-on-surface-variant">ملاحظات</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={notesPlaceholder}
                className="w-full rounded border border-outline-variant px-sm py-2 text-sm"
              />
            </div>
          </div>

          <ServicePaymentSection
            total={total}
            payment={payment}
            onChange={(patch) => setPayment((prev) => ({ ...prev, ...patch }))}
            minDownPercent={minDownPercent}
            maxInstallmentCount={maxInstallmentCount}
          />
        </div>

        <div className="space-y-md rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
          <div className="flex items-center justify-between gap-sm">
            <h2 className="font-semibold text-on-surface">البنود</h2>
            {!useCatalog && (
              <button
                type="button"
                onClick={addManualLine}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Icon name="add" size={18} />
                إضافة بند
              </button>
            )}
          </div>

          {useCatalog && (
            <div className="flex flex-wrap items-end gap-sm rounded-lg border border-outline-variant/60 bg-surface-container-low p-sm">
              <div className="min-w-[200px] flex-1">
                <label className="mb-xs block text-sm text-on-surface-variant">اختر خدمة</label>
                <select
                  value={selectedServiceId}
                  onChange={(e) =>
                    setSelectedServiceId(e.target.value ? Number(e.target.value) : '')
                  }
                  className="w-full rounded border border-outline-variant px-sm py-2 text-sm"
                >
                  <option value="">—</option>
                  {catalogServices.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name_ar || service.name} —{' '}
                      {Number(service.default_price).toLocaleString('ar-EG')} ج.م
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={addCatalogLine}
                disabled={!selectedServiceId}
                className="flex items-center gap-1 rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary disabled:opacity-50"
              >
                <Icon name="add" size={18} />
                إضافة للبنود
              </button>
            </div>
          )}

          {lines.length === 0 ? (
            <p className="rounded-lg border border-dashed border-outline-variant p-md text-center text-sm text-on-surface-variant">
              {useCatalog ? 'اختر خدمة من الكتalog لإضافتها' : 'أضف بنداً واحداً على الأقل'}
            </p>
          ) : (
            <div className="space-y-sm">
              {lines.map((line) => (
                <div
                  key={line.id}
                  className="grid gap-sm rounded-lg border border-outline-variant/60 bg-surface-container-low p-sm sm:grid-cols-12"
                >
                  <input
                    value={line.description}
                    onChange={(e) => updateLine(line.id, { description: e.target.value })}
                    placeholder="الوصف"
                    required
                    readOnly={Boolean(line.service_id)}
                    className="rounded border border-outline-variant px-sm py-2 text-sm sm:col-span-5 read-only:bg-surface-container-lowest"
                  />
                  <input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) => updateLine(line.id, { quantity: Number(e.target.value) })}
                    placeholder="الكمية"
                    className="rounded border border-outline-variant px-sm py-2 text-sm tabular-nums sm:col-span-2"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.unit_price}
                    onChange={(e) => updateLine(line.id, { unit_price: Number(e.target.value) })}
                    placeholder="السعر"
                    className="rounded border border-outline-variant px-sm py-2 text-sm tabular-nums sm:col-span-3"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    className="text-sm text-error sm:col-span-2"
                  >
                    حذف
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-outline-variant pt-md">
            {payment.paymentTerm === 'installment' && !paymentValidation.valid && total > 0 && (
              <ul className="mb-sm space-y-1 text-sm text-error">
                {paymentValidation.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            )}
            {saleMutation.isError && (
              <p className="mb-sm text-sm text-error">{getErrorMessage(saleMutation.error)}</p>
            )}
            {successMsg && (
              <div className="mb-sm space-y-sm rounded-lg bg-secondary/10 p-sm text-sm text-secondary">
                <p>{successMsg}</p>
                {lastInstallmentSale && (
                  <Link to="/installments" className="inline-flex items-center gap-1 font-bold text-primary">
                    <Icon name="payments" size={18} />
                    الذهاب لتحصيل الأقساط
                  </Link>
                )}
              </div>
            )}
            <button
              type="submit"
              disabled={saleMutation.isPending || !canSubmit}
              className="flex w-full items-center justify-center gap-xs rounded-lg bg-primary py-4 text-base font-bold text-on-primary disabled:opacity-50"
            >
              <Icon name="save" />
              {saleMutation.isPending ? 'جاري الحفظ...' : 'تسجيل العملية'}
            </button>
          </div>
        </div>
      </form>
    </SalesPageShell>
  )
}
