import { describe, expect, it } from 'vitest'
import { inspectPosDraftRestoration } from './posDraftRestoration'
import { createDeviceLine } from '../components/pos/DeviceLineCard'
import type { DeviceContractDraft } from '../stores/salesDraftStore'
import type { Branch, GpsProduct, ProductUnit } from '../api/types'

const snapshot = {
  contractKind: 'new_contract', transactionSource: 'branch', selectedBranch: { id: 2 }, warehouseId: 12,
  deviceLines: [{ ...createDeviceLine(1000), productUnitId: 7 }],
} as DeviceContractDraft
const branch = { id: 2, is_active: true } as Branch
const unit = { id: 7, state: 'available', warehouse_id: 12 } as ProductUnit
const current = { branches: [branch], warehouses: [{ id: 12, code: 'WH', name: 'Warehouse' }], units: [unit], product: { installment_price: 1000 } as GpsProduct }

describe('restored POS validation', () => {
  it('accepts unchanged selections and detects stale or sold units without replacing them', () => {
    expect(inspectPosDraftRestoration(snapshot, current)).toEqual({ issues: [], priceWarnings: [] })
    expect(inspectPosDraftRestoration(snapshot, { ...current, units: [{ ...unit, state: 'sold' }] }).issues).toHaveLength(1)
    expect(snapshot.deviceLines[0].productUnitId).toBe(7)
  })
  it('reports revoked branches, unavailable warehouses, and updated prices separately', () => {
    const result = inspectPosDraftRestoration(snapshot, { ...current, branches: [], warehouses: [], product: { installment_price: 1200 } as GpsProduct })
    expect(result.issues).toHaveLength(2)
    expect(result.priceWarnings).toHaveLength(1)
    expect(snapshot.deviceLines[0].unitPrice).toBe(1000)
  })
  it('does not require sellable stock for an existing renewal device', () => {
    expect(inspectPosDraftRestoration({ ...snapshot, contractKind: 'subscription_renewal' }, { ...current, units: [], product: undefined }).issues).toEqual([])
  })
})
