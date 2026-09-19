import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, getErrorMessage } from '../../api/client'
import type { CustomerContractDevice, SalesInvoice } from '../../api/types'
import { DEVICE_ORIGIN_LABELS } from '../services/CustomerContractDevicePicker'
import { contractStatusLabel } from '../../lib/contractStatus'
import { StatusBadge } from '../StatusBadge'
import { Icon } from '../Icon'
import { CustomerLegacyDevicesFields } from './CustomerLegacyDevicesFields'
import {
  emptyLegacyDeviceDraft,
  legacyDevicesAreComplete,
  registerCustomerLegacyDevices,
  type LegacyDeviceDraft,
} from '../../lib/customerLegacyDevices'

interface CustomerDeviceHistorySectionProps {
  customerId: number
  invoices: SalesInvoice[]
  initialWarning?: string | null
}

export function CustomerDeviceHistorySection({
  customerId,
  invoices,
  initialWarning = null,
}: CustomerDeviceHistorySectionProps) {
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [devices, setDevices] = useState<LegacyDeviceDraft[]>([emptyLegacyDeviceDraft()])
  const [showErrors, setShowErrors] = useState(false)
  const [warning, setWarning] = useState<string | null>(initialWarning)

  const devicesQuery = useQuery({
    queryKey: ['customers', customerId, 'devices'],
    queryFn: async () => {
      const { data } = await api.get<{ data: CustomerContractDevice[] }>(
        `/customers/${customerId}/devices`,
      )
      return data.data ?? []
    },
  })

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!legacyDevicesAreComplete(devices)) {
        throw new Error('أكمل السريال والشريحة واسم المستخدم لكل جهاز')
      }
      return registerCustomerLegacyDevices(customerId, devices)
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['customers', customerId, 'devices'] })
      if (result.error) {
        setWarning(result.error)
        return
      }
      setWarning(null)
      setAdding(false)
      setDevices([emptyLegacyDeviceDraft()])
      setShowErrors(false)
    },
  })

  const listed = devicesQuery.data ?? []
  const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]))

  return (
    <section id="customer-devices" className="mb-md scroll-mt-24">
      <div className="mb-sm flex flex-wrap items-center justify-between gap-sm">
        <h2 className="text-lg font-semibold">الأجهزة الحالية</h2>
        <button
          type="button"
          onClick={() => {
            setAdding((open) => !open)
            setShowErrors(false)
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-md py-sm text-sm font-bold text-on-surface hover:bg-surface-container"
        >
          <Icon name={adding ? 'close' : 'add'} size={18} />
          {adding ? 'إلغاء' : 'إضافة جهاز قديم'}
        </button>
      </div>

      {adding && (
        <div className="mb-sm space-y-sm">
          <CustomerLegacyDevicesFields
            enabled
            onEnabledChange={() => undefined}
            devices={devices}
            onChange={setDevices}
            showErrors={showErrors}
            showToggle={false}
          />
          {registerMutation.isError && (
            <p className="text-sm text-error">{getErrorMessage(registerMutation.error)}</p>
          )}
          <button
            type="button"
            disabled={registerMutation.isPending}
            onClick={() => {
              setShowErrors(true)
              if (!legacyDevicesAreComplete(devices)) return
              registerMutation.mutate()
            }}
            className="rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary disabled:opacity-50"
          >
            {registerMutation.isPending ? 'جاري التسجيل…' : 'تسجيل الأجهزة'}
          </button>
        </div>
      )}

      {warning && <p className="mb-sm text-sm text-error">{warning}</p>}

      {devicesQuery.isLoading && (
        <p className="text-sm text-on-surface-variant">جاري تحميل الأجهزة…</p>
      )}

      {!devicesQuery.isLoading && listed.length === 0 && !adding && (
        <p className="text-sm text-on-surface-variant">
          لا توجد أجهزة مسجلة — أضف أجهزة العميل القديم قبل عمل خدمة أو تجديد.
        </p>
      )}

      {listed.length > 0 && (
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
          <ul className="space-y-2 text-sm">
            {listed.map((device) => {
              const invoice = device.sales_invoice_id
                ? invoiceById.get(device.sales_invoice_id)
                : undefined
              return (
                <li key={device.id} className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{device.serial_number?.trim() || 'بدون سريال'}</span>
                  <span className="rounded-full bg-surface-container px-2 py-0.5 text-xs text-on-surface-variant">
                    {DEVICE_ORIGIN_LABELS[device.origin ?? 'company_stock']}
                  </span>
                  {device.sim_number && (
                    <span className="text-on-surface-variant">شريحة {device.sim_number}</span>
                  )}
                  {device.username && (
                    <span className="text-on-surface-variant" dir="ltr">
                      {device.username}
                    </span>
                  )}
                  {device.invoice_number && device.sales_invoice_id ? (
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
                  ) : (
                    <span className="text-xs text-on-surface-variant">بدون تعاقد في السيستم</span>
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
      )}
    </section>
  )
}
