import { amountFromPercent, clampDiscountAmount, percentFromAmount, type DiscountMode } from '../../lib/discount'
import { PosMoneyInput } from './PosMoneyInput'

interface DiscountInputProps {
  label: string
  baseAmount: number
  amount: number
  percent: number
  mode: DiscountMode
  onChange: (next: { amount: number; percent: number; mode: DiscountMode }) => void
  disabled?: boolean
}

export function DiscountInput({
  label,
  baseAmount,
  amount,
  percent,
  mode,
  onChange,
  disabled,
}: DiscountInputProps) {
  const setMode = (nextMode: DiscountMode) => {
    onChange({ amount, percent, mode: nextMode })
  }

  const handleAmountChange = (raw: number) => {
    const nextAmount = clampDiscountAmount(baseAmount, raw)
    onChange({
      amount: nextAmount,
      percent: percentFromAmount(baseAmount, nextAmount),
      mode: 'amount',
    })
  }

  const handlePercentChange = (raw: number) => {
    const nextPercent = Math.min(100, Math.max(0, raw))
    const nextAmount = amountFromPercent(baseAmount, nextPercent)
    onChange({
      amount: nextAmount,
      percent: nextPercent,
      mode: 'percent',
    })
  }

  return (
    <div className="rounded-lg border border-outline-variant/60 bg-surface-container-low p-sm">
      <div className="mb-sm flex items-center justify-between gap-sm">
        <span className="text-sm font-medium text-on-surface">{label}</span>
        <div className="flex gap-1 rounded-lg border border-outline-variant p-0.5 text-xs">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setMode('amount')}
            className={`rounded px-2 py-0.5 ${mode === 'amount' ? 'bg-primary text-on-primary' : ''}`}
          >
            مبلغ
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setMode('percent')}
            className={`rounded px-2 py-0.5 ${mode === 'percent' ? 'bg-primary text-on-primary' : ''}`}
          >
            %
          </button>
        </div>
      </div>
      <div className="grid gap-sm sm:grid-cols-2">
        <div>
          <label className="mb-xs block text-xs text-on-surface-variant">الخصم (ج.م)</label>
          <PosMoneyInput
            min={0}
            max={baseAmount}
            step="0.01"
            value={amount || ''}
            disabled={disabled}
            onChange={(e) => handleAmountChange(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="mb-xs block text-xs text-on-surface-variant">الخصم (%)</label>
          <PosMoneyInput
            suffix="%"
            min={0}
            max={100}
            step="0.01"
            value={percent || ''}
            disabled={disabled}
            onChange={(e) => handlePercentChange(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  )
}
