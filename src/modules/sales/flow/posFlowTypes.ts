import type {
  Branch,
  Customer,
  CustomerContractDevice,
  Distributor,
  Employee,
  SalesInvoice,
  SalesRep,
  SubscriptionRenewalCandidate,
} from '../../../api/types'
import type { TransactionSource } from '../../../components/pos/PosContractHeader'
import type { DeviceLineDraft } from '../../../components/pos/DeviceLineCard'
import type { ServicePaymentState } from '../../../components/services/ServicePaymentSection'
import type { FeeLineInstance } from '../../../lib/serviceCombiner'
import { distributorLabel } from '../../../lib/sales'

export const POS_FLOW_STEPS = [
  { id: 'intake', label: 'بيانات التعاقد' },
  { id: 'action', label: 'نوع العملية' },
  { id: 'details', label: 'التفاصيل' },
  { id: 'review', label: 'المراجعة' },
] as const

export type PosFlowStepId = (typeof POS_FLOW_STEPS)[number]['id']

export type PosFlowAction =
  | 'new_device'
  | 'external_device'
  | 'renewal'
  | 'ownership_transfer'
  | 'catalog'

export const POS_FLOW_ACTIONS: {
  id: PosFlowAction
  label: string
  description: string
  icon: string
}[] = [
  {
    id: 'new_device',
    label: 'جهاز جديد',
    description: 'بيع جهاز GPS من مخزون الشركة مع كاش أو تقسيط',
    icon: 'sensors',
  },
  {
    id: 'renewal',
    label: 'تجديد اشتراك',
    description: 'تجديد سنوي أو مدى الحياة لجهاز موجود',
    icon: 'autorenew',
  },
  {
    id: 'ownership_transfer',
    label: 'نقل ملكية',
    description: 'نقل الجهاز والأقساط المتبقية لمالك جديد',
    icon: 'swap_horiz',
  },
  {
    id: 'catalog',
    label: 'خدمات وإكسسوارات',
    description: 'فك أو تركيب أو برمجة أو بيع قطعة من المخزن',
    icon: 'home_repair_service',
  },
]

export type PosFlowAccessoryLine =
  | {
      key: string
      line_type: 'accessory'
      product_model_id: number
      name: string
      quantity: number
      unit_price: number
    }
  | {
      key: string
      line_type: 'package'
      accessory_package_id: number
      name: string
      quantity: number
      unit_price: number
    }

export interface PosFlowDraft {
  step: PosFlowStepId
  customerSearch: string
  selectedCustomer: Customer | null
  customerConfirmed: boolean
  transactionSource: TransactionSource
  branchSearch: string
  selectedBranch: Branch | null
  distributorSearch: string
  selectedDistributor: Distributor | null
  salesRepSearch: string
  selectedSalesRep: SalesRep | null
  contractDate: string
  notes: string
  action: PosFlowAction | null
  quantity: number
  activeDeviceIndex: number
  deviceLines: DeviceLineDraft[]
  applyInstallationFee: boolean
  installationFee: number
  applyTransportationFee: boolean
  transportationFee: number
  feeDiscountAmount: number
  feeDiscountPercent: number
  selectedPromotionId: number | ''
  distributorBalanceAmount: number
  selectedCustomerDevice: CustomerContractDevice | null
  serviceSerial: string
  renewalManualDevice: boolean
  renewalSerial: string
  renewalSim: string
  renewalUsername: string
  sourceRenewalCandidate: SubscriptionRenewalCandidate | null
  sourceTransferInvoice: SalesInvoice | null
  sourceTransferDevice: CustomerContractDevice | null
  transferIncludeDisassemblyAndAssembly?: boolean
  transferPaymentTerm?: 'cash' | 'installment'
  transferDownPayment?: number
  transferInstallmentCount?: number
  transferIntervalType?: 'monthly' | 'weekly'
  transferFirstDueDate?: string
  /** Resolved fee amounts from active services — stored to drive flowTotals */
  transferOwnershipFeeAmount?: number
  transferUninstallFeeAmount?: number
  transferInstallationFeeAmount?: number
  feeLines: FeeLineInstance[]
  feeTechnician: Employee | null
  contractPayment: ServicePaymentState
  accessoryCart: PosFlowAccessoryLine[]
}

export interface PosFlowSuccess {
  invoice: SalesInvoice
  message: string
}

export function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

export function emptyPosFlowDraft(): PosFlowDraft {
  return {
    step: 'intake',
    customerSearch: '',
    selectedCustomer: null,
    customerConfirmed: false,
    transactionSource: 'branch',
    branchSearch: '',
    selectedBranch: null,
    distributorSearch: '',
    selectedDistributor: null,
    salesRepSearch: '',
    selectedSalesRep: null,
    contractDate: todayIso(),
    notes: '',
    action: null,
    quantity: 1,
    activeDeviceIndex: 0,
    deviceLines: [],
    applyInstallationFee: true,
    installationFee: 0,
    applyTransportationFee: false,
    transportationFee: 0,
    feeDiscountAmount: 0,
    feeDiscountPercent: 0,
    selectedPromotionId: '',
    distributorBalanceAmount: 0,
    selectedCustomerDevice: null,
    serviceSerial: '',
    renewalManualDevice: false,
    renewalSerial: '',
    renewalSim: '',
    renewalUsername: '',
    sourceRenewalCandidate: null,
    sourceTransferInvoice: null,
    sourceTransferDevice: null,
    transferIncludeDisassemblyAndAssembly: false,
    transferPaymentTerm: 'cash',
    transferDownPayment: 0,
    transferInstallmentCount: 1,
    transferIntervalType: 'monthly',
    transferFirstDueDate: todayIso(),
    feeLines: [],
    feeTechnician: null,
    contractPayment: {
      paymentTerm: 'cash',
      downPayment: 0,
      installmentAmount: 0,
      intervalType: 'monthly',
      firstDueDate: todayIso(),
    },
    accessoryCart: [],
  }
}

export function isPosFlowDraftMeaningful(draft: PosFlowDraft): boolean {
  return Boolean(
    draft.selectedCustomer ||
      draft.customerSearch.trim() ||
      draft.selectedBranch ||
      draft.selectedDistributor ||
      draft.selectedSalesRep ||
      draft.action ||
      draft.deviceLines.length > 0 ||
      draft.feeLines.length > 0 ||
      draft.accessoryCart.length > 0 ||
      draft.notes.trim(),
  )
}

export function posFlowActionLabel(action: PosFlowAction | null): string {
  return POS_FLOW_ACTIONS.find((item) => item.id === action)?.label ?? '—'
}

export function normalizePosFlowAction(action: string | null | undefined): PosFlowAction | null {
  if (action === 'service' || action === 'accessory') return 'catalog'
  if (
    action === 'new_device' ||
    action === 'external_device' ||
    action === 'renewal' ||
    action === 'ownership_transfer' ||
    action === 'catalog'
  ) {
    return action
  }
  return null
}

export function normalizePosFlowStep(step: string | undefined): PosFlowStepId {
  if (step === 'customer' || step === 'source' || step === 'basics' || step === 'intake') {
    return 'intake'
  }
  if (step === 'action' || step === 'details' || step === 'review') return step
  return 'intake'
}

export function posFlowSourceLabel(draft: PosFlowDraft): string {
  if (draft.transactionSource === 'branch') {
    return draft.selectedBranch?.name_ar || draft.selectedBranch?.name || 'فرع'
  }
  if (draft.transactionSource === 'distributor') {
    return draft.selectedDistributor ? distributorLabel(draft.selectedDistributor) : 'موزع'
  }
  return draft.selectedSalesRep?.name || 'موظف'
}
