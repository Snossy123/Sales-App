import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { Customer, Distributor, PaginatedResponse, SalesInvoice } from '../api/types'
import { distributorLabel } from '../lib/sales'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'
import { useAuthStore } from '../stores/authStore'

interface ServiceLine {
  id: number
  description: string
  quantity: number
  unit_price: number
}

interface ServiceSalesPageProps {
  title: string
  subtitle: string
  saleCategory: 'accessories' | 'maintenance'
  defaultLines: Omit<ServiceLine, 'id'>[]
  notesPlaceholder?: string
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
  defaultLines,
  notesPlaceholder,
}: ServiceSalesPageProps) {
  const queryClient = useQueryClient()
  const branchId = useAuthStore((s) => s.branchId)
  const [distributorId, setDistributorId] = useState<number | ''>('')
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<ServiceLine[]>(() =>
    defaultLines.map((line) => createLine(line)),
  )
  const [successMsg, setSuccessMsg] = useState('')

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
    queryKey: ['customers', saleCategory, distributorId],
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

  const saleMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<SalesInvoice>('/sales-invoices/service-checkout', {
        customer_id: Number(customerId),
        branch_id: branchId ?? undefined,
        sale_category: saleCategory,
        payment_term: 'cash',
        notes: notes.trim() || undefined,
        items: lines.map(({ description, quantity, unit_price }) => ({
          description,
          quantity,
          unit_price,
        })),
      })
      return data
    },
    onSuccess: (invoice) => {
      setSuccessMsg(`تم تسجيل العملية — فاتورة ${invoice.invoice_number ?? `#${invoice.id}`}`)
      setNotes('')
      setLines(defaultLines.map((line) => createLine(line)))
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const total = lines.reduce(
    (sum, line) => sum + Number(line.quantity) * Number(line.unit_price),
    0,
  )

  const updateLine = (id: number, patch: Partial<ServiceLine>) => {
    setLines((prev) => prev.map((line) => (line.id === id ? { ...line, ...patch } : line)))
  }

  const addLine = () => {
    setLines((prev) => [...prev, createLine({ description: '', quantity: 1, unit_price: 0 })])
  }

  const removeLine = (id: number) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((line) => line.id !== id)))
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!customerId) return
    if (lines.some((line) => !line.description.trim() || line.unit_price <= 0)) return
    saleMutation.mutate()
  }

  return (
    <SalesPageShell title={title} subtitle={subtitle}>
      <form onSubmit={handleSubmit} className="grid gap-md lg:grid-cols-2">
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

        <div className="space-y-md rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
          <div className="flex items-center justify-between gap-sm">
            <h2 className="font-semibold text-on-surface">البنود</h2>
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Icon name="add" size={18} />
              إضافة بند
            </button>
          </div>

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
                  className="rounded border border-outline-variant px-sm py-2 text-sm sm:col-span-5"
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

          <div className="border-t border-outline-variant pt-md">
            <p className="mb-sm text-lg font-bold tabular-nums">
              الإجمالي: {total.toLocaleString('ar-EG')} ج.م
            </p>
            {saleMutation.isError && (
              <p className="mb-sm text-sm text-error">{getErrorMessage(saleMutation.error)}</p>
            )}
            {successMsg && (
              <p className="mb-sm rounded-lg bg-secondary/10 p-sm text-sm text-secondary">
                {successMsg}
              </p>
            )}
            <button
              type="submit"
              disabled={saleMutation.isPending || !customerId || total <= 0}
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
