import { useMemo } from 'react'
import {
  computeInstallmentCount,
  computeMinDownPayment,
  suggestInstallmentAmount,
} from '../../lib/sales'
import {
  cashRemainder,
  linePaidNow as cashLinePaidNow,
  type CashSchedule,
} from '../../lib/cashSchedule'
import { Icon } from '../Icon'
import { CashScheduleSelector } from '../pos/CashScheduleSelector'
import { PosMoneyInput } from '../pos/PosMoneyInput'
import {
  posInputClass,
  posLabelClass,
  posModeToggleGroupClass,
  posSectionTitleClass,
  posStaticFieldClass,
  posRequiredWrap,
  posToggleBtn,
} from '../pos/posFormStyles'

export type ServiceLinePaymentTerm = 'cash' | 'installment'
export type ServiceIntervalType = 'monthly' | 'weekly'

export interface ServiceLineDraft {
  id: number
  service_id?: number
  description: string
  unit_price: number
  cashPrice: number
  installmentPrice: number
  paymentTerm: ServiceLinePaymentTerm
  cashSchedule: CashSchedule
  downPayment: number
  installmentAmount: number
  intervalType: ServiceIntervalType
  firstDueDate: string
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export function lineTotal(line: ServiceLineDraft): number {
  return Math.max(0, Number(line.unit_price))
}

export function lineInstallmentCount(
  line: ServiceLineDraft,
  maxInstallmentCount: number,
): number {
  return computeInstallmentCount(
    lineTotal(line),
    line.installmentAmount,
    line.downPayment,
    maxInstallmentCount,
  )
}

export function validateServiceLineCash(
  line: ServiceLineDraft,
): { valid: boolean; errors: string[] } {
  if (line.paymentTerm !== 'cash') return { valid: true, errors: [] }

  const errors: string[] = []
  const total = lineTotal(line)
  if (line.downPayment < 0) {
    errors.push('المقدم لا يمكن أن يكون سالبًا')
  }
  if (line.downPayment > total + 0.009) {
    errors.push('المقدم يجب أن يكون أقل من أو يساوي إجمالي البند')
  }

  return { valid: errors.length === 0, errors }
}

export function validateServiceLineInstallment(
  line: ServiceLineDraft,
  minDownPercent: number,
  maxInstallmentCount: number,
): { valid: boolean; errors: string[] } {
  if (line.paymentTerm !== 'installment') return { valid: true, errors: [] }

  const errors: string[] = []
  const total = lineTotal(line)
  const minDown = computeMinDownPayment(total, minDownPercent)
  const count = lineInstallmentCount(line, maxInstallmentCount)

  if (line.installmentAmount <= 0) {
    errors.push('قيمة القسط يجب أن تكون أكبر من صفر')
  }
  if (line.downPayment >= total - 0.009) {
    errors.push('المقدم يجب أن يكون أقل من إجمالي البند')
  }
  if (line.downPayment < minDown - 0.009) {
    errors.push(`المقدم أقل من الحد الأدنى (${minDownPercent}%)`)
  }
  if (count <= 0) {
    errors.push('عدد الأقساط غير صالح')
  }

  return { valid: errors.length === 0, errors }
}

export function linePaidNow(line: ServiceLineDraft): number {
  const total = lineTotal(line)
  return cashLinePaidNow(line.paymentTerm, line.cashSchedule, total, line.downPayment)
}

interface ServiceLineCardProps {
  line: ServiceLineDraft
  index: number
  contractDate: string
  minDownPercent: number
  maxInstallmentCount: number
  onChange: (line: ServiceLineDraft) => void
  onRemove: () => void
  showErrors?: boolean
}

export function ServiceLineCard({
  line,
  index,
  contractDate,
  minDownPercent,
  maxInstallmentCount,
  onChange,
  onRemove,
  showErrors = false,
}: ServiceLineCardProps) {
  const total = lineTotal(line)
  const installmentValidation = validateServiceLineInstallment(line, minDownPercent, maxInstallmentCount)
  const cashValidation = validateServiceLineCash(line)
  const remainderAmount = cashRemainder(total, line.downPayment)
  const computedCount = useMemo(
    () => lineInstallmentCount(line, maxInstallmentCount),
    [line, maxInstallmentCount],
  )

  const patch = (partial: Partial<ServiceLineDraft>) => onChange({ ...line, ...partial })

  const switchToInstallment = () => {
    const price = line.installmentPrice
    patch({
      paymentTerm: 'installment',
      unit_price: price,
      downPayment: computeMinDownPayment(price, minDownPercent),
      installmentAmount: suggestInstallmentAmount(price, 6, minDownPercent),
      firstDueDate: addDays(contractDate, 30),
    })
  }

  const switchToCash = () => {
    patch({
      paymentTerm: 'cash',
      unit_price: line.cashPrice,
      cashSchedule: 'immediate',
      downPayment: 0,
    })
  }

  const descriptionError = showErrors && !line.description.trim()
  const priceError = showErrors && line.unit_price <= 0
  const hasLineErrors =
    showErrors &&
    (!installmentValidation.valid || !cashValidation.valid || descriptionError || priceError)

  return (
    <div
      className={`rounded-lg border shadow-sm ${
        hasLineErrors
          ? 'border-error/35 bg-error/[0.04]'
          : 'border-outline-variant bg-surface-container-low'
      }`}
    >
      <div
        className={`flex flex-wrap items-center gap-sm px-sm py-sm sm:px-md ${
          hasLineErrors ? 'bg-error/10' : 'bg-primary/10'
        }`}
      >
        <span className="shrink-0 font-semibold text-on-surface">خدمة {index + 1}</span>
        <span className="min-w-0 flex-1 truncate text-sm text-on-surface-variant">
          {line.description || '—'}
        </span>
        <span className="shrink-0 tabular-nums text-on-surface">
          <strong>{total.toLocaleString('ar-EG')} ج.م</strong>
        </span>
        <button type="button" onClick={onRemove} className="shrink-0 text-error" aria-label="حذف">
          <Icon name="delete" size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-md p-sm sm:p-md lg:grid-cols-2">
        <div className="space-y-sm">
          <div className={posRequiredWrap(descriptionError)}>
            <label className={posLabelClass}>الوصف</label>
            <input
              value={line.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="الوصف"
              required
              readOnly={Boolean(line.service_id)}
              className={`${posInputClass} read-only:bg-surface-container-lowest${descriptionError ? ' border-error' : ''}`}
            />
            {descriptionError ? (
              <p className="mt-xs text-xs text-error">الوصف مطلوب</p>
            ) : null}
          </div>
          <div className={posRequiredWrap(priceError)}>
            <label className={posLabelClass}>السعر</label>
            <PosMoneyInput
              min={0}
              step="0.01"
              value={line.unit_price}
              onChange={(e) => patch({ unit_price: Number(e.target.value) })}
            />
            {priceError ? <p className="mt-xs text-xs text-error">السعر مطلوب</p> : null}
          </div>
        </div>

        <div
          className={`flex flex-col gap-sm rounded-lg border p-sm ${
            showErrors && (!installmentValidation.valid || !cashValidation.valid)
              ? 'border-error/25 bg-error/[0.06]'
              : 'border-outline-variant/70 bg-surface-container-lowest'
          }`}
        >
          <h4 className={posSectionTitleClass}>طريقة الدفع</h4>
          <div className="flex gap-sm">
            {(['installment', 'cash'] as const).map((term) => (
              <button
                key={term}
                type="button"
                onClick={() =>
                  term === 'installment' ? switchToInstallment() : switchToCash()
                }
                className={posToggleBtn(line.paymentTerm === term)}
              >
                {term === 'cash' ? 'كاش' : 'تقسيط'}
              </button>
            ))}
          </div>

          {line.paymentTerm === 'installment' ? (
            <div className="space-y-sm">
              <div className={`${posModeToggleGroupClass} text-xs`}>
                {(['weekly', 'monthly'] as const).map((type) => (
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
              <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
                <div>
                  <label className={posLabelClass}>قيمة المقدم</label>
                  <PosMoneyInput
                    min={0}
                    step="0.01"
                    value={line.downPayment}
                    onChange={(e) => patch({ downPayment: Number(e.target.value) })}
                  />
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
                <div>
                  <label className={posLabelClass}>قيمة القسط</label>
                  <PosMoneyInput
                    min={0}
                    step="0.01"
                    value={line.installmentAmount}
                    onChange={(e) => patch({ installmentAmount: Number(e.target.value) })}
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
                lineTotal={total}
                downPayment={line.downPayment}
                onChange={(cashSchedule) => patch({ cashSchedule })}
              />
              <div>
                <label className={posLabelClass}>مقدم (اختياري)</label>
                <PosMoneyInput
                  min={0}
                  max={total}
                  step="0.01"
                  value={line.downPayment || ''}
                  onChange={(e) => patch({ downPayment: Number(e.target.value) })}
                />
                {line.downPayment > 0 && remainderAmount > 0 && (
                  <p className="mt-xs text-xs text-on-surface-variant">
                    المتبقي:{' '}
                    <span className="font-medium tabular-nums text-on-surface">
                      {remainderAmount.toLocaleString('ar-EG')} ج.م
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
    </div>
  )
}

let lineId = 0

export function createServiceLine(
  partial: Omit<
    ServiceLineDraft,
    'id' | 'paymentTerm' | 'cashSchedule' | 'downPayment' | 'installmentAmount' | 'intervalType' | 'firstDueDate'
  >,
  options?: { contractDate?: string; minDownPercent?: number; paymentTerm?: ServiceLinePaymentTerm },
): ServiceLineDraft {
  lineId += 1
  const contractDate = options?.contractDate ?? new Date().toISOString().split('T')[0]
  const minDownPercent = options?.minDownPercent ?? 10
  const paymentTerm = options?.paymentTerm ?? 'cash'
  const unitPrice =
    paymentTerm === 'installment' ? partial.installmentPrice : partial.cashPrice

  return {
    id: lineId,
    ...partial,
    unit_price: unitPrice,
    paymentTerm,
    cashSchedule: 'immediate',
    downPayment: paymentTerm === 'cash' ? 0 : computeMinDownPayment(unitPrice, minDownPercent),
    installmentAmount: suggestInstallmentAmount(unitPrice, 6, minDownPercent),
    intervalType: 'monthly',
    firstDueDate: addDays(contractDate, 30),
  }
}
