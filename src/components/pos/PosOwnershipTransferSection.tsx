import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import type { Customer, CustomerContractDevice, SalesInvoice } from '../../api/types'
import { formatContractMoney, ownershipTransferInstallmentSummary } from '../../lib/customerContracts'
import { formatInvoiceDate } from '../../lib/sales'
import { SearchableSelect } from '../SearchableSelect'
import { Icon } from '../Icon'
import { PosSectionCard } from './PosSectionCard'
import { normalizeScannedDigits } from '../../lib/scanner'
import { posInputClass, posLabelClass } from './posFormStyles'
import { CustomerCreateModal } from '../customers/CustomerCreateModal'
import {
  contractDeviceLabel,
  DEVICE_ORIGIN_LABELS,
} from '../services/CustomerContractDevicePicker'

export interface PosOwnershipTransferSectionProps {
  selectedSourceInvoice: SalesInvoice | null
  onSourceInvoiceChange: (invoice: SalesInvoice | null) => void
  selectedSourceDevice?: CustomerContractDevice | null
  onSourceDeviceChange?: (device: CustomerContractDevice | null) => void
  submitAttempted?: boolean
}

function deviceLine(invoice: SalesInvoice) {
  return invoice.lines?.find(
    (line) =>
      line.line_type === 'device' ||
      Boolean(line.serial_number || line.sim_number || line.product_unit_id),
  )
}

function invoiceForDevice(
  device: CustomerContractDevice,
  invoices: SalesInvoice[],
): SalesInvoice | undefined {
  if (device.sales_invoice_id) {
    const byId = invoices.find((invoice) => invoice.id === device.sales_invoice_id)
    if (byId) return byId
  }

  const serial = device.serial_number?.trim()
  if (!serial) return undefined

  return invoices.find((invoice) => {
    const line = deviceLine(invoice)
    return (line?.serial_number ?? '').trim() === serial
  })
}

export function PosOwnershipTransferSection({
  selectedSourceInvoice,
  onSourceInvoiceChange,
  selectedSourceDevice = null,
  onSourceDeviceChange,
  submitAttempted = false,
}: PosOwnershipTransferSectionProps) {
  const [serialSearch, setSerialSearch] = useState('')
  const [previousOwnerSearch, setPreviousOwnerSearch] = useState('')
  const [selectedPreviousOwner, setSelectedPreviousOwner] = useState<Customer | null>(null)
  const [addPreviousOwnerOpen, setAddPreviousOwnerOpen] = useState(false)

  const customersQuery = useQuery({
    queryKey: ['customers', 'ownership-transfer', previousOwnerSearch],
    queryFn: async () => {
      const params: Record<string, string> = { per_page: '20' }
      const q = previousOwnerSearch.trim()
      if (q) params['filter[name]'] = q
      const { data } = await api.get<{ data: Customer[] }>('/customers', { params })
      return data.data
    },
    enabled: previousOwnerSearch.trim().length >= 2,
  })

  const sourceQuery = useQuery({
    queryKey: [
      'sales-invoices',
      'transfer-source',
      serialSearch,
      selectedPreviousOwner?.id,
    ],
    queryFn: async () => {
      const params: Record<string, string | number> = {}
      const serial = serialSearch.trim()
      if (serial) params.serial_number = serial
      if (selectedPreviousOwner?.id) params.customer_id = selectedPreviousOwner.id
      const { data } = await api.get<{ data: SalesInvoice[] }>(
        '/sales-invoices/transfer-source',
        { params },
      )
      return data.data
    },
    enabled: serialSearch.trim().length >= 2 || Boolean(selectedPreviousOwner?.id),
  })

  const devicesQuery = useQuery({
    queryKey: ['customers', selectedPreviousOwner?.id, 'devices'],
    queryFn: async () => {
      const { data } = await api.get<{ data: CustomerContractDevice[] }>(
        `/customers/${selectedPreviousOwner!.id}/devices`,
      )
      return data.data ?? []
    },
    enabled: Boolean(selectedPreviousOwner?.id),
  })

  const hasSource = Boolean(selectedSourceInvoice || selectedSourceDevice)
  const sourceError = submitAttempted && !hasSource
  const line = selectedSourceInvoice ? deviceLine(selectedSourceInvoice) : undefined
  const summary = selectedSourceInvoice
    ? ownershipTransferInstallmentSummary(selectedSourceInvoice)
    : null
  const previousOwner =
    selectedSourceInvoice?.customer ??
    selectedPreviousOwner ??
    (selectedSourceInvoice as SalesInvoice & { customer?: Customer })?.customer
  const invoices = sourceQuery.data ?? []
  const devices = devicesQuery.data ?? []
  const showInvoicePicker = invoices.length > 0 && !hasSource
  const showDevicePicker = devices.length > 0 && !hasSource && Boolean(selectedPreviousOwner)
  const searching = sourceQuery.isFetching || devicesQuery.isFetching

  const clearSource = () => {
    onSourceInvoiceChange(null)
    onSourceDeviceChange?.(null)
  }

  const selectInvoice = (invoice: SalesInvoice, device?: CustomerContractDevice | null) => {
    onSourceInvoiceChange(invoice)
    onSourceDeviceChange?.(device ?? null)
    if (!selectedPreviousOwner && invoice.customer) {
      setSelectedPreviousOwner(invoice.customer)
    }
  }

  const selectDevice = (device: CustomerContractDevice) => {
    const invoice = invoiceForDevice(device, invoices)
    if (invoice) {
      selectInvoice(invoice, device)
      return
    }
    onSourceInvoiceChange(null)
    onSourceDeviceChange?.(device)
  }

  return (
    <PosSectionCard
      number={1}
      title="التعاقد الأصلي"
      subtitle="ابحث عن جهاز المالك السابق لنقل الملكية والأقساط المتبقية"
      highlighted={sourceError}
      contentClassName="space-y-md p-sm sm:p-md"
    >
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
        <div>
          <label className={posLabelClass}>المالك السابق</label>
          <SearchableSelect
            options={customersQuery.data ?? []}
            value={selectedPreviousOwner}
            onChange={(customer) => {
              setSelectedPreviousOwner(customer)
              clearSource()
            }}
            onSearchChange={setPreviousOwnerSearch}
            getOptionValue={(c) => c.id}
            getOptionLabel={(c) => `${c.name} — ${c.phone}`}
            placeholder="ابحث بالاسم أو الموبايل..."
            loading={customersQuery.isLoading}
            emptyMessage="لا يوجد عميل مطابق"
          />
          <button
            type="button"
            onClick={() => setAddPreviousOwnerOpen(true)}
            className="mt-xs text-xs font-bold text-primary hover:underline"
          >
            إضافة عميل
          </button>
        </div>
        <div>
          <label className={posLabelClass}>الرقم التسلسلي</label>
          <input
            type="text"
            value={serialSearch}
            onChange={(e) => {
              setSerialSearch(normalizeScannedDigits(e.target.value))
              clearSource()
            }}
            inputMode="numeric"
            className={posInputClass}
            placeholder="ابحث بالرقم التسلسلي..."
          />
        </div>
      </div>

      {searching && (
        <p className="text-sm text-on-surface-variant">جاري البحث عن التعاقدات والأجهزة...</p>
      )}

      {showDevicePicker && (
        <div className="space-y-sm">
          <p className="text-sm font-medium text-on-surface">أجهزة المالك السابق:</p>
          {devices.map((device) => (
            <button
              key={device.id}
              type="button"
              onClick={() => selectDevice(device)}
              className="flex w-full flex-col gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm text-start transition-colors hover:border-primary hover:bg-primary/5"
            >
              <span className="font-medium text-on-surface">{contractDeviceLabel(device)}</span>
              <span className="text-sm text-on-surface-variant">
                {DEVICE_ORIGIN_LABELS[device.origin ?? 'company_stock']}
                {device.invoice_number ? ` · ${device.invoice_number}` : ' · بدون تعاقد في السيستم'}
              </span>
            </button>
          ))}
        </div>
      )}

      {showInvoicePicker && (
        <div className="space-y-sm">
          <p className="text-sm font-medium text-on-surface">اختر التعاقد:</p>
          {invoices.map((invoice) => {
            const device = deviceLine(invoice)
            const owner = invoice.customer
            const inst = ownershipTransferInstallmentSummary(invoice)

            return (
              <button
                key={invoice.id}
                type="button"
                onClick={() => selectInvoice(invoice)}
                className="flex w-full flex-col gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm text-start transition-colors hover:border-primary hover:bg-primary/5"
              >
                <span className="font-medium text-on-surface">
                  {invoice.invoice_number ?? `#${invoice.id}`}
                  {owner ? ` — ${owner.name}` : ''}
                </span>
                <span className="text-sm text-on-surface-variant">
                  {device?.serial_number ? `تسلسلي: ${device.serial_number}` : 'بدون رقم تسلسلي'}
                  {' · '}
                  {invoice.payment_term === 'installment'
                    ? `أقساط مدفوعة: ${inst.paidCount} · متبقي: ${formatContractMoney(inst.remaining)}`
                    : `مدفوع: ${formatContractMoney(Number(invoice.paid_amount ?? 0))}`}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {!hasSource &&
        !searching &&
        (serialSearch.trim().length >= 2 || selectedPreviousOwner) &&
        invoices.length === 0 &&
        devices.length === 0 && (
          <p className="rounded-lg border border-dashed border-outline-variant px-md py-sm text-sm text-on-surface-variant">
            لا توجد تعاقدات أو أجهزة متاحة لنقل الملكية
          </p>
        )}

      {selectedSourceInvoice && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-md">
          <div className="mb-sm flex flex-wrap items-start justify-between gap-sm">
            <div>
              <p className="font-semibold text-on-surface">
                {selectedSourceInvoice.invoice_number ?? `#${selectedSourceInvoice.id}`}
              </p>
              <p className="mt-xs text-sm text-on-surface-variant">
                المالك السابق: {previousOwner?.name ?? '—'}
                {previousOwner?.phone ? ` — ${previousOwner.phone}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={clearSource}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Icon name="close" size={16} />
              تغيير
            </button>
          </div>

          <dl className="grid gap-sm text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-on-surface-variant">التسلسلي</dt>
              <dd className="font-medium tabular-nums">{line?.serial_number ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-on-surface-variant">الشريحة</dt>
              <dd className="font-medium tabular-nums">{line?.sim_number ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-on-surface-variant">طريقة الدفع</dt>
              <dd className="font-medium">
                {selectedSourceInvoice.payment_term === 'installment' ? 'تقسيط' : 'كاش'}
              </dd>
            </div>
            <div>
              <dt className="text-on-surface-variant">تاريخ التعاقد</dt>
              <dd className="font-medium">
                {selectedSourceInvoice.invoice_date
                  ? formatInvoiceDate(selectedSourceInvoice.invoice_date)
                  : '—'}
              </dd>
            </div>
          </dl>

          {summary && selectedSourceInvoice.payment_term === 'installment' && (
            <p className="mt-sm text-sm text-on-surface-variant">
              أقساط مدفوعة: {summary.paidCount} · المتبقي ينتقل للمالك الجديد:{' '}
              <strong className="text-on-surface">{formatContractMoney(summary.remaining)}</strong>
            </p>
          )}
        </div>
      )}

      {!selectedSourceInvoice && selectedSourceDevice && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-md">
          <div className="mb-sm flex flex-wrap items-start justify-between gap-sm">
            <div>
              <p className="font-semibold text-on-surface">
                {selectedSourceDevice.serial_number?.trim() || 'جهاز قديم'}
              </p>
              <p className="mt-xs text-sm text-on-surface-variant">
                المالك السابق: {previousOwner?.name ?? '—'}
                {previousOwner?.phone ? ` — ${previousOwner.phone}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={clearSource}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Icon name="close" size={16} />
              تغيير
            </button>
          </div>
          <dl className="grid gap-sm text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-on-surface-variant">التسلسلي</dt>
              <dd className="font-medium tabular-nums">
                {selectedSourceDevice.serial_number ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-on-surface-variant">الشريحة</dt>
              <dd className="font-medium tabular-nums">
                {selectedSourceDevice.sim_number ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-on-surface-variant">المصدر</dt>
              <dd className="font-medium">
                {DEVICE_ORIGIN_LABELS[selectedSourceDevice.origin ?? 'company_stock']}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {sourceError && (
        <p className="text-xs text-error">يجب اختيار التعاقد الأصلي أو الجهاز لنقل الملكية</p>
      )}

      <CustomerCreateModal
        open={addPreviousOwnerOpen}
        onClose={() => setAddPreviousOwnerOpen(false)}
        onCreated={(customer) => {
          setPreviousOwnerSearch(customer.name)
          setSelectedPreviousOwner(customer)
          clearSource()
        }}
      />
    </PosSectionCard>
  )
}
