import type { Branch, Customer, Distributor } from '../../api/types'
import type { DiscountMode } from '../../lib/discount'
import { distributorLabel } from '../../lib/sales'
import { SearchableSelect } from '../SearchableSelect'
import { DiscountInput } from './DiscountInput'

export type TransactionSource = 'branch' | 'distributor'

const selectClass =
  'w-full rounded border border-outline-variant px-sm py-2 focus:border-primary focus:outline-none'

export interface PosContractHeaderProps {
  transactionSource: TransactionSource
  onTransactionSourceChange: (source: TransactionSource) => void
  branchSearch: string
  selectedBranch: Branch | null
  onBranchChange: (branch: Branch | null) => void
  onBranchSearchChange: (q: string) => void
  filteredBranches: Branch[]
  branchesLoading: boolean
  distributorSearch: string
  selectedDistributor: Distributor | null
  onDistributorChange: (distributor: Distributor | null) => void
  onDistributorSearchChange: (q: string) => void
  distributors: Distributor[]
  distributorsLoading: boolean
  customerSearch: string
  selectedCustomer: Customer | null
  onCustomerChange: (customer: Customer | null) => void
  onCustomerSearchChange: (q: string) => void
  customers: Customer[]
  customersLoading: boolean
  contractDate: string
  onContractDateChange: (date: string) => void
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
  branchSearch,
  selectedBranch,
  onBranchChange,
  onBranchSearchChange,
  filteredBranches,
  branchesLoading,
  distributorSearch,
  selectedDistributor,
  onDistributorChange,
  onDistributorSearchChange,
  distributors,
  distributorsLoading,
  customerSearch,
  selectedCustomer,
  onCustomerChange,
  onCustomerSearchChange,
  customers,
  customersLoading,
  contractDate,
  onContractDateChange,
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
    <div className="space-y-md rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
      <h2 className="font-semibold text-on-surface">بيانات التعاقد</h2>

      <div>
        <label className="mb-xs block text-sm text-on-surface-variant">مصدر التعاقد</label>
        <div className="flex gap-sm">
          {(
            [
              { id: 'branch' as const, label: 'تعاقد عبر فرع' },
              { id: 'distributor' as const, label: 'تعاقد عبر موزع' },
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
          placeholder="ابحث بالكود أو الاسم أو الهاتف..."
          loading={distributorsLoading}
          emptyMessage="لا يوجد موزع مطابق"
        />
      )}

      <SearchableSelect
        data-tour="pos-customer"
        label="العميل"
        options={customers}
        value={selectedCustomer}
        onChange={onCustomerChange}
        onSearchChange={onCustomerSearchChange}
        getOptionValue={(c) => c.id}
        getOptionLabel={(c) => `${c.name} — ${c.phone}`}
        placeholder="ابحث بالاسم أو رقم الموبايل..."
        loading={customersLoading}
        emptyMessage="لا يوجد عميل مطابق"
      />

      <div>
        <label className="mb-xs block text-sm text-on-surface-variant">تاريخ التعاقد</label>
        <input
          type="date"
          value={contractDate}
          onChange={(e) => onContractDateChange(e.target.value)}
          className={selectClass}
        />
      </div>

      {enableInstallationFee && (
        <div className="space-y-sm rounded-lg border border-outline-variant/60 p-sm">
          <div className="flex items-center justify-between gap-sm">
            <label className="text-sm font-medium text-on-surface">
              رسوم التركيب (لكل جهاز)
            </label>
            {allowDisableFeeInSale && (
              <label className="flex items-center gap-xs text-sm">
                <input
                  type="checkbox"
                  checked={applyInstallationFee}
                  onChange={(e) => onApplyInstallationFeeChange(e.target.checked)}
                />
                تطبيق الرسوم
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
                label="خصم رسوم التركيب (لكل جهاز)"
                baseAmount={Number(installationFeePerUnit)}
                amount={feeDiscountAmount}
                percent={feeDiscountPercent}
                mode={feeDiscountMode}
                onChange={onFeeDiscountChange}
              />
              <p className="text-sm tabular-nums text-on-surface-variant">
                صافي الرسوم × {deviceCount} جهاز:{' '}
                <strong>{netInstallationFeeTotal.toLocaleString('ar-EG')} ج.م</strong>
              </p>
              <p className="text-xs text-on-surface-variant">
                تُدفع رسوم التركيب عند التعاقد ولا تدخل في الأقساط.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
