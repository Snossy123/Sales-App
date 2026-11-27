import type { ServicePaymentState } from '../components/services/ServicePaymentSection'
import { computeInstallmentCount } from './sales'

export function buildMaintenanceBillingPaymentFields(
  payment: ServicePaymentState,
  total: number,
): {
  payment_term: 'cash' | 'installment'
  installment_plan?: {
    down_payment: number
    installment_amount: number
    installment_count: number
    interval_type: 'monthly' | 'weekly'
    interval_days: number
    first_due_date: string
  }
} {
  if (payment.paymentTerm !== 'installment') {
    return { payment_term: 'cash' }
  }

  return {
    payment_term: 'installment',
    installment_plan: {
      down_payment: payment.downPayment,
      installment_amount: payment.installmentAmount,
      installment_count: computeInstallmentCount(
        total,
        payment.installmentAmount,
        payment.downPayment,
      ),
      interval_type: payment.intervalType,
      interval_days: payment.intervalType === 'weekly' ? 7 : 30,
      first_due_date: payment.firstDueDate,
    },
  }
}
