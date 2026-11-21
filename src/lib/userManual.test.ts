import { describe, expect, it } from 'vitest'
import manualSource from '../../../docs/client-user-manual-ar.md?raw'
import {
  countManualMatches,
  manualHeadingId,
  manualSectionsMatching,
  parseManual,
} from './userManual'

describe('userManual', () => {
  it('builds heading ids consistently for Arabic and English headings', () => {
    expect(manualHeadingId('1. نظرة عامة على النظام والبيئة')).toBe(
      '1-نظرة-عامة-على-النظام-والبيئة',
    )
    expect(manualHeadingId('2. الأدوار والصلاحيات وسياق البيانات (RBAC & Scope)')).toBe(
      '2-الأدوار-والصلاحيات-وسياق-البيانات-rbac--scope',
    )
  })

  it('parses all 8 exhaustive specification sections and nested subsections', () => {
    const parsed = parseManual(manualSource)
    expect(parsed.sections).toHaveLength(8)
    expect(parsed.sections[0]?.title).toContain('1.')
    expect(parsed.sections[7]?.title).toContain('8.')
    expect(parsed.sections.every((s) => s.subsections.length > 0)).toBe(true)
  })

  it('filters sections and counts matches accurately', () => {
    const { sections } = parseManual(manualSource)
    const matches = manualSectionsMatching(sections, 'مخزون')
    expect(matches.length).toBeGreaterThan(0)
    expect(countManualMatches(matches[0], 'مخزون')).toBeGreaterThan(0)
    expect(manualSectionsMatching(sections, '')).toHaveLength(sections.length)
    expect(manualSectionsMatching(sections, 'عبارة-غير-موجودة-في-الدليل')).toHaveLength(0)
  })
})
