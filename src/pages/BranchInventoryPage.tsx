import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { CustodyVoucher, PaginatedResponse, ProductUnit } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { KpiCard } from '../components/KpiCard'
import { CustodyVoucherDetails } from '../components/inventory/CustodyVoucherDetails'
import { CustodyVoucherModal } from '../components/inventory/CustodyVoucherModal'
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
  return (value ?? '').replace(/\s/g, '').toLowerCase()
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

function DeviceField({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <p className="text-on-surface-variant">{label}</p>
      <p className={`font-medium ${mono ? 'font-mono' : ''}`}>{value?.trim() || '—'}</p>
    </div>
  )
}

function CustodyDeviceSummary({ unit }: { unit: ProductUnit }) {
  const serial = productUnitDisplayCode(unit)
  const physicalSerial = unit.physical_serial?.trim() ?? ''
  const simNumber = unit.sim_number?.trim() ?? ''
  const showPhysicalSerial = physicalSerial !== '' && physicalSerial !== serial
  const showSim = simNumber !== '' && simNumber !== serial && simNumber !== physicalSerial

  return (
    <div className="grid grid-cols-1 gap-sm text-sm sm:grid-cols-2">
      {showPhysicalSerial && <DeviceField label="السريال الفعلي" value={physicalSerial} mono />}
      <DeviceField label="اسم المستخدم" value={unit.username} />
      {showSim && <DeviceField label="رقم الشريحة" value={simNumber} mono />}
      <DeviceField label="الموديل" value={modelName(unit)} />
      <DeviceField label="التصنيف" value={inventoryBucketLabel(unit.inventory_bucket)} />
      <DeviceField label="الحالة" value={productUnitStateLabel(unit.state)} />
      <DeviceField label="الموظف" value={unit.custody_employee?.name} />
      <DeviceField label="العميل" value={unit.custody_customer?.name} />
      <DeviceField label="تاريخ الاستلام" value={formatDatetime12hDisplay(unit.custody_received_at)} />
      {unit.inventory_bucket === 'custody_maintenance' && (
        <>
          <DeviceField label="حالة الصيانة" value={maintenanceVisitStatusLabel(unit)} />
          <DeviceField label="تاريخ الدخول" value={formatVisitDate(unit.maintenance_entered_on)} />
          <DeviceField label="تاريخ الخروج" value={formatVisitDate(unit.maintenance_exited_on)} />
        </>
      )}
      <div className="sm:col-span-2">
        <p className="text-on-surface-variant">ملاحظات الجهاز</p>
        <p className="font-medium whitespace-pre-wrap">{unit.notes?.trim() || '—'}</p>
      </div>
    </div>
  )
}

export function BranchInventoryPage() {
  const user = useAuthStore((s) => s.user)
  const canReceive = userCanPerform(user, 'inventory.branch.receive')
  const canIssue = userCanPerform(user, 'inventory.branch.issue')
  const canMarkVisit = canReceive || userCanPerform(user, 'inventory.branch.maintenance')
  const queryClient = useQueryClient()
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
      const { data } = await api.get<PaginatedResponse<CustodyVoucher>>('/inventory/custody/vouchers', {
        params: { product_unit_id: selectedUnit!.id, per_page: 100 },
      })
      return data.data ?? []
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

  const units = query.data?.units ?? []
  const vouchers = vouchersQuery.data ?? []

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
      const serial = voucher.product_unit ? productUnitDisplayCode(voucher.product_unit).toLowerCase() : ''
      const number = (voucher.voucher_number ?? '').toLowerCase()
      const employee = (voucher.employee?.name ?? voucher.creator?.name ?? '').toLowerCase()
      const customer = (voucher.customer?.name ?? '').toLowerCase()
      return serial.includes(q) || number.includes(q) || employee.includes(q) || customer.includes(q)
    })
  }, [vouchers, logSearch, logTypeFilter, dateFrom, dateTo])

  const hasCustodyFilters = Boolean(unitSearch || bucketFilter || employeeFilter || customerFilter)
  const hasLogFilters = Boolean(logSearch || logTypeFilter || dateFrom || dateTo)

  return (
    <SalesPageShell
      title="مخزون الفرع"
      subtitle={view === 'custody' ? 'الأجهزة الحالية في العهدة' : 'سجل أذون الاستلام والصرف'}
      actions={
        view === 'custody' && (canReceive || canIssue) ? (
          <div className="flex gap-2">
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
                    render: (row) => row.custody_customer?.name ?? '—',
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
                      <button
                        type="button"
                        className="text-sm font-bold text-primary hover:underline"
                        onClick={() => setSelectedUnit(row)}
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
      >
        {selectedUnit && (
          <div className="max-h-[70vh] space-y-md overflow-y-auto">
            <CustodyDeviceSummary unit={selectedUnit} />
            <div className="space-y-sm">
              <h3 className="text-sm font-bold text-on-surface">سجل العهدة</h3>
              <AsyncState
                isLoading={unitHistoryQuery.isLoading}
                isError={unitHistoryQuery.isError}
                error={unitHistoryQuery.error}
              >
                {(unitHistoryQuery.data ?? []).length === 0 ? (
                  <p className="text-sm text-on-surface-variant">لا يوجد سجل لهذا الجهاز.</p>
                ) : (
                  <div className="space-y-sm">
                    {(unitHistoryQuery.data ?? []).map((voucher) => (
                      <div key={voucher.id} className="rounded-lg border border-outline-variant p-sm">
                        <CustodyVoucherDetails compact deviceNotes={selectedUnit.notes} voucher={voucher} />
                      </div>
                    ))}
                  </div>
                )}
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
