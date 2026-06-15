import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { SalesInvoice } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'
import { StatusBadge } from '../components/StatusBadge'
import { formatInvoiceDate, invoiceStatusLabels, contractPrintPath } from '../lib/sales'
import { useAuthStore } from '../stores/authStore'

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
          include: 'customer,lines,installmentPlan',
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
      return number.includes(q) || customer.includes(q)
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

  return (
    <SalesPageShell
      title="مراجعة الفواتير"
      subtitle="قسم المراجعة يؤكد الفاتورة قبل إرسال جدول الأقساط للعميل"
      filters={
        <FilterBar
          search={invoiceSearch}
          onSearchChange={setInvoiceSearch}
          searchPlaceholder="بحث برقم الفاتورة أو اسم العميل..."
        />
      }
    >
      {!branchId ? (
        <p className="text-on-surface-variant">يرجى اختيار فرع.</p>
      ) : (
        <div className="grid gap-md lg:grid-cols-2">
          <AsyncState
            isLoading={query.isLoading}
            isError={query.isError}
            error={query.error}
          >
            <DataTable<SalesInvoice & Record<string, unknown>>
              data={filteredRows as (SalesInvoice & Record<string, unknown>)[]}
              keyExtractor={(row) => row.id}
              emptyMessage="لا توجد فواتير بانتظار المراجعة"
              columns={[
                { key: 'invoice_number', header: 'رقم الفاتورة' },
                {
                  key: 'customer',
                  header: 'العميل',
                  render: (row) => row.customer?.name ?? '—',
                },
                {
                  key: 'total',
                  header: 'الإجمالي',
                  render: (row) => `${Number(row.total).toLocaleString('ar-EG')} ج.م`,
                },
                {
                  key: 'payment_term',
                  header: 'الدفع',
                  render: (row) => (row.payment_term === 'installment' ? 'تقسيط' : 'نقدي'),
                },
                {
                  key: 'actions',
                  header: '',
                  render: (row) => (
                    <button
                      type="button"
                      onClick={() => setSelectedId(row.id as number)}
                      className="text-sm text-primary hover:underline"
                    >
                      مراجعة
                    </button>
                  ),
                },
              ]}
            />
          </AsyncState>

          {selected ? (
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
              <h2 className="mb-md text-lg font-semibold">
                فاتورة {selected.invoice_number ?? `#${selected.id}`}
              </h2>

              <dl className="mb-md space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-on-surface-variant">العميل</dt>
                  <dd>{selected.customer?.name ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-on-surface-variant">التاريخ</dt>
                  <dd>{formatInvoiceDate(selected.invoice_date)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-on-surface-variant">الكمية</dt>
                  <dd>{selected.lines?.[0]?.quantity ?? selected.lines?.length ?? '—'} جهاز GPS</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-on-surface-variant">الإجمالي</dt>
                  <dd className="font-bold tabular-nums">
                    {Number(selected.total).toLocaleString('ar-EG')} ج.م
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-on-surface-variant">الحالة</dt>
                  <dd>
                    <StatusBadge
                      status={selected.status ?? 'pending_review'}
                      label={invoiceStatusLabels[selected.status ?? 'pending_review']}
                    />
                  </dd>
                </div>
              </dl>

              {selected.payment_term === 'installment' && selected.installment_plan && (
                <div className="mb-md rounded-lg bg-surface-container-low p-sm text-sm">
                  <p>مقدم: {Number(selected.installment_plan.down_payment).toLocaleString('ar-EG')} ج.م</p>
                  <p>أقساط: {selected.installment_plan.installment_count} × شهري</p>
                  <p>أول استحقاق: {formatInvoiceDate(selected.installment_plan.first_due_date)}</p>
                </div>
              )}

              <div className="mb-md">
                <label className="mb-xs block text-sm text-on-surface-variant">
                  سبب الرفض (اختياري)
                </label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="مثال: بيانات العميل غير مكتملة"
                  className="w-full rounded border border-outline-variant px-sm py-2 text-sm"
                />
              </div>

              {(approveMutation.isError || rejectMutation.isError) && (
                <p className="mb-sm text-sm text-error">
                  {getErrorMessage(approveMutation.error ?? rejectMutation.error)}
                </p>
              )}

              <div className="flex flex-wrap gap-sm">
                <Link
                  to={contractPrintPath(selected.id, { autoPrint: true })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-xs rounded-lg border border-primary py-3 font-bold text-primary hover:bg-primary/5"
                >
                  <Icon name="print" />
                  طباعة العقد
                </Link>
                <button
                  type="button"
                  onClick={() => approveMutation.mutate(selected.id)}
                  disabled={approveMutation.isPending}
                  className="flex flex-1 items-center justify-center gap-xs rounded-lg bg-secondary py-3 font-bold text-on-secondary disabled:opacity-60"
                >
                  <Icon name="check_circle" />
                  تأكيد وإرسال الأقساط
                </button>
                <button
                  type="button"
                  onClick={() =>
                    rejectMutation.mutate({
                      id: selected.id,
                      reason: rejectReason || 'مرفوضة من قسم المراجعة',
                    })
                  }
                  disabled={rejectMutation.isPending}
                  className="flex flex-1 items-center justify-center gap-xs rounded-lg border border-error py-3 font-bold text-error disabled:opacity-60"
                >
                  <Icon name="cancel" />
                  رفض
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-md text-sm text-on-surface-variant">
              اختر فاتورة من الجدول لمراجعتها
            </div>
          )}
        </div>
      )}
    </SalesPageShell>
  )
}
