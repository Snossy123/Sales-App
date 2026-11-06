import { Link } from 'react-router-dom'
import { normalizeDigits } from '../lib/normalizeDigits'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { CustodyVoucher, PaginatedResponse, ProductUnit } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { KpiCard } from '../components/KpiCard'
import { CustodyVoucherDetails } from '../components/inventory/CustodyVoucherDetails'
import { BranchInventoryUnitForm } from '../components/inventory/BranchInventoryUnitForm'
import { CustodyVoucherModal } from '../components/inventory/CustodyVoucherModal'
import { DeviceInformation, DeviceHistoryTable } from '../components/inventory/DeviceReport'
import { InventoryUnitTags } from '../components/inventory/InventoryUnitTags'
import { openDeviceReport } from '../lib/printDeviceReport'
import { Modal } from '../components/Modal'
import { SalesPageShell } from '../components/SalesPageShell'
import {
  CUSTODY_BUCKET_OPTIONS,
  formatVisitDate,
  inventoryBucketLabel,
  maintenanceVisitStatusLabel,
  productUnitDisplayCode,
  productUnitStateLabel,
} from '../lib/inventoryBuckets'
import { formatDatetime12hDisplay } from '../lib/datetime12h'
import { userCanPerform } from '../lib/access'
import { useAuthStore } from '../stores/authStore'

type InventoryView = 'custody' | 'log'

interface BranchInventoryResponse {
  sellable_stock_count?: number
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

function compactSearch(value?: string | null): string {
  return normalizeDigits(value ?? '').replace(/\s/g, '').toLowerCase()
}

function modelName(unit?: ProductUnit | null): string {
  return unit?.product_model?.name_ar ?? unit?.product_model?.name ?? '—'
}

function todayIsoDate(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function PageSelectCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean
  indeterminate: boolean
  onChange: (checked: boolean) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      aria-label="تحديد أجهزة الصفحة"
      onChange={(event) => onChange(event.target.checked)}
    />
  )
}

export function BranchInventoryPage() {
  const user = useAuthStore((s) => s.user)
  const canAdd = userCanPerform(user, 'inventory.branch.add')
  const canEdit = userCanPerform(user, 'inventory.branch.edit')
  const canDelete = userCanPerform(user, 'inventory.branch.delete')
  const [unitEditor, setUnitEditor] = useState<ProductUnit | 'new' | null>(null)
  const [deleteUnit, setDeleteUnit] = useState<ProductUnit | null>(null)
  const canReceive = userCanPerform(user, 'inventory.branch.receive')
  const canIssue = userCanPerform(user, 'inventory.branch.issue')
  const canMarkVisit = canReceive || userCanPerform(user, 'inventory.branch.maintenance')
  const queryClient = useQueryClient()
  const refreshInventory = () => {
    queryClient.invalidateQueries({ queryKey: ['branch-inventory'] })
    queryClient.invalidateQueries({ queryKey: ['custody-vouchers'] })
    queryClient.invalidateQueries({ queryKey: ['inventory'] })
    queryClient.invalidateQueries({ queryKey: ['product-units'] })
  }
  const deleteMutation = useMutation({
    mutationFn: async (unitId: number) => api.delete(`/inventory/branch/units/${unitId}`),
    onSuccess: () => { setDeleteUnit(null); setSelectedUnit(null); refreshInventory() },
  })
  const [view, setView] = useState<InventoryView>('custody')
  const [voucherOpen, setVoucherOpen] = useState(false)
  const [voucherMode, setVoucherMode] = useState<'receive' | 'issue'>('receive')

  const [unitSearch, setUnitSearch] = useState('')
  const [bucketFilter, setBucketFilter] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [customerFilter, setCustomerFilter] = useState('')

  const [logSearch, setLogSearch] = useState('')
  const [logTypeFilter, setLogTypeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedVoucher, setSelectedVoucher] = useState<CustodyVoucher | null>(null)
  const [printError, setPrintError] = useState('')
  const [selectedUnit, setSelectedUnit] = useState<ProductUnit | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [visibleIds, setVisibleIds] = useState<number[]>([])
  const [visitAction, setVisitAction] = useState<'enter' | 'exit' | null>(null)
  const [visitDate, setVisitDate] = useState(todayIsoDate)
  const [visitError, setVisitError] = useState('')

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

  const unitHistoryQuery = useQuery({
    queryKey: ['custody-vouchers', 'unit', selectedUnit?.id],
    queryFn: async () => {
      const vouchers: CustodyVoucher[] = []
      let page = 1
      let lastPage: number
      do {
        const { data } = await api.get<PaginatedResponse<CustodyVoucher>>('/inventory/custody/vouchers', {
          params: { product_unit_id: selectedUnit!.id, per_page: 100, page },
        })
        vouchers.push(...(data.data ?? []))
        lastPage = data.last_page
        page += 1
      } while (page <= lastPage)
      return vouchers
    },
    enabled: selectedUnit != null,
  })

  const onVisibleRowsChange = useCallback((rows: ProductUnit[]) => {
    setVisibleIds((current) => {
      const next = rows.map((row) => row.id)
      if (current.length === next.length && current.every((id, index) => id === next[index])) return current
      return next
    })
  }, [])

  const units = useMemo(() => query.data?.units ?? [], [query.data])
  const vouchers = useMemo(() => vouchersQuery.data ?? [], [vouchersQuery.data])

  const sellableStockCount = query.data?.sellable_stock_count ?? 0
  const bucketCounts = useMemo(() => {
    const counts = Object.fromEntries(CUSTODY_BUCKET_OPTIONS.map((option) => [option.value, 0])) as Record<
      string,
      number
    >
    for (const unit of units) {
      if (unit.inventory_bucket && unit.inventory_bucket in counts) {
        counts[unit.inventory_bucket] += 1
      }
    }
    return counts
  }, [units])

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

  const customerOptions = useMemo(() => {
    const names = new Map<string, string>()
    for (const unit of units) {
      if (unit.custody_customer?.id && unit.custody_customer.name) {
        names.set(String(unit.custody_customer.id), unit.custody_customer.name)
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
      if (customerFilter && String(unit.custody_customer_id ?? unit.custody_customer?.id ?? '') !== customerFilter) {
        return false
      }
      if (!q) return true
      const qCompact = compactSearch(q)
      const serials = [productUnitDisplayCode(unit), unit.serial_number, unit.physical_serial, unit.sim_number, unit.username]
      const phones = [unit.custody_customer?.phone, unit.custody_customer?.phone_2, unit.custody_customer?.phone_3]
      const employee = (unit.custody_employee?.name ?? '').toLowerCase()
      const customer = (unit.custody_customer?.name ?? '').toLowerCase()
      const model = modelName(unit).toLowerCase()
      return (
        serials.some((value) => {
          const text = (value ?? '').toLowerCase()
          return text.includes(q) || compactSearch(value).includes(qCompact)
        }) ||
        phones.some((value) => compactSearch(value).includes(qCompact)) ||
        employee.includes(q) ||
        customer.includes(q) ||
        model.includes(q)
      )
    })
  }, [units, unitSearch, bucketFilter, employeeFilter, customerFilter])

  const maintenanceMode = bucketFilter === 'custody_maintenance'
  const selectedMaintenanceIds = useMemo(
    () => selectedIds.filter((id) => filteredUnits.some((unit) => unit.id === id)),
    [filteredUnits, selectedIds],
  )
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))
  const someVisibleSelected = visibleIds.some((id) => selectedIds.includes(id))

  function updateBucketFilter(value: string) {
    setBucketFilter(value)
    if (value !== 'custody_maintenance') setSelectedIds([])
  }

  const visitMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ units: ProductUnit[] }>('/inventory/maintenance/visits', {
        product_unit_ids: selectedMaintenanceIds,
        action: visitAction,
        occurred_on: visitDate,
      })
      return data
    },
    onSuccess: (data) => {
      setSelectedUnit((current) => {
        if (!current) return current
        return data.units.find((unit) => unit.id === current.id) ?? current
      })
      setSelectedIds([])
      setVisitAction(null)
      setVisitError('')
      queryClient.invalidateQueries({ queryKey: ['branch-inventory'] })
    },
    onError: (error) => setVisitError(getErrorMessage(error)),
  })

  function openVisit(action: 'enter' | 'exit') {
    setVisitAction(action)
    setVisitDate(todayIsoDate())
    setVisitError('')
  }

  function toggleUnit(id: number) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function toggleVisiblePage(checked: boolean) {
    setSelectedIds((current) => {
      if (checked) return [...new Set([...current, ...visibleIds])]
      const hidden = new Set(visibleIds)
      return current.filter((id) => !hidden.has(id))
    })
  }

  const filteredVouchers = useMemo(() => {
    const q = logSearch.trim().toLowerCase()
    return vouchers.filter((voucher) => {
      if (logTypeFilter && voucher.type !== logTypeFilter) return false
      const dateKey = voucherDateKey(voucher.created_at)
      if (dateFrom && dateKey && dateKey < dateFrom) return false
      if (dateTo && dateKey && dateKey > dateTo) return false
      if (!q) return true
      const unit = voucher.product_unit
      const values = [
        unit ? productUnitDisplayCode(unit) : '',
        unit?.serial_number, unit?.physical_serial, unit?.username, unit?.sim_number,
        voucher.voucher_number, voucher.employee?.name, voucher.creator?.name, voucher.customer?.name,
      ]
      const compactQuery = compactSearch(q)
      return values.some((value) => compactSearch(value).includes(compactQuery))
    })
  }, [vouchers, logSearch, logTypeFilter, dateFrom, dateTo])

  const hasCustodyFilters = Boolean(unitSearch || bucketFilter || employeeFilter || customerFilter)
  const hasLogFilters = Boolean(logSearch || logTypeFilter || dateFrom || dateTo)

  return (
    <SalesPageShell
      title="مخزون الفرع"
      subtitle={view === 'custody' ? 'الأجهزة الحالية في العهدة' : 'سجل أذون الاستلام والصرف'}
      actions={
        view === 'custody' && (canReceive || canIssue || canAdd) ? (
          <div className="flex gap-2">
            {canAdd && <button type="button" className="rounded-lg bg-primary px-3 py-2 text-sm text-on-primary" onClick={() => setUnitEditor('new')}>إضافة جهاز</button>}
            {canReceive && (
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
            )}
            {canIssue && (
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
            )}
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
          <div className="mb-md grid grid-cols-2 gap-md lg:grid-cols-4">
            <KpiCard label="أجهزة متاحة للبيع" value={query.isSuccess ? sellableStockCount : '—'} icon="inventory_2" />
            {CUSTODY_BUCKET_OPTIONS.map((option) => {
              const selected = bucketFilter === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`rounded-lg text-start ${selected ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => updateBucketFilter(selected ? '' : option.value)}
                >
                  <KpiCard label={option.label} value={bucketCounts[option.value] ?? 0} icon="inventory" />
                </button>
              )
            })}
          </div>
          <FilterBar
            search={unitSearch}
            onSearchChange={setUnitSearch}
            searchPlaceholder="اسم العميل أو رقمه أو السريال أو اليوزر أو الشريحة أو الموظف"
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
                onChange: updateBucketFilter,
              },
              {
                id: 'employee',
                label: 'الموظف',
                value: employeeFilter,
                options: employeeOptions,
                onChange: setEmployeeFilter,
              },
              {
                id: 'customer',
                label: 'العميل',
                value: customerFilter,
                options: customerOptions,
                onChange: setCustomerFilter,
              },
            ]}
            showClear={hasCustodyFilters}
            onClear={() => {
              setUnitSearch('')
              updateBucketFilter('')
              setEmployeeFilter('')
              setCustomerFilter('')
            }}
          />
          {maintenanceMode && canMarkVisit && selectedMaintenanceIds.length > 0 && (
            <div className="mb-sm flex flex-wrap items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2">
              <span className="text-sm text-on-surface">{selectedMaintenanceIds.length} جهاز محدد</span>
              <button
                type="button"
                className="rounded-lg bg-primary px-3 py-2 text-sm text-on-primary"
                onClick={() => openVisit('enter')}
              >
                راح الصيانة
              </button>
              <button
                type="button"
                className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
                onClick={() => openVisit('exit')}
              >
                خلص صيانة
              </button>
            </div>
          )}
          <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
              <DataTable<ProductUnit>
                data={filteredUnits}
                keyExtractor={(row) => row.id}
                pageSize={PAGE_SIZE}
                pageKey={`${unitSearch}|${bucketFilter}|${employeeFilter}|${customerFilter}`}
                striped={false}
                onVisibleRowsChange={maintenanceMode ? onVisibleRowsChange : undefined}
                emptyMessage={hasCustodyFilters ? 'لا توجد أجهزة مطابقة' : 'لا توجد وحدات مصنّفة في مخزون الفرع بعد.'}
                columns={[
                  ...(maintenanceMode && canMarkVisit
                    ? [
                        {
                          key: 'select',
                          header: (
                            <PageSelectCheckbox
                              checked={allVisibleSelected}
                              indeterminate={someVisibleSelected && !allVisibleSelected}
                              onChange={toggleVisiblePage}
                            />
                          ),
                          render: (row: ProductUnit) => (
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(row.id)}
                              aria-label={`تحديد ${productUnitDisplayCode(row)}`}
                              onChange={() => toggleUnit(row.id)}
                            />
                          ),
                        },
                      ]
                    : []),
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
                  ...(maintenanceMode
                    ? [
                        {
                          key: 'visit_status',
                          header: 'حالة الصيانة',
                          render: (row: ProductUnit) => maintenanceVisitStatusLabel(row),
                        },
                        {
                          key: 'entered_on',
                          header: 'تاريخ الدخول',
                          className: 'tabular-nums',
                          render: (row: ProductUnit) => formatVisitDate(row.maintenance_entered_on),
                        },
                        {
                          key: 'exited_on',
                          header: 'تاريخ الخروج',
                          className: 'tabular-nums',
                          render: (row: ProductUnit) => formatVisitDate(row.maintenance_exited_on),
                        },
                      ]
                    : []),
                  {
                    key: 'employee',
                    header: 'الموظف',
                    render: (row) => row.custody_employee?.name ?? '—',
                  },
                  {
                    key: 'customer',
                    header: 'العميل',
                    render: (row) => row.custody_customer ? (
                      <Link to={`/customers/${row.custody_customer.id}`} className="text-primary hover:underline" onClick={(event) => event.stopPropagation()}>
                        {row.custody_customer.name}
                      </Link>
                    ) : '—',
                  },
                  {
                    key: 'received_at',
                    header: 'تاريخ الاستلام',
                    className: 'tabular-nums',
                    render: (row) => formatDatetime12hDisplay(row.custody_received_at),
                  },
                  {
                    key: 'issued_at',
                    header: 'تاريخ الصرف',
                    className: 'tabular-nums',
                    render: () => '—',
                  },
                  {
                    key: 'details',
                    header: '',
                    render: (row) => (
                      <div className="flex gap-3">
                        <button type="button" className="text-sm font-bold text-primary hover:underline" onClick={() => setSelectedUnit(row)}>تفاصيل</button>
                        {canEdit && <button type="button" className="text-sm text-primary hover:underline" onClick={() => setUnitEditor(row)}>تعديل</button>}
                        {canDelete && <button type="button" className="text-sm text-error hover:underline" onClick={() => { deleteMutation.reset(); setDeleteUnit(row) }}>حذف</button>}
                      </div>
                    ),
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
            searchPlaceholder="بحث برقم الإذن أو السريال أو اسم المستخدم أو رقم الشريحة"
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
                    render: (row) => row.customer ? (
                      <Link to={`/customers/${row.customer.id}`} className="text-primary hover:underline" onClick={(event) => event.stopPropagation()}>
                        {row.customer.name}
                      </Link>
                    ) : '—',
                  },
                  {
                    key: 'received_at',
                    header: 'تاريخ الاستلام',
                    className: 'tabular-nums',
                    render: (row) =>
                      row.type === 'receipt' ? formatDatetime12hDisplay(row.created_at) : '—',
                  },
                  {
                    key: 'issued_at',
                    header: 'تاريخ الصرف',
                    className: 'tabular-nums',
                    render: (row) =>
                      row.type === 'issuance' ? formatDatetime12hDisplay(row.created_at) : '—',
                  },
                  {
                    key: 'details',
                    header: '',
                    render: (row) => (
                      <button
                        type="button"
                        className="text-sm font-bold text-primary hover:underline"
                        onClick={() => setSelectedVoucher(row)}
                      >
                        تفاصيل
                      </button>
                    ),
                  },
                ]}
              />
          </AsyncState>
        </>
      )}

      <Modal
        open={selectedUnit !== null}
        onClose={() => setSelectedUnit(null)}
        title={selectedUnit ? `سجل الجهاز ${productUnitDisplayCode(selectedUnit)}` : 'سجل الجهاز'}
        size="lg"
        headerActions={
          <button type="button" className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-on-primary disabled:opacity-50"
            disabled={!unitHistoryQuery.isSuccess || unitHistoryQuery.isFetching}
            onClick={() => {
              setPrintError('')
              if (selectedUnit && !openDeviceReport(selectedUnit, unitHistoryQuery.data ?? [])) {
                setPrintError('تعذر فتح التقرير. يرجى السماح بالنوافذ المنبثقة وإعادة المحاولة.')
              }
            }}>طباعة التقرير</button>
        }
      >
        {selectedUnit && (
          <div dir="rtl" className="max-h-[70vh] space-y-3 overflow-y-auto">
            <InventoryUnitTags state={selectedUnit.state} inventoryBucket={selectedUnit.inventory_bucket} />
            {printError && <p role="alert" className="text-sm text-error">{printError}</p>}
            <DeviceInformation unit={selectedUnit} />
            <div className="space-y-sm">
              <h3 className="text-sm font-bold text-on-surface">سجل العهدة</h3>
              <AsyncState
                isLoading={unitHistoryQuery.isLoading}
                isError={unitHistoryQuery.isError}
                error={unitHistoryQuery.error}
              >
                <div className="overflow-x-auto rounded-lg border border-outline-variant">
                  <DeviceHistoryTable vouchers={unitHistoryQuery.data ?? []} />
                </div>
              </AsyncState>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={selectedVoucher !== null}
        onClose={() => setSelectedVoucher(null)}
        title={selectedVoucher?.type === 'issuance' ? 'تفاصيل إذن الصرف' : 'تفاصيل إذن الاستلام'}
      >
        {selectedVoucher && <CustodyVoucherDetails voucher={selectedVoucher} />}
      </Modal>

      <Modal
        open={visitAction !== null}
        onClose={() => {
          if (!visitMutation.isPending) setVisitAction(null)
        }}
        title={visitAction === 'exit' ? 'خلص صيانة' : 'راح الصيانة'}
        size="sm"
      >
        <form
          className="space-y-md"
          onSubmit={(event) => {
            event.preventDefault()
            setVisitError('')
            visitMutation.mutate()
          }}
        >
          <label className="block text-sm">
            <span className="text-on-surface-variant">{visitAction === 'exit' ? 'تاريخ الخروج' : 'تاريخ الدخول'}</span>
            <input
              type="date"
              required
              value={visitDate}
              onChange={(event) => setVisitDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2"
            />
          </label>
          <p className="text-sm text-on-surface-variant">
            {visitAction === 'exit'
              ? `هيتم تسجيل خروج ${selectedMaintenanceIds.length} جهاز، ويفضلوا في قائمة الصيانة.`
              : `هيتم تسجيل دخول ${selectedMaintenanceIds.length} جهاز للصيانة.`}
          </p>
          {visitError && <p className="text-sm text-error">{visitError}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
              onClick={() => setVisitAction(null)}
              disabled={visitMutation.isPending}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary px-3 py-2 text-sm text-on-primary disabled:opacity-60"
              disabled={visitMutation.isPending || selectedMaintenanceIds.length === 0}
            >
              حفظ
            </button>
          </div>
        </form>
      </Modal>

      {unitEditor && <BranchInventoryUnitForm unit={unitEditor === 'new' ? null : unitEditor} branchId={user?.branch_id} onClose={() => setUnitEditor(null)} onSuccess={() => { setUnitEditor(null); refreshInventory() }} />}
      <Modal open={Boolean(deleteUnit)} onClose={() => { if (!deleteMutation.isPending) setDeleteUnit(null) }} title="حذف الجهاز">
        <p className="mb-3 text-sm">هل تريد حذف الجهاز {deleteUnit ? productUnitDisplayCode(deleteUnit) : ''}؟</p>
        {deleteMutation.isError && <p role="alert" className="mb-3 text-sm text-error">{getErrorMessage(deleteMutation.error)}</p>}
        <div className="flex justify-end gap-2"><button type="button" disabled={deleteMutation.isPending} onClick={() => setDeleteUnit(null)} className="rounded-lg border px-4 py-2 text-sm">إلغاء</button><button type="button" disabled={deleteMutation.isPending} onClick={() => { if (deleteUnit) deleteMutation.mutate(deleteUnit.id) }} className="rounded-lg bg-error px-4 py-2 text-sm text-white disabled:opacity-50">{deleteMutation.isPending ? 'جارٍ الحذف...' : 'حذف'}</button></div>
      </Modal>

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
