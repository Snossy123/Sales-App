import { Link, useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { CollectionFollowUpLog, InstallmentItem, PaymentTransaction, SalesInvoice } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { ContractCollectionActions } from '../components/installments/CustomerCollectionActions'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'
import { StatusBadge } from '../components/StatusBadge'
import { userHasPermission } from '../lib/access'
import { collectionStatusLabels } from '../lib/collectionHelpers'
import { formatDatetime12hDisplay } from '../lib/datetime12h'
import { formatMoney } from '../lib/theme'
import { useAuthStore } from '../stores/authStore'

interface CollectionActionHistory {
  id: number
  action_type: string
  notes?: string | null
  created_at?: string | null
  cancelled_at?: string | null
  user_name?: string | null
  sales_invoice_id?: number | null
}

const actionLabels: Record<string, string> = {
  device_disable_note: 'تسجيل فقد إشارة الجهاز',
  whatsapp_warning: 'إرسال رسالة تحذيرية',
  portal_login_disabled: 'تفعيل رسيت متأخر',
  portal_login_enabled: 'إلغاء رسيت متأخر',
  device_disable_note_cancelled: 'إلغاء تسجيل فقد إشارة الجهاز',
  whatsapp_warning_cancelled: 'إلغاء تسجيل الرسالة التحذيرية',
}

function cairoDateTime(value?: string | null) {
  if (!value || Number.isNaN(Date.parse(value))) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(value))
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`
}

export function ReviewCollectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canConfirm = userHasPermission(user, 'review.confirm_collections')
  const canManageActions = canConfirm || userHasPermission(user, 'installments.collect')
  const [historyDay, setHistoryDay] = useState('')
  const [historyFrom, setHistoryFrom] = useState('')
  const [historyTo, setHistoryTo] = useState('')
  const [notes, setNotes] = useState('')

  const query = useQuery({
    queryKey: ['review-collection', id],
    queryFn: async () => {
      const { data } = await api.get<SalesInvoice & { collection_follow_ups: CollectionFollowUpLog[]; collection_actions: CollectionActionHistory[] }>(`/review/collections/${id}`)
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
    ...(invoice?.collection_actions ?? []).map((action) => ({
      id: `action-${action.id}`,
      date: action.created_at,
      user: action.user_name,
      title: `${actionLabels[action.action_type] ?? action.action_type}${action.cancelled_at ? ' (تم إلغاؤه)' : ''}`,
      installment: action.sales_invoice_id ? 'على مستوى العقد' : 'على مستوى العميل — يشمل كل عقوده',
      notes: action.notes,
      reminder: null,
    })),
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
  const invalidHistoryRange = Boolean(historyFrom && historyTo && historyFrom > historyTo)
  const filteredHistory = history.filter((event) => {
    if (invalidHistoryRange) return false
    const value = cairoDateTime(event.date)
    if (historyDay && value.slice(0, 10) !== historyDay) return false
    if (historyFrom && value < historyFrom) return false
    if (historyTo && value > historyTo) return false
    return true
  })
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
                  status={invoice.collection_review_status === 'reviewed' ? 'success' : 'warning'}
                  label={invoice.collection_review_status === 'reviewed' ? 'تمت المراجعة' : isPending ? 'بانتظار المراجعة' : 'لم تتم المراجعة'}
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

            {canManageActions && (
              <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                <h2 className="mb-3 text-base font-semibold">إجراءات التحصيل</h2>
                <p className="mb-3 text-xs text-on-surface-variant">رسيت متأخر وفقد إشارة الجهاز إجراءات على مستوى العميل وتشمل كل عقوده. إلغاء تسجيل التحذير لا يسحب رسالة واتساب المرسلة.</p>
                <ContractCollectionActions customerId={invoice.customer_id} invoiceId={invoice.id} hasPhone={Boolean(invoice.customer?.phone)} />
              </section>
            )}

            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
                <Icon name="history" />
                سجل إجراءات التحصيل
              </h2>
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <label className="text-xs text-on-surface-variant">
                  اليوم
                  <input type="date" value={historyDay} onChange={(e) => { setHistoryDay(e.target.value); setHistoryFrom(''); setHistoryTo('') }} className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm" />
                </label>
                <label className="text-xs text-on-surface-variant">
                  من وقت (بتوقيت القاهرة)
                  <input type="datetime-local" value={historyFrom} onChange={(e) => { setHistoryFrom(e.target.value); setHistoryDay('') }} className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm" />
                </label>
                <label className="text-xs text-on-surface-variant">
                  إلى وقت (بتوقيت القاهرة)
                  <input type="datetime-local" value={historyTo} onChange={(e) => { setHistoryTo(e.target.value); setHistoryDay('') }} className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm" />
                </label>
              </div>
              {(historyDay || historyFrom || historyTo) && (
                <button type="button" className="mb-3 text-sm text-primary hover:underline" onClick={() => { setHistoryDay(''); setHistoryFrom(''); setHistoryTo('') }}>عرض كل السجل</button>
              )}
              {invalidHistoryRange && <p role="alert" className="mb-3 text-sm text-error">وقت النهاية يجب أن يكون بعد وقت البداية</p>}
              {filteredHistory.length === 0 ? (
                <p className="text-sm text-on-surface-variant">لا توجد إجراءات في الفترة المحددة</p>
              ) : (
                <ol className="space-y-3">
                  {filteredHistory.map((event) => (
                    <li key={event.id} className="rounded-lg border border-outline-variant bg-surface-container-low/50 p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface-variant">
                        <span>{event.user || '—'}</span>
                        <time dateTime={event.date ?? undefined}>{formatDatetime12hDisplay(cairoDateTime(event.date))}</time>
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

            {invoice.collection_review_status === 'reviewed' && (
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
