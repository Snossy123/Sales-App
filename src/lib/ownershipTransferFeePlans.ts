export type OwnershipTransferFeeKey =
  | 'ownership'
  | 'subscription'
  | 'uninstall'
  | 'installation'

export type OwnershipTransferFeePaymentTerm = 'cash' | 'installment'
export type OwnershipTransferFeeIntervalType = 'monthly' | 'weekly'

export interface OwnershipTransferFeeAmounts {
  ownership: number
  subscription?: number
  uninstall?: number
  installation?: number
}

export interface OwnershipTransferInstallmentPlan {
  down_payment: number
  installment_count: number
  installment_amount: number
  interval_type: OwnershipTransferFeeIntervalType
  interval_days: number
  first_due_date: string
}

export interface AllocatedOwnershipTransferFeeLine {
  key: OwnershipTransferFeeKey
  amount: number
  paymentTerm: OwnershipTransferFeePaymentTerm
  downPayment?: number
  installmentPlan?: OwnershipTransferInstallmentPlan
}

export interface AllocateOwnershipTransferFeePlansInput {
  fees: OwnershipTransferFeeAmounts
  includeDisassemblyAndAssembly: boolean
  paymentTerm: OwnershipTransferFeePaymentTerm
  downPayment: number
  installmentCount: number
  intervalType: OwnershipTransferFeeIntervalType
  firstDueDate: string
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function positiveAmount(value: number | undefined): number {
  const n = Number(value) || 0
  return n > 0 ? n : 0
}

function buildFeeEntries(
  fees: OwnershipTransferFeeAmounts,
  includeDisassemblyAndAssembly: boolean,
): Array<{ key: OwnershipTransferFeeKey; amount: number }> {
  const entries: Array<{ key: OwnershipTransferFeeKey; amount: number }> = []
  const ownership = positiveAmount(fees.ownership)
  if (ownership > 0) {
    entries.push({ key: 'ownership', amount: ownership })
  }
  const subscription = positiveAmount(fees.subscription)
  if (subscription > 0) {
    entries.push({ key: 'subscription', amount: subscription })
  }
  if (includeDisassemblyAndAssembly) {
    const uninstall = positiveAmount(fees.uninstall)
    if (uninstall > 0) {
      entries.push({ key: 'uninstall', amount: uninstall })
    }
    const installation = positiveAmount(fees.installation)
    if (installation > 0) {
      entries.push({ key: 'installation', amount: installation })
    }
  }
  return entries
}

function cashLine(
  key: OwnershipTransferFeeKey,
  amount: number,
): AllocatedOwnershipTransferFeeLine {
  return { key, amount, paymentTerm: 'cash' }
}

function installmentLine(input: {
  key: OwnershipTransferFeeKey
  amount: number
  downPayment: number
  installmentCount: number
  intervalType: OwnershipTransferFeeIntervalType
  firstDueDate: string
}): AllocatedOwnershipTransferFeeLine {
  const count = Math.max(1, input.installmentCount || 1)
  const down = round2(Math.max(0, input.downPayment))
  const financed = round2(Math.max(0, input.amount - down))
  if (financed < 0.01) {
    return cashLine(input.key, input.amount)
  }
  const installmentAmount = round2(financed / count)
  return {
    key: input.key,
    amount: input.amount,
    paymentTerm: 'installment',
    downPayment: down,
    installmentPlan: {
      down_payment: down,
      installment_count: count,
      installment_amount: installmentAmount,
      interval_type: input.intervalType,
      interval_days: input.intervalType === 'weekly' ? 7 : 30,
      first_due_date: input.firstDueDate,
    },
  }
}

/**
 * Build per-line payment terms for ownership-transfer fee services.
 * Shared down payment is applied in waterfall order (ownership → subscription →
 * uninstall → installation) so the financed remainder usually sits on one line
 * as clean N×amount installments instead of proportional splits.
 */
export function allocateOwnershipTransferFeePlans(
  input: AllocateOwnershipTransferFeePlansInput,
): AllocatedOwnershipTransferFeeLine[] {
  const entries = buildFeeEntries(
    input.fees,
    input.includeDisassemblyAndAssembly,
  )
  if (entries.length === 0) {
    return []
  }

  if (input.paymentTerm !== 'installment') {
    return entries.map((entry) => cashLine(entry.key, entry.amount))
  }

  const count = Math.max(1, input.installmentCount || 1)
  let remainingDown = round2(Math.max(0, input.downPayment))

  return entries.map((entry) => {
    const lineDown = round2(Math.min(entry.amount, remainingDown))
    remainingDown = round2(Math.max(0, remainingDown - lineDown))
    return installmentLine({
      key: entry.key,
      amount: entry.amount,
      downPayment: lineDown,
      installmentCount: count,
      intervalType: input.intervalType,
      firstDueDate: input.firstDueDate,
    })
  })
}
