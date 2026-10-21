import { GpsUsernameInput } from '../pos/GpsUsernameInput'
import { Icon } from '../Icon'
import { TextInput } from '../ui/TextInput'
import { normalizeScannedDigits } from '../../lib/scanner'
import { renewalTypeLabels } from '../../lib/contractFields'
import {
  emptyLegacyDeviceDraft,
  validateLegacyDeviceDraft,
  type LegacyDeviceDraft,
} from '../../lib/customerLegacyDevices'

const inputClass = 'w-full rounded border border-outline-variant px-sm py-2'

interface CustomerLegacyDevicesFieldsProps {
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  devices: LegacyDeviceDraft[]
  onChange: (devices: LegacyDeviceDraft[]) => void
  showErrors?: boolean
  compact?: boolean
  showToggle?: boolean
}

export function CustomerLegacyDevicesFields({
  enabled,
  onEnabledChange,
  devices,
  onChange,
  showErrors = false,
  compact = false,
  showToggle = true,
}: CustomerLegacyDevicesFieldsProps) {
  const patchDevice = (key: string, patch: Partial<LegacyDeviceDraft>) => {
    onChange(devices.map((device) => (device.key === key ? { ...device, ...patch } : device)))
  }

  const handleEnabledChange = (next: boolean) => {
    onEnabledChange(next)
    if (next && devices.length === 0) {
      onChange([emptyLegacyDeviceDraft()])
    }
  }

  return (
    <section
      className={
        compact
          ? 'rounded-lg border border-outline-variant p-sm'
          : 'rounded-lg border border-outline-variant bg-surface-container-lowest p-md'
      }
    >
      <div className="mb-sm flex flex-wrap items-center justify-between gap-sm">
        <div>
          <h3 className="text-sm font-bold text-on-surface">عميل قديم (أجهزة قبل السيستم)</h3>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            سجّل السريال والشريحة واسم المستخدم ونوع الاشتراك والأقساط المتبقية لكل جهاز حتى التجديد والتحصيل ونقل
            الملكية يشتغلوا بدون تسجيل الجهاز من مخزون الشركة.
          </p>
        </div>
        {showToggle && (
          <div className="flex w-fit gap-1 rounded-lg border border-outline-variant p-0.5 text-sm">
            <button
              type="button"
              onClick={() => handleEnabledChange(true)}
              className={`rounded px-md py-1.5 font-medium ${
                enabled ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
              }`}
            >
              نعم
            </button>
            <button
              type="button"
              onClick={() => handleEnabledChange(false)}
              className={`rounded px-md py-1.5 font-medium ${
                !enabled ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
              }`}
            >
              لا
            </button>
          </div>
        )}
      </div>

      {enabled && (
        <div className="space-y-sm">
          {devices.map((device, index) => {
            const errors = showErrors ? validateLegacyDeviceDraft(device) : {}
            return (
              <div
                key={device.key}
                className="space-y-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-sm"
              >
                <div className="flex items-center justify-between gap-sm">
                  <p className="text-sm font-bold text-on-surface">جهاز {index + 1}</p>
                  {devices.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onChange(devices.filter((item) => item.key !== device.key))}
                      className="inline-flex items-center gap-1 text-xs font-bold text-error"
                    >
                      <Icon name="delete" size={16} />
                      حذف
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-sm text-sm">
                  <label className="flex items-center gap-xs">
                    <input
                      type="radio"
                      name={`legacy-origin-${device.key}`}
                      checked={device.origin === 'legacy'}
                      onChange={() => patchDevice(device.key, { origin: 'legacy' })}
                    />
                    جهاز قديم من الشركة
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-sm sm:grid-cols-3">
                  <label className="block text-sm">
                    <span className="mb-xs block text-on-surface-variant">السريال *</span>
                    <TextInput
                      mode="phone"
                      value={device.serial_number}
                      onChange={(e) =>
                        patchDevice(device.key, { serial_number: normalizeScannedDigits(e.target.value) })
                      }
                      dir="ltr"
                      className={`${inputClass}${errors.serial_number ? ' border-error' : ''}`}
                    />
                    {errors.serial_number && (
                      <p className="mt-xs text-xs text-error">{errors.serial_number}</p>
                    )}
                  </label>
                  <label className="block text-sm">
                    <span className="mb-xs block text-on-surface-variant">رقم الشريحة *</span>
                    <TextInput
                      mode="phone"
                      value={device.sim_number}
                      onChange={(e) =>
                        patchDevice(device.key, { sim_number: normalizeScannedDigits(e.target.value) })
                      }
                      dir="ltr"
                      className={`${inputClass}${errors.sim_number ? ' border-error' : ''}`}
                    />
                    {errors.sim_number && <p className="mt-xs text-xs text-error">{errors.sim_number}</p>}
                  </label>
                  <label className="block text-sm">
                    <span className="mb-xs block text-on-surface-variant">اسم المستخدم *</span>
                    <GpsUsernameInput
                      value={device.username}
                      onChange={(username) => patchDevice(device.key, { username })}
                      hasError={Boolean(errors.username)}
                    />
                    {errors.username && <p className="mt-xs text-xs text-error">{errors.username}</p>}
                  </label>
                </div>

                <div>
                  <span className="mb-xs block text-sm text-on-surface-variant">نوع الاشتراك *</span>
                  <div className="flex flex-wrap gap-sm text-sm">
                    <label className="flex items-center gap-xs">
                      <input
                        type="radio"
                        name={`legacy-renewal-${device.key}`}
                        checked={device.renewal_type === 'annual'}
                        onChange={() => patchDevice(device.key, { renewal_type: 'annual' })}
                      />
                      {renewalTypeLabels.annual}
                    </label>
                    <label className="flex items-center gap-xs">
                      <input
                        type="radio"
                        name={`legacy-renewal-${device.key}`}
                        checked={device.renewal_type === 'permanent'}
                        onChange={() => patchDevice(device.key, { renewal_type: 'permanent' })}
                      />
                      {renewalTypeLabels.permanent}
                    </label>
                  </div>
                  {errors.renewal_type && <p className="mt-xs text-xs text-error">{errors.renewal_type}</p>}
                </div>

                {device.renewal_type === 'annual' && (
                  <label className="block text-sm">
                    <span className="mb-xs block text-on-surface-variant">تاريخ التجديد *</span>
                    <input
                      type="date"
                      value={device.subscription_renewal_date}
                      onChange={(e) =>
                        patchDevice(device.key, { subscription_renewal_date: e.target.value })
                      }
                      className={`${inputClass}${errors.subscription_renewal_date ? ' border-error' : ''}`}
                    />
                    {errors.subscription_renewal_date && (
                      <p className="mt-xs text-xs text-error">{errors.subscription_renewal_date}</p>
                    )}
                  </label>
                )}

                <div>
                  <span className="mb-xs block text-sm text-on-surface-variant">أقساط متبقية؟</span>
                  <div className="flex w-fit gap-1 rounded-lg border border-outline-variant p-0.5 text-sm">
                    <button
                      type="button"
                      onClick={() => patchDevice(device.key, { has_remaining_installments: true })}
                      className={`rounded px-md py-1.5 font-medium ${
                        device.has_remaining_installments
                          ? 'bg-primary text-on-primary'
                          : 'text-on-surface-variant'
                      }`}
                    >
                      نعم
                    </button>
                    <button
                      type="button"
                      onClick={() => patchDevice(device.key, { has_remaining_installments: false })}
                      className={`rounded px-md py-1.5 font-medium ${
                        !device.has_remaining_installments
                          ? 'bg-primary text-on-primary'
                          : 'text-on-surface-variant'
                      }`}
                    >
                      لا
                    </button>
                  </div>
                </div>

                {device.has_remaining_installments && (
                  <div className="grid grid-cols-1 gap-sm sm:grid-cols-3">
                    <label className="block text-sm">
                      <span className="mb-xs block text-on-surface-variant">عدد الأقساط المتبقية *</span>
                      <TextInput
                        mode="phone"
                        value={device.remaining_installment_count}
                        onChange={(e) =>
                          patchDevice(device.key, {
                            remaining_installment_count: normalizeScannedDigits(e.target.value),
                          })
                        }
                        dir="ltr"
                        className={`${inputClass}${errors.remaining_installment_count ? ' border-error' : ''}`}
                      />
                      {errors.remaining_installment_count && (
                        <p className="mt-xs text-xs text-error">{errors.remaining_installment_count}</p>
                      )}
                    </label>
                    <label className="block text-sm">
                      <span className="mb-xs block text-on-surface-variant">قيمة القسط *</span>
                      <TextInput
                        mode="phone"
                        value={device.installment_amount}
                        onChange={(e) =>
                          patchDevice(device.key, {
                            installment_amount: normalizeScannedDigits(e.target.value),
                          })
                        }
                        dir="ltr"
                        className={`${inputClass}${errors.installment_amount ? ' border-error' : ''}`}
                      />
                      {errors.installment_amount && (
                        <p className="mt-xs text-xs text-error">{errors.installment_amount}</p>
                      )}
                    </label>
                    <label className="block text-sm">
                      <span className="mb-xs block text-on-surface-variant">تاريخ أول قسط *</span>
                      <input
                        type="date"
                        value={device.first_due_date}
                        onChange={(e) => patchDevice(device.key, { first_due_date: e.target.value })}
                        className={`${inputClass}${errors.first_due_date ? ' border-error' : ''}`}
                      />
                      {errors.first_due_date && (
                        <p className="mt-xs text-xs text-error">{errors.first_due_date}</p>
                      )}
                    </label>
                  </div>
                )}
              </div>
            )
          })}

          <button
            type="button"
            onClick={() => onChange([...devices, emptyLegacyDeviceDraft()])}
            className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-md py-sm text-sm font-bold text-on-surface hover:bg-surface-container"
          >
            <Icon name="add" size={18} />
            إضافة جهاز آخر
          </button>
        </div>
      )}
    </section>
  )
}
