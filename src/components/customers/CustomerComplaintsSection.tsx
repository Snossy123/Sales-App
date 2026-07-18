import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import type { PaginatedResponse, SalesInvoice } from '../../api/types'
import {
  contractCaseStatusLabels,
  contractCaseTypeLabels,
} from '../../lib/contractStatus'
import { formatInvoiceDate } from '../../lib/sales'
import { AsyncState } from '../AsyncState'
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
  notes?: string | null
  disbursement_amount?: string | number | null
  completed_at?: string | null
  created_at?: string | null
  sales_invoice?: Pick<SalesInvoice, 'id' | 'invoice_number' | 'contract_status'>
  device_exchange?: ContractDeviceExchange | null
}

interface CustomerComplaintsSectionProps {
  customerId: number
}

export function CustomerComplaintsSection({ customerId }: CustomerComplaintsSectionProps) {
  const query = useQuery({
    queryKey: ['contract-cases', 'customer', customerId, 'complaints'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ContractCaseRow>>('/contract-cases', {
        params: { customer_id: customerId, per_page: 50 },
      })
      return data.data ?? []
    },
  })

  const cases = query.data ?? []

  return (
    <section id="customer-complaints" className="mb-md scroll-mt-24">
      <h2 className="mb-sm text-lg font-semibold">الشكاوى والمشاكل</h2>

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {cases.length === 0 ? (
          <p className="rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-lg text-center text-sm text-on-surface-variant">
            لا توجد شكاوى أو مشاكل مسجّلة
          </p>
        ) : (
          <ul className="space-y-3">
            {cases.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {contractCaseTypeLabels[c.case_type] ?? c.case_type}
                  </span>
                  <StatusBadge
                    status={c.status}
                    label={contractCaseStatusLabels[c.status] ?? c.status}
                  />
                  {c.created_at && (
                    <span className="text-xs text-on-surface-variant">
                      {formatInvoiceDate(c.created_at)}
                    </span>
                  )}
                </div>
                {c.reason && <p className="mt-1 text-on-surface-variant">{c.reason}</p>}
                {c.notes && !c.reason && (
                  <p className="mt-1 text-on-surface-variant">{c.notes}</p>
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
                    عرض العقد {c.sales_invoice.invoice_number ?? ''}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </AsyncState>
    </section>
  )
}
