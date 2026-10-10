import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type {
  AccessoryCheckoutPayload,
  CheckoutPayload,
  Customer,
  PaginatedResponse,
  ProductUnit,
  Promotion,
  SalesInvoice,
} from '../../../api/types'
import { MyContractsButton } from '../../../components/contracts/MyContractsButton'
import { SalesPageShell } from '../../../components/SalesPageShell'
import { UninstallDeviceHandoverModal } from '../../../components/UninstallDeviceHandoverModal'
import { useAuthStore } from '../../../stores/authStore'
import { useOrgSettingsStore } from '../../../stores/orgSettingsStore'
import { PosFlowStepper } from './PosFlowStepper'
import {
  buildAccessoryCheckout,
  buildDeviceCheckout,
  buildMixedCatalogCheckout,
  buildOwnershipTransferCheckout,
  buildRenewalCheckout,
  buildServiceCheckout,
  canLeaveStep,
  detailsReady,
  flowTotals,
} from './posFlowCheckout'
import { ActionStep } from './steps/ActionStep'
import { CatalogDetailsStep } from './steps/CatalogDetailsStep'
import { DeviceDetailsStep } from './steps/DeviceDetailsStep'
import { IntakeStep } from './steps/IntakeStep'
import { OwnershipTransferDetailsStep } from './steps/OwnershipTransferDetailsStep'
import { RenewalDetailsStep } from './steps/RenewalDetailsStep'
import { ReviewStep } from './steps/ReviewStep'
import { usePosFlowState } from './usePosFlowState'
import type { PosFlowSuccess } from './posFlowTypes'

export function PosFlowPage() {
  const queryClient = useQueryClient()
  const warehouseId = useAuthStore((s) => s.warehouseId)
  const contextBranchId = useAuthStore((s) => s.branchId)
  const salesSettings = useOrgSettingsStore((s) => s.sales)
  const enableInstallationFee = salesSettings?.enable_installation_fee ?? true
  const minDownPercent = salesSettings?.min_down_payment_percent ?? 10
  const maxInstallmentCount = salesSettings?.max_installment_months ?? 24
  const { draft, patch, confirmCustomer, clearCustomer, changeSource, goTo, goNext, goBack, reset, canGoBack } =
    usePosFlowState()
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [success, setSuccess] = useState<PosFlowSuccess | null>(null)
  const [uninstallInvoice, setUninstallInvoice] = useState<SalesInvoice | null>(null)

  const unitsQuery = useQuery({
    queryKey: ['product-units', 'pos', warehouseId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ProductUnit>>('/product-units', {
        params: {
          per_page: 100,
          'filter[warehouse_id]': warehouseId,
          'filter[state]': 'available',
        },
      })
      return data.data ?? []
    },
    enabled: Boolean(warehouseId) && draft.action === 'new_device',
  })

  const promotionsQuery = useQuery({
    queryKey: ['pricing', 'promotions', 'active'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Promotion[] }>('/pricing/promotions/active')
      return data.data ?? []
    },
    enabled: draft.step === 'review' && draft.action === 'new_device',
  })

  const distributorQuery = useQuery({
    queryKey: ['customer', draft.selectedCustomer?.id, 'distributor-profile-pos'],
    queryFn: async () => {
      const { data } = await api.get<Customer>(`/customers/${draft.selectedCustomer!.id}`, {
        params: { include: 'distributorProfile' },
      })
      return data.distributor_profile ?? null
    },
    enabled: Boolean(draft.selectedCustomer?.id) && draft.step === 'review',
  })

  const totals = flowTotals(draft, enableInstallationFee)
  const detailErrors = detailsReady(draft, {
    warehouseId: warehouseId ?? null,
    minDownPercent,
    maxInstallmentCount,
  })
  const stepReady = canLeaveStep(draft, draft.step, {
    warehouseId: warehouseId ?? null,
    minDownPercent,
    maxInstallmentCount,
  })

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (draft.action === 'catalog' && draft.feeLines.length === 0) {
        if (warehouseId == null) throw new Error('اختار مخزن من الشريط العلوي')
        const payload: AccessoryCheckoutPayload = buildAccessoryCheckout(draft, {
          contextBranchId,
          warehouseId,
        })
        const { data } = await api.post<SalesInvoice>('/sales-invoices/accessory-checkout', payload)
        return data
      }

      const payload: CheckoutPayload =
        draft.action === 'renewal'
          ? buildRenewalCheckout(draft, { contextBranchId, maxInstallmentCount })
          : draft.action === 'ownership_transfer'
              ? buildOwnershipTransferCheckout(draft, { contextBranchId, maxInstallmentCount })
              : draft.action === 'catalog' && draft.accessoryCart.length === 0
                ? buildServiceCheckout(draft, {
                    contextBranchId,
                    maxInstallmentCount,
                    total: totals.subtotal,
                  })
                : draft.action === 'catalog'
                  ? buildMixedCatalogCheckout(draft, {
                      contextBranchId,
                      warehouseId: warehouseId ?? null,
                      maxInstallmentCount,
                      total: totals.subtotal,
                    })
                  : buildDeviceCheckout(draft, {
                      contextBranchId,
                      warehouseId: warehouseId ?? null,
                      units: unitsQuery.data ?? [],
                      maxInstallmentCount,
                      enableInstallationFee,
                    })
      const { data } = await api.post<SalesInvoice>('/sales-invoices/checkout', payload)
      return data
    },
    onSuccess: (invoice) => {
      const message = `تم تسجيل العملية — فاتورة ${invoice.invoice_number ?? `#${invoice.id}`}`
      const hasUninstall =
        draft.action === 'catalog' &&
        (draft.feeLines.some((item) => item.chipId === 'uninstall') ||
          invoice.lines?.some((line) => line.service?.category === 'uninstall'))
      reset()
      setSuccess({ invoice, message })
      setSubmitAttempted(false)
      if (hasUninstall) setUninstallInvoice(invoice)
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['accessories'] })
    },
  })

  const handleNext = () => {
    if (!stepReady) {
      setSubmitAttempted(true)
      return
    }
    setSubmitAttempted(false)
    goNext()
  }

  const handleReset = () => {
    reset()
    setSuccess(null)
    setSubmitAttempted(false)
  }

  const title = useMemo(() => {
    if (success) return 'تمت العملية'
    if (draft.step === 'review') return 'مراجعة العملية'
    return 'تعاقد تجريبي'
  }, [draft.step, success])

  return (
    <SalesPageShell
      title={title}
      subtitle="مسار واحد بخطوات واضحة — للتجربة بجانب الشاشات الحالية"
      actions={<MyContractsButton />}
    >
      {!success ? <PosFlowStepper draft={draft} onGoTo={goTo} /> : null}

      <div className="mt-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-md sm:p-lg">
        {!success && draft.step === 'intake' ? (
          <IntakeStep
            draft={draft}
            onSearchChange={(customerSearch) => patch({ customerSearch, customerConfirmed: false })}
            onConfirm={confirmCustomer}
            onClear={clearCustomer}
            onSourceChange={changeSource}
            onPatch={patch}
          />
        ) : null}
        {!success && draft.step === 'action' ? (
          <ActionStep
            value={draft.action}
            onChange={(action) =>
              patch({
                action,
                deviceLines: action === draft.action ? draft.deviceLines : [],
                feeLines: action === 'catalog' ? draft.feeLines : [],
                accessoryCart: action === 'catalog' ? draft.accessoryCart : [],
                sourceTransferInvoice: action === 'ownership_transfer' ? draft.sourceTransferInvoice : null,
                sourceTransferDevice: action === 'ownership_transfer' ? draft.sourceTransferDevice : null,
                quantity: action === draft.action ? draft.quantity : 1,
                activeDeviceIndex: 0,
              })
            }
          />
        ) : null}
        {!success && draft.step === 'details' && draft.action === 'new_device' ? (
          <DeviceDetailsStep draft={draft} onPatch={patch} showErrors={submitAttempted} />
        ) : null}
        {!success && draft.step === 'details' && draft.action === 'renewal' ? (
          <RenewalDetailsStep draft={draft} onPatch={patch} showErrors={submitAttempted} />
        ) : null}
        {!success && draft.step === 'details' && draft.action === 'ownership_transfer' ? (
          <OwnershipTransferDetailsStep draft={draft} onPatch={patch} showErrors={submitAttempted} />
        ) : null}
        {!success && draft.step === 'details' && draft.action === 'catalog' ? (
          <CatalogDetailsStep draft={draft} onPatch={patch} showErrors={submitAttempted} />
        ) : null}
        {success || draft.step === 'review' ? (
          <ReviewStep
            draft={draft}
            totals={totals}
            promotions={promotionsQuery.data ?? []}
            distributorBalanceAvailable={Number(
              draft.selectedCustomer?.distributor_profile?.commission_balance ??
                distributorQuery.data?.commission_balance ??
                0,
            )}
            onPatch={patch}
            errors={success ? [] : detailErrors}
            checkoutError={
              checkoutMutation.isError ? getErrorMessage(checkoutMutation.error) : undefined
            }
            success={success}
            pending={checkoutMutation.isPending}
            onSubmit={() => {
              setSubmitAttempted(true)
              if (detailErrors.length > 0) return
              checkoutMutation.mutate()
            }}
            onReset={handleReset}
          />
        ) : null}

        {!success ? (
          <div className="mt-lg flex flex-wrap justify-between gap-sm">
            <button
              type="button"
              onClick={goBack}
              disabled={!canGoBack}
              className="rounded-lg border border-outline-variant px-lg py-2 text-sm font-bold text-on-surface disabled:opacity-40"
            >
              رجوع
            </button>
            {draft.step !== 'review' ? (
              <button
                type="button"
                onClick={handleNext}
                className="rounded-lg bg-primary px-lg py-2 text-sm font-bold text-on-primary disabled:opacity-50"
              >
                التالي
              </button>
            ) : null}
          </div>
        ) : null}

        {submitAttempted && !stepReady && draft.step !== 'review' && !success ? (
          <p className="mt-sm text-sm text-error">أكمل هذه الخطوة قبل الانتقال للتالي</p>
        ) : null}
      </div>

      <UninstallDeviceHandoverModal
        open={uninstallInvoice !== null}
        invoice={uninstallInvoice}
        onClose={() => setUninstallInvoice(null)}
      />
    </SalesPageShell>
  )
}
