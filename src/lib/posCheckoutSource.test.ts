import { describe, expect, it } from 'vitest'
import { linesMissingStockUnit } from './posCheckout'
import { checkoutSourceIds, sourceFieldFor } from './posCheckoutSource'
import { eligibleTechnicians } from './posTechnicians'
import { normalizeScannedDigits, normalizeScannedInput } from './scanner'
import { formatGpsUsername, isGpsUsernameComplete, parseGpsUsername } from './gpsUsername'

describe('stock unit guard', () => {
  it('blocks checkout when a device line has no stock unit', () => {
    expect(
      linesMissingStockUnit([{ productUnitId: undefined }], [], {
        manualDeviceEntry: false,
        allowNegativeInventory: false,
      }),
    ).toBe(true)
  })

  it('allows a line that is tied to a warehouse unit', () => {
    expect(
      linesMissingStockUnit([{ productUnitId: 5 }], [], {
        manualDeviceEntry: false,
        allowNegativeInventory: false,
      }),
    ).toBe(false)
  })
})

describe('checkout source', () => {
  it('keeps a branch sale free of sales and distributor ids', () => {
    expect(
      checkoutSourceIds({
        transactionSource: 'branch',
        branchId: 1,
        distributorId: 9,
        salesRepId: 4,
      }),
    ).toEqual({ branch_id: 1 })
  })

  it('saves a sales representative without a distributor', () => {
    expect(
      checkoutSourceIds({
        transactionSource: 'sales',
        branchId: 2,
        distributorId: 9,
        salesRepId: 4,
      }),
    ).toEqual({ branch_id: 2, sales_user_id: 4 })
  })

  it('saves a distributor referral on the distributor branch', () => {
    expect(
      checkoutSourceIds({
        transactionSource: 'distributor',
        branchId: 3,
        distributorId: 9,
        salesRepId: 4,
      }),
    ).toEqual({ branch_id: 3, distributor_id: 9 })
  })

  it('shows the selected source, not the customer profile', () => {
    expect(sourceFieldFor('branch')).toBe('branch')
    expect(sourceFieldFor('sales')).toBe('sales')
    expect(sourceFieldFor('distributor')).toBe('distributor')
  })
})

describe('device identity', () => {
  it('keeps letters in a serial', () => {
    expect(normalizeScannedInput('SN-UX-1001\r\n')).toBe('SN-UX-1001')
  })

  it('stores an Arabic serial as English digits only', () => {
    expect(normalizeScannedDigits('٨٦١٧٦٨٠٧٩١\r\n')).toBe('8617680791')
    expect(normalizeScannedDigits('SN-١٢٣\n')).toBe('123')
    expect(normalizeScannedDigits('۱۲۳')).toBe('123')
  })

  it('keeps a restored Eleraqy username', () => {
    expect(parseGpsUsername('Eleraqy12345')).toEqual({ prefixed: true, suffix: '12345' })
    expect(formatGpsUsername('12345')).toBe('Eleraqy12345')
    expect(isGpsUsernameComplete('Eleraqy12345')).toBe(true)
  })
})

describe('eligible technicians', () => {
  it('returns support technicians and skips sales representatives', () => {
    const people = eligibleTechnicians([
      { id: 1, job_title: 'مندوب مبيعات', department: { id: 1, name: 'مبيعات' } },
      { id: 2, job_title: 'فني دعم', department: { id: 2, name: 'الدعم الفني' } },
    ])
    expect(people.map((person) => person.id)).toEqual([2])
  })
})
