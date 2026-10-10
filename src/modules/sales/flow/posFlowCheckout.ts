import type { AccessoryCheckoutPayload, CheckoutPayload, ProductUnit } from '../../../api/types'
import {
  lineInstallmentCount,
  lineNetTotal,
  validateDeviceLine,
} from '../../../components/pos/DeviceLineCard'
import { cashLineCheckoutFields, linePaidNow } from '../../../lib/cashSchedule'
import { computeInstallmentCount } from '../../../lib/sales'
import { isRenewalSourceReady } from '../../../lib/posRenewalSource'
import { validateServicePayment } from '../../../components/services/ServicePaymentSection'
import { addDays, isSourceReady, resolvedBranchId } from './posFlowHelpers'
import type { PosFlowDraft } from './posFlowTypes'

function sourceFields(draft: PosFlowDraft, contextBranchId: number | null) {
  const branchId = resolvedBranchId(draft, contextBranchId)
  const payload: Pick<CheckoutPayload, 'branch_id' | 'distributor_id' | 'sales_user_id'> = {
    branch_id: branchId || undefined,
  }
  if (draft.transactionSource === 'distributor' && draft.selectedDistributor) {
    payload.distributor_id = draft.selectedDistributor.id
  }
  if (draft.transactionSource === 'sales' && draft.selectedSalesRep) {
    payload.sales_user_id = draft.selectedSalesRep.id
  }
  return payload
}

function deviceLinesPayload(
  draft: PosFlowDraft,
  units: ProductUnit[],
  maxInstallmentCount: number,
  kind: 'new_contract' | 'subscription_renewal' | 'external_device' | 'ownership_transfer',
): CheckoutPayload['lines'] {
  return draft.deviceLines.map((line, index) => {
    const unit = kind === 'new_contract' ? units[index] : undefined
    const renewalDate = line.renewalType === 'annual' ? addDays(draft.contractDate, 365) : undefined
    const base = {
      line_type: 'device' as const,
      product_unit_id:
        kind === 'new_contract' ? line.productUnitId ?? unit?.id : line.productUnitId,
      unit_price: line.unitPrice,
      discount: line.discountAmount,
      serial_number: line.serialNumber.trim() || undefined,
      sim_number: line.simNumber.trim() || undefined,
      username: line.username.trim() || undefined,
      payment_term: kind === 'ownership_transfer' ? ('cash' as const) : line.paymentTerm,
      technician_id: line.technician?.id,
      vehicle_type: line.vehicleType || undefined,
      vehicle_plate_letters: line.vehiclePlateLetters.trim() || undefined,
      vehicle_plate_numbers: line.vehiclePlateNumbers.trim() || undefined,
      chassis_number: line.chassisNumber.trim() || undefined,
      engine_number: line.engineNumber.trim() || undefined,
      renewal_type: line.renewalType,
      subscription_renewal_date: renewalDate,
      ...(kind === 'subscription_renewal'
        ? { line_contract_kind: 'subscription_renewal' as const, description: 'تجديد اشتراك سنوي' }
        : {}),
    }
    if (line.paymentTerm === 'installment') {
      return {
        ...base,
        installment_plan: {
          installment_count: lineInstallmentCount(line, maxInstallmentCount),
          installment_amount: line.installmentAmount,
          down_payment: line.downPayment,
          interval_type: line.intervalType,
          interval_days: line.intervalType === 'weekly' ? 7 : 30,
          first_due_date: line.firstDueDate,
        },
      }
    }
    return { ...base, ...cashLineCheckoutFields(line) }
  })
}

export function buildDeviceCheckout(
  draft: PosFlowDraft,
  input: {
    contextBranchId: number | null
    warehouseId: number | null
    units: ProductUnit[]
    maxInstallmentCount: number
    enableInstallationFee: boolean
  },
): CheckoutPayload {
  const customerId = draft.selectedCustomer!.id
  const grossFee =
    input.enableInstallationFee && draft.applyInstallationFee ? Number(draft.installationFee) : 0
  const transportation =
    draft.deviceLines.length > 0 && draft.applyTransportationFee
      ? Math.max(0, Number(draft.transportationFee) || 0)
      : 0

  const payload: CheckoutPayload = {
    customer_id: customerId,
    ...sourceFields(draft, input.contextBranchId),
    contract_kind: 'new_contract',
    installation_fee: grossFee,
    transportation_fee: transportation,
    discount_amount: draft.feeDiscountAmount,
    invoice_date: draft.contractDate,
    notes: draft.notes.trim() || undefined,
    lines: deviceLinesPayload(draft, input.units, input.maxInstallmentCount, 'new_contract'),
  }
  if (input.warehouseId) payload.warehouse_id = input.warehouseId
  if (draft.selectedPromotionId) payload.promotion_id = Number(draft.selectedPromotionId)
  if (draft.distributorBalanceAmount > 0) {
    payload.distributor_balance_amount = draft.distributorBalanceAmount
  }
  return payload
}

export function buildRenewalCheckout(
  draft: PosFlowDraft,
  input: {
    contextBranchId: number | null
    maxInstallmentCount: number
  },
): CheckoutPayload {
  const payload: CheckoutPayload = {
    customer_id: draft.selectedCustomer!.id,
    ...sourceFields(draft, input.contextBranchId),
    contract_kind: 'subscription_renewal',
    invoice_date: draft.contractDate,
    notes: draft.notes.trim() || undefined,
    lines: deviceLinesPayload(draft, [], input.maxInstallmentCount, 'subscription_renewal'),
  }
  if (draft.sourceRenewalCandidate?.sales_invoice_id) {
    payload.source_sales_invoice_id = draft.sourceRenewalCandidate.sales_invoice_id
  }
  if (draft.distributorBalanceAmount > 0) {
    payload.distributor_balance_amount = draft.distributorBalanceAmount
  }
  return payload
}

export function buildServiceCheckout(
  draft: PosFlowDraft,
  input: { contextBranchId: number | null; maxInstallmentCount: number; total: number },
): CheckoutPayload {
  const identity = draft.selectedCustomerDevice
  const lines: CheckoutPayload['lines'] = draft.feeLines.map((item) => ({
    line_type: 'service' as const,
    service_id: item.line.service_id,
    description: item.line.description,
    unit_price: item.line.unit_price,
    technician_id: draft.feeTechnician?.id,
    product_unit_id: item.productUnitId ?? identity?.product_unit_id ?? undefined,
    serial_number: identity?.serial_number?.trim() || undefined,
    sim_number: identity?.sim_number?.trim() || undefined,
    username: identity?.username?.trim() || undefined,
    payment_term: draft.contractPayment.paymentTerm,
  }))

  const payload: CheckoutPayload = {
    customer_id: draft.selectedCustomer!.id,
    ...sourceFields(draft, input.contextBranchId),
    contract_kind: 'mixed',
    invoice_date: draft.contractDate,
    notes: draft.notes.trim() || undefined,
    collection_scope: 'contract',
    payment_term: draft.contractPayment.paymentTerm,
    lines,
  }
  if (draft.contractPayment.paymentTerm === 'installment') {
    payload.installment_plan = {
      down_payment: draft.contractPayment.downPayment,
      installment_amount: draft.contractPayment.installmentAmount,
      installment_count: computeInstallmentCount(
        input.total,
        draft.contractPayment.installmentAmount,
        draft.contractPayment.downPayment,
      ),
      interval_type: draft.contractPayment.intervalType,
      interval_days: draft.contractPayment.intervalType === 'weekly' ? 7 : 30,
      first_due_date: draft.contractPayment.firstDueDate,
    }
  }
  if (identity?.sales_invoice_id) payload.source_sales_invoice_id = identity.sales_invoice_id
  if (draft.distributorBalanceAmount > 0) {
    payload.distributor_balance_amount = draft.distributorBalanceAmount
  }
  return payload
}

export function buildOwnershipTransferCheckout(
  draft: PosFlowDraft,
  input: { contextBranchId: number | null; maxInstallmentCount: number },
): CheckoutPayload {
  return {
    customer_id: draft.selectedCustomer!.id,
    ...sourceFields(draft, input.contextBranchId),
    contract_kind: 'ownership_transfer',
    invoice_date: draft.contractDate,
    notes: draft.notes.trim() || undefined,
    source_sales_invoice_id:
      draft.sourceTransferInvoice?.id ?? draft.sourceTransferDevice?.sales_invoice_id ?? undefined,
    lines: deviceLinesPayload(draft, [], input.maxInstallmentCount, 'ownership_transfer'),
  }
}

export function buildMixedCatalogCheckout(
  draft: PosFlowDraft,
  input: {
    contextBranchId: number | null
    warehouseId: number | null
    maxInstallmentCount: number
    total: number
  },
): CheckoutPayload {
  const servicePayload = buildServiceCheckout(draft, {
    contextBranchId: input.contextBranchId,
    maxInstallmentCount: input.maxInstallmentCount,
    total: input.total,
  })
  const accessoryLines: CheckoutPayload['lines'] = draft.accessoryCart.map((line) =>
    line.line_type === 'accessory'
      ? {
          line_type: 'accessory' as const,
          product_model_id: line.product_model_id,
          description: line.name,
          quantity: line.quantity,
          unit_price: line.unit_price,
          payment_term: 'cash' as const,
          cash_schedule: 'immediate' as const,
        }
      : {
          line_type: 'package' as const,
          accessory_package_id: line.accessory_package_id,
          description: line.name,
          quantity: line.quantity,
          unit_price: line.unit_price,
          payment_term: 'cash' as const,
          cash_schedule: 'immediate' as const,
        },
  )
  return {
    ...servicePayload,
    contract_kind: 'mixed',
    warehouse_id: input.warehouseId ?? undefined,
    lines: [...(servicePayload.lines ?? []), ...accessoryLines],
  }
}

export function buildAccessoryCheckout(
  draft: PosFlowDraft,
  input: { contextBranchId: number | null; warehouseId: number },
): AccessoryCheckoutPayload {
  const branchId = resolvedBranchId(draft, input.contextBranchId)
  return {
    customer_id: draft.selectedCustomer!.id,
    branch_id: Number(branchId),
    warehouse_id: input.warehouseId,
    invoice_date: draft.contractDate,
    notes: draft.notes.trim() || undefined,
    distributor_id:
      draft.transactionSource === 'distributor' ? draft.selectedDistributor?.id : undefined,
    sales_user_id: draft.transactionSource === 'sales' ? draft.selectedSalesRep?.id : undefined,
    distributor_balance_amount:
      draft.distributorBalanceAmount > 0 ? draft.distributorBalanceAmount : undefined,
    lines: draft.accessoryCart.map((line) =>
      line.line_type === 'accessory'
        ? {
            line_type: 'accessory' as const,
            product_model_id: line.product_model_id,
            quantity: line.quantity,
            unit_price: line.unit_price,
            payment_term: 'cash' as const,
            cash_schedule: 'immediate' as const,
          }
        : {
            line_type: 'package' as const,
            accessory_package_id: line.accessory_package_id,
            quantity: line.quantity,
            unit_price: line.unit_price,
            payment_term: 'cash' as const,
            cash_schedule: 'immediate' as const,
          },
    ),
  }
}

export function flowTotals(draft: PosFlowDraft, enableInstallationFee: boolean) {
  if (draft.action === 'catalog') {
    const accessories = draft.accessoryCart.reduce(
      (sum, line) => sum + line.unit_price * line.quantity,
      0,
    )
    const services = draft.feeLines.reduce((sum, item) => sum + Number(item.line.unit_price), 0)
    const subtotal = accessories + services
    const servicePaid =
      draft.feeLines.length === 0
        ? 0
        : draft.contractPayment.paymentTerm === 'cash'
          ? services
          : Math.min(services, draft.contractPayment.downPayment)
    const paidNow = accessories + servicePaid
    return { subtotal, fees: 0, paidNow, remaining: Math.max(0, subtotal - paidNow) }
  }
  if (draft.action === 'ownership_transfer') {
    return { subtotal: 0, fees: 0, paidNow: 0, remaining: 0 }
  }

  const devicesSubtotal = draft.deviceLines.reduce((sum, line) => sum + lineNetTotal(line), 0)
  const grossFee =
    draft.action === 'new_device' && enableInstallationFee && draft.applyInstallationFee
      ? Number(draft.installationFee)
      : 0
  const netFee = Math.max(0, grossFee - draft.feeDiscountAmount) * draft.deviceLines.length
  const transportation =
    draft.action === 'new_device' && draft.deviceLines.length > 0 && draft.applyTransportationFee
      ? Math.max(0, Number(draft.transportationFee) || 0)
      : 0
  const fees = netFee + transportation
  let paidNow = fees
  for (const line of draft.deviceLines) {
    paidNow += linePaidNow(line.paymentTerm, line.cashSchedule, lineNetTotal(line), line.downPayment)
  }
  const total = devicesSubtotal + fees
  return { subtotal: devicesSubtotal, fees, paidNow, remaining: Math.max(0, total - paidNow) }
}

export function detailsReady(
  draft: PosFlowDraft,
  input: {
    warehouseId: number | null
    minDownPercent: number
    maxInstallmentCount: number
  },
): string[] {
  const errors: string[] = []
  if (draft.action === 'new_device' || draft.action === 'external_device') {
    if (draft.action === 'new_device' && input.warehouseId == null) {
      errors.push('اختار مخزن من الشريط العلوي')
    }
    if (draft.deviceLines.length === 0) errors.push('أضف جهازاً واحداً على الأقل')
    const invalid = draft.deviceLines.some(
      (line) =>
        !validateDeviceLine(line, input.minDownPercent, input.maxInstallmentCount).valid,
    )
    if (invalid) errors.push('أكمل بيانات كل جهاز والدفع')
  }
  if (draft.action === 'ownership_transfer') {
    if (!draft.sourceTransferInvoice && !draft.sourceTransferDevice) {
      errors.push('اختار التعاقد الأصلي أو الجهاز لنقل الملكية')
    }
    if (draft.deviceLines.length === 0) errors.push('أكمل بيانات الجهاز المنقول')
  }
  if (draft.action === 'renewal') {
    if (
      !isRenewalSourceReady({
        candidate: draft.sourceRenewalCandidate,
        serialNumber: draft.renewalSerial,
        simNumber: draft.renewalSim,
        username: draft.renewalUsername,
      })
    ) {
      errors.push('اختار الجهاز أو أدخل بياناته')
    }
    const line = draft.deviceLines[0]
    if (
      !line ||
      !validateDeviceLine(line, input.minDownPercent, input.maxInstallmentCount, {
        requireTechnician: false,
      }).valid
    ) {
      errors.push('أكمل بيانات التجديد والدفع')
    }
  }
  if (draft.action === 'catalog') {
    if (draft.feeLines.length === 0 && draft.accessoryCart.length === 0) {
      errors.push('أضف خدمة أو إكسسوار واحد على الأقل')
    }
    if (draft.feeLines.length > 0 && !draft.feeTechnician) errors.push('اختار الفني')
    if (draft.feeLines.length > 0) {
      const serviceTotal = draft.feeLines.reduce((sum, item) => sum + Number(item.line.unit_price), 0)
      const payment = validateServicePayment(
        draft.contractPayment,
        serviceTotal,
        input.minDownPercent,
        input.maxInstallmentCount,
      )
      if (!payment.valid) errors.push(...payment.errors)
    }
    if (draft.accessoryCart.length > 0 && input.warehouseId == null) {
      errors.push('اختار مخزن من الشريط العلوي')
    }
  }
  return errors
}

export function canLeaveStep(
  draft: PosFlowDraft,
  step: PosFlowDraft['step'],
  extra?: { warehouseId?: number | null; minDownPercent?: number; maxInstallmentCount?: number },
): boolean {
  if (step === 'intake') {
    return draft.customerConfirmed && Boolean(draft.selectedCustomer) && isSourceReady(draft) && Boolean(draft.contractDate)
  }
  if (step === 'action') return Boolean(draft.action)
  if (step === 'details') {
    return (
      detailsReady(draft, {
        warehouseId: extra?.warehouseId ?? null,
        minDownPercent: extra?.minDownPercent ?? 10,
        maxInstallmentCount: extra?.maxInstallmentCount ?? 24,
      }).length === 0
    )
  }
  return true
}
