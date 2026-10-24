import {
  cashDueDate,
  cashRemainder,
  cashScheduleDueDates,
  cashScheduleOptions,
  cashSchedulePaymentCount,
  isCustomCashSchedule,
  isDeferredCashSchedule,
  type CashSchedule,
} from '../../lib/cashSchedule'
import { posToggleBtn } from '../pos/posFormStyles'

interface CashScheduleSelectorProps {
  schedule: CashSchedule
  contractDate: string
  onChange: (schedule: CashSchedule) => void
  lineTotal?: number
  downPayment?: number
}

export function CashScheduleSelector({
  schedule,
  contractDate,
  onChange,
  lineTotal = 0,
  downPayment = 0,
}: CashScheduleSelectorProps) {
  const dueDate = cashDueDate(schedule, contractDate)
  const paymentDates = cashScheduleDueDates(schedule, contractDate)
  const paymentCount = cashSchedulePaymentCount(schedule)
  const remainder = cashRemainder(lineTotal, downPayment)
  const hasDown = downPayment > 0
  const isDeferred = isDeferredCashSchedule(schedule)
  const splitLabel = paymentCount === 2 ? 'دفعتين' : paymentCount === 3 ? 'ثلاث دفعات' : ''

  let helperText = 'الدفع كاش — يُضاف صافي البند للمطلوب عند التعاقد.'
  if (isCustomCashSchedule(schedule)) {
    helperText = hasDown
      ? 'يُضاف المقدم للمطلوب عند التعاقد. الباقي حسب الجدول الحر.'
      : 'لا يُضاف للمطلوب عند التعاقد — يُحصّل حسب الجدول الحر.'
  } else if (isDeferred && splitLabel) {
    helperText = hasDown
      ? `يُضاف المقدم للمطلوب عند التعاقد. الباقي يُحصّل على ${splitLabel} شهرية.`
      : `لا يُضاف للمطلوب عند التعاقد — يُحصّل على ${splitLabel} شهرية.`
  } else if (isDeferred) {
    helperText = hasDown
      ? 'يُضاف المقدم للمطلوب عند التعاقد. الباقي يُحصّل في تاريخ الاستحقاق.'
      : 'لا يُضاف للمطلوب عند التعاقد — يُحصّل لاحقًا.'
  } else if (hasDown && remainder > 0) {
    helperText = 'يُضاف المقدم فقط للمطلوب عند التعاقد. الباقي يُستحق لاحقًا.'
  }

  return (
    <div className="space-y-sm">
      <p className="text-xs text-on-surface-variant">موعد سداد الكاش</p>
      <div className="flex flex-wrap gap-sm">
        {cashScheduleOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={posToggleBtn(schedule === option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {paymentDates.length > 1 ? (
        <p className="text-sm text-on-surface-variant">
          مواعيد الدفعات:{' '}
          <span className="font-medium text-on-surface">{paymentDates.join('، ')}</span>
          <span className="mt-xs block text-xs">{helperText}</span>
        </p>
      ) : dueDate ? (
        <p className="text-sm text-on-surface-variant">
          تاريخ الاستحقاق: <span className="font-medium text-on-surface">{dueDate}</span>
          <span className="mt-xs block text-xs">{helperText}</span>
        </p>
      ) : (
        <p className="text-sm text-on-surface-variant">{helperText}</p>
      )}
    </div>
  )
}
