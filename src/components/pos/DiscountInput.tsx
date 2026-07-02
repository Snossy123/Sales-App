import { amountFromPercent, clampDiscountAmount, percentFromAmount, type DiscountMode } from '../../lib/discount'
import { parseLocalizedNumber } from '../../lib/normalizeDigits'
import { PosMoneyInput } from './PosMoneyInput'

interface DiscountInputProps {
  label?: string
  baseAmount: number
  amount: number
  percent: number
  onChange: (next: { amount: number; percent: number; mode: DiscountMode }) => void
  disabled?: boolean
  compact?: boolean
}

export function DiscountInput({
  label,
  baseAmount,
  amount,
  percent,
  onChange,
  disabled,
  compact = false,
}: DiscountInputProps) {
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

  const fields = (
    <div className={`grid gap-xs ${compact ? 'grid-cols-2' : 'grid-cols-2'}`}>
      <div>
        <label className="mb-xs block text-xs text-on-surface-variant">الخصم (ج.م)</label>
        <PosMoneyInput
          min={0}
          max={baseAmount}
          step="0.01"
          value={amount || ''}
          disabled={disabled}
          onChange={(e) => handleAmountChange(parseLocalizedNumber(e.target.value))}
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
          onChange={(e) => handlePercentChange(parseLocalizedNumber(e.target.value))}
        />
      </div>
    </div>
  )

  if (compact) {
    return fields
  }

  return (
    <div className="rounded-lg border border-outline-variant/60 bg-surface-container-low p-sm">
      {label && <span className="mb-sm block text-sm font-medium text-on-surface">{label}</span>}
      {fields}
    </div>
  )
}
