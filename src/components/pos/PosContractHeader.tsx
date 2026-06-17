import type { Branch, Customer, Distributor } from '../../api/types'
import type { DiscountMode } from '../../lib/discount'
import { distributorLabel } from '../../lib/sales'
import { Icon } from '../Icon'
import { SearchableSelect } from '../SearchableSelect'
import { DiscountInput } from './DiscountInput'

export type TransactionSource = 'branch' | 'distributor'

const selectClass =
  'w-full rounded border border-outline-variant px-sm py-2 text-sm focus:border-primary focus:outline-none'

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
  return (
    <section className="w-full border-b border-outline-variant bg-surface-container-lowest pb-md">
      <h2 className="mb-md font-semibold text-on-surface">بيانات التعاقد</h2>

      <div className="grid gap-md md:grid-cols-2 lg:grid-cols-12">
        {/* مصدر التعاقد — 2 cols */}
        <div className="lg:col-span-2">
          <label className="mb-xs block text-sm text-on-surface-variant">مصدر التعاقد</label>
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
                className={`flex-1 rounded-lg border py-sm text-sm font-medium transition-colors ${
                  transactionSource === item.id
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-outline-variant bg-surface-container-low hover:bg-surface-container-high'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* موزع/فرع — 2 cols */}
        <div className="md:col-span-1 lg:col-span-2">
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

        {/* عميل — 2 cols */}
        <div className="md:col-span-1 lg:col-span-2">
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

        {/* تاريخ — 2 cols */}
        <div className="lg:col-span-2">
          <label className="mb-xs block text-sm text-on-surface-variant">تاريخ التعاقد</label>
          <input
            type="date"
            value={contractDate}
            onChange={(e) => onContractDateChange(e.target.value)}
            className={selectClass}
          />
        </div>

        {/* منتج GPS + الكمية — 2 cols */}
        <div className="md:col-span-2 lg:col-span-2" data-tour="pos-product">
          <label className="mb-xs block text-sm text-on-surface-variant">المنتج والكمية</label>
          <div className="space-y-xs rounded-lg border border-outline-variant/60 bg-surface-container-low p-sm">
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
                    className={`${selectClass} tabular-nums`}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* رسوم التركيب — 2 cols */}
        {enableInstallationFee && (
          <div className="md:col-span-2 lg:col-span-2">
            <div className="space-y-xs rounded-lg border border-outline-variant/60 bg-surface-container-low p-sm">
              <div className="flex items-center justify-between gap-sm">
                <label className="text-sm font-medium text-on-surface">رسوم التركيب</label>
                {allowDisableFeeInSale && (
                  <label className="flex items-center gap-xs text-xs">
                    <input
                      type="checkbox"
                      checked={applyInstallationFee}
                      onChange={(e) => onApplyInstallationFeeChange(e.target.checked)}
                    />
                    تطبيق
                  </label>
                )}
              </div>
              {applyInstallationFee && (
                <>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={installationFeePerUnit}
                    onChange={(e) => onInstallationFeeChange(Number(e.target.value))}
                    className={`${selectClass} tabular-nums`}
                  />
                  <DiscountInput
                    label="خصم الرسوم"
                    baseAmount={Number(installationFeePerUnit)}
                    amount={feeDiscountAmount}
                    percent={feeDiscountPercent}
                    mode={feeDiscountMode}
                    onChange={onFeeDiscountChange}
                  />
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
