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

export function CustomerCollectionActions({
  customerId,
}: {
  customerId?: number
}) {
  const queryClient = useQueryClient()
  const [deviceModalOpen, setDeviceModalOpen] = useState(false)
  const [deviceNotes, setDeviceNotes] = useState('')
  const [error, setError] = useState('')

  const summaryQuery = useCollectionActionsSummary(customerId)
  const summary = summaryQuery.data

  const invalidate = () => {
    if (customerId) {
      queryClient.invalidateQueries({ queryKey: summaryQueryKey(customerId) })
    }
  }

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

  const portalBlocked = summary?.portal_blocked ?? false
  const deviceNote = summary?.device_disable_note

  return (
    <>
      <div className="mb-sm rounded-lg border border-outline-variant/60 bg-surface-container-low/40 p-sm">
        <p className="mb-sm text-xs font-semibold text-on-surface-variant">إجراءات التحصيل</p>
        {error && (
          <p className="mb-sm rounded border border-error/30 bg-error/5 px-sm py-xs text-xs text-error">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-sm">
          <button
            type="button"
            onClick={() => {
              setError('')
              setDeviceModalOpen(true)
            }}
            disabled={deviceMutation.isPending}
            className="rounded-lg border border-outline-variant px-sm py-1.5 text-xs font-medium hover:border-primary/40 hover:text-primary"
          >
            إيقاف الجهاز
          </button>
          <button
            type="button"
            onClick={() => {
              setError('')
              portalMutation.mutate(!portalBlocked)
            }}
            disabled={portalMutation.isPending}
            className={`rounded-lg border px-sm py-1.5 text-xs font-medium ${
              portalBlocked
                ? 'border-secondary/40 text-secondary hover:bg-secondary/10'
                : 'border-error/40 text-error hover:bg-error/5'
            }`}
          >
            {portalBlocked ? 'تفعيل دخول التطبيق' : 'إيقاف دخول التطبيق'}
          </button>
        </div>
        <div className="mt-sm flex flex-wrap gap-sm text-[11px] text-on-surface-variant">
          {deviceNote && (
            <span className="rounded-full bg-surface-container-high px-sm py-0.5">
              تم تسجيل إيقاف الجهاز · {formatDatetime12hDisplay(deviceNote.logged_at)}
            </span>
          )}
          {portalBlocked && (
            <span className="rounded-full bg-error/10 px-sm py-0.5 text-error">الدخول موقوف</span>
          )}
          {!portalBlocked && summary && (
            <span className="rounded-full bg-secondary/10 px-sm py-0.5 text-secondary">الدخول مفعّل</span>
          )}
        </div>
      </div>

      <Modal open={deviceModalOpen} onClose={() => setDeviceModalOpen(false)} title="تسجيل إيقاف الجهاز" size="sm">
        <p className="mb-sm text-sm text-on-surface-variant">
          سيتم تسجيل إجراء يدوي لإيقاف عمل الجهاز — بدون اتصال بمنصة التتبع حالياً.
        </p>
        <label className="mb-xs block text-xs text-on-surface-variant">ملاحظات (اختياري)</label>
        <textarea
          value={deviceNotes}
          onChange={(e) => setDeviceNotes(e.target.value)}
          rows={3}
          className="mb-md w-full rounded border border-outline-variant px-sm py-2 text-sm"
          placeholder="سبب الإيقاف أو تفاصيل للموظف..."
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

export function ContractWhatsappWarningButton({
  customerId,
  invoiceId,
  hasPhone,
}: {
  customerId?: number
  invoiceId: number
  hasPhone: boolean
}) {
  const queryClient = useQueryClient()
  const summaryQuery = useCollectionActionsSummary(customerId)
  const summary = summaryQuery.data
  const warning = summary?.whatsapp_warnings?.[invoiceId]

  const mutation = useMutation({
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
    },
  })

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => {
          if (window.confirm('إرسال تحذير واتساب لهذا التعاقد؟')) {
            mutation.mutate()
          }
        }}
        disabled={!hasPhone || mutation.isPending}
        title={!hasPhone ? 'لا يوجد رقم هاتف للعميل' : undefined}
        className="rounded-lg border border-outline-variant px-sm py-1 text-xs font-medium text-primary hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {mutation.isPending ? 'جاري الإرسال…' : 'تحذير واتساب'}
      </button>
      {warning && (
        <span className="text-[11px] text-on-surface-variant">
          تم الإرسال · {formatDatetime12hDisplay(warning.logged_at)}
        </span>
      )}
      {mutation.isError && (
        <span className="text-[11px] text-error">{getErrorMessage(mutation.error)}</span>
      )}
    </div>
  )
}
