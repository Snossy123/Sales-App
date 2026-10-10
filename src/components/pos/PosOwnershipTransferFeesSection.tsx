import { useMemo } from 'react'
import { Icon } from '../Icon'
import { PosSectionCard } from './PosSectionCard'
import { NumericInput } from '../ui/NumericInput'
import { posInputClass, posLabelClass } from './posFormStyles'

export interface PosOwnershipTransferFeesSectionProps {
  includeDisassemblyAndAssembly: boolean
  onIncludeDisassemblyAndAssemblyChange: (include: boolean) => void
  paymentTerm: 'cash' | 'installment'
  onPaymentTermChange: (term: 'cash' | 'installment') => void
  downPayment: number
  onDownPaymentChange: (downPayment: number) => void
  installmentCount: number
  onInstallmentCountChange: (count: number) => void
  intervalType: 'monthly' | 'weekly'
  onIntervalTypeChange: (interval: 'monthly' | 'weekly') => void
  firstDueDate: string
  onFirstDueDateChange: (date: string) => void
  ownershipFee: number
  uninstallFee: number
  installationFee: number
  ownershipServiceName?: string
  uninstallServiceName?: string
  installationServiceName?: string
}

export function PosOwnershipTransferFeesSection({
  includeDisassemblyAndAssembly,
  onIncludeDisassemblyAndAssemblyChange,
  paymentTerm,
  onPaymentTermChange,
  downPayment,
  onDownPaymentChange,
  installmentCount,
  onInstallmentCountChange,
  intervalType,
  onIntervalTypeChange,
  firstDueDate,
  onFirstDueDateChange,
  ownershipFee,
  uninstallFee,
  installationFee,
  ownershipServiceName = 'رسوم نقل ملكية',
  uninstallServiceName = 'رسوم فك',
  installationServiceName = 'رسوم تركيب',
}: PosOwnershipTransferFeesSectionProps) {
  const totalFees = useMemo(() => {
    const base = Number(ownershipFee) || 0
    if (!includeDisassemblyAndAssembly) return base
    return base + (Number(uninstallFee) || 0) + (Number(installationFee) || 0)
  }, [ownershipFee, includeDisassemblyAndAssembly, uninstallFee, installationFee])

  const safeCount = Math.max(1, installmentCount || 1)
  const financedAmount = Math.max(0, totalFees - (downPayment || 0))
  const installmentAmount = Math.round((financedAmount / safeCount) * 100) / 100

  return (
    <PosSectionCard
      title="رسوم نقل الملكية والخدمات"
      subtitle="تحديد رسوم نقل الملكية، خدمات الفك والتركيب، وطريقة الدفع (كاش أو قسط إضافي)"
      icon={<Icon name="payments" size={20} className="text-primary" />}
      sectionNumber={3}
    >
      <div className="space-y-md">
        {/* Fees summary table */}
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
          <div className="flex items-center justify-between border-b border-outline-variant pb-sm">
            <span className="font-semibold text-on-surface">البند</span>
            <span className="font-semibold text-on-surface">المبلغ (ج.م)</span>
          </div>

          <div className="divide-y divide-outline-variant/60">
            {/* Ownership transfer base fee */}
            <div className="flex items-center justify-between py-sm text-sm">
              <div className="flex items-center gap-xs">
                <Icon name="swap_horiz" size={18} className="text-primary" />
                <span className="font-medium text-on-surface">{ownershipServiceName}</span>
                <span className="text-xs text-on-surface-variant">(سحب تلقائي من الخدمات)</span>
              </div>
              <span className="font-bold tabular-nums text-on-surface">
                {Number(ownershipFee).toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م
              </span>
            </div>

            {/* Disassembly fee if included */}
            {includeDisassemblyAndAssembly && (
              <div className="flex items-center justify-between py-sm text-sm">
                <div className="flex items-center gap-xs">
                  <Icon name="handyman" size={18} className="text-amber-600" />
                  <span className="text-on-surface">{uninstallServiceName}</span>
                </div>
                <span className="font-semibold tabular-nums text-on-surface">
                  {Number(uninstallFee).toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م
                </span>
              </div>
            )}

            {/* Installation fee if included */}
            {includeDisassemblyAndAssembly && (
              <div className="flex items-center justify-between py-sm text-sm">
                <div className="flex items-center gap-xs">
                  <Icon name="home_repair_service" size={18} className="text-emerald-600" />
                  <span className="text-on-surface">{installationServiceName}</span>
                </div>
                <span className="font-semibold tabular-nums text-on-surface">
                  {Number(installationFee).toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م
                </span>
              </div>
            )}
          </div>

          {/* Disassembly and Assembly Checkbox */}
          <div className="mt-sm border-t border-outline-variant/80 pt-sm">
            <label className="flex cursor-pointer items-start gap-sm rounded-lg border border-primary/20 bg-primary/5 p-sm hover:bg-primary/10 transition-colors">
              <input
                type="checkbox"
                checked={includeDisassemblyAndAssembly}
                onChange={(e) => onIncludeDisassemblyAndAssemblyChange(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
              />
              <div className="flex-1">
                <span className="font-bold text-on-surface text-sm block">
                  هل تم خدمة فك وتركيب؟
                </span>
                <span className="text-xs text-on-surface-variant block mt-0.5">
                  تفعيل هذا الخيار يضيف رسوم الفك ({Number(uninstallFee).toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م) ورسوم التركيب ({Number(installationFee).toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م) تلقائياً على المبلغ الإجمالي.
                </span>
              </div>
            </label>
          </div>

          {/* Total fees banner */}
          <div className="mt-md flex items-center justify-between rounded-lg bg-surface-container-low px-md py-sm font-bold">
            <span className="text-on-surface">إجمالي رسوم العملية:</span>
            <span className="text-lg tabular-nums text-primary">
              {totalFees.toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م
            </span>
          </div>
        </div>

        {/* Payment Term Selection */}
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
          <label className={`${posLabelClass} mb-xs font-semibold`}>
            طريقة دفع الرسوم (تحديد مصير المبلغ):
          </label>
          <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onPaymentTermChange('cash')}
              className={`flex items-center gap-sm rounded-lg border p-md text-right transition-all ${
                paymentTerm === 'cash'
                  ? 'border-primary bg-primary/10 text-primary shadow-sm font-bold'
                  : 'border-outline-variant bg-surface hover:bg-surface-container-low text-on-surface'
              }`}
            >
              <Icon name="payments" size={24} className={paymentTerm === 'cash' ? 'text-primary' : 'text-on-surface-variant'} />
              <div>
                <div className="font-bold">يدفع كاش</div>
                <div className="text-xs text-on-surface-variant mt-0.5">
                  سداد المبلغ فوراً عند إتمام نقل الملكية ({totalFees.toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م)
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onPaymentTermChange('installment')}
              className={`flex items-center gap-sm rounded-lg border p-md text-right transition-all ${
                paymentTerm === 'installment'
                  ? 'border-primary bg-primary/10 text-primary shadow-sm font-bold'
                  : 'border-outline-variant bg-surface hover:bg-surface-container-low text-on-surface'
              }`}
            >
              <Icon name="calendar_month" size={24} className={paymentTerm === 'installment' ? 'text-primary' : 'text-on-surface-variant'} />
              <div>
                <div className="font-bold">قسط إضافي على العميل</div>
                <div className="text-xs text-on-surface-variant mt-0.5">
                  ترحيل المبلغ كأقساط مجدولة على حساب المالك الجديد
                </div>
              </div>
            </button>
          </div>

          {/* Installment Plan Configuration */}
          {paymentTerm === 'installment' && (
            <div className="mt-md rounded-lg border border-primary/20 bg-primary/[0.03] p-md space-y-md">
              <div className="flex items-center gap-xs text-sm font-bold text-primary">
                <Icon name="tune" size={18} />
                <span>إعدادات القسط الإضافي على المالك الجديد</span>
              </div>

              <div className="grid grid-cols-1 gap-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className={`${posLabelClass} mb-xs`}>المقدم (ج.م)</label>
                  <NumericInput
                    type="number"
                    min={0}
                    max={totalFees}
                    value={downPayment}
                    onChange={(e) => onDownPaymentChange(Math.max(0, Number(e.target.value) || 0))}
                    className={`${posInputClass} tabular-nums`}
                  />
                </div>

                <div>
                  <label className={`${posLabelClass} mb-xs`}>عدد الأقساط</label>
                  <NumericInput
                    type="number"
                    min={1}
                    max={36}
                    value={installmentCount}
                    onChange={(e) => onInstallmentCountChange(Math.max(1, Number(e.target.value) || 1))}
                    className={`${posInputClass} tabular-nums`}
                  />
                </div>

                <div>
                  <label className={`${posLabelClass} mb-xs`}>دورية القسط</label>
                  <select
                    value={intervalType}
                    onChange={(e) => onIntervalTypeChange(e.target.value as 'monthly' | 'weekly')}
                    className={posInputClass}
                  >
                    <option value="monthly">شهري</option>
                    <option value="weekly">أسبوعي</option>
                  </select>
                </div>

                <div>
                  <label className={`${posLabelClass} mb-xs`}>تاريخ أول قسط</label>
                  <input
                    type="date"
                    value={firstDueDate}
                    onChange={(e) => onFirstDueDateChange(e.target.value)}
                    className={posInputClass}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-sm rounded-lg border border-primary/20 bg-surface-container-lowest px-md py-sm text-sm">
                <div>
                  <span className="text-on-surface-variant">المبلغ المقسط: </span>
                  <span className="font-bold tabular-nums text-on-surface">
                    {financedAmount.toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م
                  </span>
                </div>
                <div>
                  <span className="text-on-surface-variant">قيمة القسط: </span>
                  <strong className="text-primary tabular-nums text-base">
                    {installmentAmount.toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م
                  </strong>
                  <span className="text-xs text-on-surface-variant me-1">
                    {' '}/ {intervalType === 'weekly' ? 'أسبوع' : 'شهر'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PosSectionCard>
  )
}
