import { describe, expect, it } from 'vitest'
import { createDefaultServicePayment } from '../components/services/ServicePaymentSection'
import { buildMaintenanceBillingPaymentFields } from './custodyMaintenancePayment'

describe('buildMaintenanceBillingPaymentFields', () => {
  it('sends cash term without installment plan', () => {
    const payment = createDefaultServicePayment(300, 10)
    expect(buildMaintenanceBillingPaymentFields(payment, 300)).toEqual({
      payment_term: 'cash',
    })
  })

  it('sends installment term and plan fields', () => {
    const payment = {
      ...createDefaultServicePayment(300, 10),
      paymentTerm: 'installment' as const,
      downPayment: 100,
      installmentAmount: 100,
      intervalType: 'monthly' as const,
      firstDueDate: '2026-12-27',
    }
    expect(buildMaintenanceBillingPaymentFields(payment, 300)).toEqual({
      payment_term: 'installment',
      installment_plan: {
        down_payment: 100,
        installment_amount: 100,
        installment_count: 2,
        interval_type: 'monthly',
        interval_days: 30,
        first_due_date: '2026-12-27',
      },
    })
  })
})
