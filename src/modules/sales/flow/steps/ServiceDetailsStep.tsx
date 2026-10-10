import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api, getErrorMessage } from '../../../../api/client'
import type {
  CustomerContractDevice,
  Employee,
  PaginatedResponse,
  Service,
} from '../../../../api/types'
import { Icon } from '../../../../components/Icon'
import { SearchableSelect } from '../../../../components/SearchableSelect'
import {
  CustomerContractDevicePicker,
  identityFromCustomerDevice,
  type RegisterCustomerDevicePayload,
} from '../../../../components/services/CustomerContractDevicePicker'
import {
  createServiceLine,
  ServiceLineCard,
  validateServiceLineCash,
  validateServiceLineInstallment,
} from '../../../../components/services/ServiceLineCard'
import {
  ServicePaymentSection,
  validateServicePayment,
} from '../../../../components/services/ServicePaymentSection'
import { catalogTermPrice } from '../../../../lib/gpsProductPricing'
import type { ApiPaginated } from '../../../../lib/sales'
import {
  COMBINER_FEE_CHIPS,
  findCombinerService,
  newFeeLineKey,
  type CombinerFeeChipId,
} from '../../../../lib/serviceCombiner'
import { useOrgSettingsStore } from '../../../../stores/orgSettingsStore'
import type { PosFlowDraft } from '../posFlowTypes'

const CHIP_ICONS: Record<CombinerFeeChipId, string> = {
  uninstall: 'handyman',
  installation: 'home_repair_service',
  programming: 'memory',
  software: 'tune',
  site_transfer: 'swap_horiz',
}

interface ServiceDetailsStepProps {
  draft: PosFlowDraft
  onPatch: (partial: Partial<PosFlowDraft>) => void
  showErrors?: boolean
  requireService?: boolean
}

export function ServiceDetailsStep({
  draft,
  onPatch,
  showErrors = false,
  requireService = true,
}: ServiceDetailsStepProps) {
  const queryClient = useQueryClient()
  const customer = draft.selectedCustomer
  const salesSettings = useOrgSettingsStore((s) => s.sales)
  const minDownPercent = salesSettings?.min_down_payment_percent ?? 10
  const maxInstallmentCount = salesSettings?.max_installment_months ?? 24
  const [registerOrigin, setRegisterOrigin] = useState<'legacy' | 'external'>('legacy')
  const [manualDevice, setManualDevice] = useState(false)
  const [serial, setSerial] = useState('')
  const [sim, setSim] = useState('')
  const [username, setUsername] = useState('')
  const [technicianSearch, setTechnicianSearch] = useState('')

  const servicesQuery = useQuery({
    queryKey: ['services', 'pos-flow'],
    queryFn: async () => {
      const { data } = await api.get<ApiPaginated<Service>>('/services', {
        params: { per_page: 100, 'filter[is_active]': '1' },
      })
      return data.data ?? []
    },
  })

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

  const employeesQuery = useQuery({
    queryKey: ['employees', 'pos-flow-services'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', {
        params: { per_page: 100, 'filter[status]': 'active' },
      })
      return data.data ?? []
    },
  })

  const registerMutation = useMutation({
    mutationFn: async (payload: RegisterCustomerDevicePayload) => {
      const { data } = await api.post<{ data: CustomerContractDevice }>(
        `/customers/${customer!.id}/devices`,
        payload,
      )
      return data.data
    },
    onSuccess: (device) => {
      queryClient.invalidateQueries({ queryKey: ['customers', customer?.id, 'devices'] })
      selectDevice(device)
    },
  })

  const selectDevice = (device: CustomerContractDevice) => {
    const identity = identityFromCustomerDevice(device)
    setManualDevice(false)
    setSerial(identity.serialNumber)
    setSim(identity.simNumber)
    setUsername(identity.username)
    onPatch({
      selectedCustomerDevice: device,
      feeLines: draft.feeLines.map((item) =>
        item.productUnitId ? item : { ...item, productUnitId: identity.productUnitId },
      ),
    })
  }

  const toggleChip = (chipId: CombinerFeeChipId) => {
    const existing = draft.feeLines.find((item) => item.chipId === chipId)
    if (existing) {
      onPatch({ feeLines: draft.feeLines.filter((item) => item.chipId !== chipId) })
      return
    }
    const chip = COMBINER_FEE_CHIPS.find((item) => item.id === chipId)
    if (!chip) return
    const service = findCombinerService(servicesQuery.data ?? [], chip)
    if (!service) return
    const term = draft.contractPayment.paymentTerm
    const line = createServiceLine(
      {
        service_id: service.id,
        description: service.name_ar || service.name,
        unit_price: catalogTermPrice(
          Number(service.cash_price ?? service.default_price),
          Number(service.installment_price ?? service.default_price),
          term,
        ),
        cashPrice: Number(service.cash_price ?? service.default_price),
        installmentPrice: Number(service.installment_price ?? service.default_price),
      },
      { contractDate: draft.contractDate, minDownPercent, paymentTerm: term },
    )
    onPatch({
      feeLines: [
        ...draft.feeLines,
        {
          key: newFeeLineKey(),
          chipId,
          line,
          productUnitId:
            draft.selectedCustomerDevice?.product_unit_id ?? undefined,
        },
      ],
    })
  }

  const total = draft.feeLines.reduce((sum, item) => sum + Number(item.line.unit_price), 0)
  const paymentErrors = validateServicePayment(
    draft.contractPayment,
    total,
    minDownPercent,
    maxInstallmentCount,
  )
  const technicians = (employeesQuery.data ?? []).filter((employee) => {
    const q = technicianSearch.trim().toLowerCase()
    if (!q) return true
    return employee.name.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-md">
      {customer ? (
        <CustomerContractDevicePicker
          devices={devicesQuery.data ?? []}
          loading={devicesQuery.isLoading}
          selectedDevice={draft.selectedCustomerDevice}
          manual={manualDevice}
          serialNumber={serial}
          simNumber={sim}
          username={username}
          onSelectDevice={selectDevice}
          onManual={() => {
            setManualDevice(true)
            onPatch({ selectedCustomerDevice: null })
          }}
          onClear={() => {
            setManualDevice(false)
            setSerial('')
            setSim('')
            setUsername('')
            onPatch({ selectedCustomerDevice: null })
          }}
          onSerialChange={setSerial}
          onSimChange={setSim}
          onUsernameChange={setUsername}
          showIdentityFields
          identityLocked={Boolean(draft.selectedCustomerDevice) && !manualDevice}
          showErrors={showErrors && (requireService || draft.feeLines.length > 0)}
          registerOrigin={registerOrigin}
          onRegisterOriginChange={setRegisterOrigin}
          onRegister={(payload) => registerMutation.mutate(payload)}
          registering={registerMutation.isPending}
          registerError={registerMutation.isError ? getErrorMessage(registerMutation.error) : null}
        />
      ) : null}

      <div>
        <p className="mb-sm text-sm font-bold text-on-surface">اختر الخدمة</p>
        <div className="grid grid-cols-2 gap-sm sm:grid-cols-4">
          {COMBINER_FEE_CHIPS.map((chip) => {
            const active = draft.feeLines.some((item) => item.chipId === chip.id)
            const service = findCombinerService(servicesQuery.data ?? [], chip)
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => toggleChip(chip.id)}
                className={`flex min-h-16 flex-col items-center justify-center gap-xs rounded-xl border px-sm py-sm text-center text-sm font-bold ${
                  active
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-outline-variant bg-surface-container-lowest hover:border-primary/40'
                }`}
              >
                <Icon name={CHIP_ICONS[chip.id]} size={22} filled={active} />
                {chip.label}
                {!service && servicesQuery.isSuccess ? (
                  <span className="text-[11px] font-normal opacity-80">غير متاحة</span>
                ) : null}
              </button>
            )
          })}
        </div>
        {showErrors && requireService && draft.feeLines.length === 0 ? (
          <p className="mt-sm text-sm text-error">اختر خدمة واحدة على الأقل</p>
        ) : null}
      </div>

      {draft.feeLines.map((item, index) => (
        <ServiceLineCard
          key={item.key}
          line={item.line}
          index={index}
          heading={COMBINER_FEE_CHIPS.find((chip) => chip.id === item.chipId)?.label}
          contractDate={draft.contractDate}
          minDownPercent={minDownPercent}
          maxInstallmentCount={maxInstallmentCount}
          onChange={(line) =>
            onPatch({
              feeLines: draft.feeLines.map((entry) =>
                entry.key === item.key ? { ...entry, line } : entry,
              ),
            })
          }
          onRemove={() =>
            onPatch({ feeLines: draft.feeLines.filter((entry) => entry.key !== item.key) })
          }
          showErrors={showErrors}
          showPayment={false}
          devices={devicesQuery.data}
          productUnitId={item.productUnitId}
          onSelectDevice={(device) =>
            onPatch({
              feeLines: draft.feeLines.map((entry) =>
                entry.key === item.key
                  ? { ...entry, productUnitId: device?.product_unit_id ?? undefined }
                  : entry,
              ),
            })
          }
        />
      ))}

      {draft.feeLines.length > 0 ? (
        <>
          <SearchableSelect
            label="الفني"
            options={technicians}
            value={draft.feeTechnician}
            onChange={(feeTechnician) => onPatch({ feeTechnician })}
            onSearchChange={setTechnicianSearch}
            getOptionValue={(employee) => employee.id}
            getOptionLabel={(employee) =>
              `${employee.name}${employee.job_title ? ` — ${employee.job_title}` : ''}`
            }
            placeholder="ابحث باسم الفني..."
            loading={employeesQuery.isLoading}
            emptyMessage="لا يوجد فني مطابق"
            hasError={showErrors && !draft.feeTechnician}
          />
          <ServicePaymentSection
            total={total}
            payment={draft.contractPayment}
            onChange={(partial) =>
              onPatch({ contractPayment: { ...draft.contractPayment, ...partial } })
            }
            minDownPercent={minDownPercent}
            maxInstallmentCount={maxInstallmentCount}
          />
          {showErrors && !paymentErrors.valid
            ? paymentErrors.errors.map((error) => (
                <p key={error} className="text-sm text-error">
                  {error}
                </p>
              ))
            : null}
          {showErrors &&
          draft.feeLines.some(
            (item) =>
              !validateServiceLineCash(item.line).valid ||
              !validateServiceLineInstallment(item.line, minDownPercent, maxInstallmentCount).valid,
          ) ? (
            <p className="text-sm text-error">راجع بيانات الخدمات</p>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
