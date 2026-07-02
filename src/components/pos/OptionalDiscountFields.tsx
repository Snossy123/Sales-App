import { useEffect, useState } from 'react'
import type { DiscountMode } from '../../lib/discount'
import { DiscountInput } from './DiscountInput'
import { posLabelClass } from './posFormStyles'

interface OptionalDiscountFieldsProps {
  label?: string
  baseAmount: number
  amount: number
  percent: number
  onChange: (next: { amount: number; percent: number; mode: DiscountMode }) => void
  disabled?: boolean
}

export function OptionalDiscountFields({
  label = 'خصم',
  baseAmount,
  amount,
  percent,
  onChange,
  disabled,
}: OptionalDiscountFieldsProps) {
  const hasDiscount = amount > 0 || percent > 0
  const [open, setOpen] = useState(hasDiscount)

  useEffect(() => {
    if (hasDiscount) setOpen(true)
  }, [hasDiscount])

  if (!open) {
    return (
      <div>
        <label className={posLabelClass}>&nbsp;</label>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className={`flex h-[var(--pos-control-h)] w-full items-center justify-center rounded-lg border border-dashed border-outline-variant bg-surface-container-low text-[14px] font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50`}
        >
          + إضافة خصم
        </button>
      </div>
    )
  }

  const handleClear = () => {
    onChange({ amount: 0, percent: 0, mode: 'amount' })
    setOpen(false)
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-sm">
        <span className={`${posLabelClass} mb-0`}>{label}</span>
        <button
          type="button"
          disabled={disabled}
          onClick={handleClear}
          className="text-xs font-medium text-on-surface-variant hover:text-error"
        >
          إلغاء الخصم
        </button>
      </div>
      <DiscountInput
        compact
        baseAmount={baseAmount}
        amount={amount}
        percent={percent}
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  )
}
