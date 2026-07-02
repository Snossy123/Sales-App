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
}

export function ServiceLineCard({
  line,
  index,
  contractDate,
  minDownPercent,
  maxInstallmentCount,
  onChange,
  onRemove,
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

  return (
    <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low shadow-sm">
      <div className="flex flex-wrap items-center gap-sm bg-primary/10 px-md py-sm">
        <span className="font-semibold text-on-surface">خدمة {index + 1}</span>
        <span className="flex-1 truncate text-sm text-on-surface-variant">{line.description || '—'}</span>
        <span className="tabular-nums text-on-surface">
          <strong>{total.toLocaleString('ar-EG')} ج.م</strong>
        </span>
        <button type="button" onClick={onRemove} className="text-error" aria-label="حذف">
          <Icon name="delete" size={20} />
        </button>
      </div>

      <div className="grid gap-md p-md lg:grid-cols-2">
        <div className="space-y-sm">
          <div>
            <label className={posLabelClass}>الوصف</label>
            <input
              value={line.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="الوصف"
              required
              readOnly={Boolean(line.service_id)}
              className={`${posInputClass} read-only:bg-surface-container-lowest`}
            />
          </div>
          <div>
            <label className={posLabelClass}>السعر</label>
            <PosMoneyInput
              min={0}
              step="0.01"
              value={line.unit_price}
              onChange={(e) => patch({ unit_price: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="flex flex-col gap-sm rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-sm">
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
              <div className="grid grid-cols-2 gap-sm">
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
              {!installmentValidation.valid &&
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
              {!cashValidation.valid &&
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
    downPayment: computeMinDownPayment(unitPrice, minDownPercent),
    installmentAmount: suggestInstallmentAmount(unitPrice, 6, minDownPercent),
    intervalType: 'monthly',
    firstDueDate: addDays(contractDate, 30),
  }
}
