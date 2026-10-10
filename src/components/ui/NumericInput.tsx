import type { ChangeEvent, ClipboardEvent, InputHTMLAttributes } from 'react'
import { stripNonLatinNumber } from '../../lib/normalizeDigits'

type NumericInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  type?: 'number' | 'text'
}

export function NumericInput({
  type = 'text',
  dir = 'ltr',
  inputMode = 'decimal',
  onChange,
  onPaste,
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

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    onPaste?.(e)
    if (e.defaultPrevented) return
    const text = e.clipboardData.getData('text')
    if (text && /[٠-٩۰-۹]/.test(text)) {
      e.preventDefault()
      const normalized = stripNonLatinNumber(text)
      document.execCommand('insertText', false, normalized)
    }
  }

  return (
    <input
      type={type === 'number' ? 'text' : type}
      dir={dir}
      inputMode={inputMode}
      {...props}
      onChange={handleChange}
      onPaste={handlePaste}
    />
  )
}
