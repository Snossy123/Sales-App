import type { DiscountMode } from '../../lib/discount'
import { parseLocalizedNumber } from '../../lib/normalizeDigits'
import { Icon } from '../Icon'
import { OptionalDiscountFields } from './OptionalDiscountFields'
import { PosMoneyInput } from './PosMoneyInput'
import {
  posControlHeightClass,
  posLabelClass,
  posStepperClass,
} from './posFormStyles'

export interface PosDevicesToolbarProps {
  available: number
  cashPrice: number
  installmentPrice: number
  quantity: number
  maxQuantity: number
  onQuantityChange: (qty: number) => void
  productLoading?: boolean
  allowNegativeInventory?: boolean
  enableInstallationFee: boolean
  applyInstallationFee: boolean
  onApplyInstallationFeeChange: (apply: boolean) => void
  allowDisableFeeInSale: boolean
  installationFeePerUnit: number
  onInstallationFeeChange: (fee: number) => void
  feeDiscountAmount: number
  feeDiscountPercent: number
  onFeeDiscountChange: (v: {
    amount: number
    percent: number
    mode: DiscountMode
  }) => void
}

export function PosDevicesToolbar({
  available,
  cashPrice,
  installmentPrice,
  quantity,
  maxQuantity,
  onQuantityChange,
  productLoading,
  allowNegativeInventory,
  enableInstallationFee,
  applyInstallationFee,
  onApplyInstallationFeeChange,
  allowDisableFeeInSale,
  installationFeePerUnit,
  onInstallationFeeChange,
  feeDiscountAmount,
  feeDiscountPercent,
  onFeeDiscountChange,
}: PosDevicesToolbarProps) {
  const decQty = () => onQuantityChange(Math.max(0, quantity - 1))
  const incQty = () => onQuantityChange(Math.min(maxQuantity, quantity + 1))
  const feeFieldsDisabled = !enableInstallationFee || !applyInstallationFee

  return (
    <div className="space-y-sm" data-tour="pos-product">
      {!productLoading ? (
        <div className="rounded-lg border border-outline-variant/70 bg-surface-container-low px-sm py-sm text-[14px] leading-snug text-on-surface-variant">
          متاح: <strong className="tabular-nums text-on-surface">{available}</strong>
          <span className="mx-sm text-outline-variant">|</span>
          كاش:{' '}
          <strong className="tabular-nums text-on-surface">
            {Number(cashPrice).toLocaleString('ar-EG')} ج.م
          </strong>
          <span className="mx-sm text-outline-variant">|</span>
          تقسيط:{' '}
          <strong className="tabular-nums text-on-surface">
            {Number(installmentPrice).toLocaleString('ar-EG')} ج.م
          </strong>
          {allowNegativeInventory ? (
            <span className="ms-sm text-amber-800">· المخزون السالب مفعّل</span>
          ) : null}
        </div>
      ) : (
        <p className="text-[14px] text-on-surface-variant">جاري تحميل الأسعار...</p>
      )}

      <div className="grid items-end gap-md sm:grid-cols-2 xl:grid-cols-[auto_auto_auto_minmax(0,1fr)]">
        <div className="shrink-0">
          <label className={posLabelClass}>عدد الأجهزة</label>
          <div className={posStepperClass}>
            <button
              type="button"
              onClick={decQty}
              disabled={quantity <= 0}
              className="flex h-full w-11 shrink-0 items-center justify-center text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-40"
              aria-label="تقليل"
            >
              <Icon name="remove" size={20} />
            </button>
            <span className="min-w-[2.5rem] text-center text-[16px] font-extrabold tabular-nums">
              {quantity}
            </span>
            <button
              type="button"
              onClick={incQty}
              disabled={quantity >= maxQuantity}
              className="flex h-full w-11 shrink-0 items-center justify-center text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-40"
              aria-label="زيادة"
            >
              <Icon name="add" size={20} />
            </button>
          </div>
        </div>

        {enableInstallationFee && (
          <>
            {allowDisableFeeInSale && (
              <div className={`flex shrink-0 items-center ${posControlHeightClass}`}>
                <label className="flex cursor-pointer items-center gap-xs text-[14px] font-bold text-on-surface">
                  <input
                    type="checkbox"
                    checked={applyInstallationFee}
                    onChange={(e) => onApplyInstallationFeeChange(e.target.checked)}
                    className="h-4 w-4 rounded border-outline-variant accent-primary"
                  />
                  تطبيق رسوم التركيب
                </label>
              </div>
            )}

            <div className="min-w-[7rem] shrink-0">
              <label className={posLabelClass}>رسوم التركيب</label>
              <PosMoneyInput
                min={0}
                step="0.01"
                value={installationFeePerUnit}
                disabled={feeFieldsDisabled}
                onChange={(e) => onInstallationFeeChange(parseLocalizedNumber(e.target.value))}
              />
            </div>

            <div className="min-w-0">
              <OptionalDiscountFields
                label="خصم عام"
                baseAmount={installationFeePerUnit}
                amount={feeDiscountAmount}
                percent={feeDiscountPercent}
                disabled={feeFieldsDisabled}
                onChange={onFeeDiscountChange}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
