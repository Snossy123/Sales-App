import type { InputHTMLAttributes } from 'react'
import type { Branch, Customer, Distributor } from '../../api/types'
import {
  amountFromPercent,
  clampDiscountAmount,
  percentFromAmount,
  type DiscountMode,
} from '../../lib/discount'
import { distributorLabel } from '../../lib/sales'
import { Icon } from '../Icon'
import { SearchableSelect } from '../SearchableSelect'

export type TransactionSource = 'branch' | 'distributor'

const labelClass = 'mb-xs block text-xs text-on-surface-variant'
const inputClass =
  'w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-2 text-sm focus:border-primary focus:outline-none'

const sourceToggle = (active: boolean) =>
  `flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
    active
      ? 'border-primary bg-primary text-on-primary'
      : 'border-outline-variant bg-surface-container-lowest text-on-surface'
  }`

const modeToggle = (active: boolean) =>
  `flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
    active ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
  }`

function PrefixedInput({
  prefix,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { prefix: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute start-2 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant">
        {prefix}
      </span>
      <input {...props} className={`${inputClass} ps-9 tabular-nums ${className}`} />
    </div>
  )
}

export interface PosContractHeaderProps {
  transactionSource: TransactionSource
  onTransactionSourceChange: (source: TransactionSource) => void
  selectedBranch: Branch | null
  onBranchChange: (branch: Branch | null) => void
  onBranchSearchChange: (q: string) => void
  filteredBranches: Branch[]
  branchesLoading: boolean
  selectedDistributor: Distributor | null
  onDistributorChange: (distributor: Distributor | null) => void
  onDistributorSearchChange: (q: string) => void
  distributors: Distributor[]
  distributorsLoading: boolean
  selectedCustomer: Customer | null
  onCustomerChange: (customer: Customer | null) => void
  onCustomerSearchChange: (q: string) => void
  customers: Customer[]
  customersLoading: boolean
  contractDate: string
  onContractDateChange: (date: string) => void
  productName?: string
  available: number
  unitPrice: number
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
  feeDiscountMode: DiscountMode
  onFeeDiscountChange: (v: {
    amount: number
    percent: number
    mode: DiscountMode
  }) => void
  deviceCount: number
  netInstallationFeeTotal: number
}

export function PosContractHeader({
  transactionSource,
  onTransactionSourceChange,
  selectedBranch,
  onBranchChange,
  onBranchSearchChange,
  filteredBranches,
  branchesLoading,
  selectedDistributor,
  onDistributorChange,
  onDistributorSearchChange,
  distributors,
  distributorsLoading,
  selectedCustomer,
  onCustomerChange,
  onCustomerSearchChange,
  customers,
  customersLoading,
  contractDate,
  onContractDateChange,
  productName,
  available,
  unitPrice,
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
  feeDiscountMode,
  onFeeDiscountChange,
  deviceCount,
  netInstallationFeeTotal,
}: PosContractHeaderProps) {
  const handleFeeDiscountAmount = (raw: number) => {
    const amount = clampDiscountAmount(installationFeePerUnit, raw)
    onFeeDiscountChange({
      amount,
      percent: percentFromAmount(installationFeePerUnit, amount),
      mode: 'amount',
    })
  }

  const handleFeeDiscountPercent = (raw: number) => {
    const percent = Math.min(100, Math.max(0, raw))
    const amount = amountFromPercent(installationFeePerUnit, percent)
    onFeeDiscountChange({
      amount,
      percent,
      mode: 'percent',
    })
  }

  const decQty = () => onQuantityChange(Math.max(1, quantity - 1))
  const incQty = () => onQuantityChange(Math.min(maxQuantity, quantity + 1))

  const feeFieldsDisabled = !enableInstallationFee || !applyInstallationFee

  return (
    <section className="w-full overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
      {/* ── بيانات التعاقد ── */}
      <div className="p-md">
        <div className="mb-md flex items-center gap-xs">
          <Icon name="description" className="text-primary" size={20} />
          <h2 className="text-sm font-semibold text-on-surface">بيانات التعاقد</h2>
        </div>

        <div className="grid gap-md sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className={labelClass}>مصدر التعاقد</label>
            <div className="flex gap-xs">
              {(
                [
                  { id: 'branch' as const, label: 'فرع' },
                  { id: 'distributor' as const, label: 'موزع' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTransactionSourceChange(item.id)}
                  className={sourceToggle(transactionSource === item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            {transactionSource === 'branch' ? (
              <SearchableSelect
                data-tour="pos-source"
                label="الفرع"
                options={filteredBranches}
                value={selectedBranch}
                onChange={onBranchChange}
                onSearchChange={onBranchSearchChange}
                getOptionValue={(b) => b.id}
                getOptionLabel={(b) => b.name_ar || b.name}
                placeholder="ابحث باسم الفرع..."
                loading={branchesLoading}
                emptyMessage="لا يوجد فرع مطابق"
              />
            ) : (
              <SearchableSelect
                data-tour="pos-source"
                label="الموزع"
                options={distributors}
                value={selectedDistributor}
                onChange={onDistributorChange}
                onSearchChange={onDistributorSearchChange}
                getOptionValue={(d) => d.id}
                getOptionLabel={(d) =>
                  `${d.code} — ${distributorLabel(d)}${d.phone ? ` — ${d.phone}` : ''}`
                }
                placeholder="ابحث بالكود أو الاسم..."
                loading={distributorsLoading}
                emptyMessage="لا يوجد موزع مطابق"
              />
            )}
          </div>

          <div>
            <SearchableSelect
              data-tour="pos-customer"
              label="العميل"
              options={customers}
              value={selectedCustomer}
              onChange={onCustomerChange}
              onSearchChange={onCustomerSearchChange}
              getOptionValue={(c) => c.id}
              getOptionLabel={(c) => `${c.name} — ${c.phone}`}
              placeholder="ابحث بالاسم أو الموبايل..."
              loading={customersLoading}
              emptyMessage="لا يوجد عميل مطابق"
            />
          </div>

          <div>
            <label className={labelClass}>تاريخ التعاقد</label>
            <div className="relative">
              <input
                type="date"
                value={contractDate}
                onChange={(e) => onContractDateChange(e.target.value)}
                className={`${inputClass} pe-9`}
              />
              <span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-on-surface-variant">
                <Icon name="calendar_today" size={18} />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-outline-variant/60" />

      {/* ── المنتج والأسعار ── */}
      <div className="p-md">
        <div className="flex flex-wrap items-end gap-md lg:flex-nowrap">
          {/* المنتج */}
          <div className="min-w-[10rem] flex-1" data-tour="pos-product">
            <label className={labelClass}>المنتج</label>
            {productLoading ? (
              <p className="py-2 text-xs text-on-surface-variant">جاري التحميل...</p>
            ) : (
              <>
                <div className="flex items-center gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-2">
                  <Icon name="inventory_2" className="shrink-0 text-primary" size={20} />
                  <span className="flex-1 truncate text-sm font-medium">
                    {productName ?? 'GPS'}
                  </span>
                  <Icon name="expand_more" className="shrink-0 text-on-surface-variant" size={20} />
                </div>
                <p className="mt-xs text-xs text-on-surface-variant">
                  متاح: <strong className="tabular-nums">{available}</strong> — سعر:{' '}
                  <strong className="tabular-nums">
                    {Number(unitPrice).toLocaleString('ar-EG')} ج.م
                  </strong>
                </p>
                {allowNegativeInventory && (
                  <p className="text-xs text-amber-800">المخزون السالب مفعّل</p>
                )}
              </>
            )}
          </div>

          {/* عدد الأجهزة */}
          <div className="shrink-0">
            <label className={labelClass}>عدد الأجهزة</label>
            <div className="flex items-center overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
              <button
                type="button"
                onClick={decQty}
                disabled={quantity <= 1}
                className="flex h-10 w-10 items-center justify-center text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-40"
                aria-label="تقليل"
              >
                <Icon name="remove" size={20} />
              </button>
              <span className="min-w-[2.5rem] text-center text-sm font-semibold tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={incQty}
                disabled={quantity >= maxQuantity}
                className="flex h-10 w-10 items-center justify-center text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-40"
                aria-label="زيادة"
              >
                <Icon name="add" size={20} />
              </button>
            </div>
          </div>

          {enableInstallationFee && (
            <>
              <div className="hidden h-12 w-px shrink-0 self-center bg-outline-variant/60 lg:block" />

              {/* تطبيق */}
              {allowDisableFeeInSale && (
                <div className="shrink-0 pb-2">
                  <label className="flex cursor-pointer items-center gap-xs text-sm text-on-surface">
                    <input
                      type="checkbox"
                      checked={applyInstallationFee}
                      onChange={(e) => onApplyInstallationFeeChange(e.target.checked)}
                      className="h-4 w-4 rounded border-outline-variant accent-primary"
                    />
                    تطبيق
                  </label>
                </div>
              )}

              {/* رسوم التركيب */}
              <div className="min-w-[7rem] shrink-0">
                <label className={labelClass}>رسوم التركيب</label>
                <PrefixedInput
                  prefix="ج.م"
                  type="number"
                  min={0}
                  step="0.01"
                  value={installationFeePerUnit}
                  disabled={feeFieldsDisabled}
                  onChange={(e) => onInstallationFeeChange(Number(e.target.value))}
                  className="disabled:opacity-50"
                />
              </div>

              {/* نوع الخصم */}
              <div className="shrink-0">
                <label className={labelClass}>نوع الخصم</label>
                <div className="flex overflow-hidden rounded-lg border border-outline-variant p-0.5">
                  <button
                    type="button"
                    disabled={feeFieldsDisabled}
                    onClick={() =>
                      onFeeDiscountChange({
                        amount: feeDiscountAmount,
                        percent: feeDiscountPercent,
                        mode: 'percent',
                      })
                    }
                    className={`${modeToggle(feeDiscountMode === 'percent')} disabled:opacity-50`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    disabled={feeFieldsDisabled}
                    onClick={() =>
                      onFeeDiscountChange({
                        amount: feeDiscountAmount,
                        percent: feeDiscountPercent,
                        mode: 'amount',
                      })
                    }
                    className={`${modeToggle(feeDiscountMode === 'amount')} disabled:opacity-50`}
                  >
                    مبلغ
                  </button>
                </div>
              </div>

              {/* الخصم ج.م */}
              <div className="min-w-[6.5rem] shrink-0">
                <label className={labelClass}>الخصم (ج.م)</label>
                <PrefixedInput
                  prefix="ج.م"
                  type="number"
                  min={0}
                  max={installationFeePerUnit}
                  step="0.01"
                  value={feeDiscountAmount || ''}
                  disabled={feeFieldsDisabled}
                  onChange={(e) => handleFeeDiscountAmount(Number(e.target.value))}
                  dir="ltr"
                  className="disabled:opacity-50"
                />
              </div>

              {/* الخصم % */}
              <div className="min-w-[6rem] shrink-0">
                <label className={labelClass}>الخصم (%)</label>
                <PrefixedInput
                  prefix="%"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={feeDiscountPercent || ''}
                  disabled={feeFieldsDisabled}
                  onChange={(e) => handleFeeDiscountPercent(Number(e.target.value))}
                  dir="ltr"
                  className="disabled:opacity-50"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── شريط الصافي ── */}
      {enableInstallationFee && applyInstallationFee && (
        <div className="flex items-center gap-sm border-t border-primary/10 bg-primary/5 px-md py-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15">
            <Icon name="account_balance_wallet" className="text-primary" size={18} />
          </div>
          <span className="text-sm font-semibold text-primary tabular-nums">
            صافي: {netInstallationFeeTotal.toLocaleString('ar-EG')} ج.م
            {deviceCount > 1 && (
              <span className="ms-xs text-xs font-normal text-on-surface-variant">
                ({deviceCount} × جهاز)
              </span>
            )}
          </span>
        </div>
      )}
    </section>
  )
}
