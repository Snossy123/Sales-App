import type { TransactionSource } from '../components/pos/PosContractHeader'

export interface CheckoutSourceIds {
  branch_id?: number
  distributor_id?: number
  sales_user_id?: number
}

export function checkoutSourceIds(input: {
  transactionSource: TransactionSource
  branchId?: number | '' | null
  distributorId?: number | null
  salesRepId?: number | null
}): CheckoutSourceIds {
  const ids: CheckoutSourceIds = {}
  if (input.branchId) ids.branch_id = Number(input.branchId)
  if (input.transactionSource === 'distributor' && input.distributorId) {
    ids.distributor_id = input.distributorId
  }
  if (input.transactionSource === 'sales' && input.salesRepId) {
    ids.sales_user_id = input.salesRepId
  }
  return ids
}

export function sourceFieldFor(source: TransactionSource): TransactionSource {
  return source
}
