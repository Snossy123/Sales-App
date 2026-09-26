import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import type { ContractKind, Employee, GpsProduct } from '../../api/types'
import { resolveGpsUnitPrice } from '../../lib/gpsProductPricing'
import type { DiscountMode } from '../../lib/discount'
import { parseLocalizedNumber } from '../../lib/normalizeDigits'
import { normalizeScannedDigits, normalizeScannedInput } from '../../lib/scanner'
import { computeMinDownPayment, suggestInstallmentAmount } from '../../lib/sales'
import { cashRemainder, isCustomCashSchedule, seedCashScheduleItems } from '../../lib/cashSchedule'
import {
  addDays,
  lastInstallmentDate,
  nextInstallmentInterval,
} from '../../lib/installmentSchedule'
import {
  lineInstallmentCount,
  lineNetTotal,
  validateCashLine,
  validateDeviceLine,
  validateInstallmentLine,
  type DeviceLineDraft,
  type IntervalType,
  type LinePaymentTerm,
  type RenewalType,
} from './DeviceLineCard'

export const DEVICE_PAYMENT_TERMS: LinePaymentTerm[] = ['installment', 'cash']
export const DEVICE_INTERVAL_TYPES: IntervalType[] = ['weekly', 'monthly']

export function fieldErrorClass(hasError: boolean, baseClass: string): string {
  return hasError ? `${baseClass} border-error` : baseClass
}

export function priceForLine(
  product: GpsProduct | undefined,
  contractKind: ContractKind,
  paymentTerm: LinePaymentTerm,
  renewalType: RenewalType,
  cashPrice: number,
  installmentPrice: number,
): number {
  if (!product) {
    return paymentTerm === 'cash' ? cashPrice : installmentPrice
  }
  return resolveGpsUnitPrice(product, {
    contractKind,
    paymentTerm,
    renewalType,
  })
}

export interface UseDeviceLineEditorInput {
  index: number
  line: DeviceLineDraft
  contractDate: string
  contractKind: ContractKind
  product?: GpsProduct
  cashPrice: number
  installmentPrice: number
  onChange: (line: DeviceLineDraft) => void
  minDownPercent: number
  maxInstallmentCount: number
  employees: Employee[]
  showErrors?: boolean
  hidePaymentSection?: boolean
  lockedFromSource?: boolean
  autoFocusSerial?: boolean
}

export function useDeviceLineEditor({
  index,
  line,
  contractDate,
  contractKind,
  product,
  cashPrice,
  installmentPrice,
  onChange,
  minDownPercent,
  maxInstallmentCount,
  employees,
  showErrors = false,
  hidePaymentSection = false,
  lockedFromSource = false,
  autoFocusSerial = false,
}: UseDeviceLineEditorInput) {
  const serialInputRef = useRef<HTMLInputElement>(null)
  const simInputRef = useRef<HTMLInputElement>(null)
  const usernameInputRef = useRef<HTMLInputElement>(null)

  const patch = (partial: Partial<DeviceLineDraft>) => onChange({ ...line, ...partial })

  useEffect(() => {
    if (index === 0 && autoFocusSerial && !lockedFromSource) {
      serialInputRef.current?.focus()
    }
  }, [index, autoFocusSerial, lockedFromSource])

  const patchScanned = (field: 'serialNumber' | 'simNumber' | 'username', raw: string) => {
    const next = field === 'username' ? normalizeScannedInput(raw) : normalizeScannedDigits(raw)
    patch({ [field]: next } as Partial<DeviceLineDraft>)
  }

  const focusNextAfterScan = (
    e: KeyboardEvent<HTMLInputElement>,
    nextRef: RefObject<HTMLInputElement | null>,
  ) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    nextRef.current?.focus()
    nextRef.current?.select()
  }

  const net = lineNetTotal(line)
  const renewalDate = line.renewalType === 'annual' ? addDays(contractDate, 365) : undefined
  const computedCount = useMemo(
    () => lineInstallmentCount(line, maxInstallmentCount),
    [line, maxInstallmentCount],
  )
  const deviceValidation = validateDeviceLine(line, minDownPercent, maxInstallmentCount, {
    requireTechnician: !lockedFromSource && !hidePaymentSection,
    skipPayment: hidePaymentSection,
  })
  const fieldErrors = showErrors ? deviceValidation.fieldErrors : {}
  const installmentValidation = validateInstallmentLine(line, minDownPercent, maxInstallmentCount)
  const cashValidation = validateCashLine(line, maxInstallmentCount)
  const cashRemainderAmount = cashRemainder(net, line.downPayment)
  const totalAfterDown = Math.max(0, net - line.downPayment)
  const lastDueDate =
    line.paymentTerm === 'installment'
      ? lastInstallmentDate(line.firstDueDate, computedCount, line.intervalType)
      : null

  const [technicianSearch, setTechnicianSearch] = useState('')
  const filteredEmployees = useMemo(() => {
    const q = technicianSearch.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((e) => e.name.toLowerCase().includes(q))
  }, [employees, technicianSearch])

  const hasDeviceErrors = showErrors && !deviceValidation.valid
  const hasPaymentErrors =
    showErrors &&
    (line.paymentTerm === 'installment' ? !installmentValidation.valid : !cashValidation.valid)

  const switchToInstallment = () => {
    const price = priceForLine(
      product,
      contractKind,
      'installment',
      line.renewalType,
      cashPrice,
      installmentPrice,
    )
    const minDown = computeMinDownPayment(price, minDownPercent)
    patch({
      paymentTerm: 'installment',
      unitPrice: price,
      discountAmount: 0,
      discountPercent: 0,
      downPayment: minDown,
      cashScheduleItems: [],
      installmentAmount: suggestInstallmentAmount(price, 6, minDownPercent),
      firstDueDate: nextInstallmentInterval(contractDate, 'monthly'),
    })
  }

  const switchToCash = () => {
    const price = priceForLine(
      product,
      contractKind,
      'cash',
      line.renewalType,
      cashPrice,
      installmentPrice,
    )
    patch({
      paymentTerm: 'cash',
      unitPrice: price,
      discountAmount: 0,
      discountPercent: 0,
      cashSchedule: 'immediate',
      cashScheduleItems: [],
      downPayment: price,
    })
  }

  const handleRenewalTypeChange = (renewalType: RenewalType) => {
    const price = priceForLine(
      product,
      contractKind,
      line.paymentTerm,
      renewalType,
      cashPrice,
      installmentPrice,
    )
    const partial: Partial<DeviceLineDraft> = { renewalType, unitPrice: price }
    if (line.paymentTerm === 'installment') {
      partial.downPayment = computeMinDownPayment(price, minDownPercent)
      partial.installmentAmount = suggestInstallmentAmount(price, 6, minDownPercent)
    } else if (line.cashSchedule === 'immediate') {
      const nextNet = Math.max(0, price - line.discountAmount)
      partial.downPayment = nextNet
    }
    patch(partial)
  }

  const handleDiscountChange = (next: {
    amount: number
    percent: number
    mode: DiscountMode
  }) => {
    const partial: Partial<DeviceLineDraft> = {
      discountAmount: next.amount,
      discountPercent: next.percent,
      discountMode: next.mode,
    }
    if (line.paymentTerm === 'cash' && line.cashSchedule === 'immediate') {
      partial.downPayment = Math.max(0, line.unitPrice - next.amount)
    }
    patch(partial)
  }

  const applyCashSchedule = (cashSchedule: DeviceLineDraft['cashSchedule']) => {
    patch({
      cashSchedule,
      downPayment: cashSchedule === 'immediate' ? net : 0,
      cashScheduleItems: isCustomCashSchedule(cashSchedule)
        ? seedCashScheduleItems(net, contractDate)
        : [],
    })
  }

  const setIntervalType = (type: IntervalType) => {
    patch({
      intervalType: type,
      firstDueDate: nextInstallmentInterval(contractDate, type),
    })
  }

  const setDownPayment = (raw: string) => {
    patch({ downPayment: parseLocalizedNumber(raw) })
  }

  const setInstallmentAmount = (raw: string) => {
    patch({ installmentAmount: parseLocalizedNumber(raw) })
  }

  return {
    line,
    contractDate,
    maxInstallmentCount,
    patch,
    patchScanned,
    focusNextAfterScan,
    serialInputRef,
    simInputRef,
    usernameInputRef,
    technicianSearch,
    setTechnicianSearch,
    filteredEmployees,
    net,
    renewalDate,
    computedCount,
    deviceValidation,
    fieldErrors,
    installmentValidation,
    cashValidation,
    cashRemainderAmount,
    totalAfterDown,
    lastDueDate,
    hasDeviceErrors,
    hasPaymentErrors,
    switchToInstallment,
    switchToCash,
    handleRenewalTypeChange,
    handleDiscountChange,
    applyCashSchedule,
    setIntervalType,
    setDownPayment,
    setInstallmentAmount,
    isCustomSchedule: isCustomCashSchedule(line.cashSchedule),
  }
}
