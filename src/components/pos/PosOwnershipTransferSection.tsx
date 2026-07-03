import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import type { Customer, SalesInvoice } from '../../api/types'
import { formatContractMoney } from '../../lib/customerContracts'
import { formatInvoiceDate } from '../../lib/sales'
import { SearchableSelect } from '../SearchableSelect'
import { Icon } from '../Icon'
import { PosSectionCard } from './PosSectionCard'
import { posInputClass, posLabelClass } from './posFormStyles'

export interface PosOwnershipTransferSectionProps {
  selectedSourceInvoice: SalesInvoice | null
  onSourceInvoiceChange: (invoice: SalesInvoice | null) => void
  submitAttempted?: boolean
}

function deviceLine(invoice: SalesInvoice) {
  return invoice.lines?.find(
    (line) =>
      line.line_type === 'device' ||
      Boolean(line.serial_number || line.sim_number || line.product_unit_id),
  )
}

function installmentSummary(invoice: SalesInvoice) {
  const items =
    invoice.lines?.flatMap((line) => line.installment_plan?.items ?? []) ??
    invoice.installment_plan?.items ??
    invoice.installment_plans?.flatMap((plan) => plan.items ?? []) ??
    []

  const paid = items.filter((item) => Number(item.paid_amount ?? 0) > 0 || item.status === 'paid')
  const remaining = items.reduce(
    (sum, item) =>
      sum + Math.max(0, Number(item.amount ?? 0) - Number(item.paid_amount ?? 0)),
    0,
  )

  return { paidCount: paid.length, remaining }
}

export function PosOwnershipTransferSection({
  selectedSourceInvoice,
  onSourceInvoiceChange,
  submitAttempted = false,
}: PosOwnershipTransferSectionProps) {
  const [serialSearch, setSerialSearch] = useState('')
  const [previousOwnerSearch, setPreviousOwnerSearch] = useState('')
  const [selectedPreviousOwner, setSelectedPreviousOwner] = useState<Customer | null>(null)

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

  const sourceError = submitAttempted && !selectedSourceInvoice
  const line = selectedSourceInvoice ? deviceLine(selectedSourceInvoice) : undefined
  const summary = selectedSourceInvoice ? installmentSummary(selectedSourceInvoice) : null
  const previousOwner =
    selectedSourceInvoice?.customer ??
    (selectedSourceInvoice as SalesInvoice & { customer?: Customer })?.customer

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
              onSourceInvoiceChange(null)
            }}
            onSearchChange={setPreviousOwnerSearch}
            getOptionValue={(c) => c.id}
            getOptionLabel={(c) => `${c.name} — ${c.phone}`}
            placeholder="ابحث بالاسم أو الموبايل..."
            loading={customersQuery.isLoading}
            emptyMessage="لا يوجد عميل مطابق"
          />
        </div>
        <div>
          <label className={posLabelClass}>الرقم التسلسلي</label>
          <input
            type="text"
            value={serialSearch}
            onChange={(e) => {
              setSerialSearch(e.target.value)
              onSourceInvoiceChange(null)
            }}
            className={posInputClass}
            placeholder="ابحث بالرقم التسلسلي..."
          />
        </div>
      </div>

      {sourceQuery.isFetching && (
        <p className="text-sm text-on-surface-variant">جاري البحث عن التعاقدات...</p>
      )}

      {(sourceQuery.data?.length ?? 0) > 0 && !selectedSourceInvoice && (
        <div className="space-y-sm">
          <p className="text-sm font-medium text-on-surface">اختر التعاقد:</p>
          {sourceQuery.data!.map((invoice) => {
            const device = deviceLine(invoice)
            const owner = invoice.customer
            const inst = installmentSummary(invoice)

            return (
              <button
                key={invoice.id}
                type="button"
                onClick={() => onSourceInvoiceChange(invoice)}
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

      {sourceQuery.data &&
        sourceQuery.data.length === 0 &&
        (serialSearch.trim().length >= 2 || selectedPreviousOwner) &&
        !sourceQuery.isFetching && (
          <p className="rounded-lg border border-dashed border-outline-variant px-md py-sm text-sm text-on-surface-variant">
            لا توجد تعاقدات متاحة لنقل الملكية
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
              onClick={() => onSourceInvoiceChange(null)}
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

      {sourceError && (
        <p className="text-xs text-error">يجب اختيار التعاقد الأصلي لنقل الملكية</p>
      )}
    </PosSectionCard>
  )
}
