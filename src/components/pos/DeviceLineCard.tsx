import { useMemo, useState } from 'react'
import type { Employee } from '../../api/types'
import {
  amountFromPercent,
  clampDiscountAmount,
  percentFromAmount,
  type DiscountMode,
} from '../../lib/discount'
import {
  computeInstallmentCount,
  computeMinDownPayment,
  suggestInstallmentAmount,
} from '../../lib/sales'
import { Icon } from '../Icon'
import { SearchableSelect } from '../SearchableSelect'

export type VehicleType = 'car' | 'tuk_tuk' | 'motorcycle' | 'other'
export type RenewalType = 'annual' | 'permanent'
export type LinePaymentTerm = 'cash' | 'installment'
export type IntervalType = 'monthly' | 'weekly'

export interface DeviceLineDraft {
  key: string
  productUnitId?: number
  imei?: string
  serialNumber: string
  simNumber: string
  username: string
  unitPrice: number
  discountAmount: number
  discountPercent: number
  discountMode: DiscountMode
  paymentTerm: LinePaymentTerm
  installmentAmount: number
  downPayment: number
  intervalType: IntervalType
  firstDueDate: string
  technician: Employee | null
  vehicleType: VehicleType | ''
  vehiclePlateLetters: string
  vehiclePlateNumbers: string
  chassisNumber: string
  engineNumber: string
  renewalType: RenewalType
}

const inputClass = 'w-full rounded border border-outline-variant px-sm py-2 text-sm'
const scanClass = `${inputClass} font-mono tracking-wide`
const selectClass = `${inputClass} focus:border-primary focus:outline-none`

const toggleBtn = (active: boolean) =>
  `flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
    active
      ? 'border-primary bg-primary text-on-primary'
      : 'border-outline-variant bg-surface-container-lowest text-on-surface'
  }`

const colBox = 'flex h-full flex-col gap-sm rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-sm'

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export function lineNetTotal(line: DeviceLineDraft): number {
  return Math.max(0, line.unitPrice - line.discountAmount)
}

export function lineInstallmentCount(
  line: DeviceLineDraft,
  maxInstallmentCount: number,
): number {
  const net = lineNetTotal(line)
  return computeInstallmentCount(
    net,
    line.installmentAmount,
    line.downPayment,
    maxInstallmentCount,
  )
}

export function validateInstallmentLine(
  line: DeviceLineDraft,
  minDownPercent: number,
  maxInstallmentCount: number,
): { valid: boolean; errors: string[] } {
  if (line.paymentTerm !== 'installment') return { valid: true, errors: [] }

  const errors: string[] = []
  const net = lineNetTotal(line)
  const minDown = computeMinDownPayment(net, minDownPercent)
  const count = lineInstallmentCount(line, maxInstallmentCount)

  if (line.installmentAmount <= 0) {
    errors.push('قيمة القسط يجب أن تكون أكبر من صفر')
  }
  if (line.downPayment >= net - 0.009) {
    errors.push('المقدم يجب أن يكون أقل من صافي الجهاز')
  }
  if (line.downPayment < minDown - 0.009) {
    errors.push(`المقدم أقل من الحد الأدنى (${minDownPercent}%)`)
  }
  if (count < 1 && line.installmentAmount > 0 && line.downPayment < net) {
    errors.push('لا يمكن حساب عدد أقساط صالح')
  }

  return { valid: errors.length === 0, errors }
}

interface DeviceLineCardProps {
  index: number
  line: DeviceLineDraft
  contractDate: string
  onChange: (line: DeviceLineDraft) => void
  minDownPercent: number
  maxInstallmentCount: number
  employees: Employee[]
  employeesLoading: boolean
}

export function DeviceLineCard({
  index,
  line,
  contractDate,
  onChange,
  minDownPercent,
  maxInstallmentCount,
  employees,
  employeesLoading,
}: DeviceLineCardProps) {
  const [expanded, setExpanded] = useState(true)
  const [technicianSearch, setTechnicianSearch] = useState('')
  const patch = (partial: Partial<DeviceLineDraft>) => onChange({ ...line, ...partial })
  const net = lineNetTotal(line)
  const renewalDate = line.renewalType === 'annual' ? addDays(contractDate, 365) : undefined
  const computedCount = useMemo(
    () => lineInstallmentCount(line, maxInstallmentCount),
    [line, maxInstallmentCount],
  )
  const validation = validateInstallmentLine(line, minDownPercent, maxInstallmentCount)

  const filteredEmployees = useMemo(() => {
    const q = technicianSearch.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((e) => e.name.toLowerCase().includes(q))
  }, [employees, technicianSearch])

  const switchToInstallment = () => {
    const minDown = computeMinDownPayment(net, minDownPercent)
    patch({
      paymentTerm: 'installment',
      downPayment: minDown,
      installmentAmount: suggestInstallmentAmount(net, 6, minDownPercent),
      firstDueDate: addDays(contractDate, 30),
    })
  }

  const setDiscountMode = (mode: DiscountMode) => {
    patch({ discountMode: mode })
  }

  const handleDiscountAmount = (raw: number) => {
    const amount = clampDiscountAmount(line.unitPrice, raw)
    patch({
      discountAmount: amount,
      discountPercent: percentFromAmount(line.unitPrice, amount),
      discountMode: 'amount',
    })
  }

  const handleDiscountPercent = (raw: number) => {
    const percent = Math.min(100, Math.max(0, raw))
    const amount = amountFromPercent(line.unitPrice, percent)
    patch({
      discountAmount: amount,
      discountPercent: percent,
      discountMode: 'percent',
    })
  }

  return (
    <div className="w-full overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low shadow-sm">
      {/* Header — collapsible */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full flex-wrap items-center gap-sm bg-primary/10 px-md py-sm text-sm transition-colors hover:bg-primary/15"
      >
        <Icon
          name="expand_more"
          size={22}
          className={`shrink-0 text-primary transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
        <span className="font-semibold text-on-surface">جهاز {index + 1}</span>
        {line.imei && (
          <span className="text-on-surface-variant" dir="ltr">
            IMEI: {line.imei}
          </span>
        )}
        <span className="mr-auto tabular-nums text-on-surface">
          السعر الإجمالي:{' '}
          <strong>{net.toLocaleString('ar-EG')} ج.م</strong>
        </span>
      </button>

      {expanded && (
        <div className="space-y-md p-md">
          {/* صف بيانات الجهاز */}
          <div className="grid gap-sm md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-xs block text-xs text-on-surface-variant">السريال (جهاز)</label>
              <input
                value={line.serialNumber}
                onChange={(e) => patch({ serialNumber: e.target.value })}
                placeholder="امسح أو أدخل السريال"
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
            <div>
              <label className="mb-xs block text-xs text-on-surface-variant">اسم المستخدم (تطبيق التتبع)</label>
              <input
                value={line.username}
                onChange={(e) => patch({ username: e.target.value })}
                placeholder="username"
                className={inputClass}
                dir="ltr"
                autoComplete="off"
              />
            </div>
            <div>
              <SearchableSelect
                label="الفني (دعم)"
                options={filteredEmployees}
                value={line.technician}
                onChange={(technician) => patch({ technician })}
                onSearchChange={setTechnicianSearch}
                getOptionValue={(emp) => emp.id}
                getOptionLabel={(emp) =>
                  `${emp.name}${emp.job_title ? ` — ${emp.job_title}` : ''}`
                }
                placeholder="ابحث باسم الفني..."
                loading={employeesLoading}
                emptyMessage="لا يوجد فني مطابق"
              />
            </div>
          </div>

          {/* 3 أعمدة: مركبة | دفع | خصم */}
          <div className="grid gap-md lg:grid-cols-3">
            {/* المركبة والتجديد */}
            <div className={colBox}>
              <h4 className="text-sm font-semibold text-on-surface">المركبة والتجديد</h4>
              <div>
                <label className="mb-xs block text-xs text-on-surface-variant">نوع المركبة</label>
                <select
                  value={line.vehicleType}
                  onChange={(e) => patch({ vehicleType: e.target.value as VehicleType | '' })}
                  className={inputClass}
                >
                  <option value="">— اختر —</option>
                  <option value="car">سيارة</option>
                  <option value="tuk_tuk">توك توك</option>
                  <option value="motorcycle">دراجة نارية</option>
                  <option value="other">أخرى</option>
                </select>
              </div>

              {(line.vehicleType === 'car' || line.vehicleType === 'motorcycle') && (
                <div className="grid grid-cols-2 gap-xs">
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
                <div className="grid grid-cols-2 gap-xs">
                  <div>
                    <label className="mb-xs block text-xs text-on-surface-variant">الشاسيه</label>
                    <input
                      value={line.chassisNumber}
                      onChange={(e) => patch({ chassisNumber: e.target.value })}
                      dir="ltr"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-xs block text-xs text-on-surface-variant">الموتور</label>
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
                <label className="mb-xs block text-xs text-on-surface-variant">التجديد</label>
                <select
                  value={line.renewalType}
                  onChange={(e) => patch({ renewalType: e.target.value as RenewalType })}
                  className={inputClass}
                >
                  <option value="annual">سنوي</option>
                  <option value="permanent">دائم</option>
                </select>
                {line.renewalType === 'annual' && renewalDate && (
                  <p className="mt-xs text-xs text-on-surface-variant">تاريخ التجديد: {renewalDate}</p>
                )}
              </div>
            </div>

            {/* طريقة الدفع */}
            <div className={colBox} data-tour={index === 0 ? 'pos-payment' : undefined}>
              <h4 className="text-sm font-semibold text-on-surface">طريقة الدفع</h4>
              <div className="flex gap-sm">
                {(['cash', 'installment'] as const).map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() =>
                      term === 'installment' ? switchToInstallment() : patch({ paymentTerm: 'cash' })
                    }
                    className={toggleBtn(line.paymentTerm === term)}
                  >
                    {term === 'cash' ? 'نقدي' : 'تقسيط'}
                  </button>
                ))}
              </div>

              {line.paymentTerm === 'installment' ? (
                <div className="space-y-sm">
                  <div className="flex gap-1 text-xs">
                    {(['monthly', 'weekly'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() =>
                          patch({
                            intervalType: type,
                            firstDueDate: addDays(contractDate, type === 'weekly' ? 7 : 30),
                          })
                        }
                        className={`flex-1 rounded border py-1 ${
                          line.intervalType === type
                            ? 'border-primary bg-primary/10 font-medium text-primary'
                            : 'border-outline-variant'
                        }`}
                      >
                        {type === 'monthly' ? 'شهري' : 'أسبوعي'}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-sm">
                    <div>
                      <label className="mb-xs block text-xs text-on-surface-variant">قيمة المقدم</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.downPayment}
                        onChange={(e) => patch({ downPayment: Number(e.target.value) })}
                        className={`${selectClass} tabular-nums`}
                      />
                    </div>
                    <div>
                      <label className="mb-xs block text-xs text-on-surface-variant">عدد الأقساط</label>
                      <div
                        className={`${selectClass} bg-surface-container-low font-medium tabular-nums`}
                      >
                        {computedCount > 0 ? computedCount : '—'}
                      </div>
                    </div>
                    <div>
                      <label className="mb-xs block text-xs text-on-surface-variant">قيمة القسط</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.installmentAmount}
                        onChange={(e) => patch({ installmentAmount: Number(e.target.value) })}
                        className={`${selectClass} tabular-nums`}
                      />
                    </div>
                    <div>
                      <label className="mb-xs block text-xs text-on-surface-variant">أول استحقاق</label>
                      <input
                        type="date"
                        value={line.firstDueDate}
                        onChange={(e) => patch({ firstDueDate: e.target.value })}
                        className={selectClass}
                      />
                    </div>
                  </div>
                  {!validation.valid &&
                    validation.errors.map((msg) => (
                      <p key={msg} className="text-xs text-error">
                        {msg}
                      </p>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-on-surface-variant">
                  الدفع نقدي — يُضاف صافي الجهاز للمطلوب عند التعاقد.
                </p>
              )}
            </div>

            {/* خصم الجهاز */}
            <div className={colBox}>
              <div className="flex items-center justify-between gap-sm">
                <h4 className="text-sm font-semibold text-on-surface">خصم الجهاز</h4>
                <div className="flex gap-1 rounded-lg border border-outline-variant p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setDiscountMode('amount')}
                    className={`rounded px-2 py-0.5 ${line.discountMode === 'amount' ? 'bg-primary text-on-primary' : ''}`}
                  >
                    مبلغ
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountMode('percent')}
                    className={`rounded px-2 py-0.5 ${line.discountMode === 'percent' ? 'bg-primary text-on-primary' : ''}`}
                  >
                    %
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-xs block text-xs text-on-surface-variant">قيمة الخصم</label>
                {line.discountMode === 'amount' ? (
                  <input
                    type="number"
                    min={0}
                    max={line.unitPrice}
                    step="0.01"
                    value={line.discountAmount || ''}
                    onChange={(e) => handleDiscountAmount(Number(e.target.value))}
                    className={`${inputClass} tabular-nums`}
                    dir="ltr"
                  />
                ) : (
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={line.discountPercent || ''}
                    onChange={(e) => handleDiscountPercent(Number(e.target.value))}
                    className={`${inputClass} tabular-nums`}
                    dir="ltr"
                  />
                )}
              </div>

              <div className="mt-auto rounded-lg bg-surface-container-low p-sm">
                <p className="text-xs text-on-surface-variant">الصافي بعد الخصم</p>
                <p className="text-lg font-bold tabular-nums text-on-surface">
                  {net.toLocaleString('ar-EG')} ج.م
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function createDeviceLine(
  unitPrice: number,
  unit?: { id: number; imei?: string; serial_number?: string | null },
  options?: { contractDate?: string; minDownPercent?: number },
): DeviceLineDraft {
  const contractDate = options?.contractDate ?? new Date().toISOString().split('T')[0]
  const minDownPercent = options?.minDownPercent ?? 10
  const minDown = computeMinDownPayment(unitPrice, minDownPercent)

  return {
    key: `${unit?.id ?? 'new'}-${Date.now()}-${Math.random()}`,
    productUnitId: unit?.id,
    imei: unit?.imei,
    serialNumber: unit?.serial_number ?? '',
    simNumber: '',
    username: '',
    unitPrice,
    discountAmount: 0,
    discountPercent: 0,
    discountMode: 'amount',
    paymentTerm: 'installment',
    installmentAmount: suggestInstallmentAmount(unitPrice, 6, minDownPercent),
    downPayment: minDown,
    intervalType: 'monthly',
    firstDueDate: addDays(contractDate, 30),
    technician: null,
    vehicleType: '',
    vehiclePlateLetters: '',
    vehiclePlateNumbers: '',
    chassisNumber: '',
    engineNumber: '',
    renewalType: 'annual',
  }
}
