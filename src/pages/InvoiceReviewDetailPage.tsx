import { Link, useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { SalesInvoice } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { ContractReviewDetails } from '../components/contracts/ContractReviewDetails'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'
import { useAuthStore } from '../stores/authStore'
import { getUserRole, userHasPermission } from '../lib/access'
import { contractPrintPath } from '../lib/sales'

export function InvoiceReviewDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [rejectReason, setRejectReason] = useState('')
  const user = useAuthStore((s) => s.user)
  const reviewRole = ['super_admin', 'admin', 'reviewer'].includes(getUserRole(user))
  const canApprove = userHasPermission(user, 'review.approve') || reviewRole
  const canReject = userHasPermission(user, 'review.reject') || reviewRole
  const canPrint = userHasPermission(user, 'review.print') || reviewRole

  const query = useQuery({
    queryKey: ['sales-invoice', 'review', id],
    queryFn: async () => {
      const { data } = await api.get<SalesInvoice>(`/sales-invoices/${id}`, {
        params: {
          include:
            'customer.guarantors,branch,distributor,salesUser,lines,lines.productUnit,lines.service,lines.technician,lines.installmentPlan',
        },
      })
      return data
    },
    enabled: Boolean(id),
  })

  const approveMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const { data } = await api.post<SalesInvoice>(`/sales-invoices/${invoiceId}/approve`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      queryClient.invalidateQueries({ queryKey: ['gps-stock'] })
      navigate('/invoices/review')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ invoiceId, reason }: { invoiceId: number; reason: string }) => {
      const { data } = await api.post<SalesInvoice>(`/sales-invoices/${invoiceId}/reject`, { reason })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['gps-stock'] })
      navigate('/invoices/review')
    },
  })

  const mutationError = approveMutation.isError || rejectMutation.isError
    ? getErrorMessage(approveMutation.error ?? rejectMutation.error)
    : undefined

  const invoice = query.data
  const invoiceId = Number(id)
  const canReview = invoice?.review_status === 'pending' && (canApprove || canReject || canPrint)

  return (
    <SalesPageShell
      title={
        invoice?.customer?.name
          ? `مراجعة عقد ${invoice.customer.name}`
          : 'مراجعة العقد'
      }
      actions={
        <Link
          to="/invoices/review"
          className="inline-flex items-center gap-xs rounded-lg border border-outline-variant px-md py-sm text-sm font-medium text-on-surface hover:bg-surface-container-low"
        >
          <Icon name="arrow_forward" size={18} />
          رجوع للقائمة
        </Link>
      }
    >
      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {invoice && (
          <div className="w-full space-y-md">
            <ContractReviewDetails invoice={invoice} />

            {canReview && (
              <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
                <label className="mb-xs block text-xs text-on-surface-variant">
                  سبب الرفض (اختياري)
                </label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="مثال: بيانات غير مكتملة"
                  className="mb-md w-full rounded border border-outline-variant px-sm py-2 text-sm"
                />

                {mutationError && <p className="mb-md text-sm text-error">{mutationError}</p>}

                <div className="grid grid-cols-3 gap-2 sm:gap-sm">
                  {canPrint && (
                    <Link
                      to={contractPrintPath(invoice.id, { autoPrint: true })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-w-0 items-center justify-center gap-1 rounded-lg border border-primary px-2 py-2.5 text-xs font-bold text-primary hover:bg-primary/5 sm:gap-xs sm:px-md sm:py-sm sm:text-sm"
                    >
                      <Icon name="print" size={18} className="shrink-0" />
                      <span className="truncate">طباعة العقد</span>
                    </Link>
                  )}
                  {canApprove && (
                    <button
                      type="button"
                      onClick={() => approveMutation.mutate(invoiceId)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="inline-flex min-w-0 items-center justify-center gap-1 rounded-lg bg-secondary px-2 py-2.5 text-xs font-bold text-on-secondary disabled:opacity-60 sm:gap-xs sm:px-md sm:py-sm sm:text-sm"
                    >
                      <Icon name="check_circle" size={18} className="shrink-0" />
                      <span className="truncate sm:hidden">اعتماد</span>
                      <span className="hidden truncate sm:inline">تأكيد وإرسال الأقساط</span>
                    </button>
                  )}
                  {canReject && (
                    <button
                      type="button"
                      onClick={() =>
                        rejectMutation.mutate({
                          invoiceId,
                          reason: rejectReason || 'مرفوضة من قسم المراجعة',
                        })
                      }
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="inline-flex min-w-0 items-center justify-center gap-1 rounded-lg border border-error px-2 py-2.5 text-xs font-bold text-error disabled:opacity-60 sm:gap-xs sm:px-md sm:py-sm sm:text-sm"
                    >
                      <Icon name="cancel" size={18} className="shrink-0" />
                      <span className="truncate">رفض</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {!canReview && (
              <div className="rounded-xl border border-outline-variant bg-surface-container-low p-md text-center text-sm text-on-surface-variant">
                هذه الفاتورة ليست بانتظار المراجعة.
                <Link to="/invoices/review" className="mr-xs text-primary hover:underline">
                  العودة للقائمة
                </Link>
              </div>
            )}
          </div>
        )}
      </AsyncState>
    </SalesPageShell>
  )
}
