import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { SalesInvoice, SalesInvoiceLine } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'
import { StatusBadge } from '../components/StatusBadge'
import { CustomerAttachmentsSection } from '../components/customers/CustomerAttachmentsSection'
import {
  contractPrintPath,
  distributorLabel,
  formatInvoiceDate,
  invoiceStatusLabels,
} from '../lib/sales'
import { useAuthStore } from '../stores/authStore'

const vehicleTypeLabels: Record<string, string> = {
  car: 'سيارة',
  tuk_tuk: 'توك توك',
  motorcycle: 'دراجة',
  other: 'أخرى',
}

function paymentTermLabel(term?: string | null): string {
  if (term === 'mixed') return 'مختلط'
  if (term === 'installment') return 'تقسيط'
  if (term === 'cash') return 'نقدي'
  return term ?? '—'
}

function deviceCount(invoice: SalesInvoice): number {
  if (!invoice.lines?.length) return 0
  return invoice.lines.reduce((sum, line) => sum + Number(line.quantity ?? 1), 0)
}

function vehicleSummary(line: SalesInvoiceLine): string {
  if (line.vehicle_type === 'car' || line.vehicle_type === 'motorcycle') {
    const plate = [line.vehicle_plate_letters, line.vehicle_plate_numbers].filter(Boolean).join(' ')
    if (plate) return plate
  }
  if (line.vehicle_type === 'tuk_tuk') {
    const parts = [line.chassis_number, line.engine_number].filter(Boolean)
    if (parts.length) return parts.join(' / ')
  }
  return line.vehicle_info ?? '—'
}

function fmtMoney(value: string | number | undefined): string {
  return `${Number(value ?? 0).toLocaleString('ar-EG')} ج.م`
}

interface ReviewPanelProps {
  invoice: SalesInvoice
  rejectReason: string
  onRejectReasonChange: (value: string) => void
  onApprove: () => void
  onReject: () => void
  approvePending: boolean
  rejectPending: boolean
  errorMessage?: string
}

function ReviewPanel({
  invoice,
  rejectReason,
  onRejectReasonChange,
  onApprove,
  onReject,
  approvePending,
  rejectPending,
  errorMessage,
}: ReviewPanelProps) {
  const lines = invoice.lines ?? []

  return (
    <div className="flex h-full flex-col rounded-xl border border-outline-variant bg-surface-container-lowest">
      <div className="border-b border-outline-variant/60 bg-surface-container-low px-md py-sm">
        <h2 className="text-sm font-bold text-on-surface">
          {invoice.invoice_number ?? `#${invoice.id}`}
        </h2>
        <p className="text-xs text-on-surface-variant">{invoice.customer?.name ?? '—'}</p>
      </div>

      <div className="flex-1 space-y-md overflow-y-auto p-md">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-sm">
            <dt className="text-on-surface-variant">الموبايل</dt>
            <dd dir="ltr" className="text-end">{invoice.customer?.phone ?? '—'}</dd>
          </div>
          {invoice.customer?.national_id && (
            <div className="flex justify-between gap-sm">
              <dt className="text-on-surface-variant">الرقم القومي</dt>
              <dd dir="ltr" className="text-end">{invoice.customer.national_id}</dd>
            </div>
          )}
          <div className="flex justify-between gap-sm">
            <dt className="text-on-surface-variant">التاريخ</dt>
            <dd>{formatInvoiceDate(invoice.invoice_date)}</dd>
          </div>
          <div className="flex justify-between gap-sm">
            <dt className="text-on-surface-variant">الموزع</dt>
            <dd className="text-end">{distributorLabel(invoice.distributor) || '—'}</dd>
          </div>
          <div className="flex justify-between gap-sm">
            <dt className="text-on-surface-variant">الأجهزة</dt>
            <dd>{deviceCount(invoice)}</dd>
          </div>
          {invoice.installation_fee != null && Number(invoice.installation_fee) > 0 && (
            <div className="flex justify-between gap-sm">
              <dt className="text-on-surface-variant">رسوم التركيب</dt>
              <dd className="tabular-nums">{fmtMoney(invoice.installation_fee)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-sm">
            <dt className="text-on-surface-variant">الإجمالي</dt>
            <dd className="font-bold tabular-nums">{fmtMoney(invoice.total)}</dd>
          </div>
          <div className="flex justify-between gap-sm">
            <dt className="text-on-surface-variant">الدفع</dt>
            <dd>{paymentTermLabel(invoice.payment_term)}</dd>
          </div>
          <div className="flex justify-between gap-sm">
            <dt className="text-on-surface-variant">الحالة</dt>
            <dd>
              <StatusBadge
                status={invoice.status ?? 'pending_review'}
                label={invoiceStatusLabels[invoice.status ?? 'pending_review']}
              />
            </dd>
          </div>
        </dl>

        {lines.length > 0 && (
          <div className="space-y-sm">
            <h3 className="text-xs font-bold text-on-surface-variant">تفاصيل الأجهزة</h3>
            {lines.map((line, index) => (
              <div
                key={line.id}
                className="rounded-lg border border-outline-variant/70 bg-surface-container-low p-sm text-xs"
              >
                <p className="mb-xs font-semibold text-on-surface">جهاز {index + 1}</p>
                <div className="space-y-1 text-on-surface-variant">
                  <p>
                    <span className="text-on-surface">السيريال:</span>{' '}
                    <span dir="ltr">{line.serial_number ?? line.product_unit?.serial_number ?? '—'}</span>
                  </p>
                  <p>
                    <span className="text-on-surface">الشريحة:</span>{' '}
                    <span dir="ltr">{line.sim_number ?? '—'}</span>
                  </p>
                  <p>
                    <span className="text-on-surface">المستخدم:</span>{' '}
                    <span dir="ltr">{line.username ?? '—'}</span>
                  </p>
                  <p>
                    <span className="text-on-surface">الفني:</span> {line.technician?.name ?? '—'}
                  </p>
                  <p>
                    <span className="text-on-surface">المركبة:</span>{' '}
                    {line.vehicle_type ? vehicleTypeLabels[line.vehicle_type] ?? line.vehicle_type : '—'}
                    {vehicleSummary(line) !== '—' ? ` — ${vehicleSummary(line)}` : ''}
                  </p>
                  <p>
                    <span className="text-on-surface">الدفع:</span>{' '}
                    {paymentTermLabel(line.payment_term ?? invoice.payment_term)}
                  </p>
                  {line.installment_plan && (
                    <p className="text-on-surface">
                      مقدم {fmtMoney(line.installment_plan.down_payment)} —{' '}
                      {line.installment_plan.installment_count} قسط
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {invoice.payment_term === 'installment' && invoice.installment_plan && lines.length <= 1 && (
          <div className="rounded-lg bg-surface-container-low p-sm text-xs">
            <p>مقدم: {fmtMoney(invoice.installment_plan.down_payment)}</p>
            <p>أقساط: {invoice.installment_plan.installment_count}</p>
            <p>أول استحقاق: {formatInvoiceDate(invoice.installment_plan.first_due_date)}</p>
          </div>
        )}

        {invoice.customer_id && (
          <CustomerAttachmentsSection
            customerId={invoice.customer_id}
            mode="view"
            canManage={false}
          />
        )}

        <div>
          <label className="mb-xs block text-xs text-on-surface-variant">سبب الرفض (اختياري)</label>
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => onRejectReasonChange(e.target.value)}
            placeholder="مثال: بيانات غير مكتملة"
            className="w-full rounded border border-outline-variant px-sm py-2 text-sm"
          />
        </div>

        {errorMessage && <p className="text-sm text-error">{errorMessage}</p>}
      </div>

      <div className="space-y-sm border-t border-outline-variant/60 p-md">
        <Link
          to={contractPrintPath(invoice.id, { autoPrint: true })}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-xs rounded-lg border border-primary py-2.5 text-sm font-bold text-primary hover:bg-primary/5"
        >
          <Icon name="print" size={18} />
          طباعة العقد
        </Link>
        <button
          type="button"
          onClick={onApprove}
          disabled={approvePending}
          className="flex w-full items-center justify-center gap-xs rounded-lg bg-secondary py-2.5 text-sm font-bold text-on-secondary disabled:opacity-60"
        >
          <Icon name="check_circle" size={18} />
          تأكيد وإرسال الأقساط
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={rejectPending}
          className="flex w-full items-center justify-center gap-xs rounded-lg border border-error py-2.5 text-sm font-bold text-error disabled:opacity-60"
        >
          <Icon name="cancel" size={18} />
          رفض
        </button>
      </div>
    </div>
  )
}

export function InvoiceReviewPage() {
  const queryClient = useQueryClient()
  const branchId = useAuthStore((s) => s.branchId)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [invoiceSearch, setInvoiceSearch] = useState('')

  const query = useQuery({
    queryKey: ['sales-invoices', 'review', branchId],
    queryFn: async () => {
      const { data } = await api.get<{ data: SalesInvoice[] }>('/sales-invoices', {
        params: {
          per_page: 50,
          include: 'customer,lines.productUnit,lines.technician,lines.installmentPlan,installmentPlan,distributor',
          'filter[review_status]': 'pending',
          'filter[branch_id]': branchId,
        },
      })
      return data.data
    },
    enabled: Boolean(branchId),
  })

  const filteredRows = useMemo(() => {
    const rows = query.data ?? []
    const q = invoiceSearch.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => {
      const number = String(row.invoice_number ?? '').toLowerCase()
      const customer = String(row.customer?.name ?? '').toLowerCase()
      const phone = String(row.customer?.phone ?? '').toLowerCase()
      return number.includes(q) || customer.includes(q) || phone.includes(q)
    })
  }, [query.data, invoiceSearch])

  const selected = filteredRows.find((i) => i.id === selectedId) ?? null

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<SalesInvoice>(`/sales-invoices/${id}/approve`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      queryClient.invalidateQueries({ queryKey: ['gps-stock'] })
      setSelectedId(null)
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const { data } = await api.post<SalesInvoice>(`/sales-invoices/${id}/reject`, { reason })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['gps-stock'] })
      setRejectReason('')
      setSelectedId(null)
    },
  })

  const mutationError = approveMutation.isError || rejectMutation.isError
    ? getErrorMessage(approveMutation.error ?? rejectMutation.error)
    : undefined

  return (
    <SalesPageShell
      title="مراجعة الفواتير"
      subtitle="قسم المراجعة يؤكد الفاتورة قبل إرسال جدول الأقساط للعميل"
      filters={
        <FilterBar
          search={invoiceSearch}
          onSearchChange={setInvoiceSearch}
          searchPlaceholder="بحث برقم الفاتورة أو اسم العميل أو الموبايل..."
        />
      }
    >
      {!branchId ? (
        <p className="text-on-surface-variant">يرجى اختيار فرع.</p>
      ) : (
        <div className="flex flex-col gap-md lg:flex-row lg:items-start">
          <div className="w-full min-w-0 lg:w-[80%]">
            <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
              <AsyncState
                isLoading={query.isLoading}
                isError={query.isError}
                error={query.error}
              >
                <DataTable<SalesInvoice & Record<string, unknown>>
                  data={filteredRows as (SalesInvoice & Record<string, unknown>)[]}
                  keyExtractor={(row) => row.id}
                  pageSize={10}
                  emptyMessage="لا توجد فواتير بانتظار المراجعة"
                    rowClassName={(row) =>
                    row.id === selectedId ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : ''
                  }
                  columns={[
                    { key: 'invoice_number', header: 'رقم الفاتورة' },
                    {
                      key: 'customer',
                      header: 'العميل',
                      render: (row) => (
                        <div>
                          <p className="font-medium">{row.customer?.name ?? '—'}</p>
                          {row.customer?.phone && (
                            <p className="text-xs text-on-surface-variant" dir="ltr">
                              {row.customer.phone}
                            </p>
                          )}
                        </div>
                      ),
                    },
                    {
                      key: 'invoice_date',
                      header: 'التاريخ',
                      render: (row) => formatInvoiceDate(row.invoice_date),
                    },
                    {
                      key: 'distributor',
                      header: 'الموزع',
                      render: (row) => distributorLabel(row.distributor) || '—',
                    },
                    {
                      key: 'devices',
                      header: 'الأجهزة',
                      render: (row) => deviceCount(row),
                    },
                    {
                      key: 'total',
                      header: 'الإجمالي',
                      render: (row) => (
                        <span className="tabular-nums font-medium">{fmtMoney(row.total)}</span>
                      ),
                    },
                    {
                      key: 'payment_term',
                      header: 'الدفع',
                      render: (row) => paymentTermLabel(row.payment_term),
                    },
                    {
                      key: 'actions',
                      header: '',
                      render: (row) => (
                        <button
                          type="button"
                          onClick={() => setSelectedId(row.id as number)}
                          className={`text-sm font-medium hover:underline ${
                            row.id === selectedId ? 'text-secondary' : 'text-primary'
                          }`}
                        >
                          مراجعة
                        </button>
                      ),
                    },
                  ]}
                />
              </AsyncState>
            </div>
          </div>

          <div className="w-full lg:w-[20%] lg:min-w-[17rem] lg:max-w-[22rem]">
            {selected ? (
              <ReviewPanel
                invoice={selected}
                rejectReason={rejectReason}
                onRejectReasonChange={setRejectReason}
                onApprove={() => approveMutation.mutate(selected.id)}
                onReject={() =>
                  rejectMutation.mutate({
                    id: selected.id,
                    reason: rejectReason || 'مرفوضة من قسم المراجعة',
                  })
                }
                approvePending={approveMutation.isPending}
                rejectPending={rejectMutation.isPending}
                errorMessage={mutationError}
              />
            ) : (
              <div className="flex min-h-[12rem] items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-md text-center text-sm text-on-surface-variant">
                اختر فاتورة من الجدول لمراجعتها
              </div>
            )}
          </div>
        </div>
      )}
    </SalesPageShell>
  )
}
