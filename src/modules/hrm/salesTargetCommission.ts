import type { HrmUserSalesTarget } from '../../api/types'
import { formatAccountingMoney } from '../../lib/format'

export function salesTargetCommissionLabel(target: HrmUserSalesTarget): string {
  if ((target.commission_type ?? 'percent') === 'fixed') {
    return target.commission_amount != null ? formatAccountingMoney(target.commission_amount) : '—'
  }
  return target.commission_percent != null ? `${target.commission_percent}%` : '—'
}

export function salesTargetEarnedLabel(target: HrmUserSalesTarget): string {
  return formatAccountingMoney(target.commission_earned)
}
