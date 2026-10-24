import { describe, expect, it } from 'vitest'
import {
  formatVisitDate,
  inventoryBucketLabel,
  maintenanceVisitStatusLabel,
  productUnitDisplayCode,
  productUnitStateLabel,
} from './inventoryBuckets'

describe('inventoryBuckets', () => {
  it('labels known buckets and states, and passes through unknown values', () => {
    expect(inventoryBucketLabel('new')).toBe('جديدة')
    expect(inventoryBucketLabel('custody_maintenance')).toBe('صيانة')
    expect(inventoryBucketLabel('unknown_bucket')).toBe('unknown_bucket')
    expect(inventoryBucketLabel(null)).toBeNull()

    expect(productUnitStateLabel('available')).toBe('متاح')
    expect(productUnitStateLabel('sold')).toBe('مباع')
    expect(productUnitStateLabel('mystery')).toBe('mystery')
    expect(productUnitStateLabel(undefined)).toBeNull()
  })

  it('labels the latest maintenance visit from entry and exit dates', () => {
    expect(maintenanceVisitStatusLabel({})).toBe('لم يدخل')
    expect(maintenanceVisitStatusLabel({ maintenance_entered_on: '2026-10-24' })).toBe('راح الصيانة')
    expect(
      maintenanceVisitStatusLabel({
        maintenance_entered_on: '2026-10-01',
        maintenance_exited_on: '2026-10-18',
      }),
    ).toBe('خلص صيانة')
    expect(formatVisitDate(null)).toBe('—')
    expect(formatVisitDate('2026-10-24')).toBe('24/10/2026')
    expect(formatVisitDate('2026-10-24T00:00:00.000000Z')).toBe('24/10/2026')
  })

  it('prefers serial, then IMEI, then id for the display code', () => {
    expect(productUnitDisplayCode({ serial_number: 'SN-1', imei: 'IMEI-9', id: 3 })).toBe('SN-1')
    expect(productUnitDisplayCode({ serial_number: null, imei: 'IMEI-9', id: 3 })).toBe('IMEI-9')
    expect(productUnitDisplayCode({ id: 12 })).toBe('#12')
    expect(productUnitDisplayCode({})).toBe('#?')
  })
})
