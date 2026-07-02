import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import type { Employee } from '../../api/types'
import {
  type DiscountMode,
} from '../../lib/discount'
import { parseLocalizedNumber } from '../../lib/normalizeDigits'
import { normalizeScannedInput } from '../../lib/scanner'
import {
  computeInstallmentCount,
  computeMinDownPayment,
  suggestInstallmentAmount,
} from '../../lib/sales'
import { renewalTypeLabels } from '../../lib/contractFields'
import { cashRemainder, type CashSchedule } from '../../lib/cashSchedule'
import { Icon } from '../Icon'
import { CashScheduleSelector } from './CashScheduleSelector'
import { DiscountInput } from './DiscountInput'
import { SearchableSelect } from '../SearchableSelect'
import { PosMoneyInput } from './PosMoneyInput'
import {
  posInputClass,
  posLabelClass,
  posModeToggleGroupClass,
  posScanClass,
  posSelectClass,
  posSectionTitleClass,
  posStaticFieldClass,
} from './posFormStyles'

export type VehicleType = 'car' | 'tuk_tuk' | 'motorcycle' | 'other'
export type RenewalType = 'annual' | 'permanent'
export type LinePaymentTerm = 'cash' | 'installment'
export type IntervalType = 'monthly' | 'weekly'

export interface DeviceLineDraft {
  key: string
  productUnitId?: number
  imei?: string
  serialNumber: string
  simNumber: string
  username: string
  unitPrice: number
  discountAmount: number
  discountPercent: number
  discountMode: DiscountMode
  paymentTerm: LinePaymentTerm
  cashSchedule: CashSchedule
  installmentAmount: number
  downPayment: number
  intervalType: IntervalType
  firstDueDate: string
  technician: Employee | null
  vehicleType: VehicleType | ''
  vehiclePlateLetters: string
  vehiclePlateNumbers: string
  chassisNumber: string
  engineNumber: string
  renewalType: RenewalType
}

export interface DeviceLineFieldErrors {
  serialNumber?: string
  simNumber?: string
  username?: string
  vehicleType?: string
  vehiclePlateLetters?: string
  vehiclePlateNumbers?: string
  chassisNumber?: string
  engineNumber?: string
}

const colBox = 'rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-sm'

function fieldErrorClass(hasError: boolean, baseClass: string): string {
  return hasError ? `${baseClass} border-error` : baseClass
}

const PAYMENT_TERMS: LinePaymentTerm[] = ['installment', 'cash']
const INTERVAL_TYPES: IntervalType[] = ['weekly', 'monthly']

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function lastInstallmentDate(
  firstDueDate: string,
  count: number,
  intervalType: IntervalType,
): string | null {
  if (count < 1 || !firstDueDate) return null
  const stepDays = intervalType === 'weekly' ? 7 : 30
  return addDays(firstDueDate, stepDays * (count - 1))
}

export function lineNetTotal(line: DeviceLineDraft): number {
  return Math.max(0, line.unitPrice - line.discountAmount)
}

export function lineInstallmentCount(
  line: DeviceLineDraft,
  maxInstallmentCount: number,
): number {
  const net = lineNetTotal(line)
  return computeInstallmentCount(
    net,
    line.installmentAmount,
    line.downPayment,
    maxInstallmentCount,
  )
}

export function validateCashLine(line: DeviceLineDraft): { valid: boolean; errors: string[] } {
  if (line.paymentTerm !== 'cash') return { valid: true, errors: [] }

  const errors: string[] = []
  const net = lineNetTotal(line)
  if (line.downPayment < 0) {
    errors.push('المقدم لا يمكن أن يكون سالبًا')
  }
  if (line.downPayment > net + 0.009) {
    errors.push('المقدم يجب أن يكون أقل من أو يساوي صافي الجهاز')
  }

  return { valid: errors.length === 0, errors }
}

export function validateInstallmentLine(
  line: DeviceLineDraft,
  minDownPercent: number,
  maxInstallmentCount: number,
): { valid: boolean; errors: string[] } {
  if (line.paymentTerm !== 'installment') return { valid: true, errors: [] }

  const errors: string[] = []
  const net = lineNetTotal(line)
  const minDown = computeMinDownPayment(net, minDownPercent)
  const count = lineInstallmentCount(line, maxInstallmentCount)

  if (line.installmentAmount <= 0) {
    errors.push('قيمة القسط يجب أن تكون أكبر من صفر')
  }
  if (line.downPayment >= net - 0.009) {
    errors.push('المقدم يجب أن يكون أقل من صافي الجهاز')
  }
  if (line.downPayment < minDown - 0.009) {
    errors.push(`المقدم أقل من الحد الأدنى (${minDownPercent}%)`)
  }
  if (count < 1 && line.installmentAmount > 0 && line.downPayment < net) {
    errors.push('لا يمكن حساب عدد أقساط صالح')
  }

  return { valid: errors.length === 0, errors }
}

export function validateDeviceLine(
  line: DeviceLineDraft,
  minDownPercent: number,
  maxInstallmentCount: number,
): { valid: boolean; fieldErrors: DeviceLineFieldErrors; errors: string[] } {
  const fieldErrors: DeviceLineFieldErrors = {}

  if (!line.serialNumber.trim()) {
    fieldErrors.serialNumber = 'السريال مطلوب'
  }
  if (!line.simNumber.trim()) {
    fieldErrors.simNumber = 'رقم الشريحة مطلوب'
  }
  if (!line.username.trim()) {
    fieldErrors.username = 'اسم المستخدم مطلوب'
  }
  if (!line.vehicleType) {
    fieldErrors.vehicleType = 'نوع المركبة مطلوب'
  }
  if (line.vehicleType === 'car' || line.vehicleType === 'motorcycle') {
    if (!line.vehiclePlateLetters.trim()) {
      fieldErrors.vehiclePlateLetters = 'حروف اللوحة مطلوبة'
    }
    if (!line.vehiclePlateNumbers.trim()) {
      fieldErrors.vehiclePlateNumbers = 'أرقام اللوحة مطلوبة'
    }
  }
  if (line.vehicleType === 'tuk_tuk') {
    if (!line.chassisNumber.trim()) {
      fieldErrors.chassisNumber = 'رقم الشاسيه مطلوب'
    }
    if (!line.engineNumber.trim()) {
      fieldErrors.engineNumber = 'رقم الموتور مطلوب'
    }
  }

  const cashValidation = validateCashLine(line)
  const installmentValidation = validateInstallmentLine(line, minDownPercent, maxInstallmentCount)
  const paymentErrors = [...cashValidation.errors, ...installmentValidation.errors]
  const fieldErrorMessages = Object.values(fieldErrors)
  const errors = [...fieldErrorMessages, ...paymentErrors]

  return {
    valid: errors.length === 0,
    fieldErrors,
    errors,
  }
}

interface DeviceLineCardProps {
  index: number
  line: DeviceLineDraft
  contractDate: string
  cashPrice: number
  installmentPrice: number
  onChange: (line: DeviceLineDraft) => void
  minDownPercent: number
  maxInstallmentCount: number
  employees: Employee[]
  employeesLoading: boolean
  showErrors?: boolean
}

export function DeviceLineCard({
  index,
  line,
  contractDate,
  cashPrice,
  installmentPrice,
  onChange,
  minDownPercent,
  maxInstallmentCount,
  employees,
  employeesLoading,
  showErrors = false,
}: DeviceLineCardProps) {
  const [expanded, setExpanded] = useState(true)
  const [technicianSearch, setTechnicianSearch] = useState('')
  const serialInputRef = useRef<HTMLInputElement>(null)
  const simInputRef = useRef<HTMLInputElement>(null)
  const usernameInputRef = useRef<HTMLInputElement>(null)
  const patch = (partial: Partial<DeviceLineDraft>) => onChange({ ...line, ...partial })

  useEffect(() => {
    if (index === 0 && expanded) {
      serialInputRef.current?.focus()
    }
  }, [index, expanded])

  const patchScanned = (field: 'serialNumber' | 'simNumber' | 'username', raw: string) => {
    patch({ [field]: normalizeScannedInput(raw) } as Partial<DeviceLineDraft>)
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
  const deviceValidation = validateDeviceLine(line, minDownPercent, maxInstallmentCount)
  const fieldErrors = showErrors ? deviceValidation.fieldErrors : {}
  const installmentValidation = validateInstallmentLine(line, minDownPercent, maxInstallmentCount)
  const cashValidation = validateCashLine(line)
  const cashRemainderAmount = cashRemainder(net, line.downPayment)
  const totalAfterDown = Math.max(0, net - line.downPayment)
  const lastDueDate =
    line.paymentTerm === 'installment'
      ? lastInstallmentDate(line.firstDueDate, computedCount, line.intervalType)
      : null

  const filteredEmployees = useMemo(() => {
    const q = technicianSearch.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((e) => e.name.toLowerCase().includes(q))
  }, [employees, technicianSearch])

  const switchToInstallment = () => {
    const price = installmentPrice
    const minDown = computeMinDownPayment(price, minDownPercent)
    patch({
      paymentTerm: 'installment',
      unitPrice: price,
      discountAmount: 0,
      discountPercent: 0,
      downPayment: minDown,
      installmentAmount: suggestInstallmentAmount(price, 6, minDownPercent),
      firstDueDate: addDays(contractDate, 30),
    })
  }

  const switchToCash = () => {
    patch({
      paymentTerm: 'cash',
      unitPrice: cashPrice,
      discountAmount: 0,
      discountPercent: 0,
      cashSchedule: 'immediate',
      downPayment: 0,
    })
  }

  const handleDiscountChange = (next: {
    amount: number
    percent: number
    mode: DiscountMode
  }) => {
    patch({
      discountAmount: next.amount,
      discountPercent: next.percent,
      discountMode: next.mode,
    })
  }

  return (
    <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full flex-wrap items-center gap-sm bg-primary/10 px-md py-sm text-sm transition-colors hover:bg-primary/15"
      >
        <Icon
          name="expand_more"
          size={22}
          className={`shrink-0 text-primary transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
        <span className="font-semibold text-on-surface">جهاز {index + 1}</span>
        {line.imei && (
          <span className="text-on-surface-variant" dir="ltr">
            IMEI: {line.imei}
          </span>
        )}
        <span className="mr-auto tabular-nums text-on-surface">
          <strong>{net.toLocaleString('ar-EG')} ج.م</strong>
        </span>
      </button>

      {expanded && (
        <div className="space-y-md p-md">
          <div className="grid gap-sm md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className={posLabelClass}>السريال (جهاز)</label>
              <input
                ref={serialInputRef}
                value={line.serialNumber}
                onChange={(e) => patchScanned('serialNumber', e.target.value)}
                onKeyDown={(e) => focusNextAfterScan(e, simInputRef)}
                placeholder="امسح أو أدخل السريال"
                className={fieldErrorClass(Boolean(fieldErrors.serialNumber), posScanClass)}
                dir="ltr"
                autoComplete="off"
                spellCheck={false}
                data-tour={index === 0 ? 'pos-serial-scan' : undefined}
              />
              {fieldErrors.serialNumber && (
                <p className="mt-xs text-xs text-error">{fieldErrors.serialNumber}</p>
              )}
            </div>
            <div>
              <label className={posLabelClass}>رقم الشريحة / الكارت</label>
              <input
                ref={simInputRef}
                value={line.simNumber}
                onChange={(e) => patchScanned('simNumber', e.target.value)}
                onKeyDown={(e) => focusNextAfterScan(e, usernameInputRef)}
                placeholder="امسح أو أدخل رقم الشريحة"
                className={fieldErrorClass(Boolean(fieldErrors.simNumber), posScanClass)}
                dir="ltr"
                autoComplete="off"
                spellCheck={false}
                inputMode="numeric"
              />
              {fieldErrors.simNumber && (
                <p className="mt-xs text-xs text-error">{fieldErrors.simNumber}</p>
              )}
            </div>
            <div>
              <label className={posLabelClass}>اسم المستخدم (تطبيق التتبع)</label>
              <input
                ref={usernameInputRef}
                value={line.username}
                onChange={(e) => patchScanned('username', e.target.value)}
                placeholder="username"
                className={fieldErrorClass(Boolean(fieldErrors.username), posInputClass)}
                dir="ltr"
                autoComplete="off"
                spellCheck={false}
              />
              {fieldErrors.username && (
                <p className="mt-xs text-xs text-error">{fieldErrors.username}</p>
              )}
            </div>
            <div>
              <SearchableSelect
                label="الفني (دعم)"
                options={filteredEmployees}
                value={line.technician}
                onChange={(technician) => patch({ technician })}
                onSearchChange={setTechnicianSearch}
                getOptionValue={(emp) => emp.id}
                getOptionLabel={(emp) =>
                  `${emp.name}${emp.job_title ? ` — ${emp.job_title}` : ''}`
                }
                placeholder="ابحث باسم الفني..."
                loading={employeesLoading}
                emptyMessage="لا يوجد فني مطابق"
              />
            </div>
          </div>

          <div className="grid gap-sm md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className={posLabelClass}>نوع المركبة</label>
              <select
                value={line.vehicleType}
                onChange={(e) => patch({ vehicleType: e.target.value as VehicleType | '' })}
                className={fieldErrorClass(Boolean(fieldErrors.vehicleType), posSelectClass)}
              >
                <option value="">— اختر —</option>
                <option value="car">سيارة</option>
                <option value="tuk_tuk">توك توك</option>
                <option value="motorcycle">دراجة نارية</option>
                <option value="other">أخرى</option>
              </select>
              {fieldErrors.vehicleType && (
                <p className="mt-xs text-xs text-error">{fieldErrors.vehicleType}</p>
              )}
            </div>

            <div>
              <label className={posLabelClass}>التجديد</label>
              <select
                value={line.renewalType}
                onChange={(e) => patch({ renewalType: e.target.value as RenewalType })}
                className={posSelectClass}
              >
                <option value="annual">{renewalTypeLabels.annual}</option>
                <option value="permanent">{renewalTypeLabels.permanent}</option>
              </select>
              {line.renewalType === 'annual' && renewalDate && (
                <p className="mt-xs text-xs text-on-surface-variant">التجديد: {renewalDate}</p>
              )}
            </div>

            {(line.vehicleType === 'car' || line.vehicleType === 'motorcycle') && (
              <>
                <div>
                  <label className={posLabelClass}>حروف اللوحة</label>
                  <input
                    value={line.vehiclePlateLetters}
                    onChange={(e) => patch({ vehiclePlateLetters: e.target.value })}
                    className={fieldErrorClass(
                      Boolean(fieldErrors.vehiclePlateLetters),
                      posInputClass,
                    )}
                  />
                  {fieldErrors.vehiclePlateLetters && (
                    <p className="mt-xs text-xs text-error">{fieldErrors.vehiclePlateLetters}</p>
                  )}
                </div>
                <div>
                  <label className={posLabelClass}>أرقام اللوحة</label>
                  <input
                    value={line.vehiclePlateNumbers}
                    onChange={(e) => patch({ vehiclePlateNumbers: e.target.value })}
                    dir="ltr"
                    className={fieldErrorClass(
                      Boolean(fieldErrors.vehiclePlateNumbers),
                      posInputClass,
                    )}
                  />
                  {fieldErrors.vehiclePlateNumbers && (
                    <p className="mt-xs text-xs text-error">{fieldErrors.vehiclePlateNumbers}</p>
                  )}
                </div>
              </>
            )}

            {line.vehicleType === 'tuk_tuk' && (
              <>
                <div>
                  <label className={posLabelClass}>الشاسيه</label>
                  <input
                    value={line.chassisNumber}
                    onChange={(e) => patch({ chassisNumber: e.target.value })}
                    dir="ltr"
                    className={fieldErrorClass(Boolean(fieldErrors.chassisNumber), posInputClass)}
                  />
                  {fieldErrors.chassisNumber && (
                    <p className="mt-xs text-xs text-error">{fieldErrors.chassisNumber}</p>
                  )}
                </div>
                <div>
                  <label className={posLabelClass}>الموتور</label>
                  <input
                    value={line.engineNumber}
                    onChange={(e) => patch({ engineNumber: e.target.value })}
                    dir="ltr"
                    className={fieldErrorClass(Boolean(fieldErrors.engineNumber), posInputClass)}
                  />
                  {fieldErrors.engineNumber && (
                    <p className="mt-xs text-xs text-error">{fieldErrors.engineNumber}</p>
                  )}
                </div>
              </>
            )}

            <div className="md:col-span-2 xl:col-span-2">
              <label className={posLabelClass}>خصم الجهاز</label>
              <DiscountInput
                compact
                baseAmount={line.unitPrice}
                amount={line.discountAmount}
                percent={line.discountPercent}
                onChange={handleDiscountChange}
              />
            </div>
          </div>

          <div className={colBox} data-tour={index === 0 ? 'pos-payment' : undefined}>
            <div className="mb-sm flex flex-wrap items-center justify-between gap-sm">
              <h4 className={posSectionTitleClass}>طريقة الدفع — الجهاز</h4>
              <div className="flex flex-wrap items-center gap-sm">
                <div className={`${posModeToggleGroupClass} w-[11rem] text-xs`}>
                  {PAYMENT_TERMS.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() =>
                        term === 'installment' ? switchToInstallment() : switchToCash()
                      }
                      className={`flex h-full flex-1 items-center justify-center rounded-md text-xs font-medium transition-colors ${
                        line.paymentTerm === term
                          ? 'bg-primary text-on-primary'
                          : 'text-on-surface-variant'
                      }`}
                    >
                      {term === 'cash' ? 'كاش' : 'تقسيط'}
                    </button>
                  ))}
                </div>
                {line.paymentTerm === 'installment' && (
                  <div className={`${posModeToggleGroupClass} w-[11rem] text-xs`}>
                    {INTERVAL_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() =>
                          patch({
                            intervalType: type,
                            firstDueDate: addDays(contractDate, type === 'weekly' ? 7 : 30),
                          })
                        }
                        className={`flex h-full flex-1 items-center justify-center rounded-md text-xs font-medium transition-colors ${
                          line.intervalType === type
                            ? 'bg-primary text-on-primary'
                            : 'text-on-surface-variant'
                        }`}
                      >
                        {type === 'monthly' ? 'شهري' : 'أسبوعي'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {line.paymentTerm === 'installment' ? (
              <div className="space-y-sm">
                <div className="grid gap-sm sm:grid-cols-3">
                  <div>
                    <label className={posLabelClass}>المقدم</label>
                    <PosMoneyInput
                      min={0}
                      step="0.01"
                      value={line.downPayment}
                      onChange={(e) =>
                        patch({ downPayment: parseLocalizedNumber(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <label className={posLabelClass}>عدد الأقساط</label>
                    <div
                      className={`${posStaticFieldClass} bg-surface-container-low font-medium tabular-nums`}
                    >
                      {computedCount > 0 ? computedCount : '—'}
                    </div>
                  </div>
                  <div>
                    <label className={posLabelClass}>أول استحقاق</label>
                    <input
                      type="date"
                      value={line.firstDueDate}
                      onChange={(e) => patch({ firstDueDate: e.target.value })}
                      className={posInputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className={posLabelClass}>قيمة القسط</label>
                  <PosMoneyInput
                    min={0}
                    step="0.01"
                    value={line.installmentAmount}
                    onChange={(e) =>
                      patch({ installmentAmount: parseLocalizedNumber(e.target.value) })
                    }
                  />
                </div>
                <div className="grid gap-sm rounded-lg border border-tertiary/25 bg-tertiary/10 px-sm py-sm text-sm sm:grid-cols-3">
                  <div className="tabular-nums">
                    <span className="text-on-surface-variant">قيمة القسط: </span>
                    <strong className="text-on-surface">
                      {line.installmentAmount > 0
                        ? line.installmentAmount.toLocaleString('ar-EG')
                        : '—'}{' '}
                      ج.م
                    </strong>
                  </div>
                  <div className="tabular-nums">
                    <span className="text-on-surface-variant">إجمالي بعد المقدم: </span>
                    <strong className="text-on-surface">
                      {totalAfterDown.toLocaleString('ar-EG')} ج.م
                    </strong>
                  </div>
                  <div className="tabular-nums" dir="ltr">
                    <span className="text-on-surface-variant">آخر قسط: </span>
                    <strong className="text-on-surface">{lastDueDate ?? '—'}</strong>
                  </div>
                </div>
                {showErrors &&
                  !installmentValidation.valid &&
                  installmentValidation.errors.map((msg) => (
                    <p key={msg} className="text-xs text-error">
                      {msg}
                    </p>
                  ))}
              </div>
            ) : (
              <div className="space-y-sm">
                <CashScheduleSelector
                  schedule={line.cashSchedule}
                  contractDate={contractDate}
                  lineTotal={net}
                  downPayment={line.downPayment}
                  onChange={(cashSchedule) => patch({ cashSchedule })}
                />
                <div>
                  <label className={posLabelClass}>مقدم (اختياري)</label>
                  <PosMoneyInput
                    min={0}
                    max={net}
                    step="0.01"
                    value={line.downPayment || ''}
                    onChange={(e) =>
                      patch({ downPayment: parseLocalizedNumber(e.target.value) })
                    }
                  />
                  {line.downPayment > 0 && cashRemainderAmount > 0 && (
                    <p className="mt-xs text-xs text-on-surface-variant">
                      المتبقي:{' '}
                      <span className="font-medium tabular-nums text-on-surface">
                        {cashRemainderAmount.toLocaleString('ar-EG')} ج.م
                      </span>
                    </p>
                  )}
                </div>
                {showErrors &&
                  !cashValidation.valid &&
                  cashValidation.errors.map((msg) => (
                    <p key={msg} className="text-xs text-error">
                      {msg}
                    </p>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function createDeviceLine(
  unitPrice: number,
  unit?: { id: number; imei?: string; serial_number?: string | null },
  options?: { contractDate?: string; minDownPercent?: number },
): DeviceLineDraft {
  const contractDate = options?.contractDate ?? new Date().toISOString().split('T')[0]
  const minDownPercent = options?.minDownPercent ?? 10
  const minDown = computeMinDownPayment(unitPrice, minDownPercent)

  return {
    key: `${unit?.id ?? 'new'}-${Date.now()}-${Math.random()}`,
    productUnitId: unit?.id,
    imei: unit?.imei,
    serialNumber: unit?.serial_number ?? '',
    simNumber: '',
    username: '',
    unitPrice,
    discountAmount: 0,
    discountPercent: 0,
    discountMode: 'amount',
    paymentTerm: 'installment',
    cashSchedule: 'immediate',
    installmentAmount: suggestInstallmentAmount(unitPrice, 6, minDownPercent),
    downPayment: minDown,
    intervalType: 'monthly',
    firstDueDate: addDays(contractDate, 30),
    technician: null,
    vehicleType: '',
    vehiclePlateLetters: '',
    vehiclePlateNumbers: '',
    chassisNumber: '',
    engineNumber: '',
    renewalType: 'annual',
  }
}
