import type { ChangeEvent, TextareaHTMLAttributes } from 'react'
import { filterByMode, type TextInputMode } from '../../lib/normalizeDigits'

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  mode?: TextInputMode
}

export function TextArea({
  mode = 'arabic',
  dir,
  onChange,
  ...props
}: TextAreaProps) {
  const resolvedDir = dir ?? (mode === 'arabic' ? 'rtl' : mode === 'any' ? undefined : 'ltr')

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (!onChange) return
    const next = filterByMode(e.target.value, mode)
    onChange({
      ...e,
      target: { ...e.target, value: next },
    })
  }

  return <textarea dir={resolvedDir} {...props} onChange={handleChange} />
}
