import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { PaginatedResponse, SalesInvoice } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { Icon } from '../components/Icon'
import { useAuthStore } from '../stores/authStore'

const statusLabels: Record<string, string> = {
  pending_review: 'بانتظار المراجعة',
  confirmed: 'مؤكدة',
  rejected: 'مرفوضة',
}

export function InvoiceReviewPage() {
  const queryClient = useQueryClient()
  const branchId = useAuthStore((s) => s.branchId)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const query = useQuery({
    queryKey: ['sales-invoices', 'review', branchId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<SalesInvoice>>('/sales-invoices', {
        params: {
          per_page: 50,
          'filter[status]': 'pending_review',
          'filter[branch_id]': branchId,
        },
      })
      return data.data
    },
    enabled: Boolean(branchId),
  })

  const selected = query.data?.find((i) => i.id === selectedId) ?? query.data?.[0]

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
    <div>
      <h1 className="mb-md text-2xl font-bold text-on-surface">مراجعة الفواتير</h1>
      <p className="mb-md text-sm text-on-surface-variant">
        قسم المراجعة يؤكد الفاتورة قبل إرسال جدول الأقساط للعميل
      </p>

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
              data={(query.data ?? []) as (SalesInvoice & Record<string, unknown>)[]}
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

          {selected && (
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
              <h2 className="mb-md text-lg font-semibold">
                فاتورة {selected.invoice_number ?? `#${selected.id}`}
              </h2>

              <dl className="mb-md space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-on-surface-variant">العميل</dt>
                  <dd>{selected.customer?.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-on-surface-variant">التاريخ</dt>
                  <dd>{selected.invoice_date}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-on-surface-variant">الكمية</dt>
                  <dd>{selected.lines?.[0]?.quantity ?? '—'} جهاز GPS</dd>
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
                      label={statusLabels[selected.status ?? 'pending_review']}
                    />
                  </dd>
                </div>
              </dl>

              {selected.payment_term === 'installment' && selected.installment_plan && (
                <div className="mb-md rounded-lg bg-surface-container-low p-sm text-sm">
                  <p>مقدم: {Number(selected.installment_plan.down_payment).toLocaleString('ar-EG')} ج.م</p>
                  <p>أقساط: {selected.installment_plan.installment_count} × شهري</p>
                  <p>أول استحقاق: {selected.installment_plan.first_due_date}</p>
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

              <div className="flex gap-sm">
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
          )}
        </div>
      )}
    </div>
  )
}
