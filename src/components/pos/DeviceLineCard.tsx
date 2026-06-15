import type { DiscountMode } from '../../lib/discount'
import { DiscountInput } from './DiscountInput'

export type VehicleType = 'car' | 'tuk_tuk' | 'motorcycle' | 'other'
export type RenewalType = 'annual' | 'permanent'

export interface DeviceLineDraft {
  key: string
  productUnitId?: number
  imei?: string
  serialNumber: string
  simNumber: string
  unitPrice: number
  discountAmount: number
  discountPercent: number
  discountMode: DiscountMode
  vehicleType: VehicleType | ''
  vehiclePlateLetters: string
  vehiclePlateNumbers: string
  chassisNumber: string
  engineNumber: string
  renewalType: RenewalType
}

const inputClass = 'w-full rounded border border-outline-variant px-sm py-2 text-sm'
const scanClass = `${inputClass} font-mono tracking-wide`

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

interface DeviceLineCardProps {
  index: number
  line: DeviceLineDraft
  contractDate: string
  onChange: (line: DeviceLineDraft) => void
}

export function DeviceLineCard({ index, line, contractDate, onChange }: DeviceLineCardProps) {
  const patch = (partial: Partial<DeviceLineDraft>) => onChange({ ...line, ...partial })
  const lineNet = Math.max(0, line.unitPrice - line.discountAmount)
  const renewalDate = line.renewalType === 'annual' ? addDays(contractDate, 365) : undefined

  return (
    <div className="space-y-sm rounded-lg border border-outline-variant bg-surface-container-low p-md">
      <div className="flex items-center justify-between gap-sm">
        <h3 className="font-medium text-on-surface">جهاز {index + 1}</h3>
        {line.imei && (
          <span className="text-xs text-on-surface-variant" dir="ltr">
            IMEI: {line.imei}
          </span>
        )}
      </div>

      <div className="grid gap-sm sm:grid-cols-2">
        <div>
          <label className="mb-xs block text-xs text-on-surface-variant">السريال (جهاز)</label>
          <input
            value={line.serialNumber}
            onChange={(e) => patch({ serialNumber: e.target.value })}
            placeholder="امسح الباركود أو أدخل السريال"
            className={scanClass}
            dir="ltr"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="mb-xs block text-xs text-on-surface-variant">رقم الشريحة / الكارت</label>
          <input
            value={line.simNumber}
            onChange={(e) => patch({ simNumber: e.target.value })}
            placeholder="امسح أو أدخل رقم الشريحة"
            className={scanClass}
            dir="ltr"
            autoComplete="off"
          />
        </div>
      </div>

      <DiscountInput
        label="خصم الجهاز"
        baseAmount={line.unitPrice}
        amount={line.discountAmount}
        percent={line.discountPercent}
        mode={line.discountMode}
        onChange={({ amount, percent, mode }) =>
          patch({ discountAmount: amount, discountPercent: percent, discountMode: mode })
        }
      />

      <p className="text-sm tabular-nums text-on-surface-variant">
        صافي الجهاز: <strong>{lineNet.toLocaleString('ar-EG')} ج.م</strong>
      </p>

      <div>
        <label className="mb-xs block text-xs text-on-surface-variant">نوع المركبة</label>
        <select
          value={line.vehicleType}
          onChange={(e) => patch({ vehicleType: e.target.value as VehicleType | '' })}
          className={inputClass}
        >
          <option value="">—</option>
          <option value="car">سيارة</option>
          <option value="tuk_tuk">توك توك</option>
          <option value="motorcycle">دراجة نارية</option>
          <option value="other">أخرى</option>
        </select>
      </div>

      {(line.vehicleType === 'car' || line.vehicleType === 'motorcycle') && (
        <div className="grid gap-sm sm:grid-cols-2">
          <div>
            <label className="mb-xs block text-xs text-on-surface-variant">حروف اللوحة</label>
            <input
              value={line.vehiclePlateLetters}
              onChange={(e) => patch({ vehiclePlateLetters: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-xs block text-xs text-on-surface-variant">أرقام اللوحة</label>
            <input
              value={line.vehiclePlateNumbers}
              onChange={(e) => patch({ vehiclePlateNumbers: e.target.value })}
              dir="ltr"
              className={inputClass}
            />
          </div>
        </div>
      )}

      {line.vehicleType === 'tuk_tuk' && (
        <div className="grid gap-sm sm:grid-cols-2">
          <div>
            <label className="mb-xs block text-xs text-on-surface-variant">رقم الشاسيه</label>
            <input
              value={line.chassisNumber}
              onChange={(e) => patch({ chassisNumber: e.target.value })}
              dir="ltr"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-xs block text-xs text-on-surface-variant">رقم الموتور</label>
            <input
              value={line.engineNumber}
              onChange={(e) => patch({ engineNumber: e.target.value })}
              dir="ltr"
              className={inputClass}
            />
          </div>
        </div>
      )}

      <div>
        <label className="mb-xs block text-xs text-on-surface-variant">نوع التجديد</label>
        <div className="flex gap-sm">
          {(['annual', 'permanent'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => patch({ renewalType: type })}
              className={`flex-1 rounded-lg border py-sm text-sm font-medium ${
                line.renewalType === type
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-outline-variant bg-surface-container-lowest'
              }`}
            >
              {type === 'annual' ? 'سنوي' : 'دائم'}
            </button>
          ))}
        </div>
        {line.renewalType === 'annual' && renewalDate && (
          <p className="mt-xs text-xs text-on-surface-variant">تاريخ التجديد: {renewalDate}</p>
        )}
      </div>
    </div>
  )
}

export function createDeviceLine(
  unitPrice: number,
  unit?: { id: number; imei?: string; serial_number?: string | null },
): DeviceLineDraft {
  return {
    key: `${unit?.id ?? 'new'}-${Date.now()}-${Math.random()}`,
    productUnitId: unit?.id,
    imei: unit?.imei,
    serialNumber: unit?.serial_number ?? '',
    simNumber: '',
    unitPrice,
    discountAmount: 0,
    discountPercent: 0,
    discountMode: 'amount',
    vehicleType: '',
    vehiclePlateLetters: '',
    vehiclePlateNumbers: '',
    chassisNumber: '',
    engineNumber: '',
    renewalType: 'annual',
  }
}
