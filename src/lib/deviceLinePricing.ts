import type { DeviceLineDraft } from '../components/pos/DeviceLineCard'
import { computeInstallmentCount } from './sales'

const money = (value: number) => Math.round(value * 100) / 100

/** Refresh catalog pricing without changing the device or payment dates. */
export function repriceDeviceLine(
  line: DeviceLineDraft,
  unitPrice: number,
  minDownPercent: number,
  maxInstallmentCount: number,
): DeviceLineDraft {
  if (!Number.isFinite(unitPrice) || unitPrice < 0 || Math.abs(line.unitPrice - unitPrice) < 0.009) return line

  const discountAmount = money(Math.min(unitPrice, Math.max(0,
    line.discountMode === 'percent' ? unitPrice * line.discountPercent / 100 : line.discountAmount,
  )))
  const oldNet = Math.max(0, line.unitPrice - line.discountAmount)
  const net = money(Math.max(0, unitPrice - discountAmount))
  const downRatio = oldNet > 0 ? line.downPayment / oldNet : 0
  const downPayment = line.paymentTerm === 'cash' && line.cashSchedule === 'immediate'
    ? net
    : money(net * Math.min(1, Math.max(0, downRatio, line.paymentTerm === 'installment' ? minDownPercent / 100 : 0)))
  const next = {
    ...line,
    unitPrice,
    discountAmount,
    discountPercent: unitPrice > 0 ? money(discountAmount / unitPrice * 100) : 0,
    downPayment,
  }

  if (line.paymentTerm === 'installment') {
    const count = Math.max(1, Math.min(maxInstallmentCount,
      computeInstallmentCount(oldNet, line.installmentAmount, line.downPayment) || 6,
    ))
    next.installmentAmount = Math.ceil((net - downPayment) * 100 / count) / 100
  } else if (line.cashSchedule === 'custom' && line.cashScheduleItems.length > 0) {
    const total = line.cashScheduleItems.reduce((sum, item) => sum + Math.max(0, item.amount), 0)
    const remainder = money(net - downPayment)
    let allocated = 0
    next.cashScheduleItems = line.cashScheduleItems.map((item, index, items) => {
      const amount = index === items.length - 1
        ? money(remainder - allocated)
        : Math.floor(remainder * 100 * (total > 0 ? Math.max(0, item.amount) / total : 1 / items.length)) / 100
      allocated = money(allocated + amount)
      return { ...item, amount }
    })
  }
  return next
}
