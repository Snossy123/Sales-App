import {
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
} from 'react'
import { DayPicker } from 'react-day-picker'
import { ar, enUS } from 'react-day-picker/locale'
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  size,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react'
import {
  displayDateOnly,
  parseDateOnly,
  serializeDateOnly,
} from '../lib/dateOnly'
import 'react-day-picker/style.css'
import './AppDatePicker.css'

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'defaultValue' | 'min' | 'max'
> & {
  value?: string
  onChange: (value: string) => void
  min?: string
  max?: string
  minDate?: string
  maxDate?: string
  error?: boolean | string
  clearable?: boolean
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  monthYearSelection?: boolean
}

/** Controlled ISO date-only value; localization affects presentation only. */
export function AppDatePicker({
  value = '',
  onChange,
  min,
  max,
  minDate = min,
  maxDate = max,
  disabled,
  required,
  placeholder,
  error,
  clearable = !required,
  weekStartsOn = 6,
  monthYearSelection = true,
  className = '',
  style,
  id,
  name,
  lang,
  dir,
  onBlur,
  ...inputProps
}: Props) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const [open, setOpen] = useState(false)
  const [validationFailure, setValidationFailure] = useState({
    key: '',
    message: '',
  })
  const validationKey = `${value}|${minDate}|${maxDate}|${required}`
  const validationMessage =
    validationFailure.key === validationKey ? validationFailure.message : ''
  const [language, setLanguage] = useState(
    () => document.documentElement.lang || 'ar',
  )
  const [direction, setDirection] = useState(
    () => document.documentElement.dir || 'rtl',
  )
  const inputRef = useRef<HTMLInputElement>(null)
  const activeLanguage = lang ?? language
  const arabic = activeLanguage.startsWith('ar')
  const rtl = (dir ?? direction) === 'rtl'
  const selected = parseDateOnly(value)
  const lower = parseDateOnly(minDate)
  const upper = parseDateOnly(maxDate)
  const invalidRange = Boolean(
    value && ((minDate && value < minDate) || (maxDate && value > maxDate)),
  )
  const invalid = Boolean(error || invalidRange || validationMessage)
  const label = arabic ? 'اختر التاريخ' : 'Choose date'
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: rtl ? 'bottom-end' : 'bottom-start',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(6),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        padding: 8,
        apply({ availableHeight, elements }) {
          elements.floating.style.maxHeight = `${Math.max(0, availableHeight)}px`
        },
      }),
    ],
  })
  const { setReference, setFloating, domReference } = refs
  const click = useClick(context, { enabled: !disabled })
  const dismiss = useDismiss(context)
  const role = useRole(context, { role: 'dialog' })
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ])

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setLanguage(document.documentElement.lang || 'ar')
      setDirection(document.documentElement.dir || 'rtl')
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang', 'dir'],
    })
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    inputRef.current?.setCustomValidity(
      invalidRange
        ? arabic
          ? 'التاريخ خارج النطاق المسموح'
          : 'Date is outside the allowed range'
        : '',
    )
  }, [invalidRange, arabic])

  function choose(date?: Date) {
    setValidationFailure({ key: '', message: '' })
    onChange(date ? serializeDateOnly(date) : '')
    setOpen(false)
  }
  const today = serializeDateOnly(new Date())
  const todayDisabled = Boolean(
    (minDate && today < minDate) || (maxDate && today > maxDate),
  )

  return (
    <>
      <span className="app-date-field" style={style} dir={rtl ? 'rtl' : 'ltr'}>
        <input
          {...inputProps}
          id={`${fieldId}-value`}
          ref={inputRef}
          type="text"
          name={name}
          value={value}
          onChange={() => {}}
          required={required}
          disabled={disabled}
          tabIndex={-1}
          className="app-date-validation"
          aria-hidden="true"
          onInvalid={(event) => {
            event.preventDefault()
            setValidationFailure({
              key: validationKey,
              message: event.currentTarget.validationMessage,
            })
            ;(domReference.current as HTMLElement | null)?.focus()
          }}
        />
        <button
          {...getReferenceProps({ onBlur })}
          ref={setReference}
          id={fieldId}
          type="button"
          disabled={disabled}
          aria-label={`${inputProps['aria-label'] ?? placeholder ?? label}${value ? `: ${displayDateOnly(value)}` : ''}${required ? (arabic ? '، مطلوب' : ', required') : ''}`}
          aria-describedby={
            [
              inputProps['aria-describedby'],
              (typeof error === 'string' || validationMessage) &&
                `${fieldId}-error`,
            ]
              .filter(Boolean)
              .join(' ') || undefined
          }
          aria-invalid={invalid || undefined}
          className={`app-date-trigger ${className}`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="shrink-0"
          >
            <rect x="3" y="5" width="18" height="16" rx="3" />
            <path d="M16 3v4M8 3v4M3 11h18" />
          </svg>
          <span dir="ltr" className={value ? '' : 'app-date-placeholder'}>
            {displayDateOnly(value) || placeholder || 'DD/MM/YYYY'}
          </span>
        </button>
        {(typeof error === 'string' || validationMessage) && (
          <span id={`${fieldId}-error`} className="app-date-error" role="alert">
            {typeof error === 'string' ? error : validationMessage}
          </span>
        )}
      </span>
      {open && !disabled && (
        <FloatingPortal>
          <FloatingFocusManager
            context={context}
            modal={false}
            initialFocus={-1}
          >
            <div
              {...getFloatingProps({
                onKeyDown: (event) => {
                  if (event.key === 'Escape') {
                    event.stopPropagation()
                    setOpen(false)
                  }
                },
              })}
              ref={setFloating}
              style={floatingStyles}
              className="app-date-popup"
              dir={rtl ? 'rtl' : 'ltr'}
              lang={activeLanguage}
              aria-label={label}
            >
              <DayPicker
                mode="single"
                selected={selected}
                onSelect={choose}
                defaultMonth={selected ?? lower ?? upper ?? new Date()}
                locale={arabic ? ar : enUS}
                labels={
                  arabic
                    ? {
                        labelNext: () => 'الشهر التالي',
                        labelPrevious: () => 'الشهر السابق',
                        labelMonthDropdown: () => 'اختر الشهر',
                        labelYearDropdown: () => 'اختر السنة',
                        labelNav: () => 'التنقل بين الأشهر',
                        labelDayButton: (date, modifiers) =>
                          [
                            date.toLocaleDateString('ar-EG-u-ca-gregory', {
                              dateStyle: 'full',
                              numberingSystem: 'latn',
                            }),
                            modifiers.today ? 'اليوم' : '',
                            modifiers.selected ? 'محدد' : '',
                          ]
                            .filter(Boolean)
                            .join('، '),
                      }
                    : undefined
                }
                dir={rtl ? 'rtl' : 'ltr'}
                numerals="latn"
                weekStartsOn={weekStartsOn}
                autoFocus
                showOutsideDays
                fixedWeeks
                captionLayout={monthYearSelection ? 'dropdown' : 'label'}
                startMonth={
                  lower ??
                  new Date(Math.min(1900, selected?.getFullYear() ?? 1900), 0)
                }
                endMonth={
                  upper ??
                  new Date(Math.max(2100, selected?.getFullYear() ?? 2100), 11)
                }
                disabled={[
                  ...(lower ? [{ before: lower }] : []),
                  ...(upper ? [{ after: upper }] : []),
                ]}
                required={required}
              />
              <div className="app-date-actions">
                <button
                  type="button"
                  disabled={todayDisabled}
                  onClick={() => choose(parseDateOnly(today))}
                >
                  {arabic ? 'اليوم' : 'Today'}
                </button>
                {clearable && (
                  <button
                    type="button"
                    disabled={!value}
                    onClick={() => choose()}
                  >
                    {arabic ? 'مسح' : 'Clear'}
                  </button>
                )}
              </div>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  )
}
