import { describe, expect, it } from 'vitest'
import { createDeviceLine } from '../components/pos/DeviceLineCard'
import { repriceDeviceLine } from './deviceLinePricing'
import { createSuspendedPosStore } from '../stores/suspendedPosStore'
import type { DeviceContractDraft } from '../stores/salesDraftStore'

describe('device catalog price refresh', () => {
  it('corrects 825 to 8100 and recalculates the down payment and six installments', () => {
    const saved = { ...createDeviceLine(825), serialNumber: '123456', simNumber: '010123', username: 'Eleraqy123' }
    const updated = repriceDeviceLine(saved, 8100, 10, 24)
    expect(updated).toMatchObject({ unitPrice: 8100, downPayment: 810, installmentAmount: 1215,
      serialNumber: saved.serialNumber, simNumber: saved.simNumber, username: saved.username,
      key: saved.key, firstDueDate: saved.firstDueDate,
    })
    expect(saved.unitPrice).toBe(825)
    expect(repriceDeviceLine(updated, 8100, 10, 24)).toBe(updated)
  })

  it('recalculates percentage discounts while preserving fixed discounts', () => {
    const saved = createDeviceLine(1000)
    const percent = repriceDeviceLine({ ...saved, discountMode: 'percent', discountPercent: 10, discountAmount: 100 }, 2000, 10, 24)
    expect(percent.discountAmount).toBe(200)
    expect(percent.discountPercent).toBe(10)
    const fixed = repriceDeviceLine({ ...saved, discountMode: 'amount', discountAmount: 100 }, 2000, 10, 24)
    expect(fixed.discountAmount).toBe(100)
    expect(fixed.discountPercent).toBe(5)
  })

  it('uses the new net amount for immediate cash payments', () => {
    const saved = { ...createDeviceLine(825), paymentTerm: 'cash' as const, discountAmount: 100, downPayment: 725 }
    expect(repriceDeviceLine(saved, 8100, 10, 24)).toMatchObject({ unitPrice: 8100, downPayment: 8000 })
  })

  it('keeps custom payment dates and redistributes the remaining amount exactly', () => {
    const saved = { ...createDeviceLine(825), paymentTerm: 'cash' as const, cashSchedule: 'custom' as const,
      downPayment: 0, cashScheduleItems: [{ amount: 275, dueDate: '2026-12-01' }, { amount: 550, dueDate: '2027-01-01' }],
    }
    const updated = repriceDeviceLine(saved, 8100.01, 10, 24)
    expect(updated.cashScheduleItems).toEqual([{ amount: 2700, dueDate: '2026-12-01' }, { amount: 5400.01, dueDate: '2027-01-01' }])
  })

  it('enforces the minimum down payment and maximum installment count after repricing', () => {
    const saved = { ...createDeviceLine(825), downPayment: 0, installmentAmount: 1 }
    expect(repriceDeviceLine(saved, 8100, 20, 12)).toMatchObject({ downPayment: 1620, installmentAmount: 540 })
  })

  it('persists the corrected price and installments in browser storage across reloads', () => {
    const values = new Map<string, string>()
    const storage = { getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) },
    }
    const store = createSuspendedPosStore(storage)
    const line = repriceDeviceLine(createDeviceLine(825), 8100, 10, 24)
    const draft = { deviceLines: [line] } as DeviceContractDraft
    store.getState().saveActive(1, 'corrected', draft, 0)
    const restored = createSuspendedPosStore(storage).getState()
    expect(restored.sessions[1].activeId).toBe('corrected')
    expect(restored.contracts[0].payload.deviceLines[0]).toMatchObject({ unitPrice: 8100, downPayment: 810, installmentAmount: 1215 })
  })
})
