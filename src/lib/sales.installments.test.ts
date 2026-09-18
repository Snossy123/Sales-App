import { describe, expect, it } from 'vitest'
import {
  computeInstallmentCount,
  computeInstallmentDownPayment,
  computeMinDownPayment,
  installmentCountExceedsMaxMessage,
  normalizeInstallmentItem,
  paymentTermLabel,
  suggestInstallmentAmount,
} from './sales'

describe('sales installment helpers', () => {
  it('labels payment terms', () => {
    expect(paymentTermLabel('cash')).toBe('كاش')
    expect(paymentTermLabel('installment')).toBe('تقسيط')
    expect(paymentTermLabel('mixed')).toBe('مختلط')
    expect(paymentTermLabel('credit')).toBe('آجل')
    expect(paymentTermLabel(null)).toBe('—')
  })

  it('computes down payment as leftover after installment amounts', () => {
    expect(computeInstallmentDownPayment(6000, 500, 10)).toBe(1000)
    expect(computeInstallmentDownPayment(1000, 500, 3)).toBe(0)
  })

  it('computes installment count from remaining financed amount', () => {
    expect(computeInstallmentCount(6000, 500, 1000)).toBe(10)
    expect(computeInstallmentCount(1000, 0, 0)).toBe(0)
    expect(computeInstallmentCount(1000, 500, 1000)).toBe(0)
  })

  it('warns when computed count exceeds the configured max', () => {
    expect(installmentCountExceedsMaxMessage(6, 24)).toBeNull()
    expect(installmentCountExceedsMaxMessage(0, 24)).toBeNull()
    expect(installmentCountExceedsMaxMessage(30, 24)).toBe(
      'عدد الأقساط المحسوب 30 أكبر من الأقصى 24 — راجع الأدمن في إعدادات النظام',
    )
  })

  it('computes minimum down payment and suggested installment amount', () => {
    expect(computeMinDownPayment(1000, 10)).toBe(100)
    expect(suggestInstallmentAmount(1000, 9, 10)).toBe(100)
    expect(suggestInstallmentAmount(1000, 0, 10)).toBe(0)
  })

  it('normalizes nested installment payload remaining', () => {
    const item = normalizeInstallmentItem({
      id: 1,
      due_date: '2026-06-01',
      amount: 1000,
      paid_amount: 250,
      status: 'partial',
      sequence: 2,
      sales_invoice: {
        id: 88,
        invoice_number: 'INV-88',
        branch_id: 3,
        customer: { id: 9, name: 'عميل', phone: '0100' },
      },
    })

    expect(item.remaining).toBe(750)
    expect(item.sales_invoice_id).toBe(88)
    expect(item.installment_number).toBe(2)
    expect(item.customer_name).toBe('عميل')
    expect(item.invoice_number).toBe('INV-88')
  })
})
