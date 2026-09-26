import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../../api/client'
import type {
  Branch,
  Employee,
  GpsProduct,
  GpsStock,
  PaginatedResponse,
  ProductUnit,
  Service,
} from '../../../../api/types'
import {
  createDeviceLine,
  DeviceLineCard,
  type DeviceLineDraft,
} from '../../../../components/pos/DeviceLineCard'
import { PosDevicesToolbar } from '../../../../components/pos/PosDevicesToolbar'
import { InsightBanner } from '../../../../components/InsightBanner'
import { COMBINER_FEE_CHIPS, findCombinerService } from '../../../../lib/serviceCombiner'
import { resolveGpsUnitPrice } from '../../../../lib/gpsProductPricing'
import { isAtOrBelowMinStock, minStockWarningMessage } from '../../../../lib/minStock'
import { useAuthStore } from '../../../../stores/authStore'
import { useOrgSettingsStore } from '../../../../stores/orgSettingsStore'
import type { ApiPaginated } from '../../../../lib/sales'
import { resolvedBranchId } from '../posFlowHelpers'
import type { PosFlowDraft } from '../posFlowTypes'

function clampDeviceIndex(index: number, count: number): number {
  if (count <= 0) return 0
  return Math.min(Math.max(index, 0), count - 1)
}

function syncDeviceLines(input: {
  quantity: number
  existing: DeviceLineDraft[]
  units: ProductUnit[]
  product?: GpsProduct
  cashPrice: number
  installmentPrice: number
  contractDate: string
  minDownPercent: number
}): DeviceLineDraft[] {
  if (input.quantity <= 0) return []
  const next: DeviceLineDraft[] = []
  for (let index = 0; index < input.quantity; index += 1) {
    const existing = input.existing[index]
    const unit = input.units[index]
    const paymentTerm = existing?.paymentTerm ?? 'installment'
    const renewalType = existing?.renewalType ?? 'annual'
    const price = input.product
      ? resolveGpsUnitPrice(input.product, {
          contractKind: 'new_contract',
          paymentTerm,
          renewalType,
        })
      : paymentTerm === 'cash'
        ? input.cashPrice
        : input.installmentPrice
    if (existing) {
      next.push({
        ...existing,
        productUnitId: unit?.id ?? existing.productUnitId,
        imei: unit?.imei ?? existing.imei,
        unitPrice: price,
        serialNumber: existing.serialNumber || unit?.serial_number || '',
      })
    } else {
      next.push(
        createDeviceLine(price, unit, {
          contractDate: input.contractDate,
          minDownPercent: input.minDownPercent,
        }),
      )
    }
  }
  return next
}

interface DeviceDetailsStepProps {
  draft: PosFlowDraft
  onPatch: (partial: Partial<PosFlowDraft>) => void
  showErrors?: boolean
}

export function DeviceDetailsStep({ draft, onPatch, showErrors = false }: DeviceDetailsStepProps) {
  const warehouseId = useAuthStore((s) => s.warehouseId)
  const contextBranchId = useAuthStore((s) => s.branchId)
  const contextDepartmentId = useAuthStore((s) => s.departmentId)
  const salesSettings = useOrgSettingsStore((s) => s.sales)
  const allowNegativeInventory = salesSettings?.allow_negative_inventory ?? false
  const enableInstallationFee = salesSettings?.enable_installation_fee ?? true
  const allowDisableFeeInSale = salesSettings?.allow_disable_installation_fee_in_sale ?? true
  const minDownPercent = salesSettings?.min_down_payment_percent ?? 10
  const maxInstallmentCount = salesSettings?.max_installment_months ?? 24

  const servicesQuery = useQuery({
    queryKey: ['services', 'pos-installation'],
    queryFn: async () => {
      const { data } = await api.get<ApiPaginated<Service>>('/services', {
        params: { per_page: 100, 'filter[is_active]': '1' },
      })
      return data
    },
  })
  const installationChip = COMBINER_FEE_CHIPS.find((chip) => chip.id === 'installation')
  const installationService = installationChip
    ? findCombinerService(servicesQuery.data?.data ?? [], installationChip)
    : undefined
  const defaultInstallationFee = Number(
    installationService?.cash_price ?? installationService?.default_price ?? 0,
  )

  useEffect(() => {
    if (draft.installationFee === 0 && defaultInstallationFee > 0) {
      onPatch({ installationFee: defaultInstallationFee })
    }
  }, [defaultInstallationFee, draft.installationFee, onPatch])

  const productQuery = useQuery({
    queryKey: ['gps-product'],
    queryFn: async () => {
      const { data } = await api.get<GpsProduct>('/gps-product')
      return data
    },
  })

  const stockQuery = useQuery({
    queryKey: ['gps-stock', 'pos-flow', warehouseId],
    queryFn: async () => {
      const { data } = await api.get<GpsStock>('/gps-stock', {
        params: { 'filter[warehouse_id]': warehouseId },
      })
      return data
    },
    enabled: warehouseId != null,
  })

  const unitsQuery = useQuery({
    queryKey: ['product-units', 'pos-flow', warehouseId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ProductUnit>>('/product-units', {
        params: {
          per_page: 100,
          'filter[warehouse_id]': warehouseId,
          'filter[state]': 'available',
        },
      })
      return data.data
    },
    enabled: warehouseId != null,
  })

  const branchesQuery = useQuery({
    queryKey: ['branches', 'pos-flow-admin'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', {
        params: { per_page: 100, 'filter[is_active]': 1 },
      })
      return data.data ?? []
    },
  })

  const branchId = resolvedBranchId(draft, contextBranchId, branchesQuery.data ?? [])
  const administrationId = useMemo(() => {
    const branch =
      draft.selectedBranch ??
      (branchId ? (branchesQuery.data ?? []).find((item) => item.id === branchId) : null)
    return branch?.administration_id ?? branch?.department_id ?? contextDepartmentId ?? ''
  }, [branchId, branchesQuery.data, contextDepartmentId, draft.selectedBranch])

  const employeesQuery = useQuery({
    queryKey: ['employees', 'pos-flow', administrationId],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 100,
        'filter[status]': 'active',
      }
      if (administrationId) params['filter[administration_id]'] = administrationId
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', { params })
      return data.data
    },
    enabled: Boolean(administrationId) || warehouseId != null,
  })

  const available = stockQuery.data?.available ?? unitsQuery.data?.length ?? 0
  const maxQuantity = allowNegativeInventory ? 999 : Math.max(available, draft.quantity)
  const cashPrice = Number(
    productQuery.data?.cash_annual_price ??
      productQuery.data?.cash_price ??
      productQuery.data?.sell_price ??
      0,
  )
  const installmentPrice = Number(
    productQuery.data?.installment_price ?? productQuery.data?.sell_price ?? 0,
  )

  useEffect(() => {
    const units = unitsQuery.data ?? []
    const deviceLines = syncDeviceLines({
      quantity: draft.quantity,
      existing: draft.deviceLines,
      units,
      product: productQuery.data,
      cashPrice,
      installmentPrice,
      contractDate: draft.contractDate,
      minDownPercent,
    })
    onPatch({
      deviceLines,
      activeDeviceIndex: clampDeviceIndex(draft.activeDeviceIndex, deviceLines.length),
    })
    // quantity / stock / pricing only — user edits stay on the cards
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.quantity, cashPrice, installmentPrice, productQuery.data, unitsQuery.data, draft.contractDate])

  const deviceCount = draft.deviceLines.length
  const activeIndex = clampDeviceIndex(draft.activeDeviceIndex, deviceCount)
  const activeLine = draft.deviceLines[activeIndex]
  const goToDevice = (index: number) =>
    onPatch({ activeDeviceIndex: clampDeviceIndex(index, deviceCount) })

  return (
    <div className="pos-form pos-flow-fields space-y-md">
      <section className="-mx-md -mt-md rounded-t-2xl bg-surface-container-low p-md sm:-mx-lg sm:-mt-lg sm:p-lg">
        <PosDevicesToolbar
          quantity={draft.quantity}
          maxQuantity={maxQuantity}
          onQuantityChange={(quantity) =>
            onPatch({
              quantity,
              activeDeviceIndex: clampDeviceIndex(draft.activeDeviceIndex, quantity),
            })
          }
          enableInstallationFee={enableInstallationFee}
          applyInstallationFee={draft.applyInstallationFee}
          onApplyInstallationFeeChange={(applyInstallationFee) => onPatch({ applyInstallationFee })}
          allowDisableFeeInSale={allowDisableFeeInSale}
          installationFeePerUnit={draft.installationFee}
          onInstallationFeeChange={(installationFee) => onPatch({ installationFee })}
          feeDiscountAmount={draft.feeDiscountAmount}
          feeDiscountPercent={draft.feeDiscountPercent}
          onFeeDiscountChange={({ amount, percent }) =>
            onPatch({ feeDiscountAmount: amount, feeDiscountPercent: percent })
          }
          showTransportationFee
          applyTransportationFee={draft.applyTransportationFee}
          onApplyTransportationFeeChange={(applyTransportationFee) =>
            onPatch({ applyTransportationFee })
          }
          transportationFee={draft.transportationFee}
          onTransportationFeeChange={(transportationFee) => onPatch({ transportationFee })}
        />
      </section>

      {warehouseId == null ? (
        <p className="rounded-lg border border-error/30 bg-error/5 p-sm text-sm text-error">
          اختار مخزن من الشريط العلوي قبل إدخال الأجهزة.
        </p>
      ) : null}
      {warehouseId != null &&
      !stockQuery.isLoading &&
      isAtOrBelowMinStock(available, productQuery.data?.min_stock_level) ? (
        <InsightBanner message={minStockWarningMessage(available)} variant="warning" />
      ) : null}

      {activeLine ? (
        <section className="space-y-md">
          <div className="flex flex-wrap items-center justify-between gap-md">
            <div>
              <p className="text-xs font-bold tracking-wide text-primary">بيانات الجهاز</p>
              <h2 className="text-lg font-extrabold text-on-surface">
                جهاز {activeIndex + 1} من {deviceCount}
              </h2>
            </div>
            {deviceCount > 1 ? (
              <div className="flex flex-wrap gap-xs">
                {draft.deviceLines.map((line, index) => {
                  const active = index === activeIndex
                  return (
                    <button
                      key={line.key}
                      type="button"
                      onClick={() => goToDevice(index)}
                      className={`flex h-8 min-w-8 items-center justify-center rounded-full px-sm text-xs font-extrabold transition-colors ${
                        active
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-high text-on-surface-variant hover:bg-primary/10 hover:text-primary'
                      }`}
                      aria-label={`جهاز ${index + 1}`}
                    >
                      {index + 1}
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>

          <DeviceLineCard
            key={activeLine.key}
            index={activeIndex}
            line={activeLine}
            contractDate={draft.contractDate}
            contractKind="new_contract"
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
                className="rounded-lg border border-outline-variant px-md py-2 text-sm font-bold text-on-surface disabled:opacity-40"
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
