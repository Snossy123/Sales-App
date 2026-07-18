import { Link } from 'react-router-dom'
import type { SalesInvoice } from '../../api/types'
import { contractStatusLabel } from '../../lib/contractStatus'
import { StatusBadge } from '../StatusBadge'

interface CustomerDeviceHistorySectionProps {
  customerId: number
  invoices: SalesInvoice[]
}

export function CustomerDeviceHistorySection({
  invoices,
}: CustomerDeviceHistorySectionProps) {
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

  if (deviceLines.length === 0) {
    return null
  }

  return (
    <section id="customer-devices" className="mb-md scroll-mt-24">
      <h2 className="mb-sm text-lg font-semibold">الأجهزة الحالية</h2>

      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
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
    </section>
  )
}
