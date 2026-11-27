import { describe, expect, it } from 'vitest'
import type { SalesInvoice } from '../api/types'
import { hydrateServiceCombinerFromInvoice } from './hydrateServiceCombinerFromInvoice'

function invoice(overrides: Partial<SalesInvoice> = {}): SalesInvoice {
  return {
    id: 150,
    invoice_date: '2026-11-27',
    total: 850,
    balance_due: 0,
    payment_term: 'cash',
    payment_status: 'paid',
    contract_kind: 'mixed',
    customer_id: 1,
    customer: { id: 1, name: 'ناصر', phone: '011' },
    lines: [
      {
        id: 1,
        line_type: 'device',
        line_contract_kind: 'subscription_renewal',
        unit_price: 1700,
        discount: 850,
        serial_number: '861768079552147',
        sim_number: '01110204578',
        username: 'Eleraqy55409',
        renewal_type: 'annual',
        payment_term: 'cash',
      },
      {
        id: 2,
        line_type: 'service',
        service_id: 9,
        description: 'فك',
        unit_price: 200,
        payment_term: 'cash',
        service: {
          id: 9,
          code: 'SRV-FK',
          name: 'فك',
          category: 'uninstall',
          default_price: 200,
          is_active: true,
        },
      },
    ],
    ...overrides,
  } as SalesInvoice
}

describe('hydrateServiceCombinerFromInvoice', () => {
  it('restores renewal chip and fee lines for mixed contracts', () => {
    const hydrated = hydrateServiceCombinerFromInvoice(invoice())
    expect(hydrated.selectedChips).toContain('annual_renewal')
    expect(hydrated.renewalLine?.serialNumber).toBe('861768079552147')
    expect(hydrated.feeLines).toHaveLength(1)
    expect(hydrated.feeLines[0]?.chipId).toBe('uninstall')
    expect(hydrated.contractSerial).toBe('861768079552147')
  })

  it('ignores legacy external_device lines', () => {
    const hydrated = hydrateServiceCombinerFromInvoice(
      invoice({
        lines: [
          {
            id: 3,
            line_type: 'device',
            line_contract_kind: 'external_device',
            unit_price: 500,
            serial_number: 'OLD',
            payment_term: 'cash',
          },
          {
            id: 2,
            line_type: 'service',
            service_id: 9,
            description: 'فك',
            unit_price: 200,
            payment_term: 'cash',
            service: {
              id: 9,
              code: 'SRV-FK',
              name: 'فك',
              category: 'uninstall',
              default_price: 200,
              is_active: true,
            },
          },
        ],
      }),
    )
    expect(hydrated.selectedChips).not.toContain('annual_renewal')
    expect(hydrated.renewalLine).toBeNull()
    expect(hydrated.feeLines).toHaveLength(1)
  })
})
