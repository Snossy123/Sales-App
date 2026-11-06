import { describe, expect, it } from 'vitest'
import manualSource from '../../../docs/client-user-manual-ar.md?raw'
import { manualHeadingId, manualSectionsMatching, parseManual } from './userManual'

describe('userManual', () => {
  it('builds heading ids that match the manual table of contents', () => {
    expect(manualHeadingId('4. الآعدادات — المستخدمون والأدوار')).toBe(
      '4-الآعدادات--المستخدمون-والأدوار',
    )
    expect(manualHeadingId('11. المبيعات (CRM)')).toBe('11-المبيعات-crm')
  })

  it('splits the client manual into the published sections', () => {
    const parsed = parseManual(manualSource)
    const settings = parsed.sections.find((section) => section.title.startsWith('4.'))
    expect(settings?.id).toBe('4-الآعدادات--المستخدمون-والأدوار')
    expect(parsed.sections.some((section) => section.id === 'فهرس-المحتويات')).toBe(true)
    expect(parsed.sections.length).toBeGreaterThan(10)
  })

  it('filters sections by search text', () => {
    const { sections } = parseManual(manualSource)
    const matches = manualSectionsMatching(sections, 'مخزون')
    expect(matches.some((section) => section.title.includes('المخزون'))).toBe(true)
    expect(manualSectionsMatching(sections, '')).toHaveLength(sections.length)
    expect(manualSectionsMatching(sections, 'عبارة-غير-موجودة-في-الدليل')).toHaveLength(0)
  })
})
