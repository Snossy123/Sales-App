import type { CustomerContractDevice, Employee, SalesInvoice, SalesInvoiceLine, ServiceCategory } from '../api/types'
import {
  createDeviceLine,
  type DeviceLineDraft,
  type IntervalType,
  type RenewalType,
  type VehicleType,
} from '../components/pos/DeviceLineCard'
import {
  createServiceLine,
  type ServiceLineDraft,
} from '../components/services/ServiceLineCard'
import { fromPlanCashScheduleItems, type CashSchedule } from './cashSchedule'
import { newAccessoryLineKey, newFeeLineKey, type CombinerAccessoryLine, type CombinerChipId, type FeeLineInstance } from './serviceCombiner'
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

function deviceDraftFromLine(line: SalesInvoiceLine, contractDate: string): DeviceLineDraft {
  let unitPrice = Number(line.unit_price ?? 0)
  const discountAmount = Number(line.discount ?? 0)
  if (!(unitPrice > 0) && Number(line.line_total) > 0) {
    unitPrice = Number(line.line_total) + discountAmount
  }
  if (!Number.isFinite(unitPrice)) unitPrice = 0
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
  const paymentTerm = (line.payment_term ?? 'cash') === 'installment' ? 'installment' : 'cash'
  const cashSchedule = (line.cash_schedule as CashSchedule) || 'immediate'

  return {
    ...draft,
    key: `edit-${line.id}`,
    serialNumber: line.serial_number ?? '',
    simNumber: line.sim_number ?? '',
    username: line.username ?? '',
    discountAmount,
    discountPercent: unitPrice > 0 ? (discountAmount / unitPrice) * 100 : 0,
    paymentTerm,
    cashSchedule,
    cashScheduleItems: fromPlanCashScheduleItems(plan),
    installmentAmount: Number(plan?.installment_amount ?? draft.installmentAmount),
    downPayment:
      paymentTerm === 'cash'
        ? cashSchedule === 'immediate'
          ? Math.max(0, unitPrice - discountAmount)
          : Number(plan?.down_payment ?? 0)
        : Number(plan?.down_payment ?? draft.downPayment),
    intervalType: (plan?.interval_type as IntervalType) || 'monthly',
    firstDueDate: plan?.first_due_date?.slice(0, 10) || draft.firstDueDate,
    technician: technicianFromLine(line),
    vehicleType: (line.vehicle_type as VehicleType) || '',
    vehiclePlateLetters: line.vehicle_plate_letters ?? '',
    vehiclePlateNumbers: line.vehicle_plate_numbers ?? '',
    chassisNumber: line.chassis_number ?? '',
    engineNumber: line.engine_number ?? '',
    renewalType: (line.renewal_type as RenewalType) || 'annual',
  }
}

function serviceDraftFromLine(line: SalesInvoiceLine, contractDate: string, minDownPercent: number): ServiceLineDraft {
  const unitPrice = Number(line.unit_price ?? 0)
  const paymentTerm = (line.payment_term ?? 'cash') === 'installment' ? 'installment' : 'cash'
  const plan = line.installment_plan
  const draft = createServiceLine(
    {
      service_id: line.service_id ?? undefined,
      description: line.description ?? line.service?.name_ar ?? line.service?.name ?? 'خدمة',
      cashPrice: unitPrice,
      installmentPrice: unitPrice,
      unit_price: unitPrice,
    },
    { contractDate, minDownPercent, paymentTerm },
  )
  return {
    ...draft,
    cashSchedule: (line.cash_schedule as CashSchedule) || 'immediate',
    cashScheduleItems: fromPlanCashScheduleItems(plan),
    downPayment: Number(plan?.down_payment ?? draft.downPayment),
    installmentAmount: Number(plan?.installment_amount ?? draft.installmentAmount),
    intervalType: (plan?.interval_type as IntervalType) || 'monthly',
    firstDueDate: plan?.first_due_date?.slice(0, 10) || draft.firstDueDate,
  }
}

function chipIdForService(line: SalesInvoiceLine): FeeLineInstance['chipId'] | undefined {
  const category = line.service?.category as ServiceCategory | undefined
  if (!category) return undefined
  const map: Partial<Record<ServiceCategory, FeeLineInstance['chipId']>> = {
    uninstall: 'uninstall',
    installation: 'installation',
    programming: 'programming',
    software: 'software',
    reset_password: 'reset_password',
    site_transfer: 'site_transfer',
  }
  return map[category]
}

export interface ServiceCombinerHydration {
  selectedChips: CombinerChipId[]
  renewalLine: DeviceLineDraft | null
  feeLines: FeeLineInstance[]
  accessoryLines: CombinerAccessoryLine[]
  contractSerial: string
  contractSim: string
  contractUsername: string
  feeTechnician: Employee | null
  selectedCustomerDevice: CustomerContractDevice | null
  collectionScope: 'contract' | 'service'
}

export function hydrateServiceCombinerFromInvoice(
  invoice: SalesInvoice,
  minDownPercent = 10,
): ServiceCombinerHydration {
  const contractDate = invoice.invoice_date?.slice(0, 10) || new Date().toISOString().split('T')[0]
  const lines = invoice.lines ?? []
  const selectedChips: CombinerChipId[] = []
  let renewalLine: DeviceLineDraft | null = null
  const feeLines: FeeLineInstance[] = []
  const accessoryLines: CombinerAccessoryLine[] = []
  let feeTechnician: Employee | null = null
  let identityLine: SalesInvoiceLine | null = null

  for (const line of lines) {
    if (line.line_type === 'accessory' || line.line_type === 'package') {
      const paymentTerm = (line.payment_term ?? invoice.payment_term ?? 'cash') === 'installment' ? 'installment' : 'cash'
      const unitPrice = Number(line.unit_price ?? 0)
      const qty = Math.max(1, Number(line.quantity ?? 1))
      accessoryLines.push({
        key: newAccessoryLineKey(line.line_type, line.id),
        line_type: line.line_type,
        product_model_id: line.product_model_id ?? undefined,
        accessory_package_id: line.accessory_package_id ?? undefined,
        name: line.description ?? line.product_model?.name_ar ?? line.accessory_package?.name_ar ?? 'إكسسوار',
        quantity: qty,
        unitSellPrice: unitPrice,
        line: {
          ...serviceDraftFromLine(line, contractDate, minDownPercent),
          paymentTerm,
        },
      })
      continue
    }

    if (isServiceInvoiceLine(line) || line.line_type === 'service') {
      const chipId = chipIdForService(line)
      const tech = technicianFromLine(line)
      if (tech && !feeTechnician) feeTechnician = tech
      feeLines.push({
        key: newFeeLineKey(),
        chipId,
        serviceId: line.service_id ?? undefined,
        serviceCategory: line.service?.category,
        line: serviceDraftFromLine(line, contractDate, minDownPercent),
        productUnitId: line.product_unit_id ?? undefined,
      })
      if (!identityLine && (line.serial_number || line.sim_number || line.username)) {
        identityLine = line
      }
      continue
    }

    if (line.line_contract_kind === 'subscription_renewal' || line.renewal_type) {
      renewalLine = deviceDraftFromLine(line, contractDate)
      if (!selectedChips.includes('annual_renewal')) selectedChips.push('annual_renewal')
      identityLine = line
      continue
    }

    // Legacy external_device lines are ignored for edit (feature removed).
    if (line.line_contract_kind === 'external_device') continue

    if (!identityLine && (line.serial_number || line.product_unit_id)) {
      identityLine = line
    }
  }

  const selectedCustomerDevice: CustomerContractDevice | null = identityLine
    ? {
        id: `edit-${identityLine.id}`,
        product_unit_id: identityLine.product_unit_id ?? null,
        sales_invoice_id: invoice.source_sales_invoice_id ?? invoice.id,
        serial_number: identityLine.serial_number ?? null,
        physical_serial: identityLine.physical_serial ?? null,
        sim_number: identityLine.sim_number ?? null,
        username: identityLine.username ?? null,
        owner_customer_id: invoice.customer_id ?? null,
      }
    : null

  const hasPerLinePlans = lines.some((line) => line.installment_plan && line.payment_term)
  const collectionScope: 'contract' | 'service' =
    invoice.payment_term && !hasPerLinePlans ? 'contract' : hasPerLinePlans && lines.every((line) => line.payment_term) ? 'service' : 'contract'

  return {
    selectedChips,
    renewalLine,
    feeLines,
    accessoryLines,
    contractSerial: identityLine?.serial_number ?? '',
    contractSim: identityLine?.sim_number ?? '',
    contractUsername: identityLine?.username ?? '',
    feeTechnician,
    selectedCustomerDevice,
    collectionScope,
  }
}
