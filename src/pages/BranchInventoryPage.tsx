import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { CustodyVoucher, PaginatedResponse, ProductUnit } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { CustodyVoucherModal } from '../components/inventory/CustodyVoucherModal'
import { SalesPageShell } from '../components/SalesPageShell'
import {
  CUSTODY_BUCKET_OPTIONS,
  inventoryBucketLabel,
  productUnitDisplayCode,
  productUnitStateLabel,
} from '../lib/inventoryBuckets'
import { formatDatetime12hDisplay } from '../lib/datetime12h'
import { useAuthStore } from '../stores/authStore'

type InventoryView = 'custody' | 'log'

interface BranchInventoryResponse {
  units: ProductUnit[]
  grouped: {
    new: ProductUnit[]
    by_bucket: Record<string, ProductUnit[]>
  }
}

const PAGE_SIZE = 15

function voucherTypeLabel(type?: string): string {
  if (type === 'receipt') return 'استلام'
  if (type === 'issuance') return 'صرف'
  return type ?? '—'
}

function voucherDateKey(createdAt?: string | null): string {
  if (!createdAt) return ''
  return createdAt.slice(0, 10)
}

function modelName(unit?: ProductUnit | null): string {
  return unit?.product_model?.name_ar ?? unit?.product_model?.name ?? '—'
}

export function BranchInventoryPage() {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [view, setView] = useState<InventoryView>('custody')
  const [voucherOpen, setVoucherOpen] = useState(false)
  const [voucherMode, setVoucherMode] = useState<'receive' | 'issue'>('receive')

  const [unitSearch, setUnitSearch] = useState('')
  const [bucketFilter, setBucketFilter] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState('')

  const [logSearch, setLogSearch] = useState('')
  const [logTypeFilter, setLogTypeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const query = useQuery({
    queryKey: ['branch-inventory', user?.branch_id],
    queryFn: async () => {
      const params: Record<string, number> = {}
      if (user?.branch_id) params.branch_id = user.branch_id
      const { data } = await api.get<BranchInventoryResponse>('/inventory/branch', { params })
      return data
    },
    enabled: Boolean(user),
  })

  const vouchersQuery = useQuery({
    queryKey: ['custody-vouchers', user?.branch_id],
    queryFn: async () => {
      const params: Record<string, number> = { per_page: 100 }
      if (user?.branch_id) params.branch_id = user.branch_id
      const { data } = await api.get<PaginatedResponse<CustodyVoucher>>('/inventory/custody/vouchers', {
        params,
      })
      return data.data ?? []
    },
    enabled: Boolean(user),
  })

  const units = query.data?.units ?? []
  const vouchers = vouchersQuery.data ?? []

  const employeeOptions = useMemo(() => {
    const names = new Map<string, string>()
    for (const unit of units) {
      if (unit.custody_employee?.id && unit.custody_employee.name) {
        names.set(String(unit.custody_employee.id), unit.custody_employee.name)
      }
    }
    return [
      { value: '', label: 'الكل' },
      ...[...names.entries()]
        .sort((a, b) => a[1].localeCompare(b[1], 'ar'))
        .map(([value, label]) => ({ value, label })),
    ]
  }, [units])

  const filteredUnits = useMemo(() => {
    const q = unitSearch.trim().toLowerCase()
    return units.filter((unit) => {
      if (bucketFilter && unit.inventory_bucket !== bucketFilter) return false
      if (employeeFilter && String(unit.custody_employee_id ?? unit.custody_employee?.id ?? '') !== employeeFilter) {
        return false
      }
      if (!q) return true
      const serial = productUnitDisplayCode(unit).toLowerCase()
      const model = modelName(unit).toLowerCase()
      const employee = (unit.custody_employee?.name ?? '').toLowerCase()
      return serial.includes(q) || model.includes(q) || employee.includes(q)
    })
  }, [units, unitSearch, bucketFilter, employeeFilter])

  const filteredVouchers = useMemo(() => {
    const q = logSearch.trim().toLowerCase()
    return vouchers.filter((voucher) => {
      if (logTypeFilter && voucher.type !== logTypeFilter) return false
      const dateKey = voucherDateKey(voucher.created_at)
      if (dateFrom && dateKey && dateKey < dateFrom) return false
      if (dateTo && dateKey && dateKey > dateTo) return false
      if (!q) return true
      const serial = voucher.product_unit ? productUnitDisplayCode(voucher.product_unit).toLowerCase() : ''
      const number = (voucher.voucher_number ?? '').toLowerCase()
      const employee = (voucher.employee?.name ?? voucher.creator?.name ?? '').toLowerCase()
      const customer = (voucher.customer?.name ?? '').toLowerCase()
      return serial.includes(q) || number.includes(q) || employee.includes(q) || customer.includes(q)
    })
  }, [vouchers, logSearch, logTypeFilter, dateFrom, dateTo])

  const hasCustodyFilters = Boolean(unitSearch || bucketFilter || employeeFilter)
  const hasLogFilters = Boolean(logSearch || logTypeFilter || dateFrom || dateTo)

  return (
    <SalesPageShell
      title="مخزون الفرع"
      subtitle={view === 'custody' ? 'الأجهزة الحالية في العهدة' : 'سجل أذون الاستلام والصرف'}
      actions={
        view === 'custody' ? (
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
              onClick={() => {
                setVoucherMode('receive')
                setVoucherOpen(true)
              }}
            >
              إذن استلام
            </button>
            <button
              type="button"
              className="rounded-lg bg-primary px-3 py-2 text-sm text-on-primary"
              onClick={() => {
                setVoucherMode('issue')
                setVoucherOpen(true)
              }}
            >
              إذن صرف
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="mb-4 flex gap-2 border-b border-outline-variant">
        {(
          [
            { id: 'custody' as const, label: 'العهدة' },
            { id: 'log' as const, label: 'السجل' },
          ]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setView(tab.id)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              view === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === 'custody' && (
        <>
          <FilterBar
            search={unitSearch}
            onSearchChange={setUnitSearch}
            searchPlaceholder="بحث بالسريال أو الموظف أو الموديل"
            selects={[
              {
                id: 'bucket',
                label: 'التصنيف',
                value: bucketFilter,
                options: [
                  { value: '', label: 'الكل' },
                  ...CUSTODY_BUCKET_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  })),
                ],
                onChange: setBucketFilter,
              },
              {
                id: 'employee',
                label: 'الموظف',
                value: employeeFilter,
                options: employeeOptions,
                onChange: setEmployeeFilter,
              },
            ]}
            showClear={hasCustodyFilters}
            onClear={() => {
              setUnitSearch('')
              setBucketFilter('')
              setEmployeeFilter('')
            }}
          />
          <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
              <DataTable<ProductUnit>
                data={filteredUnits}
                keyExtractor={(row) => row.id}
                pageSize={PAGE_SIZE}
                pageKey={`${unitSearch}|${bucketFilter}|${employeeFilter}`}
                striped={false}
                emptyMessage={hasCustodyFilters ? 'لا توجد أجهزة مطابقة' : 'لا توجد وحدات مصنّفة في مخزون الفرع بعد.'}
                columns={[
                  {
                    key: 'serial',
                    header: 'السريال',
                    className: 'font-mono',
                    render: (row) => productUnitDisplayCode(row),
                  },
                  {
                    key: 'bucket',
                    header: 'التصنيف',
                    render: (row) => inventoryBucketLabel(row.inventory_bucket) ?? '—',
                  },
                  {
                    key: 'state',
                    header: 'الحالة',
                    render: (row) => productUnitStateLabel(row.state) ?? '—',
                  },
                  {
                    key: 'employee',
                    header: 'الموظف',
                    render: (row) => row.custody_employee?.name ?? '—',
                  },
                  {
                    key: 'model',
                    header: 'الموديل',
                    render: (row) => modelName(row),
                  },
                ]}
              />
          </AsyncState>
        </>
      )}

      {view === 'log' && (
        <>
          <FilterBar
            search={logSearch}
            onSearchChange={setLogSearch}
            searchPlaceholder="بحث برقم الإذن أو السريال"
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            selects={[
              {
                id: 'voucher-type',
                label: 'النوع',
                value: logTypeFilter,
                options: [
                  { value: '', label: 'الكل' },
                  { value: 'receipt', label: 'استلام' },
                  { value: 'issuance', label: 'صرف' },
                ],
                onChange: setLogTypeFilter,
              },
            ]}
            showClear={hasLogFilters}
            onClear={() => {
              setLogSearch('')
              setLogTypeFilter('')
              setDateFrom('')
              setDateTo('')
            }}
          />
          <AsyncState
            isLoading={vouchersQuery.isLoading}
            isError={vouchersQuery.isError}
            error={vouchersQuery.error}
          >
              <DataTable<CustodyVoucher>
                data={filteredVouchers}
                keyExtractor={(row) => row.id}
                pageSize={PAGE_SIZE}
                pageKey={`${logSearch}|${logTypeFilter}|${dateFrom}|${dateTo}`}
                striped={false}
                emptyMessage={hasLogFilters ? 'لا توجد أذون مطابقة' : 'لا توجد أذون استلام أو صرف بعد.'}
                columns={[
                  {
                    key: 'type',
                    header: 'النوع',
                    render: (row) => voucherTypeLabel(row.type),
                  },
                  {
                    key: 'voucher_number',
                    header: 'رقم الإذن',
                    render: (row) => row.voucher_number ?? '—',
                  },
                  {
                    key: 'serial',
                    header: 'السريال',
                    className: 'font-mono',
                    render: (row) => (row.product_unit ? productUnitDisplayCode(row.product_unit) : '—'),
                  },
                  {
                    key: 'employee',
                    header: 'الموظف / المستلم',
                    render: (row) => row.employee?.name ?? row.creator?.name ?? '—',
                  },
                  {
                    key: 'customer',
                    header: 'العميل',
                    render: (row) => row.customer?.name ?? '—',
                  },
                  {
                    key: 'created_at',
                    header: 'التاريخ',
                    className: 'tabular-nums',
                    render: (row) => formatDatetime12hDisplay(row.created_at),
                  },
                ]}
              />
          </AsyncState>
        </>
      )}

      <CustodyVoucherModal
        open={voucherOpen}
        mode={voucherMode}
        branchId={user?.branch_id}
        onClose={() => setVoucherOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['branch-inventory'] })
          queryClient.invalidateQueries({ queryKey: ['custody-vouchers'] })
        }}
      />
    </SalesPageShell>
  )
}
