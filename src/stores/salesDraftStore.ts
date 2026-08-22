import type {
  Branch,
  ContractKind,
  Customer,
  CustomerContractDevice,
  Distributor,
  Employee,
  SalesInvoice,
  SalesRep,
  SubscriptionRenewalCandidate,
} from '../api/types'
import type { DeviceLineDraft } from '../components/pos/DeviceLineCard'
import type { TransactionSource } from '../components/pos/PosContractHeader'
import type { ServiceLineDraft } from '../components/services/ServiceLineCard'
import type { ServicePaymentState } from '../components/services/ServicePaymentSection'
import type { CombinerChipId } from '../lib/serviceCombiner'
import { PROCEDURE_DRAFT_IDS, readProcedureDraft } from './procedureDraftStore'

export interface DeviceContractDraft {
  contractKind: ContractKind
  sourceTransferInvoice: SalesInvoice | null
  sourceRenewalCandidate: SubscriptionRenewalCandidate | null
  transactionSource: TransactionSource
  branchSearch: string
  selectedBranch: Branch | null
  distributorSearch: string
  selectedDistributor: Distributor | null
  salesRepSearch: string
  selectedSalesRep: SalesRep | null
  customerSearch: string
  selectedCustomer: Customer | null
  quantity: number
  deviceLines: DeviceLineDraft[]
  applyInstallationFee: boolean
  installationFee: number
  applyTransportationFee: boolean
  transportationFee: number
  feeDiscountAmount: number
  feeDiscountPercent: number
  contractDate: string
  selectedPromotionId: number | ''
  distributorBalanceAmount: number
}

export interface ServiceContractDraft {
  selectedChips: CombinerChipId[]
  transactionSource: TransactionSource
  branchSearch: string
  selectedBranch: Branch | null
  distributorSearch: string
  selectedDistributor: Distributor | null
  salesRepSearch: string
  selectedSalesRep: SalesRep | null
  customerSearch: string
  selectedCustomer: Customer | null
  contractDate: string
  notes: string
  selectedCustomerDevice: CustomerContractDevice | null
  manualDeviceEntry: boolean
  contractSerial: string
  contractSim: string
  contractUsername: string
  renewalLine: DeviceLineDraft | null
  externalLine: DeviceLineDraft | null
  feeLines: Record<string, ServiceLineDraft>
  distributorBalanceAmount: number
  collectionScope: 'contract' | 'service'
  contractPayment: ServicePaymentState
  feeTechnician: Employee | null
  technicianSearch: string
}

export interface AccessoriesCartLine {
  key: string
  line_type: 'accessory' | 'package'
  product_model_id?: number
  accessory_package_id?: number
  name: string
  quantity: number
  unit_price: number
}

export interface AccessoriesDraft {
  customerSearch: string
  selectedCustomer: Customer | null
  branchId: number | ''
  warehouseId: number | ''
  cart: AccessoriesCartLine[]
  notes: string
}

export function readDeviceDraft(userId: number | null, isEditMode = false): DeviceContractDraft | null {
  if (isEditMode) return null
  return readProcedureDraft<DeviceContractDraft>(PROCEDURE_DRAFT_IDS.posDevice, userId)
}

export function readServiceDraft(userId: number | null): ServiceContractDraft | null {
  return readProcedureDraft<ServiceContractDraft>(PROCEDURE_DRAFT_IDS.posService, userId)
}

export function readAccessoriesDraft(userId: number | null): AccessoriesDraft | null {
  return readProcedureDraft<AccessoriesDraft>(PROCEDURE_DRAFT_IDS.accessories, userId)
}
