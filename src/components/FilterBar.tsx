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
  onClear?: () => void
  showClear?: boolean
  dataTour?: string
}

const inputClass =
  'rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-2 text-sm text-on-surface'

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'بحث...',
  selects = [],
  onClear,
  showClear = false,
  dataTour,
}: FilterBarProps) {
  return (
    <div
      data-tour={dataTour}
      className="mb-md flex flex-wrap items-end gap-sm rounded-lg border border-outline-variant bg-surface-container-low p-sm"
    >
      {onSearchChange !== undefined && (
        <div className="min-w-[200px] flex-1">
          <label className="mb-xs block text-xs font-medium text-on-surface-variant">
            بحث
          </label>
          <div className="relative">
            <Icon
              name="search"
              size={18}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
            <input
              type="search"
              value={search ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className={`${inputClass} w-full pr-8`}
            />
          </div>
        </div>
      )}

      {selects.map((select) => (
        <div key={select.id} className="min-w-[160px]">
          <label
            htmlFor={select.id}
            className="mb-xs block text-xs font-medium text-on-surface-variant"
          >
            {select.label}
          </label>
          <select
            id={select.id}
            value={select.value}
            onChange={(e) => select.onChange(e.target.value)}
            className={`${inputClass} w-full`}
          >
            {select.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      {showClear && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-xs rounded-lg border border-outline-variant px-sm py-2 text-sm text-on-surface-variant hover:bg-surface-container"
        >
          <Icon name="filter_alt_off" size={16} />
          مسح الفلاتر
        </button>
      )}
    </div>
  )
}
