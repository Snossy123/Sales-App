import { describe, expect, it } from 'vitest'
import {
  emptyLegacyDeviceDraft,
  legacyDevicesAreComplete,
  toRegisterDevicePayload,
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

  it('requires remaining installment count and amount together', () => {
    const draft = {
      ...emptyLegacyDeviceDraft(),
      serial_number: '1000001',
      sim_number: '01011110000',
      username: 'Eleraqy123',
      has_remaining_installments: true,
    }

    expect(validateLegacyDeviceDraft(draft)).toEqual({
      remaining_installment_count: 'عدد الأقساط المتبقية مطلوب',
      installment_amount: 'قيمة القسط مطلوبة',
    })

    expect(
      validateLegacyDeviceDraft({
        ...draft,
        remaining_installment_count: '3',
        installment_amount: '500',
      }),
    ).toEqual({})
  })

  it('requires a renewal date for annual contracts', () => {
    const draft = {
      ...emptyLegacyDeviceDraft(),
      serial_number: '1000001',
      sim_number: '01011110000',
      username: 'Eleraqy123',
      renewal_type: 'annual' as const,
      subscription_renewal_date: '',
    }

    expect(validateLegacyDeviceDraft(draft)).toEqual({
      subscription_renewal_date: 'تاريخ التجديد مطلوب',
    })
  })

  it('treats a list as complete only when every row is valid', () => {
    expect(legacyDevicesAreComplete([])).toBe(false)
    expect(
      legacyDevicesAreComplete([
        {
          ...emptyLegacyDeviceDraft(),
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

  it('sends imported contract fields in the register payload', () => {
    expect(
      toRegisterDevicePayload({
        ...emptyLegacyDeviceDraft(),
        serial_number: '1000001',
        sim_number: '01011110000',
        username: 'Eleraqy123',
        renewal_type: 'annual',
        subscription_renewal_date: '2027-10-21',
        has_remaining_installments: true,
        remaining_installment_count: '3',
        installment_amount: '500',
        first_due_date: '2026-10-21',
      }),
    ).toEqual({
      origin: 'legacy',
      serial_number: '1000001',
      sim_number: '01011110000',
      username: 'Eleraqy123',
      renewal_type: 'annual',
      subscription_renewal_date: '2027-10-21',
      remaining_installment_count: 3,
      installment_amount: 500,
      first_due_date: '2026-10-21',
    })
  })
})
