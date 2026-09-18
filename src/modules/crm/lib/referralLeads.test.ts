import { describe, expect, it } from 'vitest'
import {
  formatReferralRelativeDue,
  leadDisplayCode,
  REFERRAL_STATUSES_NEED_MODAL,
  referralStatusLabel,
  referrerLabel,
} from './referralLeads'

describe('referralLeads', () => {
  it('labels known referral statuses and passes unknown values through', () => {
    expect(referralStatusLabel('no_answer')).toBe('لم يرد')
    expect(referralStatusLabel('not_interested')).toBe('غير مهتم')
    expect(referralStatusLabel('installation_scheduled')).toBe('موعد تركيب مجدول')
    expect(referralStatusLabel('installed')).toBe('تم التركيب')
    expect(referralStatusLabel('archived')).toBe('archived')
  })

  it('opens a modal for statuses that need extra fields except installed', () => {
    expect(REFERRAL_STATUSES_NEED_MODAL).toEqual([
      'no_answer',
      'not_interested',
      'installation_scheduled',
    ])
    expect(REFERRAL_STATUSES_NEED_MODAL).not.toContain('installed')
  })

  it('prefers customer name then parent referral name or phone', () => {
    expect(referrerLabel({ referred_by_customer: { name: 'أحمد' } })).toBe('أحمد')
    expect(
      referrerLabel({
        referred_by_referral_lead: { phone: '01000000000', name: 'ليد أب' },
      }),
    ).toBe('ليد أب')
    expect(referrerLabel({ referred_by_referral_lead: { phone: '01011111111' } })).toBe(
      '01011111111',
    )
    expect(referrerLabel({})).toBe('—')
  })

  it('formats display codes', () => {
    expect(leadDisplayCode({ id: 9 })).toBe('REF-9')
  })

  it('marks relative due as overdue for yesterday and empty when missing', () => {
    expect(formatReferralRelativeDue(null)).toEqual({ label: '—', overdue: false })
    expect(formatReferralRelativeDue(undefined)).toEqual({ label: '—', overdue: false })

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(12, 0, 0, 0)
    const due = formatReferralRelativeDue(yesterday.toISOString())
    expect(due.overdue).toBe(true)
    expect(due.label).toMatch(/متأخرة/)
  })
})
