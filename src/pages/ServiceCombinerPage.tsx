import { useMemo, useState, useEffect, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type {
  Branch,
  CheckoutPayload,
  Customer,
  Distributor,
  Employee,
  GpsProduct,
  PaginatedResponse,
  SalesInvoice,
  SalesRep,
  Service,
  CustomerContractDevice,
} from '../api/types'
import { computeInstallmentCount, distributorLabel, type ApiPaginated, serviceContractPrintPath } from '../lib/sales'
import { resolveCustomerTransactionSource } from '../lib/posCustomerSource'
import { linePaidNow } from '../lib/cashSchedule'
import { resolveGpsUnitPrice } from '../lib/gpsProductPricing'
import {
  COMBINER_CHIPS,
  COMBINER_FEE_CHIPS,
  deriveCombinerContractKind,
  findCombinerService,
  type CombinerChipId,
} from '../lib/serviceCombiner'
import { Icon } from '../components/Icon'
import { MyContractsButton } from '../components/contracts/MyContractsButton'
import { CustomerCreateModal } from '../components/customers/CustomerCreateModal'
import { PosContractTypeTabs } from '../components/pos/PosContractTypeTabs'
import { PosSectionCard } from '../components/pos/PosSectionCard'
import { SalesPageShell } from '../components/SalesPageShell'
import {
  ServiceContractHeader,
  type TransactionSource,
} from '../components/services/ServiceContractHeader'
import {
  createServiceLine,
  lineInstallmentCount as serviceLineInstallmentCount,
  linePaidNow as serviceLinePaidNow,
  lineTotal as serviceLineTotal,
  ServiceLineCard,
  validateServiceLineCash,
  validateServiceLineInstallment,
  type ServiceLineDraft,
} from '../components/services/ServiceLineCard'
import {
  createDeviceLine,
  lineInstallmentCount as deviceLineInstallmentCount,
  lineNetTotal,
  validateDeviceLine,
  DeviceLineCard,
  type DeviceLineDraft,
} from '../components/pos/DeviceLineCard'
import {
  applyContractDeviceIdentity,
  CustomerContractDevicePicker,
  identityFromCustomerDevice,
  type RegisterCustomerDevicePayload,
} from '../components/services/CustomerContractDevicePicker'
import { SearchableSelect } from '../components/SearchableSelect'
import {
  createDefaultServicePayment,
  ServicePaymentSection,
  validateServicePayment,
  type ServicePaymentState,
} from '../components/services/ServicePaymentSection'
import { posRequiredWrap, posSourceToggle } from '../components/pos/posFormStyles'
import { useProcedureDraft } from '../hooks/useProcedureDraft'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useAuthStore } from '../stores/authStore'
import { useOrgSettingsStore } from '../stores/orgSettingsStore'
import { isServiceContractDraftMeaningful } from '../lib/procedureDrafts'
import { PROCEDURE_DRAFT_IDS, useProcedureDraftStore } from '../stores/procedureDraftStore'
import {
  readServiceDraft,
  type ServiceContractDraft,
} from '../stores/salesDraftStore'
import { NumericInput } from '../components/ui/NumericInput'
import { UninstallDeviceHandoverModal } from '../components/UninstallDeviceHandoverModal'


const CHIP_ICONS: Record<CombinerChipId, string> = {
  annual_renewal: 'event_repeat',
  external_device: 'devices_other',
  uninstall: 'handyman',
  installation: 'home_repair_service',
  programming: 'memory',
  software: 'tune',
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function deviceCheckoutLine(
  line: DeviceLineDraft,
  kind: 'subscription_renewal' | 'external_device',
  contractDate: string,
  maxInstallmentCount: number,
  collectionScope: 'contract' | 'service' = 'service',
): CheckoutPayload['lines'][number] {
  const renewalDate = line.renewalType === 'annual' ? addDays(contractDate, 365) : undefined
  const base = {
    line_type: 'device' as const,
    line_contract_kind: kind,
    description: kind === 'subscription_renewal' ? 'تجديد اشتراك سنوي' : 'جهاز خارج الشركة',
    unit_price: line.unitPrice,
    discount: line.discountAmount,
    product_unit_id: line.productUnitId,
    serial_number: line.serialNumber.trim() || undefined,
    sim_number: line.simNumber.trim() || undefined,
    username: line.username.trim() || undefined,
    payment_term: line.paymentTerm,
    cash_schedule: line.paymentTerm === 'cash' ? line.cashSchedule : undefined,
    technician_id: line.technician?.id,
    vehicle_type: line.vehicleType || undefined,
    vehicle_plate_letters: line.vehiclePlateLetters.trim() || undefined,
    vehicle_plate_numbers: line.vehiclePlateNumbers.trim() || undefined,
    chassis_number: line.chassisNumber.trim() || undefined,
    engine_number: line.engineNumber.trim() || undefined,
    renewal_type: 'annual' as const,
    subscription_renewal_date: renewalDate,
  }

  if (collectionScope === 'contract') {
    return base
  }

  if (line.paymentTerm === 'installment') {
    return {
      ...base,
      installment_plan: {
        installment_count: deviceLineInstallmentCount(line, maxInstallmentCount),
        installment_amount: line.installmentAmount,
        down_payment: line.downPayment,
        interval_type: line.intervalType,
        interval_days: line.intervalType === 'weekly' ? 7 : 30,
        first_due_date: line.firstDueDate,
      },
    }
  }

  return {
    ...base,
    down_payment: line.downPayment > 0 ? line.downPayment : undefined,
  }
}

export function ServiceCombinerPage() {
  const queryClient = useQueryClient()
  const contextBranchId = useAuthStore((s) => s.branchId)
  const salesSettings = useOrgSettingsStore((s) => s.sales)
  const minDownPercent = salesSettings?.min_down_payment_percent ?? 10
  const maxInstallmentCount = salesSettings?.max_installment_months ?? 24

  const draftUserId = useAuthStore((s) => s.user?.id ?? null)
  const serviceDraft = readServiceDraft(draftUserId)

  const [selectedChips, setSelectedChips] = useState<Set<CombinerChipId>>(
    () => new Set(serviceDraft?.selectedChips ?? []),
  )
  const [transactionSource, setTransactionSource] = useState<TransactionSource>(
    () => serviceDraft?.transactionSource ?? 'branch',
  )
  const [branchSearch, setBranchSearch] = useState(() => serviceDraft?.branchSearch ?? '')
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(
    () => serviceDraft?.selectedBranch ?? null,
  )
  const [distributorSearch, setDistributorSearch] = useState(() => serviceDraft?.distributorSearch ?? '')
  const [selectedDistributor, setSelectedDistributor] = useState<Distributor | null>(
    () => serviceDraft?.selectedDistributor ?? null,
  )
  const [salesRepSearch, setSalesRepSearch] = useState(() => serviceDraft?.salesRepSearch ?? '')
  const [selectedSalesRep, setSelectedSalesRep] = useState<SalesRep | null>(
    () => serviceDraft?.selectedSalesRep ?? null,
  )
  const [customerSearch, setCustomerSearch] = useState(() => serviceDraft?.customerSearch ?? '')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    () => serviceDraft?.selectedCustomer ?? null,
  )
  const [contractDate, setContractDate] = useState(
    () => serviceDraft?.contractDate ?? new Date().toISOString().split('T')[0],
  )
  const [notes, setNotes] = useState(() => serviceDraft?.notes ?? '')
  const [selectedCustomerDevice, setSelectedCustomerDevice] =
    useState<CustomerContractDevice | null>(() => serviceDraft?.selectedCustomerDevice ?? null)
  const [manualDeviceEntry, setManualDeviceEntry] = useState(
    () => serviceDraft?.manualDeviceEntry ?? false,
  )
  const [registerOrigin, setRegisterOrigin] = useState<'legacy' | 'external'>('legacy')
  const [contractSerial, setContractSerial] = useState(() => serviceDraft?.contractSerial ?? '')
  const [contractSim, setContractSim] = useState(() => serviceDraft?.contractSim ?? '')
  const [contractUsername, setContractUsername] = useState(() => serviceDraft?.contractUsername ?? '')
  const [renewalLine, setRenewalLine] = useState<DeviceLineDraft | null>(
    () => serviceDraft?.renewalLine ?? null,
  )
  const [externalLine, setExternalLine] = useState<DeviceLineDraft | null>(
    () => serviceDraft?.externalLine ?? null,
  )
  const [feeLines, setFeeLines] = useState<Record<string, ServiceLineDraft>>(
    () => serviceDraft?.feeLines ?? {},
  )
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [lastInvoice, setLastInvoice] = useState<SalesInvoice | null>(null)
  const [uninstallInvoice, setUninstallInvoice] = useState<SalesInvoice | null>(null)
  const [lastInstallmentSale, setLastInstallmentSale] = useState(false)
  const [distributorBalanceAmount, setDistributorBalanceAmount] = useState(
    () => serviceDraft?.distributorBalanceAmount ?? 0,
  )
  const [collectionScope, setCollectionScope] = useState<'contract' | 'service'>(
    () => serviceDraft?.collectionScope ?? 'contract',
  )
  const [contractPayment, setContractPayment] = useState<ServicePaymentState>(
    () => serviceDraft?.contractPayment ?? createDefaultServicePayment(0, minDownPercent),
  )
  const [feeTechnician, setFeeTechnician] = useState<Employee | null>(
    () => serviceDraft?.feeTechnician ?? null,
  )
  const [technicianSearch, setTechnicianSearch] = useState(() => serviceDraft?.technicianSearch ?? '')
  const [addCustomerOpen, setAddCustomerOpen] = useState(false)

  const serviceDraftSnapshot = useMemo<ServiceContractDraft>(
    () => ({
      selectedChips: Array.from(selectedChips),
      transactionSource,
      branchSearch,
      selectedBranch,
      distributorSearch,
      selectedDistributor,
      salesRepSearch,
      selectedSalesRep,
      customerSearch,
      selectedCustomer,
      contractDate,
      notes,
      selectedCustomerDevice,
      manualDeviceEntry,
      contractSerial,
      contractSim,
      contractUsername,
      renewalLine,
      externalLine,
      feeLines,
      distributorBalanceAmount,
      collectionScope,
      contractPayment,
      feeTechnician,
      technicianSearch,
    }),
    [
      selectedChips,
      transactionSource,
      branchSearch,
      selectedBranch,
      distributorSearch,
      selectedDistributor,
      salesRepSearch,
      selectedSalesRep,
      customerSearch,
      selectedCustomer,
      contractDate,
      notes,
      selectedCustomerDevice,
      manualDeviceEntry,
      contractSerial,
      contractSim,
      contractUsername,
      renewalLine,
      externalLine,
      feeLines,
      distributorBalanceAmount,
      collectionScope,
      contractPayment,
      feeTechnician,
      technicianSearch,
    ],
  )

  useProcedureDraft({
    id: PROCEDURE_DRAFT_IDS.posService,
    userId: draftUserId,
    titleAr: 'تعاقد خدمات',
    resumePath: '/pos/services',
    snapshot: serviceDraftSnapshot,
    isMeaningful: isServiceContractDraftMeaningful(serviceDraftSnapshot),
  })

  const resetServiceForm = () => {
    setSelectedChips(new Set())
    setTransactionSource('branch')
    setBranchSearch('')
    setSelectedBranch(null)
    setDistributorSearch('')
    setSelectedDistributor(null)
    setSalesRepSearch('')
    setSelectedSalesRep(null)
    setCustomerSearch('')
    setSelectedCustomer(null)
    setContractDate(new Date().toISOString().split('T')[0])
    setNotes('')
    setSelectedCustomerDevice(null)
    setManualDeviceEntry(false)
    setContractSerial('')
    setContractSim('')
    setContractUsername('')
    setRenewalLine(null)
    setExternalLine(null)
    setFeeLines({})
    setSubmitAttempted(false)
    setSuccessMsg('')
    setLastInvoice(null)
    setUninstallInvoice(null)
    setLastInstallmentSale(false)
    setDistributorBalanceAmount(0)
    setCollectionScope('contract')
    setContractPayment(createDefaultServicePayment(0, minDownPercent))
    setFeeTechnician(null)
    setTechnicianSearch('')
    useProcedureDraftStore.getState().clearDraft(PROCEDURE_DRAFT_IDS.posService, draftUserId)
  }

  const debouncedDistributorSearch = useDebouncedValue(distributorSearch, 300)
  const debouncedCustomerSearch = useDebouncedValue(customerSearch, 300)
  const debouncedSalesRepSearch = useDebouncedValue(salesRepSearch, 300)

  const resolvedBranchId =
    transactionSource === 'branch'
      ? (selectedBranch?.id ?? contextBranchId ?? '')
      : transactionSource === 'distributor'
        ? (selectedDistributor?.branch_id ?? '')
        : (selectedSalesRep?.branch_id ?? contextBranchId ?? '')

  const resetContractDevice = () => {
    setSelectedCustomerDevice(null)
    setManualDeviceEntry(false)
    setContractSerial('')
    setContractSim('')
    setContractUsername('')
  }

  const handleCustomerChange = (customer: Customer | null) => {
    setSelectedCustomer(customer)
    setDistributorBalanceAmount(0)
    resetContractDevice()

    if (!customer) {
      setSelectedBranch(null)
      setSelectedDistributor(null)
      setSelectedSalesRep(null)
      setBranchSearch('')
      setDistributorSearch('')
      setSalesRepSearch('')
      setTransactionSource('distributor')
      return
    }

    const applyResolved = (resolvedCustomer: Customer) => {
      const resolved = resolveCustomerTransactionSource(resolvedCustomer)
      setTransactionSource(resolved.source)
      setSelectedBranch(resolved.branch)
      setSelectedDistributor(resolved.distributor)
      setSelectedSalesRep(resolved.salesRep)
      setBranchSearch(resolved.branchSearch)
      setDistributorSearch(resolved.distributorSearch)
      setSalesRepSearch(resolved.salesRepSearch)
    }

    const needsDetail =
      (customer.sales_user_id && !customer.sales_user) ||
      (customer.distributor_id && !customer.distributor) ||
      (customer.branch_id && !customer.branch)

    if (needsDetail) {
      api
        .get<Customer>(`/customers/${customer.id}`, {
          params: { include: 'salesUser,branch,distributor' },
        })
        .then(({ data }) => {
          setSelectedCustomer(data)
          applyResolved(data)
        })
        .catch(() => applyResolved(customer))
      return
    }

    applyResolved(customer)
  }

  const handleTransactionSourceChange = (source: TransactionSource) => {
    setTransactionSource(source)
    setSelectedBranch(null)
    setSelectedDistributor(null)
    setSelectedSalesRep(null)
    setBranchSearch('')
    setDistributorSearch('')
    setSalesRepSearch('')
  }

  const branchesQuery = useQuery({
    queryKey: ['branches', 'service-combiner'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', {
        params: { per_page: 100, 'filter[is_active]': 1 },
      })
      return data.data
    },
  })

  const filteredBranches = useMemo(() => {
    const q = branchSearch.trim().toLowerCase()
    const branches = branchesQuery.data ?? []
    if (!q) return branches
    return branches.filter((b) => {
      const name = (b.name_ar || b.name || '').toLowerCase()
      const code = (b.code || '').toLowerCase()
      return name.includes(q) || code.includes(q)
    })
  }, [branchesQuery.data, branchSearch])

  const distributorsQuery = useQuery({
    queryKey: ['distributors', 'service-combiner', debouncedDistributorSearch],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 50,
        'filter[status]': 'active',
      }
      const q = debouncedDistributorSearch.trim()
      if (q) {
        if (/^\d+$/.test(q)) params['filter[code]'] = q
        else params['filter[name]'] = q
      }
      const { data } = await api.get<PaginatedResponse<Distributor>>('/distributors', { params })
      return data.data
    },
    enabled: transactionSource === 'distributor',
  })

  const customersQuery = useQuery({
    queryKey: ['customers', 'service-combiner', debouncedCustomerSearch],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 50,
        'filter[status]': 'active',
        include: 'salesUser,branch,distributor',
      }
      const q = debouncedCustomerSearch.trim()
      if (q) {
        if (/^01\d{8,9}$/.test(q.replace(/\s/g, ''))) {
          params['filter[phone]'] = q.replace(/\s/g, '')
        } else {
          params['filter[name]'] = q
        }
      }
      const { data } = await api.get<PaginatedResponse<Customer>>('/customers', { params })
      return data.data
    },
  })

  const customerDevicesQuery = useQuery({
    queryKey: ['customers', selectedCustomer?.id, 'devices'],
    queryFn: async () => {
      const { data } = await api.get<{ data: CustomerContractDevice[] }>(
        `/customers/${selectedCustomer!.id}/devices`,
      )
      return data.data ?? []
    },
    enabled: Boolean(selectedCustomer?.id),
  })

  const salesRepsQuery = useQuery({
    queryKey: ['sales-reps', 'service-combiner', debouncedSalesRepSearch],
    queryFn: async () => {
      const params: Record<string, string> = {}
      const q = debouncedSalesRepSearch.trim()
      if (q) params.search = q
      const { data } = await api.get<{ data: SalesRep[] }>('/sales-reps', { params })
      return data.data
    },
    enabled: transactionSource === 'sales',
  })

  const servicesQuery = useQuery({
    queryKey: ['services', 'service-combiner'],
    queryFn: async () => {
      const { data } = await api.get<ApiPaginated<Service>>('/services', {
        params: { per_page: 100, 'filter[is_active]': '1' },
      })
      return data
    },
  })

  const productQuery = useQuery({
    queryKey: ['gps-product'],
    queryFn: async () => {
      const { data } = await api.get<GpsProduct>('/gps-product')
      return data
    },
  })

  const employeesQuery = useQuery({
    queryKey: ['employees', 'service-combiner'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', {
        params: { per_page: 100, 'filter[status]': 'active' },
      })
      return data.data
    },
  })

  const catalogServices = servicesQuery.data?.data ?? []
  const product = productQuery.data
  const hasFeeChips = COMBINER_FEE_CHIPS.some((chip) => selectedChips.has(chip.id))
  const filteredTechnicians = useMemo(() => {
    const employees = employeesQuery.data ?? []
    const q = technicianSearch.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((employee) => employee.name.toLowerCase().includes(q))
  }, [employeesQuery.data, technicianSearch])
  const annualRenewalPrice = Number(product?.annual_renewal_price ?? 0)
  const externalCashPrice = Number(
    product?.external_cash_annual_price ?? product?.cash_annual_price ?? product?.sell_price ?? 0,
  )
  const externalInstallmentPrice = Number(
    product?.external_installment_annual_price ??
      product?.installment_annual_price ??
      product?.installment_price ??
      externalCashPrice,
  )

  useEffect(() => {
    setFeeLines((prev) => {
      let changed = false
      const next = { ...prev }
      for (const chip of COMBINER_FEE_CHIPS) {
        if (!selectedChips.has(chip.id) || next[chip.id]) continue
        const service = findCombinerService(catalogServices, chip)
        if (!service) continue
        next[chip.id] = createServiceLine(
          {
            service_id: service.id,
            description: service.name_ar || service.name,
            unit_price: Number(service.cash_price ?? service.default_price),
            cashPrice: Number(service.cash_price ?? service.default_price),
            installmentPrice: Number(service.installment_price ?? service.default_price),
          },
          { contractDate, minDownPercent },
        )
        changed = true
      }
      return changed ? next : prev
    })
  }, [catalogServices, selectedChips, contractDate, minDownPercent])

  const customerDevices = customerDevicesQuery.data ?? []
  const hasDeviceChip =
    selectedChips.has('annual_renewal') || selectedChips.has('external_device')
  const showDeviceIdentityFields = true
  const listedDeviceSelected =
    Boolean(selectedCustomerDevice?.product_unit_id) && !manualDeviceEntry

  const currentDeviceIdentity = () =>
    selectedCustomerDevice && !manualDeviceEntry
      ? identityFromCustomerDevice(selectedCustomerDevice)
      : {
          productUnitId: undefined,
          serialNumber: contractSerial,
          simNumber: contractSim,
          username: contractUsername,
        }

  const applyIdentityToDeviceLines = (
    identity: Parameters<typeof applyContractDeviceIdentity>[1],
  ) => {
    setRenewalLine((line) => (line ? applyContractDeviceIdentity(line, identity) : line))
    setExternalLine((line) => (line ? applyContractDeviceIdentity(line, identity) : line))
  }

  const handleSelectCustomerDevice = (device: CustomerContractDevice) => {
    const identity = identityFromCustomerDevice(device)
    setSelectedCustomerDevice(device)
    setManualDeviceEntry(false)
    setContractSerial(identity.serialNumber)
    setContractSim(identity.simNumber)
    setContractUsername(identity.username)
    applyIdentityToDeviceLines(identity)
  }

  const handleManualDevice = () => {
    setSelectedCustomerDevice(null)
    setManualDeviceEntry(true)
    applyIdentityToDeviceLines({
      productUnitId: undefined,
      serialNumber: contractSerial,
      simNumber: contractSim,
      username: contractUsername,
    })
  }

  const registerDeviceMutation = useMutation({
    mutationFn: async (payload: RegisterCustomerDevicePayload) => {
      if (!selectedCustomer) throw new Error('العميل مطلوب')
      const { data } = await api.post<{ data: CustomerContractDevice }>(
        `/customers/${selectedCustomer.id}/devices`,
        payload,
      )
      return data.data
    },
    onSuccess: (device) => {
      queryClient.invalidateQueries({ queryKey: ['customers', selectedCustomer?.id, 'devices'] })
      handleSelectCustomerDevice(device)
    },
  })

  const currentIdentityPatch = (patch: {
    serialNumber?: string
    simNumber?: string
    username?: string
  }) => ({
    productUnitId:
      selectedCustomerDevice && !manualDeviceEntry
        ? selectedCustomerDevice.product_unit_id ?? undefined
        : undefined,
    serialNumber: patch.serialNumber ?? contractSerial,
    simNumber: patch.simNumber ?? contractSim,
    username: patch.username ?? contractUsername,
  })

  const handleContractSerialChange = (value: string) => {
    setContractSerial(value)
    applyIdentityToDeviceLines(currentIdentityPatch({ serialNumber: value }))
  }

  const handleContractSimChange = (value: string) => {
    setContractSim(value)
    applyIdentityToDeviceLines(currentIdentityPatch({ simNumber: value }))
  }

  const handleContractUsernameChange = (value: string) => {
    setContractUsername(value)
    applyIdentityToDeviceLines(currentIdentityPatch({ username: value }))
  }

  useEffect(() => {
    if (!selectedCustomer?.id || !customerDevicesQuery.isSuccess) return
    if (customerDevicesQuery.data.length === 0) {
      setSelectedCustomerDevice(null)
    }
  }, [selectedCustomer?.id, customerDevicesQuery.isSuccess, customerDevicesQuery.data])

  const toggleChip = (id: CombinerChipId) => {
    setSelectedChips((prev) => {
      const next = new Set(prev)
      const enabling = !next.has(id)
      if (enabling) next.add(id)
      else next.delete(id)

      if (id === 'annual_renewal') {
        if (enabling) {
          const price = product
            ? resolveGpsUnitPrice(product, {
                contractKind: 'subscription_renewal',
                paymentTerm: 'cash',
                renewalType: 'annual',
              })
            : annualRenewalPrice
          setRenewalLine(
            applyContractDeviceIdentity(
              createDeviceLine(price, undefined, { contractDate, minDownPercent }),
              currentDeviceIdentity(),
            ),
          )
        } else {
          setRenewalLine(null)
        }
      }

      if (id === 'external_device') {
        if (enabling) {
          const price = product
            ? resolveGpsUnitPrice(product, {
                contractKind: 'external_device',
                paymentTerm: 'cash',
                renewalType: 'annual',
              })
            : externalCashPrice
          setExternalLine(
            applyContractDeviceIdentity(
              createDeviceLine(price, undefined, { contractDate, minDownPercent }),
              currentDeviceIdentity(),
            ),
          )
        } else {
          setExternalLine(null)
        }
      }

      const feeChip = COMBINER_FEE_CHIPS.find((chip) => chip.id === id)
      if (feeChip) {
        if (enabling) {
          const service = findCombinerService(catalogServices, feeChip)
          if (service) {
            setFeeLines((lines) => ({
              ...lines,
              [feeChip.id]: createServiceLine(
                {
                  service_id: service.id,
                  description: service.name_ar || service.name,
                  unit_price: Number(service.cash_price ?? service.default_price),
                  cashPrice: Number(service.cash_price ?? service.default_price),
                  installmentPrice: Number(service.installment_price ?? service.default_price),
                },
                { contractDate, minDownPercent },
              ),
            }))
          }
        } else {
          setFeeLines((lines) => {
            const { [feeChip.id]: _, ...rest } = lines
            return rest
          })
        }
      }

      return next
    })
  }

  const activeFeeLines = COMBINER_FEE_CHIPS.filter((chip) => selectedChips.has(chip.id)).map(
    (chip) => feeLines[chip.id],
  ).filter(Boolean)

  const devicesSubtotal =
    (renewalLine && selectedChips.has('annual_renewal') ? lineNetTotal(renewalLine) : 0) +
    (externalLine && selectedChips.has('external_device') ? lineNetTotal(externalLine) : 0)
  const feesSubtotal = activeFeeLines.reduce((sum, line) => sum + serviceLineTotal(line), 0)
  const total = devicesSubtotal + feesSubtotal

  const paidNow =
    collectionScope === 'contract'
      ? contractPayment.paymentTerm === 'cash'
        ? total
        : Math.min(total, Math.max(0, contractPayment.downPayment))
      : (renewalLine && selectedChips.has('annual_renewal')
          ? linePaidNow(
              renewalLine.paymentTerm,
              renewalLine.cashSchedule,
              lineNetTotal(renewalLine),
              renewalLine.downPayment,
            )
          : 0) +
        (externalLine && selectedChips.has('external_device')
          ? linePaidNow(
              externalLine.paymentTerm,
              externalLine.cashSchedule,
              lineNetTotal(externalLine),
              externalLine.downPayment,
            )
          : 0) +
        activeFeeLines.reduce((sum, line) => sum + serviceLinePaidNow(line), 0)

  const balanceDue = Math.max(0, total - paidNow)

  const customerDistributorQuery = useQuery({
    queryKey: ['customer', selectedCustomer?.id, 'distributor-profile-combiner'],
    queryFn: async () => {
      const { data } = await api.get<Customer>(`/customers/${selectedCustomer!.id}`, {
        params: { include: 'distributorProfile' },
      })
      return data.distributor_profile ?? null
    },
    enabled: Boolean(selectedCustomer?.id),
  })

  const customerDistributorProfile =
    selectedCustomer?.distributor_profile ?? customerDistributorQuery.data ?? null
  const distributorBalanceAvailable = Number(customerDistributorProfile?.commission_balance ?? 0)
  const maxDistributorBalanceUse = Math.min(distributorBalanceAvailable, paidNow)

  const applyContractTerm = (term: ServicePaymentState['paymentTerm']) => {
    if (renewalLine) {
      setRenewalLine({
        ...renewalLine,
        paymentTerm: term,
        unitPrice: term === 'installment' ? annualRenewalPrice : annualRenewalPrice,
      })
    }
    if (externalLine) {
      setExternalLine({
        ...externalLine,
        paymentTerm: term,
        unitPrice: term === 'installment' ? externalInstallmentPrice : externalCashPrice,
      })
    }
    setFeeLines((prev) => {
      const next = { ...prev }
      for (const id of Object.keys(next)) {
        const line = next[id]
        next[id] = {
          ...line,
          paymentTerm: term,
          unit_price: term === 'installment' ? line.installmentPrice : line.cashPrice,
        }
      }
      return next
    })
  }

  const handleCollectionScopeChange = (scope: 'contract' | 'service') => {
    setCollectionScope(scope)
    if (scope === 'contract') {
      applyContractTerm(contractPayment.paymentTerm)
    }
  }

  const handleContractPaymentChange = (patch: Partial<ServicePaymentState>) => {
    setContractPayment((prev) => ({ ...prev, ...patch }))
    if (patch.paymentTerm) {
      applyContractTerm(patch.paymentTerm)
    }
  }

  const skipLinePayment = collectionScope === 'contract'

  const sourceReady =
    transactionSource === 'branch'
      ? Boolean(selectedBranch)
      : transactionSource === 'distributor'
        ? Boolean(selectedDistributor)
        : Boolean(selectedSalesRep)

  const contractDeviceReady =
    listedDeviceSelected &&
    Boolean(contractSerial.trim()) &&
    Boolean(contractSim.trim()) &&
    Boolean(contractUsername.trim())

  const renewalValid =
    !selectedChips.has('annual_renewal') ||
    (Boolean(renewalLine) &&
      validateDeviceLine(renewalLine!, minDownPercent, maxInstallmentCount, {
        requireTechnician: false,
        skipPayment: skipLinePayment,
      }).valid)

  const externalValid =
    !selectedChips.has('external_device') ||
    (Boolean(externalLine) &&
      validateDeviceLine(externalLine!, minDownPercent, maxInstallmentCount, {
        requireTechnician: !listedDeviceSelected,
        skipPayment: skipLinePayment,
      }).valid)

  const feesValid = activeFeeLines.every(
    (line) =>
      (skipLinePayment ||
        (validateServiceLineInstallment(line, minDownPercent, maxInstallmentCount).valid &&
          validateServiceLineCash(line).valid)) &&
      line.description.trim() &&
      line.unit_price > 0,
  )

  const contractPaymentValid =
    collectionScope !== 'contract' ||
    selectedChips.size === 0 ||
    validateServicePayment(contractPayment, total, minDownPercent, maxInstallmentCount).valid

  const missingFeeService = COMBINER_FEE_CHIPS.some(
    (chip) => selectedChips.has(chip.id) && !feeLines[chip.id],
  )

  const canSubmit =
    Boolean(selectedCustomer) &&
    sourceReady &&
    selectedChips.size > 0 &&
    total > 0 &&
    contractDeviceReady &&
    renewalValid &&
    externalValid &&
    feesValid &&
    contractPaymentValid &&
    !missingFeeService &&
    (!hasFeeChips || Boolean(feeTechnician))

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer) throw new Error('العميل مطلوب')

      const lines: CheckoutPayload['lines'] = []
      if (selectedChips.has('annual_renewal') && renewalLine) {
        lines.push(
          deviceCheckoutLine(
            renewalLine,
            'subscription_renewal',
            contractDate,
            maxInstallmentCount,
            collectionScope,
          ),
        )
      }
      if (selectedChips.has('external_device') && externalLine) {
        lines.push(
          deviceCheckoutLine(
            externalLine,
            'external_device',
            contractDate,
            maxInstallmentCount,
            collectionScope,
          ),
        )
      }
      for (const line of activeFeeLines) {
        const base = {
          line_type: 'service' as const,
          service_id: line.service_id,
          description: line.description,
          unit_price: line.unit_price,
          technician_id: feeTechnician?.id,
          product_unit_id: selectedCustomerDevice?.product_unit_id ?? undefined,
          serial_number: contractSerial.trim() || undefined,
          sim_number: contractSim.trim() || undefined,
          username: contractUsername.trim() || undefined,
          payment_term: collectionScope === 'contract' ? contractPayment.paymentTerm : line.paymentTerm,
          cash_schedule:
            collectionScope === 'service' && line.paymentTerm === 'cash'
              ? line.cashSchedule
              : undefined,
        }
        if (collectionScope === 'contract') {
          lines.push(base)
          continue
        }
        if (line.paymentTerm === 'installment') {
          lines.push({
            ...base,
            installment_plan: {
              down_payment: line.downPayment,
              installment_amount: line.installmentAmount,
              installment_count: serviceLineInstallmentCount(line, maxInstallmentCount),
              interval_type: line.intervalType,
              interval_days: line.intervalType === 'weekly' ? 7 : 30,
              first_due_date: line.firstDueDate,
            },
          })
        } else {
          lines.push({
            ...base,
            down_payment: line.downPayment > 0 ? line.downPayment : undefined,
          })
        }
      }

      const payload: CheckoutPayload = {
        customer_id: selectedCustomer.id,
        branch_id: resolvedBranchId ? Number(resolvedBranchId) : undefined,
        contract_kind: deriveCombinerContractKind(selectedChips),
        invoice_date: contractDate,
        notes: notes.trim() || undefined,
        collection_scope: collectionScope,
        lines,
      }

      if (collectionScope === 'contract') {
        payload.payment_term = contractPayment.paymentTerm
        if (contractPayment.paymentTerm === 'installment') {
          payload.installment_plan = {
            down_payment: contractPayment.downPayment,
            installment_amount: contractPayment.installmentAmount,
            installment_count: computeInstallmentCount(
              total,
              contractPayment.installmentAmount,
              contractPayment.downPayment,
            ),
            interval_type: contractPayment.intervalType,
            interval_days: contractPayment.intervalType === 'weekly' ? 7 : 30,
            first_due_date: contractPayment.firstDueDate,
          }
        }
      }

      if (selectedChips.has('annual_renewal') && selectedCustomerDevice?.sales_invoice_id) {
        payload.source_sales_invoice_id = selectedCustomerDevice.sales_invoice_id
      }
      if (transactionSource === 'distributor' && selectedDistributor) {
        payload.distributor_id = selectedDistributor.id
      }
      if (transactionSource === 'sales' && selectedSalesRep) {
        payload.sales_user_id = selectedSalesRep.id
      }
      if (distributorBalanceAmount > 0) {
        payload.distributor_balance_amount = distributorBalanceAmount
      }

      const { data } = await api.post<SalesInvoice>('/sales-invoices/checkout', payload)
      return data
    },
    onSuccess: (invoice) => {
      const hasInstallment =
        collectionScope === 'contract'
          ? contractPayment.paymentTerm === 'installment'
          : (renewalLine?.paymentTerm === 'installment' && selectedChips.has('annual_renewal')) ||
            (externalLine?.paymentTerm === 'installment' && selectedChips.has('external_device')) ||
            activeFeeLines.some((line) => line.paymentTerm === 'installment')
      const uninstallFee = feeLines.uninstall
      const hasUninstall =
        selectedChips.has('uninstall') ||
        invoice.lines?.some((line) => line.service?.category === 'uninstall') ||
        Boolean(
          uninstallFee?.service_id &&
            catalogServices.find((service) => service.id === uninstallFee.service_id)?.category ===
              'uninstall',
        )
      const customerId = selectedCustomer?.id
      const successMessage = `تم تسجيل العملية — فاتورة ${invoice.invoice_number ?? `#${invoice.id}`}`
      resetServiceForm()
      setLastInvoice(invoice)
      setSuccessMsg(successMessage)
      setLastInstallmentSale(hasInstallment)
      if (hasUninstall) {
        setUninstallInvoice(invoice)
      }
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      queryClient.invalidateQueries({ queryKey: ['customers', customerId, 'devices'] })
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitAttempted(true)
    if (!canSubmit) return
    checkoutMutation.mutate()
  }

  const summaryBranchLabel =
    transactionSource === 'distributor' && selectedDistributor
      ? distributorLabel(selectedDistributor)
      : selectedBranch?.name_ar || selectedBranch?.name || undefined

  return (
    <SalesPageShell
      title="تعاقد خدمات"
      subtitle="خدمة واحدة أو أكتر في نفس العقد"
      actions={<MyContractsButton />}
    >
      <PosContractTypeTabs onClear={resetServiceForm} />
      <form
        onSubmit={handleSubmit}
        className="pos-form grid grid-cols-1 items-start gap-md lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]"
      >
        <div className="space-y-md">
          <PosSectionCard number={1} title="بيانات التعاقد" subtitle="العميل والمصدر وتاريخ العقد">
            <ServiceContractHeader
              plain
              transactionSource={transactionSource}
              onTransactionSourceChange={handleTransactionSourceChange}
              selectedBranch={selectedBranch}
              onBranchChange={setSelectedBranch}
              onBranchSearchChange={setBranchSearch}
              filteredBranches={filteredBranches}
              branchesLoading={branchesQuery.isLoading}
              selectedDistributor={selectedDistributor}
              onDistributorChange={setSelectedDistributor}
              onDistributorSearchChange={setDistributorSearch}
              distributors={distributorsQuery.data ?? []}
              distributorsLoading={distributorsQuery.isLoading}
              selectedSalesRep={selectedSalesRep}
              onSalesRepChange={setSelectedSalesRep}
              onSalesRepSearchChange={setSalesRepSearch}
              salesReps={salesRepsQuery.data ?? []}
              salesRepsLoading={salesRepsQuery.isLoading}
              selectedCustomer={selectedCustomer}
              onCustomerChange={handleCustomerChange}
              onAddCustomer={() => setAddCustomerOpen(true)}
              onCustomerSearchChange={setCustomerSearch}
              customers={customersQuery.data ?? []}
              customersLoading={customersQuery.isLoading}
              contractDate={contractDate}
              onContractDateChange={setContractDate}
            />
          </PosSectionCard>

          {selectedCustomer && (
            <PosSectionCard
              number={2}
              title="جهاز العميل"
              subtitle="اختار جهازًا مسجلًا أو سجّل جهازًا قديمًا / خارجيًا"
              highlighted={submitAttempted && !contractDeviceReady}
            >
              <CustomerContractDevicePicker
                devices={customerDevices}
                loading={customerDevicesQuery.isLoading}
                selectedDevice={selectedCustomerDevice}
                manual={manualDeviceEntry}
                serialNumber={contractSerial}
                simNumber={contractSim}
                username={contractUsername}
                onSelectDevice={handleSelectCustomerDevice}
                onManual={handleManualDevice}
                onClear={() => {
                  setSelectedCustomerDevice(null)
                  setManualDeviceEntry(false)
                }}
                onSerialChange={handleContractSerialChange}
                onSimChange={handleContractSimChange}
                onUsernameChange={handleContractUsernameChange}
                showIdentityFields={showDeviceIdentityFields}
                identityLocked={listedDeviceSelected}
                showErrors={submitAttempted}
                registerOrigin={registerOrigin}
                onRegisterOriginChange={setRegisterOrigin}
                onRegister={(payload) => registerDeviceMutation.mutate(payload)}
                registering={registerDeviceMutation.isPending}
                registerError={
                  registerDeviceMutation.isError
                    ? getErrorMessage(registerDeviceMutation.error)
                    : null
                }
              />
            </PosSectionCard>
          )}

          <PosSectionCard
            number={2}
            title="الخدمات على هذا العقد"
            subtitle="اختر خدمة أو أكثر لنفس العميل"
            highlighted={submitAttempted && selectedChips.size === 0}
          >
            <div className="grid grid-cols-2 gap-sm sm:grid-cols-3">
              {COMBINER_CHIPS.map((chip) => {
                const active = selectedChips.has(chip.id)
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => toggleChip(chip.id)}
                    className={`flex min-h-16 flex-col items-center justify-center gap-xs rounded-xl border px-sm py-sm text-center text-sm font-bold transition-colors ${
                      active
                        ? 'border-primary bg-primary text-on-primary shadow-sm'
                        : 'border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary/40 hover:bg-surface-container'
                    }`}
                  >
                    <Icon name={CHIP_ICONS[chip.id]} size={22} filled={active} />
                    {chip.label}
                  </button>
                )
              })}
            </div>
            {submitAttempted && selectedChips.size === 0 && (
              <p className="mt-sm text-sm text-error">اختر خدمة واحدة على الأقل</p>
            )}
            {missingFeeService && (
              <p className="mt-sm text-sm text-error">
                خدمة الكتالوج غير موجودة — راجع صفحة الخدمات (فك / تركيب / برمجة / سوفت)
              </p>
            )}
          </PosSectionCard>

          {selectedChips.has('annual_renewal') && renewalLine && (
            <DeviceLineCard
              index={0}
              line={renewalLine}
              contractDate={contractDate}
              contractKind="subscription_renewal"
              product={product}
              cashPrice={annualRenewalPrice}
              installmentPrice={annualRenewalPrice}
              onChange={(line) => {
                setRenewalLine(line)
                if (manualDeviceEntry) {
                  setContractSerial(line.serialNumber)
                  setContractSim(line.simNumber)
                  setExternalLine((prev) =>
                    prev
                      ? applyContractDeviceIdentity(prev, {
                          serialNumber: line.serialNumber,
                          simNumber: line.simNumber,
                        })
                      : prev,
                  )
                }
              }}
              minDownPercent={minDownPercent}
              maxInstallmentCount={maxInstallmentCount}
              employees={employeesQuery.data ?? []}
              employeesLoading={employeesQuery.isLoading}
              showErrors={submitAttempted}
              showPayment={collectionScope === 'service'}
              lockedFromSource={listedDeviceSelected}
              annualRenewalOnly
            />
          )}

          {selectedChips.has('external_device') && externalLine && (
            <DeviceLineCard
              index={0}
              line={externalLine}
              contractDate={contractDate}
              contractKind="external_device"
              product={product}
              cashPrice={externalCashPrice}
              installmentPrice={externalInstallmentPrice}
              onChange={(line) => {
                setExternalLine(line)
                if (manualDeviceEntry) {
                  setContractSerial(line.serialNumber)
                  setContractSim(line.simNumber)
                  setRenewalLine((prev) =>
                    prev
                      ? applyContractDeviceIdentity(prev, {
                          serialNumber: line.serialNumber,
                          simNumber: line.simNumber,
                        })
                      : prev,
                  )
                }
              }}
              minDownPercent={minDownPercent}
              maxInstallmentCount={maxInstallmentCount}
              employees={employeesQuery.data ?? []}
              employeesLoading={employeesQuery.isLoading}
              showErrors={submitAttempted}
              showPayment={collectionScope === 'service'}
              lockedFromSource={listedDeviceSelected}
              annualRenewalOnly
            />
          )}

          {hasFeeChips ? (
            <div
              className={`rounded-xl border bg-surface-container-lowest p-md shadow-sm ${
                submitAttempted && !feeTechnician ? 'border-error/40' : 'border-outline-variant'
              }`}
            >
              <div className={posRequiredWrap(submitAttempted && !feeTechnician)}>
                <SearchableSelect
                  label="الفني"
                  options={filteredTechnicians}
                  value={feeTechnician}
                  onChange={setFeeTechnician}
                  onSearchChange={setTechnicianSearch}
                  getOptionValue={(emp) => emp.id}
                  getOptionLabel={(emp) =>
                    `${emp.name}${emp.job_title ? ` — ${emp.job_title}` : ''}`
                  }
                  placeholder="ابحث باسم الفني..."
                  loading={employeesQuery.isLoading}
                  emptyMessage="لا يوجد فني مطابق"
                  hasError={submitAttempted && !feeTechnician}
                />
                {submitAttempted && !feeTechnician ? (
                  <p className="mt-xs text-xs text-error">
                    الفني مطلوب لكل خدمات الفك والتركيب والسوفت والبرمجة
                  </p>
                ) : (
                  <p className="mt-xs text-xs text-on-surface-variant">
                    يُسند نفس الفني لكل خدمات الفك / التركيب / البرمجة / السوفت في هذا العقد
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {COMBINER_FEE_CHIPS.filter((chip) => selectedChips.has(chip.id) && feeLines[chip.id]).map(
            (chip) => (
              <ServiceLineCard
                key={chip.id}
                line={feeLines[chip.id]}
                index={0}
                contractDate={contractDate}
                minDownPercent={minDownPercent}
                maxInstallmentCount={maxInstallmentCount}
                onChange={(updated) =>
                  setFeeLines((prev) => ({ ...prev, [chip.id]: updated }))
                }
                onRemove={() => toggleChip(chip.id)}
                showPayment={collectionScope === 'service'}
              />
            ),
          )}

          <PosSectionCard number={3} title="التحصيل" subtitle="كيف يُحسب الدفع لهذا العقد">
            <div className="flex h-11 gap-xs">
              {([
                { id: 'contract', label: 'تحصيل على الإجمالي' },
                { id: 'service', label: 'تحصيل على مستوى الخدمة' },
              ] as const).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleCollectionScopeChange(option.id)}
                  className={posSourceToggle(collectionScope === option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </PosSectionCard>

          {collectionScope === 'contract' && selectedChips.size > 0 ? (
            <ServicePaymentSection
              total={total}
              payment={contractPayment}
              onChange={handleContractPaymentChange}
              minDownPercent={minDownPercent}
              maxInstallmentCount={maxInstallmentCount}
            />
          ) : null}

          <PosSectionCard number={4} title="ملاحظات">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="اختياري"
              className="w-full rounded-lg border border-outline-variant px-sm py-2 text-sm focus:border-primary focus:outline-none"
            />
          </PosSectionCard>
        </div>

        <aside className="flex flex-col gap-md lg:sticky lg:top-4 lg:self-start">
          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            <div className="border-b border-outline-variant/60 px-sm py-sm sm:px-md">
              <h2 className="text-[16px] font-extrabold text-on-surface">ملخص التعاقد</h2>
              <div className="mt-xs flex flex-wrap gap-x-sm gap-y-0.5 text-[12px] text-on-surface-variant">
                {summaryBranchLabel ? <span>{summaryBranchLabel}</span> : null}
                {summaryBranchLabel ? <span aria-hidden>·</span> : null}
                <span className="tabular-nums" dir="ltr">
                  {contractDate}
                </span>
              </div>
            </div>
            <div className="space-y-sm px-sm py-sm text-sm sm:px-md">
              <div className="flex justify-between gap-sm tabular-nums">
                <span className="text-on-surface-variant">الإجمالي</span>
                <span className="font-bold">
                  {total.toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م
                </span>
              </div>
              {paidNow > 0 ? (
                <div className="rounded-lg border border-primary/20 bg-primary/8 px-sm py-sm">
                  <div className="flex items-center justify-between gap-sm tabular-nums">
                    <span className="font-bold text-on-surface">المدفوع الآن</span>
                    <span className="text-lg font-extrabold text-primary">
                      {paidNow.toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م
                    </span>
                  </div>
                  {distributorBalanceAvailable > 0 && (
                    <div className="mt-sm border-t border-primary/15 pt-sm">
                      <p className="mb-xs text-xs text-on-surface-variant">
                        رصيد عمولة:{' '}
                        {distributorBalanceAvailable.toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م
                      </p>
                      <label className="mb-xs block text-xs text-on-surface-variant">
                        استخدام من الرصيد
                      </label>
                      <NumericInput
                        type="number"
                        min={0}
                        max={maxDistributorBalanceUse}
                        value={distributorBalanceAmount}
                        onChange={(e) =>
                          setDistributorBalanceAmount(
                            Math.min(Number(e.target.value), maxDistributorBalanceUse),
                          )
                        }
                        className="w-full rounded-lg border border-outline-variant px-sm py-1.5 text-sm tabular-nums"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex justify-between gap-sm tabular-nums">
                  <span className="text-on-surface-variant">المدفوع الآن</span>
                  <span className="font-bold text-secondary">0 ج.م</span>
                </div>
              )}
              <div className="flex justify-between gap-sm border-t border-outline-variant/60 pt-sm tabular-nums">
                <span className="font-bold text-on-surface">المتبقي</span>
                <span className="text-lg font-extrabold text-error">
                  {balanceDue.toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م
                </span>
              </div>
            </div>
            <div
              className="h-3 bg-surface-container-lowest"
              style={{
                backgroundImage:
                  'linear-gradient(135deg, var(--color-surface-container-low) 33.33%, transparent 33.33%, transparent 50%, var(--color-surface-container-low) 50%, var(--color-surface-container-low) 83.33%, transparent 83.33%, transparent 100%)',
                backgroundSize: '12px 12px',
              }}
              aria-hidden
            />
          </div>

          {checkoutMutation.isError && (
            <p className="rounded-lg border border-error/30 bg-error/5 p-sm text-sm text-error">
              {getErrorMessage(checkoutMutation.error)}
            </p>
          )}
          {successMsg && lastInvoice && (
            <div className="space-y-sm rounded-lg border border-secondary/25 bg-secondary/10 p-sm text-sm text-secondary">
              <p>{successMsg}</p>
              <Link
                to={serviceContractPrintPath(lastInvoice.id, undefined, { autoPrint: false })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
              >
                <Icon name="print" size={18} />
                طباعة العقد
              </Link>
              {lastInstallmentSale && (
                <Link
                  to="/installments"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-primary"
                >
                  <Icon name="payments" size={18} />
                  الذهاب لتحصيل الأقساط
                </Link>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={checkoutMutation.isPending || (submitAttempted && !canSubmit)}
            className="flex w-full items-center justify-center gap-xs rounded-lg bg-primary py-4 text-base font-bold text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="check_circle" />
            {checkoutMutation.isPending ? 'جاري الحفظ...' : 'تسجيل العملية'}
          </button>
        </aside>
      </form>

      <UninstallDeviceHandoverModal
        open={uninstallInvoice !== null}
        invoice={uninstallInvoice}
        onClose={() => setUninstallInvoice(null)}
      />
      <CustomerCreateModal
        open={addCustomerOpen}
        onClose={() => setAddCustomerOpen(false)}
        onCreated={(customer) => {
          setCustomerSearch(customer.name)
          handleCustomerChange(customer)
        }}
      />
    </SalesPageShell>
  )
}
