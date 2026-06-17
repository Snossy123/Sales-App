import { useMemo, useState, type ReactNode } from 'react'
import type { Employee } from '../../api/types'
import type { DiscountMode } from '../../lib/discount'
import {
  computeInstallmentCount,
  computeMinDownPayment,
  suggestInstallmentAmount,
} from '../../lib/sales'
import { SearchableSelect } from '../SearchableSelect'
import { DiscountInput } from './DiscountInput'

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

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function DeviceSectionTitle({ children }: { children: ReactNode }) {
  return <h4 className="text-sm font-medium text-on-surface-variant">{children}</h4>
}

function DeviceSectionBox({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-sm rounded-lg border border-outline-variant/60 bg-surface-container-lowest/50 p-sm">
      {children}
    </div>
  )
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
  branchReady: boolean
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
  branchReady,
}: DeviceLineCardProps) {
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

  return (
    <div className="w-full space-y-md rounded-lg border border-outline-variant bg-surface-container-low p-md">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-sm border-b border-outline-variant/50 pb-sm">
        <h3 className="text-base font-semibold text-on-surface">جهاز {index + 1}</h3>
        <div className="flex flex-wrap items-center gap-md text-sm tabular-nums text-on-surface-variant">
          {line.imei && (
            <span dir="ltr">IMEI: {line.imei}</span>
          )}
          <span>
            سعر:{' '}
            <strong className="text-on-surface">
              {line.unitPrice.toLocaleString('ar-EG')} ج.م
            </strong>
          </span>
          <span>
            صافي:{' '}
            <strong className="text-on-surface">{net.toLocaleString('ar-EG')} ج.م</strong>
          </span>
        </div>
      </div>

      {/* 1 — بيانات الجهاز */}
      <div className="space-y-sm">
        <DeviceSectionTitle>بيانات الجهاز</DeviceSectionTitle>
        <div className="grid gap-sm sm:grid-cols-2 lg:grid-cols-4">
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
          <div>
            <label className="mb-xs block text-xs text-on-surface-variant">اسم المستخدم (تطبيق التتبع)</label>
            <input
              value={line.username}
              onChange={(e) => patch({ username: e.target.value })}
              placeholder="username لكل جهاز"
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
              disabled={!branchReady}
              emptyMessage={branchReady ? 'لا يوجد فني مطابق' : 'اختر فرع/موزع أولاً'}
            />
          </div>
        </div>
      </div>

      {/* 2 — المركبة والتجديد */}
      <div className="space-y-sm">
        <DeviceSectionTitle>المركبة والتجديد</DeviceSectionTitle>
        <div className="grid gap-sm sm:grid-cols-2 lg:grid-cols-4">
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
            <>
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
            </>
          )}

          {line.vehicleType === 'tuk_tuk' && (
            <>
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
            </>
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
      </div>

      {/* 3 — طريقة الدفع */}
      <div className="space-y-sm">
        <DeviceSectionTitle>طريقة الدفع</DeviceSectionTitle>
        <div data-tour={index === 0 ? 'pos-payment' : undefined}>
          <div className="flex max-w-md gap-sm">
            {(['cash', 'installment'] as const).map((term) => (
              <button
                key={term}
                type="button"
                onClick={() =>
                  term === 'installment' ? switchToInstallment() : patch({ paymentTerm: 'cash' })
                }
                className={`flex-1 rounded-lg border py-sm text-sm font-medium ${
                  line.paymentTerm === term
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-outline-variant bg-surface-container-lowest'
                }`}
              >
                {term === 'cash' ? 'نقدي' : 'تقسيط'}
              </button>
            ))}
          </div>
        </div>

        {line.paymentTerm === 'installment' && (
          <DeviceSectionBox>
            <div>
              <label className="mb-xs block text-xs text-on-surface-variant">نوع القسط</label>
              <div className="flex max-w-md gap-sm">
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
                    className={`flex-1 rounded-lg border py-sm text-sm font-medium ${
                      line.intervalType === type
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-outline-variant bg-surface-container-low'
                    }`}
                  >
                    {type === 'monthly' ? 'شهري' : 'أسبوعي'}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-xs block text-xs text-on-surface-variant">المقدم</label>
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
                <label className="mb-xs block text-xs text-on-surface-variant">عدد الأقساط (يُحسب)</label>
                <div className="rounded border border-outline-variant bg-surface-container-low px-sm py-2 text-sm font-medium tabular-nums">
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
          </DeviceSectionBox>
        )}
      </div>

      {/* 4 — خصم الجهاز */}
      <div className="space-y-sm">
        <DeviceSectionTitle>خصم الجهاز</DeviceSectionTitle>
        <DeviceSectionBox>
          <div className="max-w-md">
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
          </div>
          <p className="text-sm font-medium tabular-nums text-on-surface">
            صافي الجهاز بعد الخصم: {net.toLocaleString('ar-EG')} ج.م
          </p>
        </DeviceSectionBox>
      </div>
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
