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
  quantity: number
  maxQuantity: number
  onQuantityChange: (qty: number) => void
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
  quantity,
  maxQuantity,
  onQuantityChange,
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
