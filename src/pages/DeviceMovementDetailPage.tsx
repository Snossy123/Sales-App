import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { DeviceMovement } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { SalesPageShell } from '../components/SalesPageShell'
import { StatusBadge } from '../components/StatusBadge'
import { ToastBanner } from '../components/ToastBanner'
import { useAuthStore } from '../stores/authStore'

const STATUS_LABELS: Record<string, string> = {
  pending: 'بانتظار التأكيد',
  confirmed: 'مؤكّدة',
  rejected: 'مرفوضة',
  cancelled: 'ملغاة',
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function warehouseLabel(warehouse?: DeviceMovement['from_warehouse']): string {
  if (!warehouse) return '—'
  const branch = warehouse.branch?.name_ar || warehouse.branch?.name
  const name = warehouse.name_ar || warehouse.name
  return branch ? `${name} (${branch})` : name
}

export function DeviceMovementDetailPage() {
  const { id } = useParams()
  const movementId = Number(id)
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [toast, setToast] = useState('')

  const query = useQuery({
    queryKey: ['device-movements', movementId],
    queryFn: async () => {
      const { data } = await api.get<DeviceMovement>(`/device-movements/${movementId}`)
      return data
    },
    enabled: Number.isFinite(movementId) && movementId > 0,
  })

  const movement = query.data
  const isRecipient = movement?.recipient_user_id === userId
  const isSender = movement?.sender_user_id === userId
  const canConfirm = movement?.status === 'pending' && isRecipient
  const canCancel = movement?.status === 'pending' && isSender

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['device-movements'] })
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<DeviceMovement>(`/device-movements/${movementId}/confirm`)
      return data
    },
    onSuccess: () => {
      invalidate()
      setToast('تم تأكيد استلام الأجهزة')
      query.refetch()
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<DeviceMovement>(`/device-movements/${movementId}/reject`, {
        rejection_reason: rejectReason.trim() || undefined,
      })
      return data
    },
    onSuccess: () => {
      invalidate()
      setToast('تم رفض الحركة')
      setShowReject(false)
      query.refetch()
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<DeviceMovement>(`/device-movements/${movementId}/cancel`)
      return data
    },
    onSuccess: () => {
      invalidate()
      setToast('تم إلغاء الحركة')
      query.refetch()
    },
  })

  const actionError =
    confirmMutation.error ?? rejectMutation.error ?? cancelMutation.error

  return (
    <SalesPageShell
      title={`حركة ${movement?.movement_number ?? `#${movementId}`}`}
      subtitle="تفاصيل حركة الأجهزة"
      actions={
        <Link to="/inventory/movements" className="text-sm text-primary hover:underline">
          ← العودة للقائمة
        </Link>
      }
    >
      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error ?? actionError}>
        {movement && (
          <div className="space-y-md">
            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
              <div className="mb-md flex flex-wrap items-center justify-between gap-sm">
                <h2 className="text-lg font-semibold text-on-surface">{movement.movement_number}</h2>
                <StatusBadge
                  status={movement.status === 'pending' ? 'pending' : movement.status === 'confirmed' ? 'paid' : 'overdue'}
                  label={STATUS_LABELS[movement.status] ?? movement.status}
                />
              </div>

              <dl className="grid gap-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-on-surface-variant">من</dt>
                  <dd className="font-medium">{warehouseLabel(movement.from_warehouse)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-on-surface-variant">إلى</dt>
                  <dd className="font-medium">{warehouseLabel(movement.to_warehouse)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-on-surface-variant">المرسل</dt>
                  <dd>{movement.sender?.name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-on-surface-variant">المستلم</dt>
                  <dd>{movement.recipient?.name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-on-surface-variant">تاريخ الإرسال</dt>
                  <dd>{formatDateTime(movement.created_at)}</dd>
                </div>
                {movement.confirmed_at && (
                  <div>
                    <dt className="text-xs text-on-surface-variant">تاريخ التأكيد</dt>
                    <dd>{formatDateTime(movement.confirmed_at)}</dd>
                  </div>
                )}
                {movement.rejected_at && (
                  <div>
                    <dt className="text-xs text-on-surface-variant">تاريخ الرفض</dt>
                    <dd>{formatDateTime(movement.rejected_at)}</dd>
                  </div>
                )}
                {movement.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-on-surface-variant">ملاحظات</dt>
                    <dd>{movement.notes}</dd>
                  </div>
                )}
                {movement.rejection_reason && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-on-surface-variant">سبب الرفض</dt>
                    <dd>{movement.rejection_reason}</dd>
                  </div>
                )}
              </dl>
            </section>

            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
              <h3 className="mb-sm text-sm font-bold text-on-surface">الأجهزة ({movement.lines?.length ?? 0})</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/60 text-xs text-on-surface-variant">
                      <th className="px-sm py-2 text-start">السريال / IMEI</th>
                      <th className="px-sm py-2 text-start">الموديل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(movement.lines ?? []).map((line) => (
                      <tr key={line.id} className="border-b border-outline-variant/40">
                        <td className="px-sm py-2 tabular-nums">
                          {line.product_unit?.serial_number ?? line.product_unit?.imei ?? `#${line.product_unit_id}`}
                        </td>
                        <td className="px-sm py-2">
                          {line.product_unit?.product_model?.name_ar ??
                            line.product_unit?.product_model?.name ??
                            '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {canConfirm && (
              <section className="rounded-xl border border-primary/30 bg-primary/5 p-md">
                <h3 className="mb-sm font-semibold text-on-surface">تأكيد الاستلام</h3>
                <p className="mb-md text-sm text-on-surface-variant">
                  هذه الحركة مرسلة إليك — يرجى تأكيد استلام الأجهزة أو رفض الحركة.
                </p>
                <div className="flex flex-wrap gap-sm">
                  <button
                    type="button"
                    disabled={confirmMutation.isPending}
                    onClick={() => confirmMutation.mutate()}
                    className="rounded-lg bg-primary px-md py-sm text-sm font-medium text-on-primary hover:bg-primary/90 disabled:opacity-60"
                  >
                    {confirmMutation.isPending ? 'جاري التأكيد…' : 'تأكيد الاستلام'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReject((v) => !v)}
                    className="rounded-lg border border-outline-variant px-md py-sm text-sm font-medium text-on-surface hover:border-error/40 hover:text-error"
                  >
                    رفض
                  </button>
                </div>
                {showReject && (
                  <div className="mt-md space-y-sm">
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="سبب الرفض (اختياري)"
                      rows={2}
                      className="w-full rounded-lg border border-outline-variant px-sm py-2 text-sm"
                    />
                    <button
                      type="button"
                      disabled={rejectMutation.isPending}
                      onClick={() => rejectMutation.mutate()}
                      className="rounded-lg bg-error px-md py-sm text-sm font-medium text-on-error hover:opacity-90 disabled:opacity-60"
                    >
                      {rejectMutation.isPending ? 'جاري الرفض…' : 'تأكيد الرفض'}
                    </button>
                  </div>
                )}
                {actionError && (
                  <p className="mt-sm text-sm text-error">{getErrorMessage(actionError)}</p>
                )}
              </section>
            )}

            {canCancel && (
              <section className="rounded-xl border border-outline-variant bg-surface-container-low p-md">
                <button
                  type="button"
                  disabled={cancelMutation.isPending}
                  onClick={() => {
                    if (window.confirm('إلغاء الحركة وإرجاع الأجهزة لمخزن المصدر؟')) {
                      cancelMutation.mutate()
                    }
                  }}
                  className="text-sm text-error hover:underline disabled:opacity-60"
                >
                  إلغاء الحركة
                </button>
              </section>
            )}
          </div>
        )}
      </AsyncState>
    </SalesPageShell>
  )
}
