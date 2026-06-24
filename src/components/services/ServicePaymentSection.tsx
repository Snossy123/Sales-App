import { useMemo } from 'react'
import {
  computeInstallmentCount,
  computeMinDownPayment,
  suggestInstallmentAmount,
} from '../../lib/sales'
import { PosMoneyInput } from '../pos/PosMoneyInput'
import {
  posInputClass,
  posLabelClass,
  posModeToggleGroupClass,
  posStaticFieldClass,
  posToggleBtn,
} from '../pos/posFormStyles'

export type ServicePaymentTerm = 'cash' | 'installment'
export type ServiceIntervalType = 'monthly' | 'weekly'

export interface ServicePaymentState {
  paymentTerm: ServicePaymentTerm
  downPayment: number
  installmentAmount: number
  intervalType: ServiceIntervalType
  firstDueDate: string
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

export function createDefaultServicePayment(total: number, minDownPercent: number): ServicePaymentState {
  const today = new Date().toISOString().split('T')[0]
  const downPayment = computeMinDownPayment(total, minDownPercent)
  const installmentAmount = suggestInstallmentAmount(total, 6, minDownPercent)

  return {
    paymentTerm: 'cash',
    downPayment,
    installmentAmount,
    intervalType: 'monthly',
    firstDueDate: addDays(today, 30),
  }
}

export function validateServicePayment(
  payment: ServicePaymentState,
  total: number,
  minDownPercent: number,
  maxInstallmentCount: number,
): { valid: boolean; errors: string[] } {
  if (payment.paymentTerm !== 'installment') {
    return { valid: true, errors: [] }
  }

  const errors: string[] = []
  const minDown = computeMinDownPayment(total, minDownPercent)
  const count = computeInstallmentCount(
    total,
    payment.installmentAmount,
    payment.downPayment,
    maxInstallmentCount,
  )

  if (payment.installmentAmount <= 0) {
    errors.push('قيمة القسط يجب أن تكون أكبر من صفر')
  }
  if (payment.downPayment >= total - 0.009) {
    errors.push('المقدم يجب أن يكون أقل من الإجمالي')
  }
  if (payment.downPayment < minDown - 0.009) {
    errors.push(`المقدم أقل من الحد الأدنى (${minDownPercent}%)`)
  }
  if (count <= 0) {
    errors.push('عدد الأقساط غير صالح')
  }

  return { valid: errors.length === 0, errors }
}

interface ServicePaymentSectionProps {
  total: number
  payment: ServicePaymentState
  onChange: (patch: Partial<ServicePaymentState>) => void
  minDownPercent: number
  maxInstallmentCount: number
}

export function ServicePaymentSection({
  total,
  payment,
  onChange,
  minDownPercent,
  maxInstallmentCount,
}: ServicePaymentSectionProps) {
  const installmentCount = useMemo(
    () =>
      computeInstallmentCount(
        total,
        payment.installmentAmount,
        payment.downPayment,
        maxInstallmentCount,
      ),
    [total, payment.installmentAmount, payment.downPayment, maxInstallmentCount],
  )

  const paidNow =
    payment.paymentTerm === 'cash' ? total : Math.min(total, payment.downPayment)
  const balance = Math.max(0, total - paidNow)

  const switchToInstallment = () => {
    onChange({
      paymentTerm: 'installment',
      downPayment: computeMinDownPayment(total, minDownPercent),
      installmentAmount: suggestInstallmentAmount(total, 6, minDownPercent),
      firstDueDate: addDays(new Date().toISOString().split('T')[0], 30),
    })
  }

  return (
    <div className="space-y-md rounded-lg border border-outline-variant bg-surface-container-low p-md">
      <h3 className="font-semibold text-on-surface">طريقة الدفع</h3>

      <div className="flex gap-sm">
        {(['cash', 'installment'] as const).map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => (term === 'installment' ? switchToInstallment() : onChange({ paymentTerm: 'cash' }))}
            className={posToggleBtn(payment.paymentTerm === term)}
          >
            {term === 'cash' ? 'كاش' : 'تقسيط'}
          </button>
        ))}
      </div>

      {payment.paymentTerm === 'installment' && (
        <div className="space-y-sm">
          <div className={`${posModeToggleGroupClass} text-xs`}>
            {(['monthly', 'weekly'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() =>
                  onChange({
                    intervalType: type,
                    firstDueDate: addDays(
                      new Date().toISOString().split('T')[0],
                      type === 'weekly' ? 7 : 30,
                    ),
                  })
                }
                className={`flex h-full flex-1 items-center justify-center rounded-md text-xs font-medium transition-colors ${
                  payment.intervalType === type
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
                value={payment.downPayment}
                onChange={(e) => onChange({ downPayment: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className={posLabelClass}>أول استحقاق</label>
              <input
                type="date"
                value={payment.firstDueDate}
                onChange={(e) => onChange({ firstDueDate: e.target.value })}
                className={posInputClass}
              />
            </div>
            <div>
              <label className={posLabelClass}>قيمة القسط</label>
              <PosMoneyInput
                min={0}
                step="0.01"
                value={payment.installmentAmount}
                onChange={(e) => onChange({ installmentAmount: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className={posLabelClass}>عدد الأقساط</label>
              <div className={`${posStaticFieldClass} bg-surface-container-low font-medium tabular-nums`}>
                {installmentCount > 0 ? installmentCount : '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-xs border-t border-outline-variant pt-sm text-sm">
        <div className="flex justify-between tabular-nums">
          <span className="text-on-surface-variant">الإجمالي</span>
          <span className="font-bold">{total.toLocaleString('ar-EG')} ج.م</span>
        </div>
        <div className="flex justify-between tabular-nums">
          <span className="text-on-surface-variant">المدفوع الآن</span>
          <span>{paidNow.toLocaleString('ar-EG')} ج.م</span>
        </div>
        <div className="flex justify-between tabular-nums">
          <span className="text-on-surface-variant">المتبقي</span>
          <span className="font-semibold text-secondary">{balance.toLocaleString('ar-EG')} ج.م</span>
        </div>
      </div>
    </div>
  )
}
