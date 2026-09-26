import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../../api/client'
import type {
  Branch,
  Customer,
  CustomerContractDevice,
  Distributor,
  PaginatedResponse,
  SalesRep,
} from '../../../../api/types'
import { CustomerCreateModal } from '../../../../components/customers/CustomerCreateModal'
import { Icon } from '../../../../components/Icon'
import { SearchableSelect } from '../../../../components/SearchableSelect'
import { TextArea } from '../../../../components/ui/TextArea'
import type { TransactionSource } from '../../../../components/pos/PosContractHeader'
import { posInputClass } from '../../../../components/pos/posFormStyles'
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue'
import { distributorLabel } from '../../../../lib/sales'
import { useAuthStore } from '../../../../stores/authStore'
import type { PosFlowDraft } from '../posFlowTypes'

const SOURCE_OPTIONS: { id: TransactionSource; label: string; icon: string }[] = [
  { id: 'branch', label: 'فرع', icon: 'store' },
  { id: 'distributor', label: 'موزع', icon: 'local_shipping' },
  { id: 'sales', label: 'موظف', icon: 'badge' },
]

interface IntakeStepProps {
  draft: PosFlowDraft
  onSearchChange: (value: string) => void
  onConfirm: (customer: Customer) => void
  onClear: () => void
  onSourceChange: (source: TransactionSource) => void
  onPatch: (partial: Partial<PosFlowDraft>) => void
}

export function IntakeStep({
  draft,
  onSearchChange,
  onConfirm,
  onClear,
  onSourceChange,
  onPatch,
}: IntakeStepProps) {
  const customerReady = draft.customerConfirmed && Boolean(draft.selectedCustomer)

  return (
    <div className="grid gap-lg lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <CustomerColumn
        draft={draft}
        onSearchChange={onSearchChange}
        onConfirm={onConfirm}
        onClear={onClear}
      />
      <SourceColumn
        draft={draft}
        enabled={customerReady}
        onSourceChange={onSourceChange}
        onPatch={onPatch}
      />
    </div>
  )
}

function CustomerColumn({
  draft,
  onSearchChange,
  onConfirm,
  onClear,
}: {
  draft: PosFlowDraft
  onSearchChange: (value: string) => void
  onConfirm: (customer: Customer) => void
  onClear: () => void
}) {
  const [addOpen, setAddOpen] = useState(false)
  const debouncedSearch = useDebouncedValue(draft.customerSearch, 300)
  const query = debouncedSearch.trim()

  const customersQuery = useQuery({
    queryKey: ['customers', 'pos-flow', query],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 20,
        'filter[status]': 'active',
        include: 'salesUser,branch,distributor',
      }
      if (/^01\d{8,9}$/.test(query.replace(/\s/g, ''))) {
        params['filter[phone]'] = query.replace(/\s/g, '')
      } else {
        params['filter[name]'] = query
      }
      const { data } = await api.get<PaginatedResponse<Customer>>('/customers', { params })
      return data.data ?? []
    },
    enabled: query.length >= 2 && !draft.customerConfirmed,
  })

  const confirmWithDetail = async (customer: Customer) => {
    try {
      const { data } = await api.get<Customer>(`/customers/${customer.id}`, {
        params: { include: 'salesUser,branch,distributor,distributorProfile' },
      })
      onConfirm(data)
    } catch {
      onConfirm(customer)
    }
  }

  return (
    <section className="rounded-2xl border border-outline-variant/70 bg-surface p-md shadow-sm sm:p-lg">
      <div className="mb-md flex items-center justify-between gap-sm">
        <div>
          <p className="text-xs font-bold tracking-wide text-primary">1</p>
          <h2 className="text-lg font-extrabold text-on-surface">العميل</h2>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-xs rounded-full bg-primary/10 px-sm py-1 text-xs font-bold text-primary hover:bg-primary/15"
        >
          <Icon name="person_add" size={16} />
          عميل جديد
        </button>
      </div>

      {draft.customerConfirmed && draft.selectedCustomer ? (
        <ConfirmedCustomerCard customer={draft.selectedCustomer} onClear={onClear} />
      ) : (
        <div className="space-y-md">
          <div className="relative">
            <Icon
              name="search"
              size={20}
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
            <input
              className={`${posInputClass} h-12 ps-10 text-base`}
              value={draft.customerSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ابحث بالاسم أو الموبايل"
              autoFocus
            />
          </div>
          <p className="text-xs text-on-surface-variant">
            حرفين على الأقل. لو مش لاقيه، أضف عميل جديد.
          </p>

          {customersQuery.isLoading ? (
            <p className="text-sm text-on-surface-variant">جاري البحث...</p>
          ) : null}

          {query.length >= 2 && !customersQuery.isLoading && (customersQuery.data?.length ?? 0) === 0 ? (
            <div className="rounded-xl border border-dashed border-outline-variant px-md py-lg text-center">
              <p className="text-sm text-on-surface-variant">لا يوجد عميل مطابق</p>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="mt-sm text-sm font-bold text-primary hover:underline"
              >
                إضافة عميل جديد
              </button>
            </div>
          ) : null}

          <div className="grid gap-sm">
            {(customersQuery.data ?? []).map((customer) => (
              <CustomerResultCard
                key={customer.id}
                customer={customer}
                onConfirm={() => confirmWithDetail(customer)}
              />
            ))}
          </div>
        </div>
      )}

      <CustomerCreateModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(customer) => {
          setAddOpen(false)
          void confirmWithDetail(customer)
        }}
      />
    </section>
  )
}

function ConfirmedCustomerCard({
  customer,
  onClear,
}: {
  customer: Customer
  onClear: () => void
}) {
  const devicesQuery = useQuery({
    queryKey: ['customers', customer.id, 'devices', 'pos-flow-card'],
    queryFn: async () => {
      const { data } = await api.get<{ data: CustomerContractDevice[] }>(
        `/customers/${customer.id}/devices`,
      )
      return data.data ?? []
    },
  })
  const phones = [customer.phone, customer.phone_2, customer.phone_3].filter(Boolean)
  const initial = customer.name.trim().slice(0, 1)

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-md">
      <div className="mb-md flex items-start gap-sm">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-extrabold text-on-primary">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-sm">
            <div>
              <p className="text-lg font-extrabold text-on-surface">{customer.name}</p>
              <p className="text-sm tabular-nums text-on-surface-variant">{phones.join(' · ')}</p>
            </div>
            <span className="rounded-full bg-primary px-sm py-0.5 text-[11px] font-bold text-on-primary">
              مؤكد
            </span>
          </div>
        </div>
      </div>
      <dl className="grid gap-sm text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-on-surface-variant">الرقم القومي</dt>
          <dd className="font-medium">{customer.national_id || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-on-surface-variant">الأجهزة</dt>
          <dd className="font-medium">
            {devicesQuery.isLoading ? '...' : `${devicesQuery.data?.length ?? 0} جهاز`}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-on-surface-variant">العنوان</dt>
          <dd className="font-medium">{customer.address || '—'}</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={onClear}
        className="mt-md text-sm font-bold text-primary hover:underline"
      >
        تغيير العميل
      </button>
    </div>
  )
}

function CustomerResultCard({
  customer,
  onConfirm,
}: {
  customer: Customer
  onConfirm: () => void
}) {
  const phones = [customer.phone, customer.phone_2, customer.phone_3].filter(Boolean)
  const sourceBits = [
    customer.sales_user ? `موظف: ${customer.sales_user.name}` : null,
    customer.distributor ? `موزع: ${distributorLabel(customer.distributor)}` : null,
    customer.branch ? `فرع: ${customer.branch.name_ar || customer.branch.name}` : null,
  ].filter(Boolean)

  return (
    <article className="rounded-xl border border-outline-variant bg-surface-container-lowest p-sm transition-colors hover:border-primary/40">
      <div className="mb-xs flex items-start justify-between gap-sm">
        <div>
          <h3 className="font-bold text-on-surface">{customer.name}</h3>
          <p className="text-sm tabular-nums text-on-surface-variant">{phones.join(' · ')}</p>
        </div>
      </div>
      <p className="mb-sm text-xs text-on-surface-variant">
        {sourceBits.join(' · ') || 'غير مرتبط'}
      </p>
      <button
        type="button"
        onClick={onConfirm}
        className="w-full rounded-lg bg-primary py-2 text-sm font-bold text-on-primary"
      >
        هذا هو العميل
      </button>
    </article>
  )
}

function SourceColumn({
  draft,
  enabled,
  onSourceChange,
  onPatch,
}: {
  draft: PosFlowDraft
  enabled: boolean
  onSourceChange: (source: TransactionSource) => void
  onPatch: (partial: Partial<PosFlowDraft>) => void
}) {
  const warehouseId = useAuthStore((s) => s.warehouseId)
  const debouncedDistributorSearch = useDebouncedValue(draft.distributorSearch, 300)
  const debouncedSalesRepSearch = useDebouncedValue(draft.salesRepSearch, 300)

  const suggested = draft.selectedCustomer
    ? [
        draft.selectedCustomer.sales_user
          ? `موظف ${draft.selectedCustomer.sales_user.name}`
          : null,
        draft.selectedCustomer.distributor
          ? `موزع ${distributorLabel(draft.selectedCustomer.distributor)}`
          : null,
        draft.selectedCustomer.branch
          ? `فرع ${draft.selectedCustomer.branch.name_ar || draft.selectedCustomer.branch.name}`
          : null,
      ].filter(Boolean)
    : []

  const branchesQuery = useQuery({
    queryKey: ['branches', 'pos-flow'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', {
        params: { per_page: 100, 'filter[is_active]': 1 },
      })
      return data.data ?? []
    },
    enabled,
  })

  const filteredBranches = (branchesQuery.data ?? []).filter((branch) => {
    const q = draft.branchSearch.trim().toLowerCase()
    if (!q) return true
    return (
      (branch.name_ar || branch.name || '').toLowerCase().includes(q) ||
      (branch.code || '').toLowerCase().includes(q)
    )
  })

  const distributorsQuery = useQuery({
    queryKey: ['distributors', 'pos-flow', debouncedDistributorSearch],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 50,
        'filter[status]': 'active',
      }
      const q = debouncedDistributorSearch.trim()
      if (q) {
        if (/^\d+$/.test(q)) params['filter[code]'] = q
        else params['filter[name]'] = q
      }
      const { data } = await api.get<PaginatedResponse<Distributor>>('/distributors', { params })
      return data.data ?? []
    },
    enabled: enabled && draft.transactionSource === 'distributor',
  })

  const salesRepsQuery = useQuery({
    queryKey: ['sales-reps', 'pos-flow', debouncedSalesRepSearch],
    queryFn: async () => {
      const params: Record<string, string> = {}
      const q = debouncedSalesRepSearch.trim()
      if (q) params.search = q
      const { data } = await api.get<{ data: SalesRep[] }>('/sales-reps', { params })
      return data.data ?? []
    },
    enabled: enabled && draft.transactionSource === 'sales',
  })

  return (
    <section
      className={`rounded-2xl border border-outline-variant/70 bg-surface p-md shadow-sm sm:p-lg ${
        enabled ? '' : 'opacity-55'
      }`}
    >
      <div className="mb-md">
        <p className="text-xs font-bold tracking-wide text-primary">2</p>
        <h2 className="text-lg font-extrabold text-on-surface">المصدر والبيانات</h2>
      </div>

      {!enabled ? (
        <p className="rounded-xl bg-surface-container-low px-md py-sm text-sm text-on-surface-variant">
          أكّد العميل أولاً عشان تختار المصدر.
        </p>
      ) : null}

      <fieldset disabled={!enabled} className="space-y-md">
        {suggested.length > 0 ? (
          <p className="text-xs text-on-surface-variant">مقترح من ملف العميل: {suggested.join(' · ')}</p>
        ) : null}

        <div className="grid grid-cols-3 gap-xs">
          {SOURCE_OPTIONS.map((option) => {
            const active = draft.transactionSource === option.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSourceChange(option.id)}
                className={`flex flex-col items-center gap-xs rounded-xl border px-xs py-sm text-sm font-bold transition-colors ${
                  active
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary/40'
                }`}
              >
                <Icon name={option.icon} size={20} className="no-flip" />
                {option.label}
              </button>
            )
          })}
        </div>

        {draft.transactionSource === 'branch' ? (
          <SearchableSelect
            label="الفرع"
            options={filteredBranches}
            value={draft.selectedBranch}
            onChange={(branch) =>
              onPatch({
                selectedBranch: branch,
                branchSearch: branch?.name_ar || branch?.name || '',
              })
            }
            onSearchChange={(value) => onPatch({ branchSearch: value })}
            getOptionValue={(branch) => branch.id}
            getOptionLabel={(branch) => branch.name_ar || branch.name}
            placeholder="ابحث باسم الفرع..."
            loading={branchesQuery.isLoading}
            emptyMessage="لا يوجد فرع مطابق"
          />
        ) : null}

        {draft.transactionSource === 'distributor' ? (
          <SearchableSelect
            label="الموزع"
            options={distributorsQuery.data ?? []}
            value={draft.selectedDistributor}
            onChange={(distributor) =>
              onPatch({
                selectedDistributor: distributor,
                distributorSearch: distributor ? distributorLabel(distributor) : '',
              })
            }
            onSearchChange={(value) => onPatch({ distributorSearch: value })}
            getOptionValue={(distributor) => distributor.id}
            getOptionLabel={(distributor) =>
              `${distributor.code} — ${distributorLabel(distributor)}`
            }
            placeholder="ابحث بالكود أو الاسم..."
            loading={distributorsQuery.isLoading}
            emptyMessage="لا يوجد موزع مطابق"
          />
        ) : null}

        {draft.transactionSource === 'sales' ? (
          <SearchableSelect
            label="موظف المبيعات"
            options={salesRepsQuery.data ?? []}
            value={draft.selectedSalesRep}
            onChange={(rep) =>
              onPatch({
                selectedSalesRep: rep,
                salesRepSearch: rep?.name || '',
              })
            }
            onSearchChange={(value) => onPatch({ salesRepSearch: value })}
            getOptionValue={(rep) => rep.id}
            getOptionLabel={(rep) => rep.name}
            placeholder="ابحث باسم الموظف..."
            loading={salesRepsQuery.isLoading}
            emptyMessage="لا يوجد موظف مطابق"
          />
        ) : null}

        <div className="flex flex-wrap items-end gap-sm">
          <label className="min-w-40 flex-1 text-sm font-bold text-on-surface-variant">
            تاريخ التعاقد
            <div className="relative mt-1">
              <input
                type="date"
                value={draft.contractDate}
                onChange={(e) => onPatch({ contractDate: e.target.value })}
                className={`${posInputClass} pe-9`}
              />
              <span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-on-surface-variant">
                <Icon name="calendar_today" size={18} className="no-flip" />
              </span>
            </div>
          </label>
          <span
            className={`rounded-full px-sm py-1 text-xs font-bold ${
              warehouseId == null
                ? 'bg-tertiary/10 text-tertiary'
                : 'bg-primary/10 text-primary'
            }`}
          >
            {warehouseId == null ? 'بدون مخزن' : 'المخزن جاهز'}
          </span>
        </div>

        <label className="block text-sm font-bold text-on-surface-variant">
          ملاحظات
          <TextArea
            rows={3}
            value={draft.notes}
            onChange={(e) => onPatch({ notes: e.target.value })}
            placeholder="اختياري — تظهر على العقد"
            className={`${posInputClass} mt-1`}
          />
        </label>
      </fieldset>
    </section>
  )
}
