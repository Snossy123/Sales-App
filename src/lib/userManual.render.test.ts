import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { UserManualPage } from '../pages/UserManualPage'

describe('UserManualPage', () => {
  it('renders the ERP Documentation Portal homepage with search and all 8 module cards', () => {
    const html = renderToStaticMarkup(createElement(UserManualPage))
    expect(html).toContain('GPS ERP DOCS')
    expect(html).toContain('كل ما تحتاجه لإتقان نظام GPS للمبيعات.')
    expect(html).toContain('8 أقسام')
    expect(html).toContain('الأدوار والصلاحيات (RBAC)')
    expect(html).toContain('الحالات الحدية والأوفلاين')
  })

  it('renders the three-column documentation reader for a selected section', () => {
    const html = renderToStaticMarkup(
      createElement(UserManualPage, {
        initialSectionId: '2-الأدوار-والصلاحيات-وسياق-البيانات-rbac--scope',
      }),
    )
    expect(html).toContain('في هذه الصفحة')
    expect(html).toContain('الرئيسية (كل الأقسام)')
    expect(html).toContain('مدير الفرع')
    expect(html).toContain('id="2-الأدوار-والصلاحيات-وسياق-البيانات-rbac--scope"')
  })
})
