import { describe, expect, it } from 'vitest'
import { SERVICE_CATEGORIES, serviceCategoryLabel } from './services'

describe('services categories', () => {
  it('contains the new categories in SERVICE_CATEGORIES', () => {
    const values = SERVICE_CATEGORIES.map((c) => c.value)
    expect(values).toContain('site_transfer')
    expect(values).toContain('ownership_transfer')
    expect(values).toContain('programming')
    expect(values).toContain('reset_password')
  })

  it('maps new categories to correct Arabic labels', () => {
    expect(serviceCategoryLabel('site_transfer')).toBe('نقل على الموقع')
    expect(serviceCategoryLabel('ownership_transfer')).toBe('نقل ملكية')
    expect(serviceCategoryLabel('programming')).toBe('برمجة')
    expect(serviceCategoryLabel('reset_password')).toBe('Reset Password')
    expect(serviceCategoryLabel('on_site_transfer')).toBe('نقل على الموقع')
  })

  it('maps existing categories to their labels', () => {
    expect(serviceCategoryLabel('maintenance')).toBe('صيانة')
    expect(serviceCategoryLabel('software')).toBe('سوفت وير')
    expect(serviceCategoryLabel('subscription')).toBe('تجديد اشتراك')
    expect(serviceCategoryLabel('installation')).toBe('تركيب')
    expect(serviceCategoryLabel('uninstall')).toBe('فك')
    expect(serviceCategoryLabel('transfer')).toBe('نقل')
    expect(serviceCategoryLabel('other')).toBe('أخرى')
  })

  it('falls back to category string when unknown', () => {
    expect(serviceCategoryLabel('custom_unknown')).toBe('custom_unknown')
  })
})
