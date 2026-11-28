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
  /** @deprecated Per-line plans removed; use sharedInstallmentPlan on the allocation result. */
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

export interface OwnershipTransferFeeAllocation {
  lines: AllocatedOwnershipTransferFeeLine[]
  /** One schedule on sum(fees) − down payment; null when cash or fully covered by down. */
  sharedInstallmentPlan: OwnershipTransferInstallmentPlan | null
  feesTotal: number
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

function sharedPlan(input: {
  feesTotal: number
  downPayment: number
  installmentCount: number
  intervalType: OwnershipTransferFeeIntervalType
  firstDueDate: string
}): OwnershipTransferInstallmentPlan | null {
  const count = Math.max(1, input.installmentCount || 1)
  const down = round2(Math.min(input.feesTotal, Math.max(0, input.downPayment)))
  const financed = round2(Math.max(0, input.feesTotal - down))
  if (financed < 0.01) {
    return null
  }
  return {
    down_payment: down,
    installment_count: count,
    installment_amount: round2(financed / count),
    interval_type: input.intervalType,
    interval_days: input.intervalType === 'weekly' ? 7 : 30,
    first_due_date: input.firstDueDate,
  }
}

/**
 * Build per-service fee invoice lines plus one shared installment schedule on
 * the total of those fees (not one plan per service line).
 */
export function allocateOwnershipTransferFeePlans(
  input: AllocateOwnershipTransferFeePlansInput,
): OwnershipTransferFeeAllocation {
  const entries = buildFeeEntries(
    input.fees,
    input.includeDisassemblyAndAssembly,
  )
  const feesTotal = round2(entries.reduce((sum, entry) => sum + entry.amount, 0))

  if (entries.length === 0) {
    return { lines: [], sharedInstallmentPlan: null, feesTotal: 0 }
  }

  if (input.paymentTerm !== 'installment') {
    return {
      lines: entries.map((entry) => cashLine(entry.key, entry.amount)),
      sharedInstallmentPlan: null,
      feesTotal,
    }
  }

  const plan = sharedPlan({
    feesTotal,
    downPayment: input.downPayment,
    installmentCount: input.installmentCount,
    intervalType: input.intervalType,
    firstDueDate: input.firstDueDate,
  })

  if (!plan) {
    return {
      lines: entries.map((entry) => cashLine(entry.key, entry.amount)),
      sharedInstallmentPlan: null,
      feesTotal,
    }
  }

  return {
    lines: entries.map((entry) => ({
      key: entry.key,
      amount: entry.amount,
      paymentTerm: 'installment' as const,
    })),
    sharedInstallmentPlan: plan,
    feesTotal,
  }
}
