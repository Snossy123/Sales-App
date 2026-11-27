import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../../api/client'
import type {
  Branch,
  CustomerContractDevice,
  Employee,
  GpsProduct,
  PaginatedResponse,
} from '../../../../api/types'
import {
  createDeviceLine,
  DeviceLineCard,
  type DeviceLineDraft,
} from '../../../../components/pos/DeviceLineCard'
import { PosSubscriptionRenewalSection } from '../../../../components/pos/PosSubscriptionRenewalSection'
import {
  applyContractDeviceIdentity,
  identityFromCustomerDevice,
  type RegisterCustomerDevicePayload,
} from '../../../../components/services/CustomerContractDevicePicker'
import { candidateFromCustomerDevice } from '../../../../lib/posRenewalSource'
import { resolveGpsUnitPrice } from '../../../../lib/gpsProductPricing'
import { subscriptionRenewalUnitPrice } from '../../../../lib/contractKinds'
import { useAuthStore } from '../../../../stores/authStore'
import { useOrgSettingsStore } from '../../../../stores/orgSettingsStore'
import { resolvedBranchId } from '../posFlowHelpers'
import type { PosFlowDraft } from '../posFlowTypes'

interface RenewalDetailsStepProps {
  draft: PosFlowDraft
  onPatch: (partial: Partial<PosFlowDraft>) => void
  showErrors?: boolean
}

export function RenewalDetailsStep({ draft, onPatch, showErrors = false }: RenewalDetailsStepProps) {
  const queryClient = useQueryClient()
  const contextBranchId = useAuthStore((s) => s.branchId)
  const contextDepartmentId = useAuthStore((s) => s.departmentId)
  const salesSettings = useOrgSettingsStore((s) => s.sales)
  const minDownPercent = salesSettings?.min_down_payment_percent ?? 10
  const maxInstallmentCount = salesSettings?.max_installment_months ?? 24
  const customer = draft.selectedCustomer
  const [registerError, setRegisterError] = useState<string | null>(null)

  const devicesQuery = useQuery({
    queryKey: ['customers', customer?.id, 'devices'],
    queryFn: async () => {
      const { data } = await api.get<{ data: CustomerContractDevice[] }>(
        `/customers/${customer!.id}/devices`,
      )
      return data.data ?? []
    },
    enabled: Boolean(customer?.id),
  })

  const productQuery = useQuery({
    queryKey: ['gps-product'],
    queryFn: async () => {
      const { data } = await api.get<GpsProduct>('/gps-product')
      return data
    },
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
  const administrationId =
    draft.selectedBranch?.administration_id ??
    draft.selectedBranch?.department_id ??
    (branchId ? (branchesQuery.data ?? []).find((item) => item.id === branchId)?.administration_id : '') ??
    contextDepartmentId ??
    ''

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
    enabled: Boolean(administrationId),
  })

  const cashAnnual = Number(
    productQuery.data?.cash_annual_price ??
      productQuery.data?.cash_price ??
      productQuery.data?.sell_price ??
      0,
  )
  const annualRenewalPrice = Number(productQuery.data?.annual_renewal_price ?? 0)
  const line = draft.deviceLines[0]
  const renewalType = line?.renewalType ?? 'annual'
  const paymentTerm = line?.paymentTerm ?? 'installment'
  const unitPrice = productQuery.data
    ? resolveGpsUnitPrice(productQuery.data, {
        contractKind: 'subscription_renewal',
        paymentTerm,
        renewalType,
      })
    : renewalType === 'permanent'
      ? subscriptionRenewalUnitPrice(cashAnnual)
      : annualRenewalPrice

  useEffect(() => {
    if (!customer) return
    const devices = devicesQuery.data
    if (devices && devices.length === 0 && !draft.renewalManualDevice && !draft.selectedCustomerDevice) {
      onPatch({ renewalManualDevice: true })
    }
  }, [customer, devicesQuery.data, draft.renewalManualDevice, draft.selectedCustomerDevice, onPatch])

  useEffect(() => {
    if (!draft.selectedCustomerDevice) {
      if (draft.deviceLines.length > 0 && draft.renewalManualDevice) {
        onPatch({ deviceLines: [] })
      }
      return
    }
    const existing = draft.deviceLines[0]
    const deviceIdentity = identityFromCustomerDevice(draft.selectedCustomerDevice)
    const identity = {
      ...deviceIdentity,
      serialNumber: draft.renewalSerial || deviceIdentity.serialNumber,
      physicalSerial: draft.renewalPhysicalSerial || deviceIdentity.physicalSerial,
      simNumber: draft.renewalSim || deviceIdentity.simNumber,
      username: draft.renewalUsername || deviceIdentity.username,
    }
    const base =
      existing ??
      createDeviceLine(unitPrice, undefined, { contractDate: draft.contractDate, minDownPercent })
    const next = applyContractDeviceIdentity(
      { ...base, unitPrice, renewalType: existing?.renewalType ?? 'annual' },
      identity,
    )
    if (
      !existing ||
      existing.unitPrice !== next.unitPrice ||
      existing.serialNumber !== next.serialNumber ||
      existing.physicalSerial !== next.physicalSerial ||
      existing.simNumber !== next.simNumber ||
      existing.username !== next.username ||
      existing.productUnitId !== next.productUnitId
    ) {
      onPatch({ deviceLines: [next], quantity: 1 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    draft.selectedCustomerDevice,
    draft.renewalSerial,
    draft.renewalPhysicalSerial,
    draft.renewalSim,
    draft.renewalUsername,
    draft.renewalManualDevice,
    unitPrice,
    draft.contractDate,
  ])

  const handleSelectDevice = (device: CustomerContractDevice) => {
    const identity = identityFromCustomerDevice(device)
    setRegisterError(null)
    onPatch({
      selectedCustomerDevice: device,
      renewalManualDevice: false,
      renewalSerial: identity.serialNumber,
      renewalPhysicalSerial: identity.physicalSerial,
      renewalSim: identity.simNumber,
      renewalUsername: identity.username,
      sourceRenewalCandidate: customer ? candidateFromCustomerDevice(device, customer) : null,
    })
  }

  const registerMutation = useMutation({
    mutationFn: async (payload: RegisterCustomerDevicePayload) => {
      const { data } = await api.post<{ data: CustomerContractDevice }>(
        `/customers/${customer!.id}/devices`,
        payload,
      )
      return data.data
    },
    onSuccess: (device) => {
      setRegisterError(null)
      queryClient.invalidateQueries({ queryKey: ['customers', customer?.id, 'devices'] })
      handleSelectDevice(device)
    },
    onError: (error) => {
      setRegisterError(getErrorMessage(error))
    },
  })

  const patchIdentity = (partial: Partial<DeviceLineDraft> & { physicalSerial?: string }) => {
    const current = draft.deviceLines[0]
    onPatch({
      renewalSerial: partial.serialNumber ?? draft.renewalSerial,
      renewalPhysicalSerial: partial.physicalSerial ?? draft.renewalPhysicalSerial,
      renewalSim: partial.simNumber ?? draft.renewalSim,
      renewalUsername: partial.username ?? draft.renewalUsername,
      deviceLines: current ? [{ ...current, ...partial, unitPrice }] : draft.deviceLines,
    })
  }

  return (
    <div className="space-y-md">
      <PosSubscriptionRenewalSection
        customer={customer}
        devices={devicesQuery.data ?? []}
        devicesLoading={devicesQuery.isLoading}
        selectedDevice={draft.selectedCustomerDevice}
        manual={draft.renewalManualDevice}
        serialNumber={draft.renewalSerial}
        physicalSerial={draft.renewalPhysicalSerial}
        simNumber={draft.renewalSim}
        username={draft.renewalUsername}
        onSelectDevice={handleSelectDevice}
        onManual={() =>
          onPatch({
            selectedCustomerDevice: null,
            renewalManualDevice: true,
            sourceRenewalCandidate: null,
            deviceLines: [],
          })
        }
        onClear={() =>
          onPatch({
            selectedCustomerDevice: null,
            renewalManualDevice: false,
            renewalSerial: '',
            renewalPhysicalSerial: '',
            renewalSim: '',
            renewalUsername: '',
            sourceRenewalCandidate: null,
            deviceLines: [],
          })
        }
        onSerialChange={(value) => patchIdentity({ serialNumber: value })}
        onPhysicalSerialChange={(value) => patchIdentity({ physicalSerial: value })}
        onSimChange={(value) => patchIdentity({ simNumber: value })}
        onUsernameChange={(value) => patchIdentity({ username: value })}
        onRegister={(payload) => registerMutation.mutate(payload)}
        registering={registerMutation.isPending}
        registerError={registerError}
        submitAttempted={showErrors}
      />

      {line && draft.selectedCustomerDevice && !draft.renewalManualDevice ? (
        <DeviceLineCard
          index={0}
          line={line}
          contractDate={draft.contractDate}
          contractKind="subscription_renewal"
          product={productQuery.data}
          cashPrice={unitPrice}
          installmentPrice={unitPrice}
          onChange={(next) =>
            onPatch({
              deviceLines: [next],
              renewalSerial: next.serialNumber,
              renewalPhysicalSerial: next.physicalSerial ?? draft.renewalPhysicalSerial,
              renewalSim: next.simNumber,
              renewalUsername: next.username,
            })
          }
          minDownPercent={minDownPercent}
          maxInstallmentCount={maxInstallmentCount}
          employees={employeesQuery.data ?? []}
          employeesLoading={employeesQuery.isLoading}
          showErrors={showErrors}
          lockedFromSource
        />
      ) : (
        <p className="text-sm text-on-surface-variant">
          اختار جهاز العميل أو سجّل جهازًا غير موجود في السيستم لإكمال التجديد.
        </p>
      )}
    </div>
  )
}
