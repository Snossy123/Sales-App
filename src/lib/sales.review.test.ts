import { describe, expect, it } from 'vitest'
import {
  invoiceStatusLabels,
  invoiceStatusOptions,
  reviewStatusForBadge,
  reviewStatusLabel,
  reviewStatusLabels,
} from './sales'

describe('sales review labels', () => {
  it('labels review statuses including empty as pending', () => {
    expect(reviewStatusLabel('pending')).toBe('بانتظار المراجعة')
    expect(reviewStatusLabel('approved')).toBe('تمت المراجعة')
    expect(reviewStatusLabel('rejected')).toBe('مرفوضة')
    expect(reviewStatusLabel(null)).toBe('بانتظار المراجعة')
    expect(reviewStatusLabel(undefined)).toBe('بانتظار المراجعة')
    expect(reviewStatusLabels.approved).toBe('تمت المراجعة')
  })

  it('maps review status to badge keys', () => {
    expect(reviewStatusForBadge('pending')).toBe('pending_review')
    expect(reviewStatusForBadge(null)).toBe('pending_review')
    expect(reviewStatusForBadge('approved')).toBe('review_approved')
    expect(reviewStatusForBadge('rejected')).toBe('rejected')
  })

  it('keeps invoice status labels aligned with filter options', () => {
    expect(invoiceStatusLabels.pending_review).toBe('بانتظار المراجعة')
    expect(invoiceStatusLabels.confirmed).toBe('مؤكدة')
    expect(invoiceStatusLabels.rejected).toBe('مرفوضة')
    const optionValues = invoiceStatusOptions.filter((o) => o.value !== '').map((o) => o.value)
    expect(optionValues).toEqual(['pending_review', 'confirmed', 'rejected'])
    for (const option of invoiceStatusOptions) {
      if (!option.value) continue
      expect(invoiceStatusLabels[option.value]).toBe(option.label)
    }
  })
})
