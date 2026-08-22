import type {
  AccessoriesDraft,
  DeviceContractDraft,
  ServiceContractDraft,
} from '../stores/salesDraftStore'

export function isDeviceContractDraftMeaningful(draft: DeviceContractDraft): boolean {
  return Boolean(
    draft.selectedCustomer ||
      draft.deviceLines.length > 0 ||
      draft.customerSearch.trim() ||
      draft.selectedDistributor ||
      draft.selectedSalesRep ||
      draft.sourceTransferInvoice ||
      draft.sourceRenewalCandidate ||
      draft.selectedPromotionId !== '' ||
      draft.distributorBalanceAmount > 0 ||
      draft.contractKind !== 'new_contract' ||
      draft.transactionSource !== 'branch',
  )
}

export function isServiceContractDraftMeaningful(draft: ServiceContractDraft): boolean {
  return Boolean(
    draft.selectedChips.length > 0 ||
      draft.selectedCustomer ||
      draft.customerSearch.trim() ||
      draft.notes.trim() ||
      draft.selectedCustomerDevice ||
      draft.manualDeviceEntry ||
      draft.contractSerial.trim() ||
      draft.contractSim.trim() ||
      draft.contractUsername.trim() ||
      draft.renewalLine ||
      draft.externalLine ||
      draft.feeLines.length > 0 ||
      draft.selectedDistributor ||
      draft.selectedSalesRep ||
      draft.distributorBalanceAmount > 0 ||
      draft.transactionSource !== 'branch',
  )
}

export function isAccessoriesDraftMeaningful(draft: AccessoriesDraft): boolean {
  return Boolean(
    draft.selectedCustomer ||
      draft.cart.length > 0 ||
      draft.notes.trim() ||
      draft.customerSearch.trim(),
  )
}
