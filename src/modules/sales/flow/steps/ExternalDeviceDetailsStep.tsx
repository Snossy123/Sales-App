import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../../api/client'
import type { Employee, GpsProduct, PaginatedResponse } from '../../../../api/types'
import {
  createDeviceLine,
  DeviceLineCard,
  type DeviceLineDraft,
} from '../../../../components/pos/DeviceLineCard'
import { posStepperClass } from '../../../../components/pos/posFormStyles'
import { Icon } from '../../../../components/Icon'
import { resolveGpsUnitPrice } from '../../../../lib/gpsProductPricing'
import { useOrgSettingsStore } from '../../../../stores/orgSettingsStore'
import type { PosFlowDraft } from '../posFlowTypes'

function clampDeviceIndex(index: number, count: number): number {
  if (count <= 0) return 0
  return Math.min(Math.max(index, 0), count - 1)
}

function syncExternalLines(input: {
  quantity: number
  existing: DeviceLineDraft[]
  product?: GpsProduct
  contractDate: string
  minDownPercent: number
}): DeviceLineDraft[] {
  if (input.quantity <= 0) return []
  const next: DeviceLineDraft[] = []
  for (let index = 0; index < input.quantity; index += 1) {
    const existing = input.existing[index]
    const paymentTerm = existing?.paymentTerm ?? 'installment'
    const renewalType = existing?.renewalType ?? 'annual'
    const price = input.product
      ? resolveGpsUnitPrice(input.product, {
          contractKind: 'external_device',
          paymentTerm,
          renewalType,
        })
      : existing?.unitPrice ?? 0
    if (existing) {
      next.push({ ...existing, unitPrice: price, productUnitId: undefined })
    } else {
      next.push(
        createDeviceLine(price, undefined, {
          contractDate: input.contractDate,
          minDownPercent: input.minDownPercent,
        }),
      )
    }
  }
  return next
}

interface ExternalDeviceDetailsStepProps {
  draft: PosFlowDraft
  onPatch: (partial: Partial<PosFlowDraft>) => void
  showErrors?: boolean
}

export function ExternalDeviceDetailsStep({
  draft,
  onPatch,
  showErrors = false,
}: ExternalDeviceDetailsStepProps) {
  const salesSettings = useOrgSettingsStore((s) => s.sales)
  const minDownPercent = salesSettings?.min_down_payment_percent ?? 10
  const maxInstallmentCount = salesSettings?.max_installment_months ?? 24

  const productQuery = useQuery({
    queryKey: ['gps-product'],
    queryFn: async () => {
      const { data } = await api.get<GpsProduct>('/gps-product')
      return data
    },
  })

  const employeesQuery = useQuery({
    queryKey: ['employees', 'pos-flow-external'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', {
        params: { per_page: 100, 'filter[status]': 'active' },
      })
      return data.data
    },
  })

  const cashPrice = Number(productQuery.data?.cash_price ?? productQuery.data?.sell_price ?? 0)
  const installmentPrice = Number(
    productQuery.data?.installment_price ?? productQuery.data?.sell_price ?? 0,
  )

  useEffect(() => {
    const deviceLines = syncExternalLines({
      quantity: Math.max(1, draft.quantity),
      existing: draft.deviceLines,
      product: productQuery.data,
      contractDate: draft.contractDate,
      minDownPercent,
    })
    onPatch({
      quantity: Math.max(1, draft.quantity),
      deviceLines,
      activeDeviceIndex: clampDeviceIndex(draft.activeDeviceIndex, deviceLines.length),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.quantity, productQuery.data, draft.contractDate])

  const deviceCount = draft.deviceLines.length
  const activeIndex = clampDeviceIndex(draft.activeDeviceIndex, deviceCount)
  const activeLine = draft.deviceLines[activeIndex]
  const goToDevice = (index: number) =>
    onPatch({ activeDeviceIndex: clampDeviceIndex(index, deviceCount) })

  return (
    <div className="pos-form pos-flow-fields space-y-md">
      <section className="-mx-md -mt-md rounded-t-2xl bg-surface-container-low p-md sm:-mx-lg sm:-mt-lg sm:p-lg">
        <label className="mb-1 block text-[14px] font-bold text-on-surface-variant">عدد الأجهزة</label>
        <div className={`${posStepperClass} max-w-56`}>
          <button
            type="button"
            onClick={() => onPatch({ quantity: Math.max(1, draft.quantity - 1) })}
            disabled={draft.quantity <= 1}
            className="flex h-full w-11 items-center justify-center text-on-surface-variant disabled:opacity-40"
            aria-label="تقليل"
          >
            <Icon name="remove" size={20} />
          </button>
          <span className="min-w-[2.5rem] flex-1 text-center text-[16px] font-extrabold tabular-nums">
            {draft.quantity}
          </span>
          <button
            type="button"
            onClick={() => onPatch({ quantity: Math.min(20, draft.quantity + 1) })}
            className="flex h-full w-11 items-center justify-center text-on-surface-variant"
            aria-label="زيادة"
          >
            <Icon name="add" size={20} />
          </button>
        </div>
      </section>

      {activeLine ? (
        <section className="space-y-md">
          <div className="flex flex-wrap items-center justify-between gap-md">
            <h2 className="text-lg font-extrabold text-on-surface">
              جهاز {activeIndex + 1} من {deviceCount}
            </h2>
            {deviceCount > 1 ? (
              <div className="flex flex-wrap gap-xs">
                {draft.deviceLines.map((line, index) => (
                  <button
                    key={line.key}
                    type="button"
                    onClick={() => goToDevice(index)}
                    className={`flex h-8 min-w-8 items-center justify-center rounded-full px-sm text-xs font-extrabold ${
                      index === activeIndex
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <DeviceLineCard
            key={activeLine.key}
            index={activeIndex}
            line={activeLine}
            contractDate={draft.contractDate}
            contractKind="external_device"
            product={productQuery.data}
            cashPrice={cashPrice}
            installmentPrice={installmentPrice}
            onChange={(next) =>
              onPatch({
                deviceLines: draft.deviceLines.map((item, itemIndex) =>
                  itemIndex === activeIndex ? next : item,
                ),
              })
            }
            minDownPercent={minDownPercent}
            maxInstallmentCount={maxInstallmentCount}
            employees={employeesQuery.data ?? []}
            employeesLoading={employeesQuery.isLoading}
            showErrors={showErrors}
            embedded
          />

          {deviceCount > 1 ? (
            <div className="flex flex-wrap justify-between gap-md pt-md">
              <button
                type="button"
                onClick={() => goToDevice(activeIndex - 1)}
                disabled={activeIndex <= 0}
                className="rounded-lg border border-outline-variant px-md py-2 text-sm font-bold disabled:opacity-40"
              >
                الجهاز السابق
              </button>
              <button
                type="button"
                onClick={() => goToDevice(activeIndex + 1)}
                disabled={activeIndex >= deviceCount - 1}
                className="rounded-lg bg-primary px-md py-2 text-sm font-bold text-on-primary disabled:opacity-40"
              >
                الجهاز التالي
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
