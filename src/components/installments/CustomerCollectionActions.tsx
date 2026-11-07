import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api, getErrorMessage } from '../../api/client'
import type { CollectionActionsSummary } from '../../api/types'
import { formatDatetime12hDisplay } from '../../lib/datetime12h'
import { Modal } from '../Modal'
import { TextArea } from '../ui/TextArea'

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
  hideTrigger = false,
  openActions = false,
  onOpenActionsChange,
}: {
  customerId?: number
  invoiceId: number
  hasPhone: boolean
  hideTrigger?: boolean
  openActions?: boolean
  onOpenActionsChange?: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [actionsModalOpen, setActionsModalOpen] = useState(false)
  const [deviceModalOpen, setDeviceModalOpen] = useState(false)
  const [deviceNotes, setDeviceNotes] = useState('')
  const [error, setError] = useState('')

  const setModalOpen = (open: boolean) => {
    setActionsModalOpen(open)
    onOpenActionsChange?.(open)
  }

  const isActionsModalOpen = onOpenActionsChange ? openActions : actionsModalOpen

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
      void queryClient.invalidateQueries({ queryKey: ['review-collection'] })
      void queryClient.invalidateQueries({ queryKey: ['review-collections'] })
      setError('')
      setModalOpen(false)
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
      void queryClient.invalidateQueries({ queryKey: ['review-collection'] })
      void queryClient.invalidateQueries({ queryKey: ['review-collections'] })
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
      void queryClient.invalidateQueries({ queryKey: ['review-collection'] })
      void queryClient.invalidateQueries({ queryKey: ['review-collections'] })
      setError('')
      setModalOpen(false)
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const cancelWarningMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.delete<{ summary: CollectionActionsSummary }>(
        `/sales-invoices/${invoiceId}/collection-actions/whatsapp-warning`,
      )
      return data
    },
    onSuccess: (data) => {
      if (customerId) {
        queryClient.setQueryData(summaryQueryKey(customerId), data.summary)
      }
      void queryClient.invalidateQueries({ queryKey: ['review-collection'] })
      void queryClient.invalidateQueries({ queryKey: ['review-collections'] })
      setError('')
      setModalOpen(false)
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const cancelDeviceMutation = useMutation({
    mutationFn: async () => {
      if (!customerId) throw new Error('عميل غير محدد')
      const { data } = await api.delete<{ summary: CollectionActionsSummary }>(
        `/customers/${customerId}/collection-actions/device-disable-note`,
      )
      return data
    },
    onSuccess: (data) => {
      if (customerId) {
        queryClient.setQueryData(summaryQueryKey(customerId), data.summary)
      }
      void queryClient.invalidateQueries({ queryKey: ['review-collection'] })
      void queryClient.invalidateQueries({ queryKey: ['review-collections'] })
      setDeviceModalOpen(false)
      setError('')
      setModalOpen(false)
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const closeActionsModal = () => {
    setModalOpen(false)
    setError('')
  }

  if (!customerId) return null

  return (
    <>
      {error && !isActionsModalOpen && (
        <p className="mb-sm rounded border border-error/30 bg-error/5 px-sm py-xs text-xs text-error">
          {error}
        </p>
      )}

      {!hideTrigger && (
        <div className="mb-sm flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setError('')
              setModalOpen(true)
            }}
            className="rounded-lg border border-primary/40 bg-primary/5 px-sm py-1 text-xs font-medium text-primary hover:bg-primary/10"
          >
            إضافة إجراء
          </button>
        </div>
      )}

      <div className="mb-sm flex flex-wrap gap-sm text-[11px] text-on-surface-variant">
        {warning && (
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-sm py-0.5">
            تم إرسال رسالة تحذيرية · {formatDatetime12hDisplay(warning.logged_at)}
            <button
              type="button"
              disabled={cancelWarningMutation.isPending}
              onClick={() => {
                if (window.confirm('إلغاء تسجيل التحذير على هذا العقد؟ الرسالة المرسلة لن تُسحب.')) {
                  cancelWarningMutation.mutate()
                }
              }}
              className="font-medium text-error hover:underline disabled:opacity-50"
            >
              إلغاء
            </button>
          </span>
        )}
        {portalBlocked && (
          <span className="inline-flex items-center gap-1 rounded-full bg-error/10 px-sm py-0.5 text-error">
            رسيت متأخر مفعّل
            <button
              type="button"
              disabled={portalMutation.isPending}
              onClick={() => {
                if (window.confirm('إلغاء رسيت متأخر لهذا العميل؟')) {
                  portalMutation.mutate(true)
                }
              }}
              className="font-medium underline disabled:opacity-50"
            >
              إلغاء
            </button>
          </span>
        )}
        {deviceNote && (
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-sm py-0.5">
            تم تسجيل فقد إشارة الجهاز · {formatDatetime12hDisplay(deviceNote.logged_at)}
            <button
              type="button"
              disabled={cancelDeviceMutation.isPending}
              onClick={() => {
                if (window.confirm('إلغاء تسجيل فقد إشارة الجهاز؟')) {
                  cancelDeviceMutation.mutate()
                }
              }}
              className="font-medium text-error hover:underline disabled:opacity-50"
            >
              إلغاء
            </button>
          </span>
        )}
      </div>

      <Modal open={isActionsModalOpen} onClose={closeActionsModal} title="إجراءات التحصيل" size="sm">
        {error && (
          <p className="mb-sm rounded border border-error/30 bg-error/5 px-sm py-xs text-xs text-error">
            {error}
          </p>
        )}

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              if (warning) {
                if (window.confirm('إلغاء تسجيل التحذير على هذا العقد؟ الرسالة المرسلة لن تُسحب.')) {
                  cancelWarningMutation.mutate()
                }
                return
              }
              if (window.confirm('إرسال رسالة تحذيرية لهذا التعاقد؟')) {
                whatsappMutation.mutate()
              }
            }}
            disabled={(!warning && !hasPhone) || whatsappMutation.isPending || cancelWarningMutation.isPending}
            title={!warning && !hasPhone ? 'لا يوجد رقم هاتف للعميل' : undefined}
            className={`w-full rounded-lg border px-sm py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
              warning
                ? 'border-error/40 text-error hover:bg-error/5'
                : 'border-outline-variant text-primary hover:border-primary/40'
            }`}
          >
            {whatsappMutation.isPending || cancelWarningMutation.isPending
              ? 'جاري التنفيذ…'
              : warning
                ? 'إلغاء الرسالة التحذيرية'
                : 'رسالة تحذيرية'}
          </button>

          <button
            type="button"
            onClick={() => {
              setError('')
              const actionLabel = portalBlocked ? 'إلغاء رسيت متأخر' : 'تفعيل رسيت متأخر'
              if (window.confirm(`${actionLabel} لهذا العميل؟`)) {
                portalMutation.mutate(portalBlocked)
              }
            }}
            disabled={portalMutation.isPending}
            className={`w-full rounded-lg border px-sm py-2 text-sm font-medium ${
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
              if (deviceNote) {
                if (window.confirm('إلغاء تسجيل فقد إشارة الجهاز؟')) {
                  cancelDeviceMutation.mutate()
                }
                return
              }
              setModalOpen(false)
              setDeviceModalOpen(true)
            }}
            disabled={deviceMutation.isPending || cancelDeviceMutation.isPending}
            className={`w-full rounded-lg border px-sm py-2 text-sm font-medium ${
              deviceNote
                ? 'border-error/40 text-error hover:bg-error/5'
                : 'border-outline-variant hover:border-primary/40 hover:text-primary'
            }`}
          >
            {cancelDeviceMutation.isPending ? 'جاري الإلغاء…' : deviceNote ? 'إلغاء فقد اشارة الجهاز' : 'فقد اشارة الجهاز'}
          </button>
        </div>
      </Modal>

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
        <TextArea
          mode="arabic"
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
