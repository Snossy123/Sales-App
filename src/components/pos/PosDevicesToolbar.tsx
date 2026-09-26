import type { DiscountMode } from '../../lib/discount'
import { parseLocalizedNumber } from '../../lib/normalizeDigits'
import { Icon } from '../Icon'
import { OptionalDiscountFields } from './OptionalDiscountFields'
import { PosMoneyInput } from './PosMoneyInput'
import { posLabelClass, posStepperClass } from './posFormStyles'

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
  showTransportationFee?: boolean
  applyTransportationFee?: boolean
  onApplyTransportationFeeChange?: (apply: boolean) => void
  transportationFee?: number
  onTransportationFeeChange?: (fee: number) => void
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
  showTransportationFee = false,
  applyTransportationFee = false,
  onApplyTransportationFeeChange,
  transportationFee = 0,
  onTransportationFeeChange,
}: PosDevicesToolbarProps) {
  const decQty = () => onQuantityChange(Math.max(0, quantity - 1))
  const incQty = () => onQuantityChange(Math.min(maxQuantity, quantity + 1))
  const feeFieldsDisabled = !enableInstallationFee || !applyInstallationFee
  const transportationFieldsDisabled = !applyTransportationFee
  const showTransport =
    showTransportationFee && onTransportationFeeChange && onApplyTransportationFeeChange

  return (
    <div data-tour="pos-product">
      <div className="grid grid-cols-1 items-start gap-md sm:grid-cols-2 xl:grid-cols-4">
        <div>
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
            <span className="min-w-[2.5rem] flex-1 text-center text-[16px] font-extrabold tabular-nums">
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

        {enableInstallationFee ? (
          <div>
            <label className={`${posLabelClass} flex items-center gap-xs`}>
              {allowDisableFeeInSale ? (
                <input
                  type="checkbox"
                  checked={applyInstallationFee}
                  onChange={(e) => onApplyInstallationFeeChange(e.target.checked)}
                  className="h-4 w-4 rounded border-outline-variant accent-primary"
                />
              ) : null}
              رسوم التركيب
            </label>
            <PosMoneyInput
              min={0}
              step="0.01"
              value={installationFeePerUnit}
              disabled={feeFieldsDisabled}
              onChange={(e) => onInstallationFeeChange(parseLocalizedNumber(e.target.value))}
            />
          </div>
        ) : null}

        {enableInstallationFee ? (
          <OptionalDiscountFields
            label="خصم عام"
            baseAmount={installationFeePerUnit}
            amount={feeDiscountAmount}
            percent={feeDiscountPercent}
            disabled={feeFieldsDisabled}
            onChange={onFeeDiscountChange}
          />
        ) : null}

        {showTransport ? (
          <div>
            <label className={`${posLabelClass} flex items-center gap-xs`}>
              <input
                type="checkbox"
                checked={applyTransportationFee}
                onChange={(e) => onApplyTransportationFeeChange(e.target.checked)}
                className="h-4 w-4 rounded border-outline-variant accent-primary"
              />
              رسوم التنقلات
            </label>
            <PosMoneyInput
              min={0}
              step="0.01"
              value={transportationFee}
              disabled={transportationFieldsDisabled}
              onChange={(e) => onTransportationFeeChange(parseLocalizedNumber(e.target.value))}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
