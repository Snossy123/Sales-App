import type { ChangeEvent, InputHTMLAttributes } from 'react'
import { stripNonLatinNumber } from '../../lib/normalizeDigits'

type NumericInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  type?: 'number' | 'text'
}

export function NumericInput({
  type = 'number',
  dir = 'ltr',
  inputMode = 'decimal',
  onChange,
  ...props
}: NumericInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!onChange) return
    const next = stripNonLatinNumber(e.target.value)
    onChange({
      ...e,
      target: { ...e.target, value: next },
    })
  }

  return <input type={type} dir={dir} inputMode={inputMode} {...props} onChange={handleChange} />
}
