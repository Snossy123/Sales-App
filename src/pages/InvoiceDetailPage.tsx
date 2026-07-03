import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
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
import { contractKindLabel } from '../lib/contractKinds'
import { reviewStatusForBadge, reviewStatusLabel } from '../lib/sales'

const CONTRACT_DETAIL_INCLUDES =
  'customer.guarantors,branch,distributor,salesUser,lines,lines.productUnit,lines.service,lines.technician,lines.installmentPlan'

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const reviewRole = ['super_admin', 'admin', 'reviewer'].includes(getUserRole(user))
  const canPrint = userHasPermission(user, 'review.print') || reviewRole

  const query = useQuery({
    queryKey: ['sales-invoice', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get<SalesInvoice>(`/sales-invoices/${id}`, {
        params: { include: CONTRACT_DETAIL_INCLUDES },
      })
      return data
    },
    enabled: Boolean(id),
  })

  const invoice = query.data

  return (
    <SalesPageShell
      title={
        invoice?.customer?.name
          ? `تفاصيل عقد ${invoice.customer.name}`
          : 'تفاصيل العقد'
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
          to="/invoices"
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
              {canPrint ? <ContractPrintActions invoice={invoice} autoPrint /> : null}
            </ContractReviewDecisionPanel>
          </div>
        )}
      </AsyncState>
    </SalesPageShell>
  )
}
