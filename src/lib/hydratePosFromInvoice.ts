import type { Customer, Employee, SalesInvoice, SalesInvoiceLine } from '../api/types'
import {
  createDeviceLine,
  type DeviceLineDraft,
  type IntervalType,
  type RenewalType,
  type VehicleType,
} from '../components/pos/DeviceLineCard'
import type { CashSchedule } from './cashSchedule'
import { isServiceInvoiceLine } from './sales'

function technicianFromLine(line: SalesInvoiceLine): Employee | null {
  if (!line.technician) return null

  return {
    id: line.technician.id,
    employee_code: '',
    name: line.technician.name,
    job_title: line.technician.job_title,
    status: 'active',
  }
}

export function deviceDraftsFromInvoice(
  invoice: SalesInvoice,
  contractDate: string,
): DeviceLineDraft[] {
  const lines = (invoice.lines ?? []).filter((line) => !isServiceInvoiceLine(line))

  return lines.map((line) => {
    const unitPrice = Number(line.unit_price ?? 0)
    const draft = createDeviceLine(
      unitPrice,
      line.product_unit_id
        ? {
            id: line.product_unit_id,
            imei: line.product_unit?.imei,
            serial_number: line.serial_number,
          }
        : undefined,
      { contractDate },
    )
    const plan = line.installment_plan
    const paymentTerm = line.payment_term === 'installment' ? 'installment' : 'cash'

    return {
      ...draft,
      key: `edit-${line.id}`,
      serialNumber: line.serial_number ?? '',
      simNumber: line.sim_number ?? '',
      username: line.username ?? '',
      discountAmount: Number(line.discount ?? 0),
      paymentTerm,
      cashSchedule: (line.cash_schedule as CashSchedule) || 'immediate',
      installmentAmount: Number(plan?.installment_amount ?? draft.installmentAmount),
      downPayment: Number(plan?.down_payment ?? draft.downPayment),
      intervalType: (plan?.interval_type as IntervalType) || 'monthly',
      firstDueDate: plan?.first_due_date ?? draft.firstDueDate,
      technician: technicianFromLine(line),
      vehicleType: (line.vehicle_type as VehicleType) || '',
      vehiclePlateLetters: line.vehicle_plate_letters ?? '',
      vehiclePlateNumbers: line.vehicle_plate_numbers ?? '',
      chassisNumber: line.chassis_number ?? '',
      engineNumber: line.engine_number ?? '',
      renewalType: (line.renewal_type as RenewalType) || 'annual',
    }
  })
}

export function customerFromInvoice(invoice: SalesInvoice): Customer | null {
  return invoice.customer ?? null
}
