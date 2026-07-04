import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import type { PaginatedResponse, SalesInvoice } from '../../api/types'
import {
  contractCaseStatusLabels,
  contractCaseTypeLabels,
  contractStatusLabel,
} from '../../lib/contractStatus'
import { formatInvoiceDate } from '../../lib/sales'
import { StatusBadge } from '../StatusBadge'

interface ContractDeviceExchange {
  old_serial?: string | null
  new_serial?: string | null
  exchanged_at?: string | null
}

interface ContractCaseRow {
  id: number
  case_type: string
  status: string
  reason?: string | null
  disbursement_amount?: string | number | null
  completed_at?: string | null
  sales_invoice?: Pick<SalesInvoice, 'id' | 'invoice_number' | 'contract_status'>
  device_exchange?: ContractDeviceExchange | null
}

interface CustomerDeviceHistorySectionProps {
  customerId: number
  invoices: SalesInvoice[]
}

export function CustomerDeviceHistorySection({
  customerId,
  invoices,
}: CustomerDeviceHistorySectionProps) {
  const casesQuery = useQuery({
    queryKey: ['contract-cases', 'customer', customerId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ContractCaseRow>>('/contract-cases', {
        params: { customer_id: customerId, per_page: 50 },
      })
      return data.data ?? []
    },
  })

  const activeContracts = invoices.filter(
    (inv) =>
      inv.review_status === 'approved' &&
      !['returned', 'cancelled'].includes(String(inv.contract_status ?? 'active')),
  )

  const deviceLines = activeContracts.flatMap((inv) =>
    (inv.lines ?? [])
      .filter((l) => l.product_unit_id)
      .map((l) => ({
        invoiceId: inv.id,
        invoiceNumber: inv.invoice_number,
        serial: l.serial_number ?? l.product_unit?.serial_number ?? l.product_unit?.imei ?? '—',
        contractStatus: inv.contract_status,
      })),
  )

  const cases = casesQuery.data ?? []

  if (deviceLines.length === 0 && cases.length === 0) {
    return null
  }

  return (
    <section className="mb-md">
      <h2 className="mb-sm text-lg font-semibold">سجل الأجهزة والمشاكل</h2>

      {deviceLines.length > 0 && (
        <div className="mb-md rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
          <h3 className="mb-sm text-sm font-semibold">الأجهزة الحالية</h3>
          <ul className="space-y-2 text-sm">
            {deviceLines.map((d) => (
              <li key={`${d.invoiceId}-${d.serial}`} className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{d.serial}</span>
                <span className="text-on-surface-variant">·</span>
                <Link to={`/contracts/${d.invoiceId}`} className="text-primary hover:underline">
                  {d.invoiceNumber ?? `#${d.invoiceId}`}
                </Link>
                <StatusBadge
                  status={d.contractStatus ?? 'active'}
                  label={contractStatusLabel(d.contractStatus)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {cases.length > 0 && (
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
          <h3 className="mb-sm text-sm font-semibold">المشاكل والاستبدالات</h3>
          <ul className="space-y-3 text-sm">
            {cases.map((c) => (
              <li key={c.id} className="rounded-lg border border-outline-variant/60 px-sm py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {contractCaseTypeLabels[c.case_type] ?? c.case_type}
                  </span>
                  <StatusBadge
                    status={c.status}
                    label={contractCaseStatusLabels[c.status] ?? c.status}
                  />
                  {c.completed_at && (
                    <span className="text-xs text-on-surface-variant">
                      {formatInvoiceDate(c.completed_at)}
                    </span>
                  )}
                </div>
                {c.reason && (
                  <p className="mt-1 text-on-surface-variant">{c.reason}</p>
                )}
                {c.device_exchange && (
                  <p className="mt-1 tabular-nums text-on-surface">
                    {c.device_exchange.old_serial ?? '—'} ← {c.device_exchange.new_serial ?? '—'}
                  </p>
                )}
                {Number(c.disbursement_amount ?? 0) > 0 && (
                  <p className="mt-1 text-secondary">
                    أمر دفع: {Number(c.disbursement_amount).toLocaleString('ar-EG')} ج.م
                  </p>
                )}
                {c.sales_invoice?.id && (
                  <Link
                    to={`/contracts/${c.sales_invoice.id}`}
                    className="mt-1 inline-block text-xs text-primary hover:underline"
                  >
                    عرض العقد
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
