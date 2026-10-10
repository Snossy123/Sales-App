import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../../api/client'
import type { Employee, PaginatedResponse, Service } from '../../../../api/types'
import type { ApiPaginated } from '../../../../lib/sales'
import {
  createDeviceLine,
  DeviceLineCard,
} from '../../../../components/pos/DeviceLineCard'
import { PosOwnershipTransferSection } from '../../../../components/pos/PosOwnershipTransferSection'
import { PosOwnershipTransferFeesSection } from '../../../../components/pos/PosOwnershipTransferFeesSection'
import {
  applyContractDeviceIdentity,
  identityFromCustomerDevice,
} from '../../../../components/services/CustomerContractDevicePicker'
import { useOrgSettingsStore } from '../../../../stores/orgSettingsStore'
import type { PosFlowDraft } from '../posFlowTypes'

interface OwnershipTransferDetailsStepProps {
  draft: PosFlowDraft
  onPatch: (partial: Partial<PosFlowDraft>) => void
  showErrors?: boolean
}

export function OwnershipTransferDetailsStep({
  draft,
  onPatch,
  showErrors = false,
}: OwnershipTransferDetailsStepProps) {
  const salesSettings = useOrgSettingsStore((s) => s.sales)
  const minDownPercent = salesSettings?.min_down_payment_percent ?? 10
  const maxInstallmentCount = salesSettings?.max_installment_months ?? 24

  const employeesQuery = useQuery({
    queryKey: ['employees', 'pos-flow-transfer'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', {
        params: { per_page: 100, 'filter[status]': 'active' },
      })
      return data.data
    },
  })

  useEffect(() => {
    if (draft.sourceTransferInvoice) {
      const sourceLine = draft.sourceTransferInvoice.lines?.find(
        (line) =>
          line.line_type === 'device' ||
          Boolean(line.serial_number || line.sim_number || line.product_unit_id),
      )
      onPatch({
        quantity: 1,
        deviceLines: [
          {
            ...createDeviceLine(0, undefined, {
              contractDate: draft.contractDate,
              minDownPercent,
            }),
            serialNumber: sourceLine?.serial_number ?? '',
            simNumber: sourceLine?.sim_number ?? '',
            username: sourceLine?.username || sourceLine?.serial_number || '',
            paymentTerm: 'cash',
            unitPrice: 0,
            downPayment: 0,
            vehicleType: sourceLine?.vehicle_type ?? '',
            vehiclePlateLetters: sourceLine?.vehicle_plate_letters ?? '',
            vehiclePlateNumbers: sourceLine?.vehicle_plate_numbers ?? '',
            chassisNumber: sourceLine?.chassis_number ?? '',
            engineNumber: sourceLine?.engine_number ?? '',
            renewalType: sourceLine?.renewal_type ?? 'annual',
          },
        ],
      })
      return
    }
    if (!draft.sourceTransferDevice) return
    const identity = identityFromCustomerDevice(draft.sourceTransferDevice)
    const existing =
      draft.deviceLines[0] ??
      createDeviceLine(0, undefined, { contractDate: draft.contractDate, minDownPercent })
    onPatch({
      quantity: 1,
      deviceLines: [
        {
          ...applyContractDeviceIdentity(existing, identity),
          paymentTerm: 'cash',
          unitPrice: 0,
          downPayment: 0,
        },
      ],
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.sourceTransferInvoice, draft.sourceTransferDevice, draft.contractDate])

  const servicesQuery = useQuery({
    queryKey: ['services', 'pos-transfer-fees'],
    queryFn: async () => {
      const { data } = await api.get<ApiPaginated<Service>>('/services', {
        params: { per_page: 100, 'filter[is_active]': '1' },
      })
      return data
    },
  })

  const allServices = servicesQuery.data?.data ?? []
  const ownershipTransferService = allServices.find(
    (s) =>
      s.category === 'ownership_transfer' ||
      s.code === 'SRV-OWN' ||
      (s.name_ar || s.name).includes('نقل ملكية'),
  )
  const uninstallService = allServices.find(
    (s) =>
      s.category === 'uninstall' ||
      s.code === 'SRV-FK' ||
      (s.name_ar || s.name).includes('فك'),
  )
  const installationService = allServices.find(
    (s) =>
      s.category === 'installation' ||
      s.code === 'SRV-TRK' ||
      (s.name_ar || s.name).includes('تركيب'),
  )

  const ownershipFee = Number(
    ownershipTransferService?.cash_price ?? ownershipTransferService?.default_price ?? 200,
  )
  const uninstallFee = Number(
    uninstallService?.cash_price ?? uninstallService?.default_price ?? 100,
  )
  const installationFee = Number(
    installationService?.cash_price ?? installationService?.default_price ?? 500,
  )

  // Persist resolved fee amounts into draft so flowTotals can compute correct totals
  useEffect(() => {
    onPatch({
      transferOwnershipFeeAmount: ownershipFee,
      transferUninstallFeeAmount: uninstallFee,
      transferInstallationFeeAmount: installationFee,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownershipFee, uninstallFee, installationFee])

  const line = draft.deviceLines[0]

  return (
    <div className="pos-form pos-flow-fields space-y-md">
      <PosOwnershipTransferSection
        selectedSourceInvoice={draft.sourceTransferInvoice}
        onSourceInvoiceChange={(sourceTransferInvoice) =>
          onPatch({ sourceTransferInvoice, sourceTransferDevice: null })
        }
        selectedSourceDevice={draft.sourceTransferDevice}
        onSourceDeviceChange={(sourceTransferDevice) =>
          onPatch({ sourceTransferDevice, sourceTransferInvoice: null })
        }
        submitAttempted={showErrors}
      />

      <PosOwnershipTransferFeesSection
        includeDisassemblyAndAssembly={Boolean(draft.transferIncludeDisassemblyAndAssembly)}
        onIncludeDisassemblyAndAssemblyChange={(val) =>
          onPatch({ transferIncludeDisassemblyAndAssembly: val })
        }
        paymentTerm={draft.transferPaymentTerm ?? 'cash'}
        onPaymentTermChange={(val) => onPatch({ transferPaymentTerm: val })}
        downPayment={draft.transferDownPayment ?? 0}
        onDownPaymentChange={(val) => onPatch({ transferDownPayment: val })}
        installmentCount={draft.transferInstallmentCount ?? 1}
        onInstallmentCountChange={(val) => onPatch({ transferInstallmentCount: val })}
        intervalType={draft.transferIntervalType ?? 'monthly'}
        onIntervalTypeChange={(val) => onPatch({ transferIntervalType: val })}
        firstDueDate={draft.transferFirstDueDate ?? draft.contractDate}
        onFirstDueDateChange={(val) => onPatch({ transferFirstDueDate: val })}
        ownershipFee={ownershipFee}
        uninstallFee={uninstallFee}
        installationFee={installationFee}
        ownershipServiceName={ownershipTransferService?.name_ar || ownershipTransferService?.name}
        uninstallServiceName={uninstallService?.name_ar || uninstallService?.name}
        installationServiceName={installationService?.name_ar || installationService?.name}
      />

      {line ? (
        <DeviceLineCard
          index={0}
          line={line}
          contractDate={draft.contractDate}
          contractKind="ownership_transfer"
          cashPrice={0}
          installmentPrice={0}
          onChange={(next) => onPatch({ deviceLines: [next] })}
          minDownPercent={minDownPercent}
          maxInstallmentCount={maxInstallmentCount}
          employees={employeesQuery.data ?? []}
          employeesLoading={employeesQuery.isLoading}
          showErrors={showErrors}
          hidePaymentSection
          embedded
        />
      ) : null}
    </div>
  )
}
