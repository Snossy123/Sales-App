import { Icon } from '../Icon'
import {
  DEFAULT_PHONE_COUNT,
  emptyPhoneEntry,
  type CustomerPhoneEntry,
} from '../../lib/customerForm'

const inputClass = 'w-full rounded border border-outline-variant px-sm py-2'

interface CustomerPhoneFieldsProps {
  phones: CustomerPhoneEntry[]
  onChange: (phones: CustomerPhoneEntry[]) => void
}

export function CustomerPhoneFields({ phones, onChange }: CustomerPhoneFieldsProps) {
  const updatePhone = (index: number, patch: Partial<CustomerPhoneEntry>) => {
    onChange(phones.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)))
  }

  const addPhone = () => {
    onChange([...phones, emptyPhoneEntry()])
  }

  const removePhone = (index: number) => {
    if (index < DEFAULT_PHONE_COUNT) return
    onChange(phones.filter((_, i) => i !== index))
  }

  return (
    <div className="col-span-12 space-y-sm">
      {phones.map((entry, index) => (
        <div key={index} className="grid grid-cols-12 items-end gap-sm">
          <label className="col-span-12 block text-sm sm:col-span-4">
            <span className="mb-xs block text-on-surface-variant">
              {index === 0 ? 'تبع مين *' : 'تبع مين'}
            </span>
            <input
              value={entry.label}
              onChange={(e) => updatePhone(index, { label: e.target.value })}
              placeholder="مثل: شخصي، زوجة، ابن..."
              className={inputClass}
            />
          </label>
          <label className="col-span-12 block text-sm sm:col-span-4">
            <span className="mb-xs block text-on-surface-variant">
              {index === 0 ? 'رقم الهاتف 1 *' : `رقم الهاتف ${index + 1}`}
            </span>
            <input
              value={entry.number}
              onChange={(e) => updatePhone(index, { number: e.target.value })}
              required={index === 0}
              dir="ltr"
              className={inputClass}
            />
          </label>
          {index >= DEFAULT_PHONE_COUNT ? (
            <button
              type="button"
              onClick={() => removePhone(index)}
              className="col-span-12 inline-flex h-[42px] items-center justify-center gap-1 rounded border border-outline-variant px-sm text-sm text-on-surface-variant hover:bg-surface-container sm:col-span-1"
              aria-label="حذف الرقم"
            >
              <Icon name="close" size={18} />
            </button>
          ) : (
            <div className="hidden sm:col-span-1 sm:block" />
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addPhone}
        className="inline-flex items-center gap-1 rounded-lg border border-dashed border-outline-variant px-md py-xs text-sm text-on-surface-variant hover:bg-surface-container-low"
      >
        <Icon name="add" size={18} />
        إضافة رقم آخر
      </button>
    </div>
  )
}
