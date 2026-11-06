import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { CustodyVoucher, ProductUnit } from '../../api/types'
import { DeviceReport } from './DeviceReport'

const unit: ProductUnit = {
  id: 1, product_model_id: 1, imei: '12345', state: 'maintenance',
  username: 'user-123', sim_number: '01012345678', inventory_bucket: 'custody_maintenance',
  notes: 'ملاحظات الجهاز <script>alert(1)</script>',
}

function render(vouchers: CustodyVoucher[]) {
  return renderToStaticMarkup(createElement(DeviceReport, { unit, vouchers, companyName: 'الشركة', generatedAt: '2026-11-06' }))
}

describe('device report', () => {
  it('preserves every movement, newest first, including long notes and recipient details', () => {
    const vouchers: CustodyVoucher[] = Array.from({ length: 125 }, (_, index) => ({
      id: index + 1, type: 'issuance', recipient_type: 'customer', voucher_number: `VOUCHER-${index + 1}-END`,
      created_at: '2026-11-06T12:00:00Z', notes: 'نص طويل '.repeat(100),
      customer: { id: 2, name: 'اسم العميل الطويل' }, creator: { id: 3, name: 'المستخدم' },
    }))
    const html = render(vouchers)
    expect(html.match(/VOUCHER-\d+-END/g)).toHaveLength(125)
    expect(html.indexOf('VOUCHER-125-END')).toBeLessThan(html.indexOf('VOUCHER-1-END'))
    expect(html).toContain('نص طويل '.repeat(100))
    expect(html).toContain('صرف — عميل')
    expect(html).toContain('<thead>')
    expect(html).toContain('توقيع العميل')
  })

  it('shows actual device identities, escapes notes, and provides an empty state', () => {
    const html = render([])
    expect(html).toContain('user-123')
    expect(html).toContain('01012345678')
    expect(html).toContain('لا يوجد سجل حركة لهذا الجهاز.')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
    expect(html).toContain('حالة الصيانة')
  })
})
