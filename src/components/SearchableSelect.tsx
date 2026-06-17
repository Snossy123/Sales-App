import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from './Icon'

const inputClass =
  'w-full rounded border border-outline-variant px-sm py-2 pe-9 focus:border-primary focus:outline-none disabled:opacity-50'

export interface SearchableSelectProps<T> {
  options: T[]
  value: T | null
  onChange: (value: T | null) => void
  onSearchChange: (query: string) => void
  getOptionValue: (option: T) => string | number
  getOptionLabel: (option: T) => string
  placeholder?: string
  loading?: boolean
  disabled?: boolean
  emptyMessage?: string
  label?: string
  'data-tour'?: string
}

export function SearchableSelect<T>({
  options,
  value,
  onChange,
  onSearchChange,
  getOptionValue,
  getOptionLabel,
  placeholder = 'ابحث...',
  loading = false,
  disabled = false,
  emptyMessage = 'لا توجد نتائج',
  label,
  'data-tour': dataTour,
}: SearchableSelectProps<T>) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (value) {
      setQuery(getOptionLabel(value))
    }
  }, [value])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        if (value) {
          setQuery(getOptionLabel(value))
        } else {
          setQuery('')
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [value, open])

  const handleInputChange = (text: string) => {
    setQuery(text)
    onSearchChange(text)
    if (value) {
      onChange(null)
    }
    setOpen(true)
  }

  const handleSelect = (option: T) => {
    onChange(option)
    setQuery(getOptionLabel(option))
    setOpen(false)
  }

  const handleClear = () => {
    onChange(null)
    setQuery('')
    onSearchChange('')
    setOpen(false)
  }

  const showDropdown = open && !disabled && (loading || options.length > 0 || query.trim().length > 0)

  return (
    <div ref={rootRef} className="relative" data-tour={dataTour}>
      {label ? (
        <label className="mb-xs block text-xs text-on-surface-variant">{label}</label>
      ) : null}
      <div className="relative">
        <input
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClass}
          autoComplete="off"
        />
        {value ? (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="absolute end-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
            aria-label="مسح"
          >
            <Icon name="close" size={18} />
          </button>
        ) : (
          <span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-on-surface-variant">
            <Icon name="search" size={18} />
          </span>
        )}
      </div>
      {showDropdown ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-outline-variant bg-surface-container-lowest shadow-md"
        >
          {loading ? (
            <li className="px-sm py-2 text-sm text-on-surface-variant">جاري البحث...</li>
          ) : options.length === 0 ? (
            <li className="px-sm py-2 text-sm text-on-surface-variant">{emptyMessage}</li>
          ) : (
            options.map((option) => {
              const id = getOptionValue(option)
              const selected = value ? getOptionValue(value) === id : false
              return (
                <li key={String(id)}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(option)}
                    className={`w-full px-sm py-2 text-start text-sm transition-colors hover:bg-surface-container-high ${
                      selected ? 'bg-primary/10 font-medium text-primary' : 'text-on-surface'
                    }`}
                  >
                    {getOptionLabel(option)}
                  </button>
                </li>
              )
            })
          )}
        </ul>
      ) : null}
    </div>
  )
}
