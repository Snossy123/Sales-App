import { describe, expect, it } from 'vitest'
import { createSuspendedPosStore } from './suspendedPosStore'
import type { DeviceContractDraft } from './salesDraftStore'
import { createDeviceLine } from '../components/pos/DeviceLineCard'

function draft(name: string): DeviceContractDraft {
  return {
    contractKind: 'new_contract', sourceTransferInvoice: null, sourceRenewalCandidate: null,
    transactionSource: 'branch', branchSearch: '', selectedBranch: null, distributorSearch: '', selectedDistributor: null,
    salesRepSearch: '', selectedSalesRep: null, customerSearch: name, selectedCustomer: null,
    quantity: 1, deviceLines: [createDeviceLine(1000)], applyInstallationFee: true, installationFee: 150,
    applyTransportationFee: true, transportationFee: 100, feeDiscountAmount: 10, feeDiscountPercent: 5,
    contractDate: '2026-11-06', selectedPromotionId: 3, distributorBalanceAmount: 30,
    warehouseId: 12, contextBranchId: 2, contextDepartmentId: 1, userEdited: true,
    renewalManualDevice: true, renewalSerial: '123', renewalSim: '010123', renewalUsername: 'Eleraqy123', renewalCustomerLocked: true,
    transferIncludeDisassemblyAndAssembly: true, transferPaymentTerm: 'installment', transferDownPayment: 250,
    transferInstallmentCount: 6, transferIntervalType: 'weekly', transferFirstDueDate: '2026-12-01',
  }
}
function setup() {
  const values = new Map<string, string>()
  let fails = false
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { if (fails) throw new Error('Quota exceeded'); values.set(key, value) } }
  return { store: createSuspendedPosStore(storage), storage, fail: () => { fails = true } }
}

describe('suspended POS contracts', () => {
  it('parks several contracts, swaps the current form immediately, and does not duplicate IDs', () => {
    const { store } = setup()
    store.getState().park(1, 'a', draft('A'), 0)
    store.getState().park(1, 'b', draft('B'), 1)
    store.getState().resume(1, 'a', null, 2)
    store.getState().resume(1, 'b', { id: 'a', userId: 1, payload: draft('A edited before debounce'), updatedAt: 10 }, 3)
    expect(store.getState().contracts).toHaveLength(2)
    expect(store.getState().sessions[1].activeId).toBe('b')
    expect(store.getState().contracts.find((entry) => entry.id === 'a')?.payload.customerSearch).toBe('A edited before debounce')
    expect(store.getState().saveActive(1, 'a', draft('stale timer'), 3)).toBe(false)
  })
  it('restores all fields after reload without expiring parked contracts', () => {
    const { store, storage } = setup()
    const snapshot = draft('full data')
    snapshot.deviceLines[0].cashSchedule = 'custom'
    snapshot.deviceLines[0].cashScheduleItems = [{ dueDate: '2026-12-06', amount: 500 }]
    store.getState().park(1, 'full', snapshot, 0)
    snapshot.deviceLines[0].cashScheduleItems = []
    expect(store.getState().contracts[0].payload.deviceLines[0].cashScheduleItems).toEqual([{ dueDate: '2026-12-06', amount: 500 }])
    const reloaded = createSuspendedPosStore(storage)
    expect(reloaded.getState().contracts[0].payload).toEqual(draftFromSaved(store))
    reloaded.getState().resume(1, 'full', null, 1)
    expect(createSuspendedPosStore(storage).getState().sessions[1].activeId).toBe('full')
  })
  it('keeps users isolated and removes only the completed active contract', () => {
    const { store } = setup()
    store.getState().park(1, 'a', draft('A'), 0)
    store.getState().park(1, 'b', draft('B'), 1)
    store.getState().park(2, 'c', draft('C'), 0)
    expect(() => store.getState().resume(1, 'c', null, 2)).toThrow()
    store.getState().resume(1, 'a', null, 2)
    store.getState().finish(1, 3)
    expect(store.getState().contracts.map((entry) => entry.id).sort()).toEqual(['b', 'c'])
    expect(store.getState().saveActive(1, 'a', draft('late cleanup'), 3)).toBe(false)
    store.getState().remove(1, 'b')
    expect(store.getState().contracts.map((entry) => entry.id)).toEqual(['c'])
  })
  it('does not change session or saved data when persistence fails', () => {
    const { store, fail } = setup()
    store.getState().saveActive(1, 'a', draft('A'), 0)
    store.getState().park(2, 'b', draft('B'), 0)
    const previous = store.getState()
    fail()
    expect(() => store.getState().park(1, 'a', draft('unsaved edits'), 0)).toThrow()
    expect(store.getState()).toBe(previous)
    expect(() => store.getState().finish(1, 0)).toThrow()
    expect(store.getState()).toBe(previous)
  })
  it('keeps the active contract after a failed checkout and protects it from list deletion', () => {
    const { store } = setup()
    store.getState().saveActive(1, 'a', draft('active'), 0)
    expect(() => store.getState().remove(1, 'a')).toThrow()
    expect(store.getState().sessions[1].activeId).toBe('a')
    expect(store.getState().contracts[0].payload.customerSearch).toBe('active')
  })
})
function draftFromSaved(store: ReturnType<typeof createSuspendedPosStore>) { return store.getState().contracts[0].payload }
