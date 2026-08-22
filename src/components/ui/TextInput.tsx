import type { ChangeEvent, InputHTMLAttributes } from 'react'
import { filterByMode, type TextInputMode } from '../../lib/normalizeDigits'

type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  mode?: TextInputMode
  type?: InputHTMLAttributes<HTMLInputElement>['type']
}

export function TextInput({
  mode = 'arabic',
  type = 'text',
  dir,
  onChange,
  ...props
}: TextInputProps) {
  const resolvedDir = dir ?? (mode === 'arabic' ? 'rtl' : mode === 'any' ? undefined : 'ltr')

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!onChange) return
    const next = filterByMode(e.target.value, mode)
    onChange({
      ...e,
      target: { ...e.target, value: next },
    })
  }

  return <input type={type} dir={resolvedDir} {...props} onChange={handleChange} />
}
