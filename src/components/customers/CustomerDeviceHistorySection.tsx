import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import type { CustomerContractDevice, SalesInvoice } from '../../api/types'
import { DEVICE_ORIGIN_LABELS } from '../services/CustomerContractDevicePicker'
import { contractStatusLabel } from '../../lib/contractStatus'
import { StatusBadge } from '../StatusBadge'

interface CustomerDeviceHistorySectionProps {
  customerId: number
  invoices: SalesInvoice[]
}

export function CustomerDeviceHistorySection({
  customerId,
  invoices,
}: CustomerDeviceHistorySectionProps) {
  const devicesQuery = useQuery({
    queryKey: ['customers', customerId, 'devices'],
    queryFn: async () => {
      const { data } = await api.get<{ data: CustomerContractDevice[] }>(
        `/customers/${customerId}/devices`,
      )
      return data.data ?? []
    },
  })

  const devices = devicesQuery.data ?? []
  const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]))

  if (devicesQuery.isLoading) {
    return (
      <section id="customer-devices" className="mb-md scroll-mt-24">
        <h2 className="mb-sm text-lg font-semibold">الأجهزة الحالية</h2>
        <p className="text-sm text-on-surface-variant">جاري تحميل الأجهزة…</p>
      </section>
    )
  }

  if (devices.length === 0) {
    return null
  }

  return (
    <section id="customer-devices" className="mb-md scroll-mt-24">
      <h2 className="mb-sm text-lg font-semibold">الأجهزة الحالية</h2>

      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
        <ul className="space-y-2 text-sm">
          {devices.map((device) => {
            const invoice = device.sales_invoice_id
              ? invoiceById.get(device.sales_invoice_id)
              : undefined
            return (
              <li
                key={device.id}
                className="flex flex-wrap items-center gap-2"
              >
                <span className="font-medium">
                  {device.serial_number?.trim() || 'بدون سريال'}
                </span>
                <span className="rounded-full bg-surface-container px-2 py-0.5 text-xs text-on-surface-variant">
                  {DEVICE_ORIGIN_LABELS[device.origin ?? 'company_stock']}
                </span>
                {device.invoice_number && device.sales_invoice_id && (
                  <>
                    <span className="text-on-surface-variant">·</span>
                    <Link
                      to={`/contracts/${device.sales_invoice_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {device.invoice_number}
                    </Link>
                  </>
                )}
                {invoice && (
                  <StatusBadge
                    status={invoice.contract_status ?? 'active'}
                    label={contractStatusLabel(invoice.contract_status)}
                  />
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
