import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { UserManualPage } from '../pages/UserManualPage'

describe('UserManualPage', () => {
  it('renders the exhaustive specification sections, controls, and role matrix', () => {
    const html = renderToStaticMarkup(createElement(UserManualPage))
    expect(html).toContain('دليل الاستخدام والمرجع التفصيلي الشامل')
    expect(html).toContain('ابحث في الدليل')
    expect(html).toContain('8 أقسام رئيسية')
    expect(html).toContain('عرض الكل')
    expect(html).toContain('قسم واحد')
    expect(html).toContain('مدير الفرع')
    expect(html).toContain('id="1-نظرة-عامة-على-النظام-والبيئة"')
    expect(html).toContain('id="8-الحالات-الحدية-والأخطاء-والأمان-والتزامن-edge-cases-errors--sync"')
  })
})
