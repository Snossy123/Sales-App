import type { ChangeEvent, InputHTMLAttributes } from 'react'
import { normalizeDigits } from '../../lib/normalizeDigits'
import { posControlHeightClass } from './posFormStyles'

type PosMoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  suffix?: string
}

export function PosMoneyInput({
  suffix = 'ج.م',
  className = '',
  disabled,
  onFocus,
  onChange,
  ...props
}: PosMoneyInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!onChange) return
    const normalized = normalizeDigits(e.target.value)
    onChange({
      ...e,
      target: { ...e.target, value: normalized },
    } as ChangeEvent<HTMLInputElement>)
  }

  return (
    <div
      className={`pos-money-field flex items-stretch overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest focus-within:border-primary ${posControlHeightClass} ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <input
        type="text"
        inputMode="decimal"
        dir="ltr"
        disabled={disabled}
        {...props}
        onChange={handleChange}
        onFocus={(e) => {
          const { value } = e.currentTarget
          if (value === '0' || value === '0.0' || value === '0.00') {
            e.currentTarget.select()
          }
          onFocus?.(e)
        }}
        className={`min-w-0 flex-1 border-0 bg-transparent px-2 text-end text-[16px] leading-5 tabular-nums focus:outline-none focus:ring-0 disabled:cursor-not-allowed ${className}`}
      />
      <span className="w-px shrink-0 self-stretch bg-outline-variant/60" aria-hidden />
      <span className="flex shrink-0 items-center px-2 text-[13px] leading-none text-on-surface-variant">
        {suffix}
      </span>
    </div>
  )
}
