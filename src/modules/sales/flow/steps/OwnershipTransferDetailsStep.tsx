import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../../api/client'
import type { Employee, PaginatedResponse } from '../../../../api/types'
import {
  createDeviceLine,
  DeviceLineCard,
} from '../../../../components/pos/DeviceLineCard'
import { PosOwnershipTransferSection } from '../../../../components/pos/PosOwnershipTransferSection'
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
