import { cashDueDate, cashScheduleOptions, type CashSchedule } from '../../lib/cashSchedule'
import { posToggleBtn } from '../pos/posFormStyles'

interface CashScheduleSelectorProps {
  schedule: CashSchedule
  contractDate: string
  onChange: (schedule: CashSchedule) => void
}

export function CashScheduleSelector({ schedule, contractDate, onChange }: CashScheduleSelectorProps) {
  const dueDate = cashDueDate(schedule, contractDate)

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
      {dueDate ? (
        <p className="text-sm text-on-surface-variant">
          تاريخ الاستحقاق: <span className="font-medium text-on-surface">{dueDate}</span>
          <span className="mt-xs block text-xs">لا يُضاف للمطلوب عند التعاقد — يُحصّل لاحقًا.</span>
        </p>
      ) : (
        <p className="text-sm text-on-surface-variant">الدفع كاش — يُضاف صافي البند للمطلوب عند التعاقد.</p>
      )}
    </div>
  )
}
