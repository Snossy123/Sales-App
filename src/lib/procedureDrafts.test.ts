import { describe, expect, it } from 'vitest'
import type {
  AccessoriesDraft,
  DeviceContractDraft,
  ServiceContractDraft,
} from '../stores/salesDraftStore'
import {
  isAccessoriesDraftMeaningful,
  isDeviceContractDraftMeaningful,
  isServiceContractDraftMeaningful,
} from './procedureDrafts'

function emptyDeviceDraft(overrides: Partial<DeviceContractDraft> = {}): DeviceContractDraft {
  return {
    contractKind: 'new_contract',
    sourceTransferInvoice: null,
    sourceRenewalCandidate: null,
    transactionSource: 'branch',
    branchSearch: '',
    selectedBranch: null,
    distributorSearch: '',
    selectedDistributor: null,
    salesRepSearch: '',
    selectedSalesRep: null,
    customerSearch: '',
    selectedCustomer: null,
    quantity: 1,
    deviceLines: [],
    applyInstallationFee: false,
    installationFee: 0,
    applyTransportationFee: false,
    transportationFee: 0,
    feeDiscountAmount: 0,
    feeDiscountPercent: 0,
    contractDate: '',
    selectedPromotionId: '',
    distributorBalanceAmount: 0,
    ...overrides,
  }
}

function emptyServiceDraft(overrides: Partial<ServiceContractDraft> = {}): ServiceContractDraft {
  return {
    selectedChips: [],
    transactionSource: 'branch',
    branchSearch: '',
    selectedBranch: null,
    distributorSearch: '',
    selectedDistributor: null,
    salesRepSearch: '',
    selectedSalesRep: null,
    customerSearch: '',
    selectedCustomer: null,
    contractDate: '',
    notes: '',
    selectedCustomerDevice: null,
    manualDeviceEntry: false,
    contractSerial: '',
    contractSim: '',
    contractUsername: '',
    renewalLine: null,
    externalLine: null,
    feeLines: [],
    distributorBalanceAmount: 0,
    collectionScope: 'contract',
    contractPayment: {
      paymentTerm: 'cash',
      downPayment: 0,
      installmentAmount: 0,
      intervalType: 'monthly',
      firstDueDate: '',
    },
    feeTechnician: null,
    technicianSearch: '',
    ...overrides,
  }
}

function emptyAccessoriesDraft(overrides: Partial<AccessoriesDraft> = {}): AccessoriesDraft {
  return {
    customerSearch: '',
    selectedCustomer: null,
    branchId: '',
    warehouseId: '',
    cart: [],
    notes: '',
    ...overrides,
  }
}

describe('procedureDrafts', () => {
  it('treats empty POS drafts as not meaningful', () => {
    expect(isDeviceContractDraftMeaningful(emptyDeviceDraft())).toBe(false)
    expect(isServiceContractDraftMeaningful(emptyServiceDraft())).toBe(false)
    expect(isAccessoriesDraftMeaningful(emptyAccessoriesDraft())).toBe(false)
  })

  it('marks a device draft meaningful when the customer, lines, or kind change', () => {
    expect(
      isDeviceContractDraftMeaningful(
        emptyDeviceDraft({ selectedCustomer: { id: 1 } as DeviceContractDraft['selectedCustomer'] }),
      ),
    ).toBe(true)
    expect(
      isDeviceContractDraftMeaningful(
        emptyDeviceDraft({ deviceLines: [{ key: '1' } as DeviceContractDraft['deviceLines'][number]] }),
      ),
    ).toBe(true)
    expect(isDeviceContractDraftMeaningful(emptyDeviceDraft({ contractKind: 'subscription_renewal' }))).toBe(
      true,
    )
  })

  it('marks a service draft meaningful when chips or a customer are set', () => {
    expect(isServiceContractDraftMeaningful(emptyServiceDraft({ selectedChips: ['uninstall'] }))).toBe(true)
    expect(
      isServiceContractDraftMeaningful(
        emptyServiceDraft({ selectedCustomer: { id: 2 } as ServiceContractDraft['selectedCustomer'] }),
      ),
    ).toBe(true)
  })

  it('marks an accessories draft meaningful when the cart or customer is set', () => {
    expect(
      isAccessoriesDraftMeaningful(
        emptyAccessoriesDraft({
          cart: [{ key: 'a', line_type: 'accessory', name: 'ريموت', quantity: 1, unit_price: 50 }],
        }),
      ),
    ).toBe(true)
    expect(isAccessoriesDraftMeaningful(emptyAccessoriesDraft({ customerSearch: 'أحمد' }))).toBe(true)
  })
})
