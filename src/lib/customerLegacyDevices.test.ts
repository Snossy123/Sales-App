import { describe, expect, it } from 'vitest'
import {
  emptyLegacyDeviceDraft,
  legacyDevicesAreComplete,
  validateLegacyDeviceDraft,
} from './customerLegacyDevices'

describe('customerLegacyDevices', () => {
  it('requires serial, sim, and complete GPS username', () => {
    const draft = emptyLegacyDeviceDraft()
    expect(validateLegacyDeviceDraft(draft)).toEqual({
      serial_number: 'السريال مطلوب',
      sim_number: 'رقم الشريحة مطلوب',
      username: 'اسم المستخدم مطلوب',
    })

    expect(
      validateLegacyDeviceDraft({
        ...draft,
        serial_number: '1000001',
        sim_number: '01011110000',
        username: 'Eleraqy123',
      }),
    ).toEqual({})
  })

  it('treats a list as complete only when every row is valid', () => {
    expect(legacyDevicesAreComplete([])).toBe(false)
    expect(
      legacyDevicesAreComplete([
        {
          key: 'a',
          origin: 'legacy',
          serial_number: '1000001',
          sim_number: '01011110000',
          username: 'Eleraqy123',
        },
        emptyLegacyDeviceDraft(),
      ]),
    ).toBe(false)
  })
})
