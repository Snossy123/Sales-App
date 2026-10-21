import { describe, expect, it } from 'vitest'
import type { SalesInvoice } from '../api/types'
import { buildOwnershipTransferFinancialBreakdown } from './ownershipTransferFinancialBreakdown'

describe('buildOwnershipTransferFinancialBreakdown', () => {
  it('aggregates transfer invoice service lines and source remaining balance', () => {
    const invoice: SalesInvoice = {
      id: 55,
      invoice_date: '2026-10-21',
      customer_id: 2,
      total: 2150,
      paid_amount: 450,
      balance_due: 1700,
      payment_term: 'installment',
      payment_status: 'partial',
      lines: [
        {
          id: 1,
          line_type: 'device',
          unit_price: 0,
          line_total: 0,
        },
        {
          id: 2,
          line_type: 'service',
          unit_price: 450,
          line_total: 450,
          service: { id: 9, name: 'OWN', category: 'ownership_transfer', default_price: 450, is_active: true },
          payment_term: 'cash',
        },
        {
          id: 3,
          line_type: 'service',
          unit_price: 1700,
          line_total: 1700,
          service: { id: 5, name: 'SUB-L', category: 'subscription', default_price: 1700, is_active: true },
          payment_term: 'installment',
          installment_plan: {
            id: 1,
            down_payment: 0,
            installment_count: 4,
            interval_type: 'weekly',
            first_due_date: '2023-10-28',
          },
        },
        {
          id: 4,
          line_type: 'service',
          unit_price: 100,
          line_total: 100,
          service: { id: 10, name: 'FK', category: 'uninstall', default_price: 100, is_active: true },
        },
        {
          id: 5,
          line_type: 'service',
          unit_price: 100,
          line_total: 100,
          service: { id: 11, name: 'TRK', category: 'installation', default_price: 100, is_active: true },
        },
      ],
      ownership_transfer_record: {
        id: 1,
        from_customer_id: 1,
        to_customer_id: 2,
        remaining_balance_at_transfer: 4000,
      },
    }

    const breakdown = buildOwnershipTransferFinancialBreakdown(invoice)

    expect(breakdown.ownershipTransferFee).toBe(450)
    expect(breakdown.subscriptionRenewalFee).toBe(1700)
    expect(breakdown.disassemblyInstallationFee).toBe(200)
    expect(breakdown.remainingInstallmentsOnSource).toBe(4000)
    expect(breakdown.paidAmount).toBe(450)
    expect(breakdown.remainingBalance).toBe(5900)
    expect(breakdown.paymentScheduleText).toContain('أسبوعياً')
    expect(breakdown.paymentScheduleText).toContain('2023/10/28')
  })

  it('ignores a duplicated device price stored on the invoice and subtracts only collected fees', () => {
    const invoice: SalesInvoice = {
      id: 56,
      invoice_date: '2026-10-21',
      customer_id: 2,
      total: 4150,
      paid_amount: 1700,
      balance_due: 2450,
      payment_term: 'mixed',
      payment_status: 'partial',
      lines: [
        {
          id: 1,
          line_type: 'device',
          unit_price: 1700,
          line_total: 1700,
          payment_term: 'cash',
        },
        {
          id: 2,
          line_type: 'service',
          unit_price: 450,
          line_total: 450,
          description: 'رسوم نقل ملكية',
          payment_term: 'installment',
          installment_plan: {
            id: 2,
            down_payment: 200,
            installment_count: 4,
            interval_type: 'monthly',
            first_due_date: '2026-10-21',
          },
        },
        {
          id: 3,
          line_type: 'service',
          unit_price: 1700,
          line_total: 1700,
          description: 'تجديد الاشتراك',
          payment_term: 'installment',
          installment_plan: {
            id: 3,
            down_payment: 0,
            installment_count: 4,
            interval_type: 'monthly',
            first_due_date: '2026-10-21',
          },
        },
        {
          id: 4,
          line_type: 'service',
          unit_price: 300,
          line_total: 300,
          description: 'رسوم فك وتركيب',
          payment_term: 'installment',
          installment_plan: {
            id: 4,
            down_payment: 0,
            installment_count: 4,
            interval_type: 'monthly',
            first_due_date: '2026-10-21',
          },
        },
      ],
      ownership_transfer_record: {
        id: 2,
        from_customer_id: 1,
        to_customer_id: 2,
        remaining_balance_at_transfer: 4000,
      },
    }

    const breakdown = buildOwnershipTransferFinancialBreakdown(invoice)

    expect(breakdown.paidAmount).toBe(200)
    expect(breakdown.remainingBalance).toBe(6250)
  })
})
