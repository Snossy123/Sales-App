import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
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

const DRAFT_STORAGE_KEY = 'sales-form-drafts'

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

interface PersistedDrafts {
  userId: number | null
  deviceContract: DeviceContractDraft | null
  serviceContract: ServiceContractDraft | null
  accessories: AccessoriesDraft | null
}

function applyForUser(
  current: PersistedDrafts,
  userId: number | null,
  patch: Partial<PersistedDrafts>,
): PersistedDrafts {
  if (current.userId != null && current.userId !== userId) {
    return {
      userId,
      deviceContract: null,
      serviceContract: null,
      accessories: null,
      ...patch,
    }
  }
  return { ...current, userId, ...patch }
}

interface SalesDraftState extends PersistedDrafts {
  setDeviceDraft: (userId: number | null, draft: DeviceContractDraft | null) => void
  setServiceDraft: (userId: number | null, draft: ServiceContractDraft | null) => void
  setAccessoriesDraft: (userId: number | null, draft: AccessoriesDraft | null) => void
  clearDeviceDraft: () => void
  clearServiceDraft: () => void
  clearAccessoriesDraft: () => void
}

function readPersistedDrafts(): PersistedDrafts | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { state?: PersistedDrafts }
    return parsed.state ?? null
  } catch {
    return null
  }
}

function draftForCurrentUser(userId: number | null): PersistedDrafts | null {
  const persisted = readPersistedDrafts()
  if (!persisted || persisted.userId !== userId) return null
  return persisted
}

export function readDeviceDraft(userId: number | null, isEditMode = false): DeviceContractDraft | null {
  if (isEditMode) return null
  return draftForCurrentUser(userId)?.deviceContract ?? null
}

export function readServiceDraft(userId: number | null): ServiceContractDraft | null {
  return draftForCurrentUser(userId)?.serviceContract ?? null
}

export function readAccessoriesDraft(userId: number | null): AccessoriesDraft | null {
  return draftForCurrentUser(userId)?.accessories ?? null
}

export const useSalesDraftStore = create<SalesDraftState>()(
  persist(
    (set) => ({
      userId: null,
      deviceContract: null,
      serviceContract: null,
      accessories: null,

      setDeviceDraft: (userId, deviceContract) =>
        set((state) => applyForUser(state, userId, { deviceContract })),
      setServiceDraft: (userId, serviceContract) =>
        set((state) => applyForUser(state, userId, { serviceContract })),
      setAccessoriesDraft: (userId, accessories) =>
        set((state) => applyForUser(state, userId, { accessories })),
      clearDeviceDraft: () => set({ deviceContract: null }),
      clearServiceDraft: () => set({ serviceContract: null }),
      clearAccessoriesDraft: () => set({ accessories: null }),
    }),
    {
      name: DRAFT_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        userId: state.userId,
        deviceContract: state.deviceContract,
        serviceContract: state.serviceContract,
        accessories: state.accessories,
      }),
    },
  ),
)
