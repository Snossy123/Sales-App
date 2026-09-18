import { describe, expect, it } from 'vitest'
import type { Customer, Lead, ReferralLead } from '../../../api/types'
import {
  isoToDatetimeLocal,
  leadPhoneOptions,
  mergeCallContactOptions,
  referralLeadPhoneOptions,
} from './contactPhones'

describe('contactPhones', () => {
  it('returns no phone options when the number is empty', () => {
    expect(leadPhoneOptions({ id: 1, name: 'ليد', phone: '  ', status: 'new' } as Lead)).toEqual([])
    expect(
      referralLeadPhoneOptions({
        id: 2,
        phone: '',
        status: 'no_answer',
      } as ReferralLead),
    ).toEqual([])
  })

  it('merges customer, lead, and referral contacts with the right kind', () => {
    const customer = {
      id: 10,
      name: 'عميل',
      phone: '01011111111',
      status: 'active',
    } as Customer
    const lead = { id: 20, name: 'ليد', phone: '01022222222', status: 'new' } as Lead
    const referral = {
      id: 30,
      name: 'ترشيح',
      phone: '01033333333',
      status: 'no_answer',
    } as ReferralLead

    const merged = mergeCallContactOptions([customer], [lead], [referral])
    expect(merged.map((row) => row.kind)).toEqual(['customer', 'lead', 'referral'])
    expect(merged[0].customerId).toBe(10)
    expect(merged[1].leadId).toBe(20)
    expect(merged[2].referralLeadId).toBe(30)
  })

  it('converts ISO values for datetime-local inputs', () => {
    expect(isoToDatetimeLocal(null)).toBe('')
    expect(isoToDatetimeLocal(undefined)).toBe('')
    expect(isoToDatetimeLocal('2026-03-15T14:30')).toBe('2026-03-15T14:30')
    expect(isoToDatetimeLocal('2026-03-15T14:30:00')).toBe('2026-03-15T14:30')
  })
})
