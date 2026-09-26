import { useCallback, useMemo, useState } from 'react'
import type { Customer } from '../../../api/types'
import { useProcedureDraft } from '../../../hooks/useProcedureDraft'
import { resolveCustomerTransactionSource } from '../../../lib/posCustomerSource'
import {
  PROCEDURE_DRAFT_IDS,
  readProcedureDraft,
  useProcedureDraftStore,
} from '../../../stores/procedureDraftStore'
import { useAuthStore } from '../../../stores/authStore'
import type { TransactionSource } from '../../../components/pos/PosContractHeader'
import {
  emptyPosFlowDraft,
  isPosFlowDraftMeaningful,
  normalizePosFlowAction,
  normalizePosFlowStep,
  type PosFlowDraft,
  type PosFlowStepId,
} from './posFlowTypes'

const STEP_ORDER: PosFlowStepId[] = ['intake', 'action', 'details', 'review']

export function usePosFlowState() {
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const saved = readProcedureDraft<PosFlowDraft>(PROCEDURE_DRAFT_IDS.posFlow, userId)
  const [draft, setDraft] = useState<PosFlowDraft>(() => ({
    ...emptyPosFlowDraft(),
    ...saved,
    step: normalizePosFlowStep(saved?.step),
    action: normalizePosFlowAction(saved?.action),
  }))

  const snapshot = useMemo(() => draft, [draft])

  useProcedureDraft({
    id: PROCEDURE_DRAFT_IDS.posFlow,
    userId,
    titleAr: 'تعاقد تجريبي',
    resumePath: '/pos/flow',
    snapshot,
    isMeaningful: isPosFlowDraftMeaningful(draft),
  })

  const patch = useCallback((partial: Partial<PosFlowDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }))
  }, [])

  const confirmCustomer = useCallback((customer: Customer) => {
    const resolved = resolveCustomerTransactionSource(customer)
    setDraft((prev) => ({
      ...prev,
      selectedCustomer: customer,
      customerSearch: customer.name,
      customerConfirmed: true,
      transactionSource: resolved.source,
      selectedBranch: resolved.branch,
      selectedDistributor: resolved.distributor,
      selectedSalesRep: resolved.salesRep,
      branchSearch: resolved.branchSearch,
      distributorSearch: resolved.distributorSearch,
      salesRepSearch: resolved.salesRepSearch,
      selectedCustomerDevice: null,
      renewalManualDevice: false,
      renewalSerial: '',
      renewalSim: '',
      renewalUsername: '',
      sourceRenewalCandidate: null,
      sourceTransferInvoice: null,
      sourceTransferDevice: null,
      feeLines: [],
      distributorBalanceAmount: 0,
    }))
  }, [])

  const clearCustomer = useCallback(() => {
    setDraft((prev) => ({
      ...prev,
      selectedCustomer: null,
      customerConfirmed: false,
      customerSearch: '',
      selectedCustomerDevice: null,
      renewalManualDevice: false,
      renewalSerial: '',
      renewalSim: '',
      renewalUsername: '',
      sourceRenewalCandidate: null,
      sourceTransferInvoice: null,
      sourceTransferDevice: null,
      feeLines: [],
    }))
  }, [])

  const changeSource = useCallback((source: TransactionSource) => {
    setDraft((prev) => ({
      ...prev,
      transactionSource: source,
      selectedBranch: source === 'branch' ? prev.selectedBranch : null,
      selectedDistributor: source === 'distributor' ? prev.selectedDistributor : null,
      selectedSalesRep: source === 'sales' ? prev.selectedSalesRep : null,
      branchSearch: source === 'branch' ? prev.branchSearch : '',
      distributorSearch: source === 'distributor' ? prev.distributorSearch : '',
      salesRepSearch: source === 'sales' ? prev.salesRepSearch : '',
    }))
  }, [])

  const goTo = useCallback((step: PosFlowStepId) => {
    setDraft((prev) => ({ ...prev, step }))
  }, [])

  const stepIndex = STEP_ORDER.indexOf(draft.step)

  const goNext = useCallback(() => {
    const next = STEP_ORDER[stepIndex + 1]
    if (next) setDraft((prev) => ({ ...prev, step: next }))
  }, [stepIndex])

  const goBack = useCallback(() => {
    const prevStep = STEP_ORDER[stepIndex - 1]
    if (prevStep) setDraft((prev) => ({ ...prev, step: prevStep }))
  }, [stepIndex])

  const reset = useCallback(() => {
    useProcedureDraftStore.getState().clearDraft(PROCEDURE_DRAFT_IDS.posFlow, userId)
    setDraft(emptyPosFlowDraft())
  }, [userId])

  return {
    draft,
    patch,
    confirmCustomer,
    clearCustomer,
    changeSource,
    goTo,
    goNext,
    goBack,
    reset,
    stepIndex,
    canGoBack: stepIndex > 0,
  }
}
