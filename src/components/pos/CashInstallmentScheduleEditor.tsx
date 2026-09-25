import { parseLocalizedNumber } from '../../lib/normalizeDigits'
import {
  cashScheduleItemsTotal,
  resizeCashScheduleItems,
  type CashScheduleItem,
} from '../../lib/cashSchedule'
import { PosMoneyInput } from './PosMoneyInput'
import { posInputClass, posLabelClass } from './posFormStyles'

interface CashInstallmentScheduleEditorProps {
  items: CashScheduleItem[]
  remainder: number
  maxCount: number
  contractDate: string
  onChange: (items: CashScheduleItem[]) => void
}

export function CashInstallmentScheduleEditor({
  items,
  remainder,
  maxCount,
  contractDate,
  onChange,
}: CashInstallmentScheduleEditorProps) {
  const total = cashScheduleItemsTotal(items)
  const difference = Math.round((total - remainder) * 100) / 100
  const count = Math.max(1, items.length)

  const patchItem = (index: number, partial: Partial<CashScheduleItem>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...partial } : item)))
  }

  return (
    <div className="space-y-sm">
      <div className="max-w-[10rem]">
        <label className={posLabelClass}>عدد الأقساط</label>
        <input
          type="number"
          min={1}
          max={maxCount}
          step={1}
          value={count}
          onChange={(e) =>
            onChange(resizeCashScheduleItems(items, Number(e.target.value) || 1, contractDate))
          }
          className={posInputClass}
        />
      </div>

      <div className="space-y-sm">
        {items.map((item, index) => (
          <div
            key={index}
            className="grid grid-cols-1 gap-sm sm:grid-cols-2"
          >
            <div>
              <label className={posLabelClass}>قيمة القسط {index + 1}</label>
              <PosMoneyInput
                min={0}
                step="0.01"
                value={item.amount || ''}
                onChange={(e) =>
                  patchItem(index, { amount: parseLocalizedNumber(e.target.value) })
                }
              />
            </div>
            <div>
              <label className={posLabelClass}>تاريخ التحصيل {index + 1}</label>
              <input
                type="date"
                value={item.dueDate}
                onChange={(e) => patchItem(index, { dueDate: e.target.value })}
                className={posInputClass}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-sm rounded-lg border border-tertiary/25 bg-tertiary/10 px-sm py-sm text-sm sm:grid-cols-3">
        <div className="tabular-nums">
          <span className="text-on-surface-variant">مجموع الأقساط: </span>
          <strong className="text-on-surface">
            {total.toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م
          </strong>
        </div>
        <div className="tabular-nums">
          <span className="text-on-surface-variant">المتبقي بعد المقدم: </span>
          <strong className="text-on-surface">
            {remainder.toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م
          </strong>
        </div>
        <div className="tabular-nums">
          <span className="text-on-surface-variant">الفرق: </span>
          <strong className={Math.abs(difference) > 0.01 ? 'text-error' : 'text-on-surface'}>
            {difference.toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م
          </strong>
        </div>
      </div>
    </div>
  )
}
