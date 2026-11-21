import { AppDatePicker } from './AppDatePicker'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

export interface FilterSelectOption {
  value: string
  label: string
}

export interface FilterSelectConfig {
  id: string
  label: string
  value: string
  options: FilterSelectOption[]
  onChange: (value: string) => void
}

export interface FilterMultiSelectConfig {
  id: string
  label: string
  values: string[]
  options: FilterSelectOption[]
  onChange: (values: string[]) => void
  emptyLabel: string
}

interface FilterBarProps {
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  selects?: FilterSelectConfig[]
  multiSelects?: FilterMultiSelectConfig[]
  dateFrom?: string
  dateTo?: string
  onDateFromChange?: (value: string) => void
  onDateToChange?: (value: string) => void
  dateFromLabel?: string
  dateToLabel?: string
  onClear?: () => void
  showClear?: boolean
  dataTour?: string
}

const inputClass =
  'h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-sm text-sm text-on-surface'

const fieldClass = 'min-w-0 flex flex-col gap-xs'

function multiSelectSummary(config: FilterMultiSelectConfig): string {
  if (config.values.length === 0) return config.emptyLabel
  if (config.values.length === 1) {
    return config.options.find((option) => option.value === config.values[0])?.label ?? config.values[0]
  }
  return `${config.values.length} محصلين`
}

function FilterMultiSelect({ config }: { config: FilterMultiSelectConfig }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const toggle = (value: string) => {
    config.onChange(
      config.values.includes(value)
        ? config.values.filter((item) => item !== value)
        : [...config.values, value],
    )
  }

  return (
    <FilterField label={config.label} htmlFor={config.id}>
      <div ref={rootRef} className="relative">
        <button
          id={config.id}
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((current) => !current)}
          className={`${inputClass} flex items-center justify-between gap-xs text-start`}
        >
          <span className="truncate">{multiSelectSummary(config)}</span>
          <Icon name="expand_more" size={18} className="shrink-0 text-on-surface-variant" />
        </button>
        {open && (
          <div
            id={listId}
            className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-outline-variant bg-surface-container-lowest p-sm shadow-lg"
          >
            <label className="flex cursor-pointer items-center gap-xs rounded px-xs py-1 text-sm hover:bg-surface-container">
              <input
                type="checkbox"
                checked={config.values.length === 0}
                onChange={() => config.onChange([])}
              />
              {config.emptyLabel}
            </label>
            {config.options.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-xs rounded px-xs py-1 text-sm hover:bg-surface-container"
              >
                <input
                  type="checkbox"
                  checked={config.values.includes(option.value)}
                  onChange={() => toggle(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        )}
      </div>
    </FilterField>
  )
}

function FilterField({
  label,
  htmlFor,
  children,
  className = '',
}: {
  label: string
  htmlFor?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`${fieldClass} ${className}`}>
      <label htmlFor={htmlFor} className="text-xs font-medium text-on-surface-variant">
        {label}
      </label>
      {children}
    </div>
  )
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'بحث...',
  selects = [],
  multiSelects = [],
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  dateFromLabel = 'من تاريخ',
  dateToLabel = 'إلى تاريخ',
  onClear,
  showClear = false,
  dataTour,
}: FilterBarProps) {
  const searchOnly =
    onSearchChange !== undefined &&
    onDateFromChange === undefined &&
    onDateToChange === undefined &&
    selects.length === 0 &&
    multiSelects.length === 0

  return (
    <div
      data-tour={dataTour}
      className="mb-md rounded-lg border border-outline-variant bg-surface-container-low p-sm"
    >
      <div className="grid grid-cols-1 items-end gap-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))]">
        {onSearchChange !== undefined && (
          <FilterField
            label="بحث"
            htmlFor="filter-search"
            className={searchOnly ? 'sm:col-span-2 lg:col-span-3 xl:col-span-6' : 'sm:col-span-2 xl:col-span-2'}
          >
            <div className="relative">
              <Icon
                name="search"
                size={18}
                className="pointer-events-none absolute start-2 top-1/2 -translate-y-1/2 text-on-surface-variant"
              />
              <input
                id="filter-search"
                type="search"
                value={search ?? ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className={`${inputClass} ps-8`}
              />
            </div>
          </FilterField>
        )}

        {onDateFromChange !== undefined && (
          <FilterField label={dateFromLabel} htmlFor="filter-date-from">
            <AppDatePicker
              id="filter-date-from"
              value={dateFrom ?? ''}
              onChange={(e) => onDateFromChange(e)}
              className={inputClass}
            />
          </FilterField>
        )}

        {onDateToChange !== undefined && (
          <FilterField label={dateToLabel} htmlFor="filter-date-to">
            <AppDatePicker
              id="filter-date-to"
              value={dateTo ?? ''}
              onChange={(e) => onDateToChange(e)}
              className={inputClass}
            />
          </FilterField>
        )}

        {multiSelects.map((select) => (
          <FilterMultiSelect key={select.id} config={select} />
        ))}

        {selects.map((select) => (
          <FilterField key={select.id} label={select.label} htmlFor={select.id}>
            <select
              id={select.id}
              value={select.value}
              onChange={(e) => select.onChange(e.target.value)}
              className={inputClass}
            >
              {select.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FilterField>
        ))}

        {showClear && onClear && (
          <div className={`${fieldClass} xl:col-span-1`}>
            <span className="hidden text-xs font-medium text-transparent sm:block" aria-hidden>
              &nbsp;
            </span>
            <button
              type="button"
              onClick={onClear}
              className="inline-flex h-10 w-full items-center justify-center gap-xs rounded-lg border border-outline-variant px-sm text-sm text-on-surface-variant hover:bg-surface-container"
            >
              <Icon name="filter_alt_off" size={16} />
              مسح الفلاتر
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
