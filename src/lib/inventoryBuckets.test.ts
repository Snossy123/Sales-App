import { describe, expect, it } from 'vitest'
import {
  inventoryBucketLabel,
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

  it('prefers serial, then IMEI, then id for the display code', () => {
    expect(productUnitDisplayCode({ serial_number: 'SN-1', imei: 'IMEI-9', id: 3 })).toBe('SN-1')
    expect(productUnitDisplayCode({ serial_number: null, imei: 'IMEI-9', id: 3 })).toBe('IMEI-9')
    expect(productUnitDisplayCode({ id: 12 })).toBe('#12')
    expect(productUnitDisplayCode({})).toBe('#?')
  })
})
