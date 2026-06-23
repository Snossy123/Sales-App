import type { Branch, Customer, Distributor, SalesRep } from '../../api/types'
import {
  amountFromPercent,
  clampDiscountAmount,
  percentFromAmount,
  type DiscountMode,
} from '../../lib/discount'
import { distributorLabel } from '../../lib/sales'
import { Icon } from '../Icon'
import { SearchableSelect } from '../SearchableSelect'
import { PosMoneyInput } from './PosMoneyInput'
import {
  posInputClass,
  posLabelClass,
  posModeToggle,
  posModeToggleGroupClass,
  posSectionTitleClass,
  posSourceToggle,
  posStaticFieldClass,
  posStepperClass,
  posControlHeightClass,
} from './posFormStyles'

export type TransactionSource = 'branch' | 'distributor' | 'sales'

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
  selectedSalesRep: SalesRep | null
  onSalesRepChange: (rep: SalesRep | null) => void
  onSalesRepSearchChange: (q: string) => void
  salesReps: SalesRep[]
  salesRepsLoading: boolean
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
  selectedSalesRep,
  onSalesRepChange,
  onSalesRepSearchChange,
  salesReps,
  salesRepsLoading,
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

  const customerLinkedToSalesRep = Boolean(selectedCustomer?.sales_user_id)
  const sourceToggleOptions = customerLinkedToSalesRep
    ? []
    : [
        { id: 'branch' as const, label: 'فرع' },
        { id: 'distributor' as const, label: 'موزع' },
      ]

  return (
    <section className="w-full overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
      {/* ── بيانات التعاقد ── */}
      <div className="p-md">
        <div className="mb-md flex items-center gap-xs">
          <Icon name="description" className="text-primary" size={20} />
          <h2 className={posSectionTitleClass}>بيانات التعاقد</h2>
        </div>

        <div className="grid gap-md sm:grid-cols-2 xl:grid-cols-4">
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
            {selectedCustomer?.sales_user && (
              <p className="mt-xs text-[13px] leading-snug text-secondary">
                تابع لموظف مبيعات: {selectedCustomer.sales_user.name}
              </p>
            )}
            {selectedCustomer?.distributor && !selectedCustomer.sales_user_id && (
              <p className="mt-xs text-[13px] leading-snug text-secondary">
                تابع للموزع: {distributorLabel(selectedCustomer.distributor)}
              </p>
            )}
            {selectedCustomer?.branch &&
              !selectedCustomer.sales_user_id &&
              !selectedCustomer.distributor_id && (
                <p className="mt-xs text-[13px] leading-snug text-secondary">
                  تابع للفرع: {selectedCustomer.branch.name_ar || selectedCustomer.branch.name}
                </p>
              )}
          </div>

          {sourceToggleOptions.length > 0 && (
            <div>
              <label className={posLabelClass}>مصدر التعاقد</label>
              <div className="flex gap-xs">
                {sourceToggleOptions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onTransactionSourceChange(item.id)}
                    className={posSourceToggle(transactionSource === item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            {customerLinkedToSalesRep || transactionSource === 'sales' ? (
              <SearchableSelect
                data-tour="pos-source"
                label="موظف المبيعات"
                options={salesReps}
                value={selectedSalesRep}
                onChange={onSalesRepChange}
                onSearchChange={onSalesRepSearchChange}
                getOptionValue={(r) => r.id}
                getOptionLabel={(r) => r.name}
                placeholder="ابحث باسم الموظف..."
                loading={salesRepsLoading}
                emptyMessage="لا يوجد موظف مطابق"
              />
            ) : transactionSource === 'branch' ? (
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
            ) : transactionSource === 'distributor' ? (
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
            ) : null}
          </div>

          <div>
            <label className={posLabelClass}>تاريخ التعاقد</label>
            <div className="relative">
              <input
                type="date"
                value={contractDate}
                onChange={(e) => onContractDateChange(e.target.value)}
                className={`${posInputClass} pe-9`}
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
        <div
          className="grid items-end gap-md sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_auto] xl:grid-cols-[minmax(0,1.4fr)_auto_auto_auto_auto_auto_auto]"
        >
          {/* المنتج */}
          <div className="min-w-0" data-tour="pos-product">
            <label className={posLabelClass}>المنتج</label>
            {productLoading ? (
              <p className={`${posControlHeightClass} flex items-center text-[14px] text-on-surface-variant`}>
                جاري التحميل...
              </p>
            ) : (
              <div className={`${posStaticFieldClass} gap-xs`}>
                <Icon name="inventory_2" className="shrink-0 text-primary" size={20} />
                <span className="flex-1 truncate font-bold">
                  {productName ?? 'GPS'}
                </span>
                <Icon name="expand_more" className="shrink-0 text-on-surface-variant" size={20} />
              </div>
            )}
          </div>

          {/* عدد الأجهزة */}
          <div className="shrink-0">
            <label className={posLabelClass}>عدد الأجهزة</label>
            <div className={posStepperClass}>
              <button
                type="button"
                onClick={decQty}
                disabled={quantity <= 1}
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
              <div className={`hidden w-px shrink-0 self-stretch bg-outline-variant/60 lg:block ${posControlHeightClass}`} />

              {allowDisableFeeInSale && (
                <div className={`flex shrink-0 items-center ${posControlHeightClass}`}>
                  <label className="flex cursor-pointer items-center gap-xs text-[15px] font-bold text-on-surface">
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

              <div className="min-w-[7rem] shrink-0">
                <label className={posLabelClass}>رسوم التركيب</label>
                <PosMoneyInput
                  min={0}
                  step="0.01"
                  value={installationFeePerUnit}
                  disabled={feeFieldsDisabled}
                  onChange={(e) => onInstallationFeeChange(Number(e.target.value))}
                />
              </div>

              <div className="shrink-0">
                <label className={posLabelClass}>نوع الخصم</label>
                <div className={posModeToggleGroupClass}>
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
                    className={`${posModeToggle(feeDiscountMode === 'percent')} disabled:opacity-50`}
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
                    className={`${posModeToggle(feeDiscountMode === 'amount')} disabled:opacity-50`}
                  >
                    مبلغ
                  </button>
                </div>
              </div>

              <div className="min-w-[6.5rem] shrink-0">
                <label className={posLabelClass}>الخصم (ج.م)</label>
                <PosMoneyInput
                  min={0}
                  max={installationFeePerUnit}
                  step="0.01"
                  value={feeDiscountAmount || ''}
                  disabled={feeFieldsDisabled}
                  onChange={(e) => handleFeeDiscountAmount(Number(e.target.value))}
                />
              </div>

              <div className="min-w-[6rem] shrink-0">
                <label className={posLabelClass}>الخصم (%)</label>
                <PosMoneyInput
                  suffix="%"
                  min={0}
                  max={100}
                  step="0.01"
                  value={feeDiscountPercent || ''}
                  disabled={feeFieldsDisabled}
                  onChange={(e) => handleFeeDiscountPercent(Number(e.target.value))}
                />
              </div>
            </>
          )}
        </div>

        {!productLoading && (
          <div className="mt-sm space-y-0.5 text-[14px] leading-snug text-on-surface-variant">
            <p>
              متاح: <strong className="tabular-nums">{available}</strong> — سعر:{' '}
              <strong className="tabular-nums">
                {Number(unitPrice).toLocaleString('ar-EG')} ج.م
              </strong>
            </p>
            {allowNegativeInventory && (
              <p className="text-amber-800">المخزون السالب مفعّل</p>
            )}
          </div>
        )}
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
