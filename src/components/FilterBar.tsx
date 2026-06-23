import type { ReactNode } from 'react'
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

interface FilterBarProps {
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  selects?: FilterSelectConfig[]
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
  return (
    <div
      data-tour={dataTour}
      className="mb-md rounded-lg border border-outline-variant bg-surface-container-low p-sm"
    >
      <div className="grid grid-cols-1 items-end gap-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {onSearchChange !== undefined && (
          <FilterField label="بحث" htmlFor="filter-search" className="sm:col-span-2 xl:col-span-2">
            <div className="relative">
              <Icon
                name="search"
                size={18}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant"
              />
              <input
                id="filter-search"
                type="search"
                value={search ?? ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className={`${inputClass} pr-8`}
              />
            </div>
          </FilterField>
        )}

        {onDateFromChange !== undefined && (
          <FilterField label={dateFromLabel} htmlFor="filter-date-from">
            <input
              id="filter-date-from"
              type="date"
              value={dateFrom ?? ''}
              onChange={(e) => onDateFromChange(e.target.value)}
              className={inputClass}
              dir="ltr"
            />
          </FilterField>
        )}

        {onDateToChange !== undefined && (
          <FilterField label={dateToLabel} htmlFor="filter-date-to">
            <input
              id="filter-date-to"
              type="date"
              value={dateTo ?? ''}
              onChange={(e) => onDateToChange(e.target.value)}
              className={inputClass}
              dir="ltr"
            />
          </FilterField>
        )}

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
