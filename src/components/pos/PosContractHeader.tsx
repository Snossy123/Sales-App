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
  'w-full rounded border border-outline-variant bg-surface-container-lowest px-sm py-2 text-sm focus:border-primary focus:outline-none'
const accentBox =
  'flex h-full min-w-0 flex-col gap-sm rounded-lg border border-primary/15 bg-primary/5 p-sm'

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

const sourceToggle = (active: boolean) =>
  `flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
    active
      ? 'border-primary bg-primary text-on-primary'
      : 'border-outline-variant bg-surface-container-lowest text-on-surface'
  }`

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

  return (
    <section className="w-full overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
      <div className="border-b border-outline-variant/60 bg-surface-container-low px-md py-sm">
        <h2 className="text-sm font-semibold text-on-surface">بيانات التعاقد</h2>
      </div>

      <div className="flex flex-wrap items-end gap-md p-md xl:flex-nowrap">
        {/* مصدر التعاقد */}
        <div className="w-full shrink-0 sm:w-auto sm:min-w-[9rem]">
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

        {/* موزع / فرع */}
        <div className="min-w-[11rem] flex-1">
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

        {/* عميل */}
        <div className="min-w-[11rem] flex-1">
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

        {/* تاريخ */}
        <div className="w-full shrink-0 sm:w-auto sm:min-w-[10.5rem]">
          <label className={labelClass}>تاريخ التعاقد</label>
          <input
            type="date"
            value={contractDate}
            onChange={(e) => onContractDateChange(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* منتج + كمية */}
        <div className="w-full shrink-0 xl:w-[14rem]" data-tour="pos-product">
          <label className={labelClass}>المنتج والكمية</label>
          <div className={accentBox}>
            {productLoading ? (
              <p className="text-xs text-on-surface-variant">جاري التحميل...</p>
            ) : (
              <>
                <div className="flex items-center gap-xs">
                  <Icon name="gps_fixed" className="shrink-0 text-primary" size={18} />
                  <span className="truncate text-sm font-medium">{productName ?? 'GPS'}</span>
                </div>
                <p className="text-xs text-on-surface-variant">
                  متاح: <strong className="tabular-nums">{available}</strong> — سعر:{' '}
                  <strong className="tabular-nums">
                    {Number(unitPrice).toLocaleString('ar-EG')} ج.م
                  </strong>
                </p>
                {allowNegativeInventory && (
                  <p className="text-xs text-amber-800">المخزون السالب مفعّل</p>
                )}
                <div>
                  <label className="mb-xs block text-xs text-on-surface-variant">عدد الأجهزة</label>
                  <input
                    type="number"
                    min={1}
                    max={maxQuantity}
                    value={quantity}
                    onChange={(e) => onQuantityChange(Number(e.target.value))}
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* رسوم التركيب */}
        {enableInstallationFee && (
          <div className="min-w-[16rem] flex-1">
            <div className={accentBox}>
              <div className="flex flex-wrap items-center gap-sm">
                <span className="text-sm font-medium text-on-surface">رسوم التركيب</span>
                {allowDisableFeeInSale && (
                  <label className="ms-auto flex items-center gap-xs text-xs text-on-surface-variant">
                    <input
                      type="checkbox"
                      checked={applyInstallationFee}
                      onChange={(e) => onApplyInstallationFeeChange(e.target.checked)}
                      className="rounded border-outline-variant"
                    />
                    تطبيق
                  </label>
                )}
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={installationFeePerUnit}
                  disabled={!applyInstallationFee}
                  onChange={(e) => onInstallationFeeChange(Number(e.target.value))}
                  className={`${inputClass} w-24 tabular-nums disabled:opacity-50`}
                />
              </div>

              {applyInstallationFee && (
                <>
                  <div className="flex items-center justify-between gap-sm">
                    <span className="text-xs text-on-surface-variant">خصم الرسوم</span>
                    <div className="flex gap-1 rounded-lg border border-outline-variant p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          onFeeDiscountChange({
                            amount: feeDiscountAmount,
                            percent: feeDiscountPercent,
                            mode: 'amount',
                          })
                        }
                        className={`rounded px-2 py-0.5 ${
                          feeDiscountMode === 'amount' ? 'bg-primary text-on-primary' : ''
                        }`}
                      >
                        مبلغ
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onFeeDiscountChange({
                            amount: feeDiscountAmount,
                            percent: feeDiscountPercent,
                            mode: 'percent',
                          })
                        }
                        className={`rounded px-2 py-0.5 ${
                          feeDiscountMode === 'percent' ? 'bg-primary text-on-primary' : ''
                        }`}
                      >
                        %
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-xs">
                    <div>
                      <label className="mb-xs block text-xs text-on-surface-variant">
                        الخصم (ج.م)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={installationFeePerUnit}
                        step="0.01"
                        value={feeDiscountAmount || ''}
                        onChange={(e) => handleFeeDiscountAmount(Number(e.target.value))}
                        className={`${inputClass} tabular-nums`}
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="mb-xs block text-xs text-on-surface-variant">
                        الخصم (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={feeDiscountPercent || ''}
                        onChange={(e) => handleFeeDiscountPercent(Number(e.target.value))}
                        className={`${inputClass} tabular-nums`}
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <p className="text-xs tabular-nums text-on-surface-variant">
                    صافي × {deviceCount}:{' '}
                    <strong>{netInstallationFeeTotal.toLocaleString('ar-EG')} ج.م</strong>
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
