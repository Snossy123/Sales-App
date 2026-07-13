import type { Branch, Customer, Distributor, SalesRep } from '../../api/types'
import { distributorLabel } from '../../lib/sales'
import { Icon } from '../Icon'
import { SearchableSelect } from '../SearchableSelect'
import { PosSectionCard } from './PosSectionCard'
import { posInputClass, posLabelClass, posRequiredWrap, posSourceToggle } from './posFormStyles'

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
  customerLabel?: string
  sectionNumber?: number
  submitAttempted?: boolean
  customerLocked?: boolean
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
  customerLabel = 'العميل',
  sectionNumber = 1,
  submitAttempted = false,
  customerLocked = false,
}: PosContractHeaderProps) {
  const customerLinkedToSalesRep = Boolean(selectedCustomer?.sales_user_id)
  const customerLinkedToDistributor = Boolean(
    selectedCustomer?.distributor_id && selectedCustomer?.distributor,
  )
  const dualAttribution = customerLinkedToSalesRep && customerLinkedToDistributor
  const sourceToggleOptions = customerLinkedToSalesRep
    ? []
    : [
        { id: 'branch' as const, label: 'فرع' },
        { id: 'distributor' as const, label: 'موزع' },
      ]

  const sourceReady =
    transactionSource === 'branch'
      ? Boolean(selectedBranch)
      : transactionSource === 'distributor'
        ? Boolean(selectedDistributor)
        : Boolean(selectedSalesRep)

  const customerError = submitAttempted && !selectedCustomer
  const sourceError = submitAttempted && !sourceReady

  return (
    <PosSectionCard
      number={sectionNumber}
      title="بيانات التعاقد"
      subtitle={
        customerLocked
          ? 'حدّد مصدر التعاقد وتاريخ التسجيل'
          : 'اختر مصدر التعاقد والعميل وتاريخ التسجيل'
      }
      contentClassName="p-sm sm:p-md"
      highlighted={(!customerLocked && customerError) || sourceError}
    >
      <div
        className={`grid grid-cols-1 gap-md sm:grid-cols-2 ${
          customerLocked ? 'lg:grid-cols-3' : 'lg:grid-cols-4'
        }`}
      >
        {!customerLocked && (
          <div className={posRequiredWrap(customerError)}>
            <SearchableSelect
              data-tour="pos-customer"
              label={customerLabel}
              options={customers}
              value={selectedCustomer}
              onChange={onCustomerChange}
              onSearchChange={onCustomerSearchChange}
              getOptionValue={(c) => c.id}
              getOptionLabel={(c) => `${c.name} — ${c.phone}`}
              placeholder="ابحث بالاسم أو الموبايل..."
              loading={customersLoading}
              emptyMessage="لا يوجد عميل مطابق"
              hasError={customerError}
            />
            {customerError && (
              <p className="mt-xs text-xs text-error">
                {customerLabel === 'العميل' ? 'يجب اختيار العميل' : `يجب اختيار ${customerLabel}`}
              </p>
            )}
            {selectedCustomer?.sales_user && (
              <p className="mt-xs text-[13px] leading-snug text-secondary">
                تابع لموظف مبيعات: {selectedCustomer.sales_user.name}
              </p>
            )}
            {dualAttribution && selectedCustomer?.distributor && (
              <p className="mt-xs text-[13px] leading-snug text-secondary">
                موزّع مُحيل: {distributorLabel(selectedCustomer.distributor)} (يُحتسب مع الموظف)
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
        )}

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

        <div className={posRequiredWrap(sourceError)}>
          {customerLinkedToSalesRep || transactionSource === 'sales' ? (
            <>
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
                hasError={sourceError}
              />
              {sourceError && (
                <p className="mt-xs text-xs text-error">يجب اختيار موظف المبيعات</p>
              )}
            </>
          ) : transactionSource === 'branch' ? (
            <>
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
                hasError={sourceError}
              />
              {sourceError && <p className="mt-xs text-xs text-error">يجب اختيار الفرع</p>}
            </>
          ) : transactionSource === 'distributor' ? (
            <>
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
                hasError={sourceError}
              />
              {sourceError && <p className="mt-xs text-xs text-error">يجب اختيار الموزع</p>}
            </>
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
    </PosSectionCard>
  )
}
