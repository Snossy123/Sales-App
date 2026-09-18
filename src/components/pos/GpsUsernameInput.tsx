import { type KeyboardEvent, type RefObject } from 'react'
import {
  formatGpsUsername,
  GPS_USERNAME_PREFIX,
  parseGpsUsername,
} from '../../lib/gpsUsername'
import { normalizeDigits } from '../../lib/normalizeDigits'
import { normalizeScannedInput } from '../../lib/scanner'
import { posInputClass, posStaticFieldClass } from './posFormStyles'

function digitsOnly(value: string): string {
  return normalizeDigits(value).replace(/\D/g, '')
}

interface GpsUsernameInputProps {
  value: string
  onChange: (value: string) => void
  hasError?: boolean
  disabled?: boolean
  inputRef?: RefObject<HTMLInputElement | null>
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
}

export function GpsUsernameInput({
  value,
  onChange,
  hasError = false,
  disabled = false,
  inputRef,
  onKeyDown,
}: GpsUsernameInputProps) {
  const parsed = parseGpsUsername(value)

  if (!parsed.prefixed) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(normalizeScannedInput(e.target.value))}
        onKeyDown={onKeyDown}
        placeholder="username"
        className={hasError ? `${posInputClass} border-error` : posInputClass}
        dir="ltr"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
      />
    )
  }

  return (
    <div
      className={`${posStaticFieldClass} gap-0 px-3 focus-within:border-primary ${hasError ? 'border-error' : ''} ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <span className="shrink-0 font-semibold text-on-surface-variant">{GPS_USERNAME_PREFIX}</span>
      <input
        ref={inputRef}
        value={parsed.suffix}
        onChange={(e) => onChange(formatGpsUsername(digitsOnly(e.target.value)))}
        onKeyDown={onKeyDown}
        placeholder="الرقم"
        className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[16px] leading-5 outline-none"
        dir="ltr"
        autoComplete="off"
        spellCheck={false}
        inputMode="numeric"
        disabled={disabled}
      />
    </div>
  )
}
