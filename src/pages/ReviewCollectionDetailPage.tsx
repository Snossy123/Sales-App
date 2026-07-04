import { Link, useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { InstallmentItem, PaymentTransaction, SalesInvoice } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'
import { StatusBadge } from '../components/StatusBadge'
import { userHasPermission } from '../lib/access'
import { formatMoney } from '../lib/theme'
import { useAuthStore } from '../stores/authStore'

export function ReviewCollectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canConfirm = userHasPermission(user, 'review.confirm_collections')
  const [notes, setNotes] = useState('')

  const query = useQuery({
    queryKey: ['review-collection', id],
    queryFn: async () => {
      const { data } = await api.get<SalesInvoice>(`/review/collections/${id}`)
      return data
    },
    enabled: Boolean(id),
  })

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<SalesInvoice>(`/review/collections/${id}/confirm`, { notes: notes || undefined })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-collections'] })
      navigate('/review/collections')
    },
  })

  const invoice = query.data
  const payments = (invoice?.payment_transactions ?? []) as PaymentTransaction[]
  const installments = (invoice?.installment_items ?? []) as InstallmentItem[]
  const isPending = invoice?.collection_review_status === 'pending'

  return (
    <SalesPageShell
      title="تفاصيل مراجعة التحصيل"
      subtitle={invoice ? `عقد ${invoice.invoice_number}` : undefined}
      actions={
        <Link to="/review/collections" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <Icon name="arrow_forward" className="text-base" />
          العودة للقائمة
        </Link>
      }
    >
      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {invoice && (
          <div className="space-y-6">
            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge
                  status={isPending ? 'warning' : 'success'}
                  label={isPending ? 'بانتظار المراجعة' : 'تمت المراجعة'}
                />
                <span className="text-sm text-on-surface-variant">
                  العميل: {invoice.customer?.name ?? '—'} · الفرع: {invoice.branch?.name ?? '—'}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <div className="text-xs text-on-surface-variant">إجمالي العقد</div>
                  <div className="font-medium">{formatMoney(Number(invoice.total))}</div>
                </div>
                <div>
                  <div className="text-xs text-on-surface-variant">المحصّل</div>
                  <div className="font-medium">{formatMoney(Number(invoice.paid_amount))}</div>
                </div>
                <div>
                  <div className="text-xs text-on-surface-variant">المتبقي</div>
                  <div className="font-medium">{formatMoney(Number(invoice.balance_due))}</div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
              <h2 className="mb-3 text-base font-semibold">الأقساط</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant text-on-surface-variant">
                      <th className="px-2 py-2 text-start">#</th>
                      <th className="px-2 py-2 text-start">تاريخ الاستحقاق</th>
                      <th className="px-2 py-2 text-start">المبلغ</th>
                      <th className="px-2 py-2 text-start">المدفوع</th>
                      <th className="px-2 py-2 text-start">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installments.map((item) => (
                      <tr key={item.id} className="border-b border-outline-variant/50">
                        <td className="px-2 py-2">{item.sequence}</td>
                        <td className="px-2 py-2">{item.due_date?.slice(0, 10) ?? '—'}</td>
                        <td className="px-2 py-2">{formatMoney(Number(item.amount))}</td>
                        <td className="px-2 py-2">{formatMoney(Number(item.paid_amount ?? 0))}</td>
                        <td className="px-2 py-2">{item.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
              <h2 className="mb-3 text-base font-semibold">سجل المدفوعات</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant text-on-surface-variant">
                      <th className="px-2 py-2 text-start">التاريخ</th>
                      <th className="px-2 py-2 text-start">المبلغ</th>
                      <th className="px-2 py-2 text-start">طريقة الدفع</th>
                      <th className="px-2 py-2 text-start">المحصّل</th>
                      <th className="px-2 py-2 text-start">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-b border-outline-variant/50">
                        <td className="px-2 py-2">{payment.paid_at?.slice(0, 10) ?? '—'}</td>
                        <td className="px-2 py-2">{formatMoney(Number(payment.amount))}</td>
                        <td className="px-2 py-2">{payment.payment_method}</td>
                        <td className="px-2 py-2">{payment.user?.name ?? '—'}</td>
                        <td className="px-2 py-2">{payment.notes ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {isPending && canConfirm && (
              <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                <h2 className="mb-3 text-base font-semibold">تأكيد المراجعة</h2>
                <textarea
                  className="mb-3 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm"
                  rows={3}
                  placeholder="ملاحظات المراجعة (اختياري)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                {confirmMutation.isError && (
                  <p className="mb-2 text-sm text-error">{getErrorMessage(confirmMutation.error)}</p>
                )}
                <button
                  type="button"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-50"
                  disabled={confirmMutation.isPending}
                  onClick={() => confirmMutation.mutate()}
                >
                  {confirmMutation.isPending ? 'جاري التأكيد...' : 'تأكيد المراجعة'}
                </button>
              </section>
            )}
          </div>
        )}
      </AsyncState>
    </SalesPageShell>
  )
}
