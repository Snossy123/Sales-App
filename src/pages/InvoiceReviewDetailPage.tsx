import { Link, useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { SalesInvoice } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { ContractPrintActions } from '../components/contracts/ContractPrintActions'
import { ContractReviewDecisionPanel } from '../components/contracts/ContractReviewDecisionPanel'
import { ContractReviewDetails } from '../components/contracts/ContractReviewDetails'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'
import { StatusBadge } from '../components/StatusBadge'
import { useAuthStore } from '../stores/authStore'
import { getUserRole, userHasPermission } from '../lib/access'
import { contractSourceLabel, fmtInvoiceContractDateTime } from '../lib/contractFields'
import { contractKindLabel, reviewApproveLabel } from '../lib/contractKinds'
import { reviewStatusForBadge, reviewStatusLabel } from '../lib/sales'

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
            'customer.guarantors,branch,distributor,salesUser,lines,lines.productUnit,lines.service,lines.technician,lines.installmentPlan,sourceInvoice.customer',
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
      subtitle={
        invoice
          ? [
              invoice.invoice_number,
              contractKindLabel(invoice.contract_kind),
              contractSourceLabel(invoice),
              fmtInvoiceContractDateTime(invoice),
            ]
              .filter(Boolean)
              .join(' · ')
          : undefined
      }
      headerExtra={
        invoice ? (
          <div className="mt-xs flex flex-wrap gap-xs">
            <StatusBadge
              status={reviewStatusForBadge(invoice.review_status)}
              label={reviewStatusLabel(invoice.review_status)}
            />
            {invoice.payment_status ? <StatusBadge status={invoice.payment_status} /> : null}
          </div>
        ) : undefined
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
          <div className="grid grid-cols-1 items-start gap-md lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
            <ContractReviewDetails invoice={invoice} />

            <ContractReviewDecisionPanel invoice={invoice}>
              {canReview ? (
                <>
                  {canReject ? (
                    <label className="block text-xs text-on-surface-variant">
                      سبب الرفض (اختياري)
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="مثال: بيانات غير مكتملة"
                        className="mt-xs w-full rounded-lg border border-outline-variant px-sm py-2 text-sm"
                      />
                    </label>
                  ) : null}

                  {mutationError ? (
                    <p className="text-sm text-error">{mutationError}</p>
                  ) : null}

                  {canApprove ? (
                    <button
                      type="button"
                      onClick={() => approveMutation.mutate(invoiceId)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="flex w-full items-center justify-center gap-xs rounded-lg bg-secondary px-md py-3 text-sm font-bold text-on-secondary disabled:opacity-60"
                    >
                      <Icon name="check_circle" size={20} />
                      {reviewApproveLabel(invoice.contract_kind)}
                    </button>
                  ) : null}

                  {canPrint ? <ContractPrintActions invoice={invoice} autoPrint /> : null}

                  {canReject ? (
                    <button
                      type="button"
                      onClick={() =>
                        rejectMutation.mutate({
                          invoiceId,
                          reason: rejectReason || 'مرفوضة من قسم المراجعة',
                        })
                      }
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="flex w-full items-center justify-center gap-xs rounded-lg border border-error px-md py-3 text-sm font-bold text-error disabled:opacity-60"
                    >
                      <Icon name="cancel" size={20} />
                      رفض العقد
                    </button>
                  ) : null}
                </>
              ) : (
                <p className="text-center text-sm text-on-surface-variant">
                  هذه الفاتورة ليست بانتظار المراجعة.
                </p>
              )}
            </ContractReviewDecisionPanel>
          </div>
        )}
      </AsyncState>
    </SalesPageShell>
  )
}
