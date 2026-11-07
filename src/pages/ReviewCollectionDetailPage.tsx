import { Link, useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { CollectionFollowUpLog, InstallmentItem, PaymentTransaction, SalesInvoice } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'
import { StatusBadge } from '../components/StatusBadge'
import { userHasPermission } from '../lib/access'
import { collectionStatusLabels } from '../lib/collectionHelpers'
import { formatDatetime12hDisplay } from '../lib/datetime12h'
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
      const { data } = await api.get<SalesInvoice & { collection_follow_ups: CollectionFollowUpLog[] }>(`/review/collections/${id}`)
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
  const history = [
    ...payments.map((payment) => ({
      id: `payment-${payment.id}`,
      date: payment.paid_at,
      user: payment.user?.name,
      title: `${Number(payment.amount) < 0 ? 'استرداد دفعة' : 'تسجيل تحصيل'} — ${formatMoney(Number(payment.amount ?? 0))}`,
      installment: payment.installment_item?.sequence != null ? `القسط #${payment.installment_item.sequence}` : 'على مستوى العقد',
      notes: payment.notes,
      reminder: null,
    })),
    ...(invoice?.collection_follow_ups ?? []).map((log) => ({
      id: `follow-up-${log.id}`,
      date: log.created_at,
      user: log.user_name,
      title: `متابعة التحصيل — ${log.collection_status_label || (log.collection_status ? collectionStatusLabels[log.collection_status] ?? log.collection_status : 'تحديث المتابعة')}`,
      installment: log.installment_sequence != null ? `القسط #${log.installment_sequence}` : log.installment_item_id != null ? 'متابعة قسط' : 'على مستوى العقد',
      notes: log.collection_notes,
      reminder: log.collection_reminder_at,
    })),
    ...(invoice?.collection_reviewed_at ? [{
      id: 'review',
      date: invoice.collection_reviewed_at,
      user: invoice.collection_reviewer?.name,
      title: 'تأكيد مراجعة التحصيل',
      installment: 'على مستوى العقد',
      notes: invoice.collection_review_notes,
      reminder: null,
    }] : []),
  ].sort((a, b) => (Date.parse(b.date ?? '') || 0) - (Date.parse(a.date ?? '') || 0))
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
                  <div className="font-medium">
                    {formatMoney(
                      Math.max(
                        0,
                        Number(invoice.total ?? 0) - Number(invoice.transportation_fee ?? 0),
                      ),
                    )}
                  </div>
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

            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
                <Icon name="history" />
                سجل إجراءات التحصيل
              </h2>
              {history.length === 0 ? (
                <p className="text-sm text-on-surface-variant">لا توجد إجراءات مسجلة حتى الآن</p>
              ) : (
                <ol className="space-y-3">
                  {history.map((event) => (
                    <li key={event.id} className="rounded-lg border border-outline-variant bg-surface-container-low/50 p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface-variant">
                        <span>{event.user || '—'}</span>
                        <time dateTime={event.date ?? undefined}>{formatDatetime12hDisplay(event.date)}</time>
                      </div>
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">{event.installment}</p>
                      {event.reminder && (
                        <p className="mt-1 text-xs text-on-surface-variant">التذكير: {formatDatetime12hDisplay(event.reminder)}</p>
                      )}
                      {event.notes && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{event.notes}</p>}
                    </li>
                  ))}
                </ol>
              )}
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

            {!isPending && (
              <section className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
                <h2 className="mb-3 text-base font-semibold">نتيجة المراجعة</h2>
                <dl className="space-y-2 text-sm">
                  {invoice.collection_reviewed_at && (
                    <div className="flex justify-between gap-sm">
                      <dt className="text-on-surface-variant">تاريخ التأكيد</dt>
                      <dd dir="ltr">{invoice.collection_reviewed_at.slice(0, 10)}</dd>
                    </div>
                  )}
                  {invoice.collection_reviewer?.name && (
                    <div className="flex justify-between gap-sm">
                      <dt className="text-on-surface-variant">المراجع</dt>
                      <dd>{invoice.collection_reviewer.name}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="mb-1 text-on-surface-variant">ملاحظات المراجعة</dt>
                    <dd className="rounded-lg bg-surface-container-lowest px-3 py-2 text-on-surface">
                      {invoice.collection_review_notes?.trim() || '—'}
                    </dd>
                  </div>
                </dl>
              </section>
            )}
          </div>
        )}
      </AsyncState>
    </SalesPageShell>
  )
}
