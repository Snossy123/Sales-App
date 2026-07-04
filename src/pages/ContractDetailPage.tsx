import { Link, useParams } from 'react-router-dom'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { SalesInvoice } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { ContractPrintActions } from '../components/contracts/ContractPrintActions'
import { ContractReviewDetails } from '../components/contracts/ContractReviewDetails'
import { ContractProblemWizard } from '../components/contracts/ContractProblemWizard'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'
import { StatusBadge } from '../components/StatusBadge'
import { useAuthStore } from '../stores/authStore'
import { userHasPermission } from '../lib/access'
import { contractSourceLabel, fmtInvoiceContractDateTime } from '../lib/contractFields'
import { contractKindLabel } from '../lib/contractKinds'
import { contractStatusLabel } from '../lib/contractStatus'
import { reviewStatusForBadge, reviewStatusLabel } from '../lib/sales'

export function ContractDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canManageCases = userHasPermission(user, 'contract_cases.manage')
  const canPrint = userHasPermission(user, 'review.print')
  const [wizardOpen, setWizardOpen] = useState(false)

  const query = useQuery({
    queryKey: ['sales-invoice', 'contract-detail', id],
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

  const invoice = query.data
  const canTransferToProblems =
    canManageCases &&
    invoice?.review_status === 'approved' &&
    (!invoice.contract_status || invoice.contract_status === 'active')

  const handleWizardComplete = () => {
    setWizardOpen(false)
    queryClient.invalidateQueries({ queryKey: ['sales-invoice', 'contract-detail', id] })
    queryClient.invalidateQueries({ queryKey: ['contract-cases'] })
  }

  return (
    <SalesPageShell
      title={invoice?.customer?.name ? `تفاصيل عقد ${invoice.customer.name}` : 'تفاصيل العقد'}
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
            <StatusBadge
              status={invoice.contract_status ?? 'active'}
              label={contractStatusLabel(invoice.contract_status)}
            />
            {invoice.payment_status ? <StatusBadge status={invoice.payment_status} /> : null}
          </div>
        ) : undefined
      }
      actions={
        <div className="flex flex-wrap items-center gap-sm">
          {canTransferToProblems && invoice && (
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              className="inline-flex items-center gap-xs rounded-lg bg-error px-md py-sm text-sm font-medium text-on-error hover:bg-error/90"
            >
              <Icon name="report_problem" size={18} />
              تحويل للمشاكل
            </button>
          )}
          {invoice && canPrint && <ContractPrintActions invoice={invoice} />}
          <Link
            to={invoice?.customer_id ? `/customers/${invoice.customer_id}` : '/customers'}
            className="inline-flex items-center gap-xs rounded-lg border border-outline-variant px-md py-sm text-sm font-medium text-on-surface hover:bg-surface-container-low"
          >
            <Icon name="arrow_forward" size={18} />
            العودة للعميل
          </Link>
        </div>
      }
    >
      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {invoice && (
          <>
            {invoice.problem_reason && (
              <div className="mb-md rounded-lg border border-error/30 bg-error/5 px-md py-sm text-sm">
                <span className="font-medium text-error">سبب المشكلة: </span>
                {invoice.problem_reason}
              </div>
            )}
            <ContractReviewDetails invoice={invoice} />
          </>
        )}
      </AsyncState>

      {invoice && (
        <ContractProblemWizard
          invoice={invoice}
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          onComplete={handleWizardComplete}
        />
      )}
    </SalesPageShell>
  )
}
