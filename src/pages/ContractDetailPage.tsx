import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { SalesInvoice } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { ContractFollowUpTab } from '../components/contracts/ContractFollowUpTab'
import { ContractInstallmentsTab } from '../components/contracts/ContractInstallmentsTab'
import { ContractPaymentsTab } from '../components/contracts/ContractPaymentsTab'
import { ContractPrintActions } from '../components/contracts/ContractPrintActions'
import { ContractReviewDetails } from '../components/contracts/ContractReviewDetails'
import { ContractProblemWizard } from '../components/contracts/ContractProblemWizard'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'
import { StatusBadge } from '../components/StatusBadge'
import { useAuthStore } from '../stores/authStore'
import { userCanPerform, userHasPermission } from '../lib/access'
import { contractSourceLabel, fmtInvoiceContractDateTime } from '../lib/contractFields'
import { contractKindLabel } from '../lib/contractKinds'
import {
  CONTRACT_CASES_MANAGE_PERMISSION,
  canExchangeContract,
  canRejectContract,
  canReturnContract,
  canTransferContractToProblems,
  isContractEligibleForProblems,
  type ContractProblemCaseType,
} from '../lib/contractCases'
import { canEditContract, contractEditPath } from '../lib/contractEdit'
import { contractStatusLabel } from '../lib/contractStatus'
import { reviewStatusForBadge, reviewStatusLabel } from '../lib/sales'

const CONTRACT_TABS = [
  { id: 'details', label: 'التفاصيل' },
  { id: 'installments', label: 'الأقساط' },
  { id: 'payments', label: 'سجل المدفوعات' },
  { id: 'follow_up', label: 'متابعة التحصيل' },
] as const

type ContractTabId = (typeof CONTRACT_TABS)[number]['id']

function isContractTabId(value: string | null): value is ContractTabId {
  return CONTRACT_TABS.some((tab) => tab.id === value)
}

export function ContractDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canManageCases = userHasPermission(user, CONTRACT_CASES_MANAGE_PERMISSION)
  const canPrint = userHasPermission(user, 'review.print')
  const canViewFollowUpHistory = userCanPerform(user, 'installments.view')
  const [searchParams, setSearchParams] = useSearchParams()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardCaseType, setWizardCaseType] = useState<ContractProblemCaseType | null>(null)

  const visibleTabs = useMemo(
    () =>
      CONTRACT_TABS.filter(
        (tab) => tab.id !== 'follow_up' || canViewFollowUpHistory,
      ),
    [canViewFollowUpHistory],
  )

  const tabParam = searchParams.get('tab')
  const activeTab: ContractTabId =
    isContractTabId(tabParam) && visibleTabs.some((tab) => tab.id === tabParam)
      ? tabParam
      : 'details'

  const setActiveTab = (tab: ContractTabId) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (tab === 'details') next.delete('tab')
        else next.set('tab', tab)
        return next
      },
      { replace: true },
    )
  }

  useEffect(() => {
    if (searchParams.get('resume') === 'problem') {
      setWizardOpen(true)
    }
  }, [searchParams])

  const query = useQuery({
    queryKey: ['sales-invoice', 'contract-detail', id],
    queryFn: async () => {
      const { data } = await api.get<SalesInvoice>(`/sales-invoices/${id}`, {
        params: {
          include:
            'customer.guarantors,branch,distributor,salesUser,lines,lines.productUnit,lines.service,lines.technician,lines.installmentPlan.items,sourceInvoice.customer,paymentTransactions.user,paymentTransactions.installmentItem',
        },
      })
      return data
    },
    enabled: Boolean(id),
  })

  const invoice = query.data
  const canTransferToProblems = canTransferContractToProblems(user, invoice)
  const canReject = canRejectContract(user, invoice)
  const canExchange = canExchangeContract(user, invoice)
  const canReturn = canReturnContract(user, invoice)
  const showProblemsPermissionHint = !canManageCases && isContractEligibleForProblems(invoice)

  const openWizard = (caseType?: ContractProblemCaseType) => {
    setWizardCaseType(caseType ?? null)
    setWizardOpen(true)
  }

  const handleWizardComplete = () => {
    setWizardOpen(false)
    setWizardCaseType(null)
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
          {invoice && canEditContract(user, invoice) ? (
            <Link
              to={contractEditPath(invoice.id)}
              className="inline-flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-medium text-on-primary"
            >
              <Icon name="edit" size={18} />
              تعديل العقد
            </Link>
          ) : null}
          {canReject && invoice && (
            <Link
              to={`/invoices/review/${invoice.id}`}
              className="inline-flex items-center gap-xs rounded-lg border border-error px-md py-sm text-sm font-medium text-error hover:bg-error/5"
            >
              <Icon name="cancel" size={18} />
              رفض
            </Link>
          )}
          {canExchange && invoice && (
            <button
              type="button"
              onClick={() => openWizard('exchange')}
              className="inline-flex items-center gap-xs rounded-lg bg-error px-md py-sm text-sm font-medium text-on-error hover:bg-error/90"
            >
              <Icon name="swap_horiz" size={18} />
              استبدال
            </button>
          )}
          {canReturn && invoice && (
            <button
              type="button"
              onClick={() => openWizard('return')}
              className="inline-flex items-center gap-xs rounded-lg bg-error px-md py-sm text-sm font-medium text-on-error hover:bg-error/90"
            >
              <Icon name="assignment_return" size={18} />
              استرجاع
            </button>
          )}
          {canTransferToProblems && invoice && (
            <button
              type="button"
              onClick={() => openWizard()}
              className="inline-flex items-center gap-xs rounded-lg bg-error px-md py-sm text-sm font-medium text-on-error hover:bg-error/90"
            >
              <Icon name="report_problem" size={18} />
              تحويل للمشاكل
            </button>
          )}
          {showProblemsPermissionHint && (
            <span
              className="inline-flex items-center gap-xs rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm text-xs text-on-surface-variant"
              title="يتطلب صلاحية: إدارة مشاكل العقد"
            >
              <Icon name="lock" size={16} />
              تحويل للمشاكل غير متاح لحسابك
            </span>
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
            <div className="mb-md overflow-x-auto border-b border-outline-variant">
              <div className="flex min-w-max gap-xs" role="tablist" aria-label="أقسام تفاصيل العقد">
                {visibleTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`border-b-2 px-md py-sm text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'details' && <ContractReviewDetails invoice={invoice} />}
            {activeTab === 'installments' && <ContractInstallmentsTab invoice={invoice} />}
            {activeTab === 'payments' && (
              <ContractPaymentsTab invoice={invoice} active={activeTab === 'payments'} />
            )}
            {activeTab === 'follow_up' && canViewFollowUpHistory && (
              <ContractFollowUpTab invoiceId={invoice.id} active={activeTab === 'follow_up'} />
            )}
          </>
        )}
      </AsyncState>

      {invoice && (
        <ContractProblemWizard
          invoice={invoice}
          open={wizardOpen}
          initialCaseType={wizardCaseType}
          onClose={() => {
            setWizardOpen(false)
            setWizardCaseType(null)
          }}
          onComplete={handleWizardComplete}
        />
      )}
    </SalesPageShell>
  )
}
