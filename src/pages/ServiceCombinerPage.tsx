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
  SubscriptionRenewalCandidate,
} from '../api/types'
import { computeInstallmentCount, type ApiPaginated, serviceContractPrintPath } from '../lib/sales'
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
import { PosContractTypeTabs } from '../components/pos/PosContractTypeTabs'
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
import { PosSubscriptionRenewalSection } from '../components/pos/PosSubscriptionRenewalSection'
import { SearchableSelect } from '../components/SearchableSelect'
import {
  createDefaultServicePayment,
  ServicePaymentSection,
  validateServicePayment,
  type ServicePaymentState,
} from '../components/services/ServicePaymentSection'
import { posRequiredWrap, posToggleBtn } from '../components/pos/posFormStyles'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useAuthStore } from '../stores/authStore'
import { useOrgSettingsStore } from '../stores/orgSettingsStore'

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

  const [selectedChips, setSelectedChips] = useState<Set<CombinerChipId>>(new Set())
  const [transactionSource, setTransactionSource] = useState<TransactionSource>('branch')
  const [branchSearch, setBranchSearch] = useState('')
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [distributorSearch, setDistributorSearch] = useState('')
  const [selectedDistributor, setSelectedDistributor] = useState<Distributor | null>(null)
  const [salesRepSearch, setSalesRepSearch] = useState('')
  const [selectedSalesRep, setSelectedSalesRep] = useState<SalesRep | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [contractDate, setContractDate] = useState(() => new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [sourceRenewalCandidate, setSourceRenewalCandidate] =
    useState<SubscriptionRenewalCandidate | null>(null)
  const [renewalLine, setRenewalLine] = useState<DeviceLineDraft | null>(null)
  const [externalLine, setExternalLine] = useState<DeviceLineDraft | null>(null)
  const [feeLines, setFeeLines] = useState<Record<string, ServiceLineDraft>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [lastInvoice, setLastInvoice] = useState<SalesInvoice | null>(null)
  const [lastInstallmentSale, setLastInstallmentSale] = useState(false)
  const [distributorBalanceAmount, setDistributorBalanceAmount] = useState(0)
  const [collectionScope, setCollectionScope] = useState<'contract' | 'service'>('contract')
  const [contractPayment, setContractPayment] = useState<ServicePaymentState>(() =>
    createDefaultServicePayment(0, minDownPercent),
  )
  const [feeTechnician, setFeeTechnician] = useState<Employee | null>(null)
  const [technicianSearch, setTechnicianSearch] = useState('')

  const debouncedDistributorSearch = useDebouncedValue(distributorSearch, 300)
  const debouncedCustomerSearch = useDebouncedValue(customerSearch, 300)
  const debouncedSalesRepSearch = useDebouncedValue(salesRepSearch, 300)

  const resolvedBranchId =
    transactionSource === 'branch'
      ? (selectedBranch?.id ?? contextBranchId ?? '')
      : transactionSource === 'distributor'
        ? (selectedDistributor?.branch_id ?? '')
        : (selectedSalesRep?.branch_id ?? contextBranchId ?? '')

  const handleCustomerChange = (customer: Customer | null) => {
    setSelectedCustomer(customer)
    setDistributorBalanceAmount(0)

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

  const toggleChip = (id: CombinerChipId) => {
    setSelectedChips((prev) => {
      const next = new Set(prev)
      const enabling = !next.has(id)
      if (enabling) next.add(id)
      else next.delete(id)

      if (id === 'annual_renewal' && !enabling) {
        setSourceRenewalCandidate(null)
        setRenewalLine(null)
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
            createDeviceLine(price, undefined, { contractDate, minDownPercent }),
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

  const handleRenewalCandidateChange = (candidate: SubscriptionRenewalCandidate | null) => {
    setSourceRenewalCandidate(candidate)
    if (!candidate) {
      setRenewalLine(null)
      return
    }

    const price = product
      ? resolveGpsUnitPrice(product, {
          contractKind: 'subscription_renewal',
          paymentTerm: 'cash',
          renewalType: 'annual',
        })
      : annualRenewalPrice

    if (candidate.customer_id) {
      setSelectedCustomer({
        id: candidate.customer_id,
        name: candidate.customer_name ?? '',
        phone: candidate.customer_phone ?? '',
        phone_2: candidate.customer_phone_2 ?? null,
      } as Customer)
    }

    const base = createDeviceLine(price, undefined, { contractDate, minDownPercent })
    setRenewalLine({
      ...base,
      paymentTerm: 'cash',
      downPayment: 0,
      serialNumber: candidate.serial_number ?? '',
      simNumber: candidate.sim_number ?? '',
      username: candidate.username ?? '',
      vehicleType: (candidate.vehicle_type as DeviceLineDraft['vehicleType']) || 'other',
      vehiclePlateLetters: candidate.vehicle_plate_letters ?? '',
      vehiclePlateNumbers: candidate.vehicle_plate_numbers ?? '',
      chassisNumber: candidate.chassis_number ?? '',
      engineNumber: candidate.engine_number ?? '',
      renewalType: 'annual',
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

  const renewalValid =
    !selectedChips.has('annual_renewal') ||
    (Boolean(sourceRenewalCandidate) &&
      Boolean(renewalLine) &&
      validateDeviceLine(renewalLine!, minDownPercent, maxInstallmentCount, {
        requireTechnician: false,
        skipPayment: skipLinePayment,
      }).valid)

  const externalValid =
    !selectedChips.has('external_device') ||
    (Boolean(externalLine) &&
      validateDeviceLine(externalLine!, minDownPercent, maxInstallmentCount, {
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
              maxInstallmentCount,
            ),
            interval_type: contractPayment.intervalType,
            interval_days: contractPayment.intervalType === 'weekly' ? 7 : 30,
            first_due_date: contractPayment.firstDueDate,
          }
        }
      }

      if (selectedChips.has('annual_renewal') && sourceRenewalCandidate) {
        payload.source_sales_invoice_id = sourceRenewalCandidate.sales_invoice_id
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
      setLastInstallmentSale(hasInstallment)
      setLastInvoice(invoice)
      setSuccessMsg(`تم تسجيل العملية — فاتورة ${invoice.invoice_number ?? `#${invoice.id}`}`)
      setNotes('')
      setSelectedChips(new Set())
      setSourceRenewalCandidate(null)
      setRenewalLine(null)
      setExternalLine(null)
      setFeeLines({})
      setFeeTechnician(null)
      setTechnicianSearch('')
      setSubmitAttempted(false)
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['installments'] })
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitAttempted(true)
    if (!canSubmit) return
    checkoutMutation.mutate()
  }

  return (
    <SalesPageShell title="تعاقد خدمات" subtitle="خدمة واحدة أو أكتر في نفس العقد">
      <PosContractTypeTabs />
      <form onSubmit={handleSubmit} className="space-y-md">
        <ServiceContractHeader
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
          onCustomerSearchChange={setCustomerSearch}
          customers={customersQuery.data ?? []}
          customersLoading={customersQuery.isLoading}
          contractDate={contractDate}
          onContractDateChange={setContractDate}
        />

        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
          <p className="mb-sm text-sm font-bold text-on-surface">الخدمات على هذا العقد</p>
          <div className="flex flex-wrap gap-xs">
            {COMBINER_CHIPS.map((chip) => {
              const active = selectedChips.has(chip.id)
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => toggleChip(chip.id)}
                  className={`${posToggleBtn(active)} px-md`}
                >
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
        </div>

        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
          <p className="mb-xs text-sm text-on-surface-variant">التحصيل</p>
          <div className="flex flex-wrap gap-sm">
            {([
              { id: 'contract', label: 'تحصيل على الإجمالي' },
              { id: 'service', label: 'تحصيل على مستوى الخدمة' },
            ] as const).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleCollectionScopeChange(option.id)}
                className={posToggleBtn(collectionScope === option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {selectedChips.has('annual_renewal') && (
          <div className="space-y-md">
            <PosSubscriptionRenewalSection
              selectedCandidate={sourceRenewalCandidate}
              onCandidateChange={handleRenewalCandidateChange}
              submitAttempted={submitAttempted}
            />
            {renewalLine && (
              <DeviceLineCard
                index={0}
                line={renewalLine}
                contractDate={contractDate}
                contractKind="subscription_renewal"
                product={product}
                cashPrice={annualRenewalPrice}
                installmentPrice={annualRenewalPrice}
                onChange={(line) => setRenewalLine(line)}
                minDownPercent={minDownPercent}
                maxInstallmentCount={maxInstallmentCount}
                employees={employeesQuery.data ?? []}
                employeesLoading={employeesQuery.isLoading}
                showErrors={submitAttempted}
                showPayment={collectionScope === 'service'}
                lockedFromSource
                annualRenewalOnly
              />
            )}
          </div>
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
            onChange={(line) => setExternalLine(line)}
            minDownPercent={minDownPercent}
            maxInstallmentCount={maxInstallmentCount}
            employees={employeesQuery.data ?? []}
            employeesLoading={employeesQuery.isLoading}
            showErrors={submitAttempted}
            showPayment={collectionScope === 'service'}
            annualRenewalOnly
          />
        )}

        {hasFeeChips ? (
          <div className={`rounded-lg border bg-surface-container-lowest p-md ${
            submitAttempted && !feeTechnician
              ? 'border-error/40'
              : 'border-outline-variant'
          }`}>
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
                <p className="mt-xs text-xs text-error">الفني مطلوب لكل خدمات الفك والتركيب والسوفت والبرمجة</p>
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

        {collectionScope === 'contract' && selectedChips.size > 0 ? (
          <ServicePaymentSection
            total={total}
            payment={contractPayment}
            onChange={handleContractPaymentChange}
            minDownPercent={minDownPercent}
            maxInstallmentCount={maxInstallmentCount}
          />
        ) : null}

        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
          <label className="mb-xs block text-sm text-on-surface-variant">ملاحظات</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded border border-outline-variant px-sm py-2 text-sm"
          />
        </div>

        <div className="grid gap-md lg:grid-cols-[1fr_minmax(240px,320px)]">
          <div />
          <div className="space-y-md">
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
              <dl className="space-y-xs text-sm">
                <div className="flex justify-between">
                  <dt className="text-on-surface-variant">الإجمالي</dt>
                  <dd className="font-bold tabular-nums">{total.toLocaleString('ar-EG')} ج.م</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-on-surface-variant">المدفوع الآن</dt>
                  <dd className="font-bold tabular-nums text-secondary">
                    {paidNow.toLocaleString('ar-EG')} ج.م
                  </dd>
                </div>
                <div className="flex justify-between border-t border-outline-variant pt-sm">
                  <dt className="text-on-surface-variant">المتبقي</dt>
                  <dd className="font-bold tabular-nums text-error">
                    {balanceDue.toLocaleString('ar-EG')} ج.م
                  </dd>
                </div>
                {distributorBalanceAvailable > 0 && paidNow > 0 && (
                  <div className="rounded-lg border border-primary/25 bg-primary/5 p-sm">
                    <p className="mb-xs text-xs text-on-surface-variant">
                      رصيد عمولة: {distributorBalanceAvailable.toLocaleString('ar-EG')} ج.م
                    </p>
                    <label className="mb-xs block text-xs text-on-surface-variant">
                      استخدام من الرصيد
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={maxDistributorBalanceUse}
                      value={distributorBalanceAmount}
                      onChange={(e) =>
                        setDistributorBalanceAmount(
                          Math.min(Number(e.target.value), maxDistributorBalanceUse),
                        )
                      }
                      className="w-full rounded border border-outline-variant px-sm py-1.5 text-sm tabular-nums"
                    />
                  </div>
                )}
              </dl>
            </div>

            {checkoutMutation.isError && (
              <p className="text-sm text-error">{getErrorMessage(checkoutMutation.error)}</p>
            )}
            {successMsg && lastInvoice && (
              <div className="space-y-sm rounded-lg bg-secondary/10 p-sm text-sm text-secondary">
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
                  <Link to="/installments" className="inline-flex items-center gap-1 font-bold text-primary">
                    <Icon name="payments" size={18} />
                    الذهاب لتحصيل الأقساط
                  </Link>
                )}
              </div>
            )}
            <button
              type="submit"
              disabled={checkoutMutation.isPending || (submitAttempted && !canSubmit)}
              className="flex w-full items-center justify-center gap-xs rounded-lg bg-primary py-4 text-base font-bold text-on-primary disabled:opacity-50"
            >
              <Icon name="save" />
              {checkoutMutation.isPending ? 'جاري الحفظ...' : 'تسجيل العملية'}
            </button>
          </div>
        </div>
      </form>
    </SalesPageShell>
  )
}
