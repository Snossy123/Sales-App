import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api, getErrorMessage } from '../../api/client'
import type { CollectionActionsSummary } from '../../api/types'
import { formatDatetime12hDisplay } from '../../lib/datetime12h'
import { Modal } from '../Modal'

function summaryQueryKey(customerId: number) {
  return ['collection-actions-summary', customerId] as const
}

function useCollectionActionsSummary(customerId?: number) {
  return useQuery({
    queryKey: summaryQueryKey(customerId ?? 0),
    queryFn: async () => {
      const { data } = await api.get<CollectionActionsSummary>(
        `/customers/${customerId}/collection-actions/summary`,
      )
      return data
    },
    enabled: Boolean(customerId),
  })
}

export function ContractCollectionActions({
  customerId,
  invoiceId,
  hasPhone,
}: {
  customerId?: number
  invoiceId: number
  hasPhone: boolean
}) {
  const queryClient = useQueryClient()
  const [deviceModalOpen, setDeviceModalOpen] = useState(false)
  const [deviceNotes, setDeviceNotes] = useState('')
  const [error, setError] = useState('')

  const summaryQuery = useCollectionActionsSummary(customerId)
  const summary = summaryQuery.data
  const portalBlocked = summary?.portal_blocked ?? false
  const deviceNote = summary?.device_disable_note
  const warning = summary?.whatsapp_warnings?.[invoiceId]

  const whatsappMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ summary: CollectionActionsSummary }>(
        `/sales-invoices/${invoiceId}/collection-actions/whatsapp-warning`,
      )
      return data
    },
    onSuccess: (data) => {
      if (customerId) {
        queryClient.setQueryData(summaryQueryKey(customerId), data.summary)
      }
      setError('')
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const deviceMutation = useMutation({
    mutationFn: async () => {
      if (!customerId) throw new Error('عميل غير محدد')
      const { data } = await api.post<{ summary: CollectionActionsSummary }>(
        `/customers/${customerId}/collection-actions/device-disable-note`,
        { notes: deviceNotes.trim() || null },
      )
      return data
    },
    onSuccess: (data) => {
      if (customerId) {
        queryClient.setQueryData(summaryQueryKey(customerId), data.summary)
      }
      setDeviceModalOpen(false)
      setDeviceNotes('')
      setError('')
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const portalMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!customerId) throw new Error('عميل غير محدد')
      const { data } = await api.post<{ summary: CollectionActionsSummary }>(
        `/customers/${customerId}/collection-actions/portal-access`,
        { enabled },
      )
      return data
    },
    onSuccess: (data) => {
      if (customerId) {
        queryClient.setQueryData(summaryQueryKey(customerId), data.summary)
      }
      setError('')
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  if (!customerId) return null

  return (
    <>
      {error && (
        <p className="mb-sm rounded border border-error/30 bg-error/5 px-sm py-xs text-xs text-error">
          {error}
        </p>
      )}

      <div className="mb-sm flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (window.confirm('إرسال رسالة تحذيرية لهذا التعاقد؟')) {
              whatsappMutation.mutate()
            }
          }}
          disabled={!hasPhone || whatsappMutation.isPending}
          title={!hasPhone ? 'لا يوجد رقم هاتف للعميل' : undefined}
          className="rounded-lg border border-outline-variant px-sm py-1 text-xs font-medium text-primary hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {whatsappMutation.isPending ? 'جاري الإرسال…' : 'رسالة تحذيرية'}
        </button>

        <button
          type="button"
          onClick={() => {
            setError('')
            portalMutation.mutate(!portalBlocked)
          }}
          disabled={portalMutation.isPending}
          className={`rounded-lg border px-sm py-1 text-xs font-medium ${
            portalBlocked
              ? 'border-secondary/40 text-secondary hover:bg-secondary/10'
              : 'border-error/40 text-error hover:bg-error/5'
          }`}
        >
          {portalBlocked ? 'إلغاء رسيت متأخر' : 'رسيت متأخر'}
        </button>

        <button
          type="button"
          onClick={() => {
            setError('')
            setDeviceModalOpen(true)
          }}
          disabled={deviceMutation.isPending}
          className="rounded-lg border border-outline-variant px-sm py-1 text-xs font-medium hover:border-primary/40 hover:text-primary"
        >
          فقد اشارة الجهاز
        </button>
      </div>

      <div className="mb-sm flex flex-wrap gap-sm text-[11px] text-on-surface-variant">
        {warning && (
          <span className="rounded-full bg-surface-container-high px-sm py-0.5">
            تم إرسال رسالة تحذيرية · {formatDatetime12hDisplay(warning.logged_at)}
          </span>
        )}
        {portalBlocked && (
          <span className="rounded-full bg-error/10 px-sm py-0.5 text-error">رسيت متأخر مفعّل</span>
        )}
        {deviceNote && (
          <span className="rounded-full bg-surface-container-high px-sm py-0.5">
            تم تسجيل فقد إشارة الجهاز · {formatDatetime12hDisplay(deviceNote.logged_at)}
          </span>
        )}
      </div>

      <Modal
        open={deviceModalOpen}
        onClose={() => setDeviceModalOpen(false)}
        title="تسجيل فقد إشارة الجهاز"
        size="sm"
      >
        <p className="mb-sm text-sm text-on-surface-variant">
          سيتم تسجيل إجراء يدوي لفقد إشارة الجهاز — بدون اتصال بمنصة التتبع حالياً.
        </p>
        <label className="mb-xs block text-xs text-on-surface-variant">ملاحظات (اختياري)</label>
        <textarea
          value={deviceNotes}
          onChange={(e) => setDeviceNotes(e.target.value)}
          rows={3}
          className="mb-md w-full rounded border border-outline-variant px-sm py-2 text-sm"
          placeholder="تفاصيل إضافية للموظف..."
        />
        <button
          type="button"
          onClick={() => deviceMutation.mutate()}
          disabled={deviceMutation.isPending}
          className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-on-primary"
        >
          {deviceMutation.isPending ? 'جاري الحفظ…' : 'تأكيد التسجيل'}
        </button>
      </Modal>
    </>
  )
}
