import type { Branch, Customer, Distributor, SalesRep } from '../api/types'
import type { TransactionSource } from '../components/pos/PosContractHeader'
import { distributorLabel } from './sales'

export interface CustomerTransactionSourceState {
  source: TransactionSource
  branch: Branch | null
  distributor: Distributor | null
  salesRep: SalesRep | null
  branchSearch: string
  distributorSearch: string
  salesRepSearch: string
}

export function resolveCustomerTransactionSource(
  customer: Customer,
): CustomerTransactionSourceState {
  const cleared: CustomerTransactionSourceState = {
    source: 'distributor',
    branch: null,
    distributor: null,
    salesRep: null,
    branchSearch: '',
    distributorSearch: '',
    salesRepSearch: '',
  }

  if (customer.sales_user_id && customer.sales_user) {
    const salesRep: SalesRep = {
      id: customer.sales_user.id,
      name: customer.sales_user.name,
      branch_id: customer.sales_user.branch_id,
    }
    return {
      ...cleared,
      source: 'sales',
      salesRep,
      salesRepSearch: salesRep.name,
    }
  }

  // بدون موظف مبيعات: المستخدم يختار موزع أو فرع — نعبّي الموزع إن وُجد كاقتراح فقط
  const suggested: CustomerTransactionSourceState = {
    ...cleared,
    source: 'distributor',
  }

  if (customer.distributor_id && customer.distributor) {
    suggested.distributor = customer.distributor
    suggested.distributorSearch = distributorLabel(customer.distributor)
  }

  return suggested
}
