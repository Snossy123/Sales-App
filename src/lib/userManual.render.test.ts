import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { UserManualPage } from '../pages/UserManualPage'

describe('UserManualPage', () => {
  it('renders the manual role table and section headings', () => {
    const html = renderToStaticMarkup(createElement(UserManualPage))
    expect(html).toContain('دليل الاستخدام')
    expect(html).toContain('ابحث في الدليل')
    expect(html).toContain('مدير الفرع')
    expect(html).toContain('id="4-الآعدادات--المستخدمون-والأدوار"')
  })
})