import { Link } from 'react-router-dom'
import { useMemo, useState, useEffect, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type {
  Branch,
  CheckoutPayload,
  ContractKind,
  Customer,
  Distributor,
  Employee,
  GpsProduct,
  GpsStock,
  PaginatedResponse,
  ProductUnit,
  SalesInvoice,
  SalesRep,
  Promotion,
} from '../api/types'
import { contractPrintPath, isServiceInvoiceLine } from '../lib/sales'
import { linePaidNow } from '../lib/cashSchedule'
import {
  resolveCustomerTransactionSource,
} from '../lib/posCustomerSource'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'
import { StartTourButton } from '../components/tour/StartTourButton'
import { usePageTour } from '../hooks/usePageTour'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useAuthStore } from '../stores/authStore'
import { useOrgSettingsStore } from '../stores/orgSettingsStore'
import {
  createDeviceLine,
  DeviceLineCard,
  lineInstallmentCount,
  lineNetTotal,
  validateDeviceLine,
  type DeviceLineDraft,
} from '../components/pos/DeviceLineCard'
import {
  PosContractHeader,
  type TransactionSource,
} from '../components/pos/PosContractHeader'
import { PosContractSummary } from '../components/pos/PosContractSummary'
import { PosMobileCheckoutBar } from '../components/pos/PosMobileCheckoutBar'
import { PosContractKindSelector } from '../components/pos/PosContractKindSelector'
import { PosContractTypeTabs } from '../components/pos/PosContractTypeTabs'
import {
  allowsManualDeviceEntry,
  subscriptionRenewalUnitPrice,
} from '../lib/contractKinds'
import { resolveGpsUnitPrice } from '../lib/gpsProductPricing'
import { PosDevicesToolbar } from '../components/pos/PosDevicesToolbar'
import { PosStockInfoBar } from '../components/pos/PosStockInfoBar'
import { PosSectionCard } from '../components/pos/PosSectionCard'
import { PosOwnershipTransferSection } from '../components/pos/PosOwnershipTransferSection'

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export function PosPage() {
  usePageTour('pos')
  const queryClient = useQueryClient()
  const warehouseId = useAuthStore((s) => s.warehouseId)
  const contextBranchId = useAuthStore((s) => s.branchId)
  const contextDepartmentId = useAuthStore((s) => s.departmentId)
  const salesSettings = useOrgSettingsStore((s) => s.sales)
  const allowNegativeInventory = salesSettings?.allow_negative_inventory ?? false
  const enableInstallationFee = salesSettings?.enable_installation_fee ?? true
  const defaultInstallationFee = salesSettings?.default_installation_fee ?? 500
  const allowDisableFeeInSale = salesSettings?.allow_disable_installation_fee_in_sale ?? true
  const minDownPercent = salesSettings?.min_down_payment_percent ?? 10
  const maxInstallmentCount = salesSettings?.max_installment_months ?? 24

  const [contractKind, setContractKind] = useState<ContractKind>('new_contract')
  const [sourceTransferInvoice, setSourceTransferInvoice] = useState<SalesInvoice | null>(null)
  const [transactionSource, setTransactionSource] = useState<TransactionSource>('branch')
  const [branchSearch, setBranchSearch] = useState('')
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [distributorSearch, setDistributorSearch] = useState('')
  const [selectedDistributor, setSelectedDistributor] = useState<Distributor | null>(null)
  const [salesRepSearch, setSalesRepSearch] = useState('')
  const [selectedSalesRep, setSelectedSalesRep] = useState<SalesRep | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [deviceLines, setDeviceLines] = useState<DeviceLineDraft[]>([])
  const [applyInstallationFee, setApplyInstallationFee] = useState(true)
  const [installationFee, setInstallationFee] = useState(defaultInstallationFee)
  const [feeDiscountAmount, setFeeDiscountAmount] = useState(0)
  const [feeDiscountPercent, setFeeDiscountPercent] = useState(0)
  const [contractDate, setContractDate] = useState(() => new Date().toISOString().split('T')[0])
  const [lastInvoice, setLastInvoice] = useState<SalesInvoice | null>(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [selectedPromotionId, setSelectedPromotionId] = useState<number | ''>('')
  const [distributorBalanceAmount, setDistributorBalanceAmount] = useState(0)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const activePromotionsQuery = useQuery({
    queryKey: ['pricing', 'promotions', 'active'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Promotion[] }>('/pricing/promotions/active')
      return data.data ?? []
    },
  })

  useEffect(() => {
    const promos = activePromotionsQuery.data ?? []
    if (promos.length > 0 && deviceLines.length > 0 && !selectedPromotionId) {
      setSelectedPromotionId(promos[0].id)
    }
    if (deviceLines.length === 0) {
      setSelectedPromotionId('')
    }
  }, [activePromotionsQuery.data, deviceLines.length, selectedPromotionId])

  const debouncedDistributorSearch = useDebouncedValue(distributorSearch, 300)
  const debouncedCustomerSearch = useDebouncedValue(customerSearch, 300)
  const debouncedSalesRepSearch = useDebouncedValue(salesRepSearch, 300)

  const resolvedBranchId =
    transactionSource === 'branch'
      ? selectedBranch?.id ?? contextBranchId ?? ''
      : transactionSource === 'distributor'
        ? selectedDistributor?.branch_id ?? ''
        : selectedSalesRep?.branch_id ?? contextBranchId ?? ''

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
      setTransactionSource('branch')
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
          params: { include: 'salesUser,branch,distributor,distributorProfile' },
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
    setDeviceLines((prev) => prev.map((line) => ({ ...line, technician: null })))
  }

  const branchesQuery = useQuery({
    queryKey: ['branches', 'pos'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', {
        params: { per_page: 100, 'filter[is_active]': 1 },
      })
      return data.data
    },
  })

  const resolvedAdministrationId = useMemo(() => {
    const administrationFromBranch = (branch: Branch | null | undefined): number | '' => {
      if (!branch) return ''
      return branch.administration_id ?? branch.department_id ?? ''
    }
    const branchFromId = (id: number | '' | undefined): Branch | null => {
      if (!id) return null
      if (selectedBranch?.id === id) return selectedBranch
      if (selectedDistributor?.branch_id === id && selectedDistributor.branch) {
        return selectedDistributor.branch
      }
      return branchesQuery.data?.find((b) => b.id === id) ?? null
    }

    if (transactionSource === 'branch' && selectedBranch) {
      return administrationFromBranch(selectedBranch) || contextDepartmentId || ''
    }
    if (transactionSource === 'distributor' && selectedDistributor) {
      const branch =
        selectedDistributor.branch ?? branchFromId(selectedDistributor.branch_id)
      return administrationFromBranch(branch) || contextDepartmentId || ''
    }
    if (transactionSource === 'sales' && selectedSalesRep?.branch_id) {
      return administrationFromBranch(branchFromId(selectedSalesRep.branch_id)) || contextDepartmentId || ''
    }
    if (resolvedBranchId) {
      return administrationFromBranch(branchFromId(resolvedBranchId)) || contextDepartmentId || ''
    }
    return contextDepartmentId ?? ''
  }, [
    transactionSource,
    selectedBranch,
    selectedDistributor,
    selectedSalesRep,
    resolvedBranchId,
    contextDepartmentId,
    branchesQuery.data,
  ])

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

  useEffect(() => {
    if (
      transactionSource === 'branch' &&
      !selectedBranch &&
      contextBranchId &&
      branchesQuery.data
    ) {
      const branch = branchesQuery.data.find((b) => b.id === contextBranchId)
      if (branch) setSelectedBranch(branch)
    }
  }, [transactionSource, selectedBranch, contextBranchId, branchesQuery.data])

  const distributorsQuery = useQuery({
    queryKey: ['distributors', 'pos', debouncedDistributorSearch],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 50,
        'filter[status]': 'active',
      }
      const q = debouncedDistributorSearch.trim()
      if (q) {
        if (/^\d+$/.test(q)) {
          params['filter[code]'] = q
        } else {
          params['filter[name]'] = q
        }
      }
      const { data } = await api.get<PaginatedResponse<Distributor>>('/distributors', { params })
      return data.data
    },
    enabled: transactionSource === 'distributor',
  })

  const customersQuery = useQuery({
    queryKey: ['customers', 'pos', debouncedCustomerSearch],
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
    enabled: true,
  })

  const salesRepsQuery = useQuery({
    queryKey: ['sales-reps', 'pos', debouncedSalesRepSearch],
    queryFn: async () => {
      const params: Record<string, string> = {}
      const q = debouncedSalesRepSearch.trim()
      if (q) params.search = q
      const { data } = await api.get<{ data: SalesRep[] }>('/sales-reps', { params })
      return data.data
    },
    enabled: transactionSource === 'sales',
  })

  const employeesQuery = useQuery({
    queryKey: ['employees', 'pos', resolvedAdministrationId],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 100,
        'filter[status]': 'active',
      }
      if (resolvedAdministrationId) params['filter[administration_id]'] = resolvedAdministrationId
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', { params })
      return data.data
    },
    enabled: Boolean(resolvedAdministrationId) || Boolean(warehouseId),
  })

  const productQuery = useQuery({
    queryKey: ['gps-product'],
    queryFn: async () => {
      const { data } = await api.get<GpsProduct>('/gps-product')
      return data
    },
  })

  const stockQuery = useQuery({
    queryKey: ['gps-stock', 'pos', warehouseId],
    queryFn: async () => {
      const { data } = await api.get<GpsStock>('/gps-stock', {
        params: { 'filter[warehouse_id]': warehouseId },
      })
      return data
    },
    enabled: Boolean(warehouseId),
  })

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
      return data.data
    },
    enabled: Boolean(warehouseId),
  })


  const manualDeviceEntry = allowsManualDeviceEntry(contractKind)
  const cashPrice = Number(productQuery.data?.cash_price ?? productQuery.data?.sell_price ?? 0)
  const installmentPrice = Number(
    productQuery.data?.installment_price ?? productQuery.data?.sell_price ?? 0,
  )
  const renewalReferencePrice = subscriptionRenewalUnitPrice(cashPrice)
  const available = stockQuery.data?.available ?? unitsQuery.data?.length ?? 0
  const maxQuantity = manualDeviceEntry ? 99 : allowNegativeInventory ? 999 : available

  useEffect(() => {
    if (quantity <= 0) {
      setDeviceLines([])
      return
    }

    const units = unitsQuery.data ?? []
    setDeviceLines((prev) => {
      const next: DeviceLineDraft[] = []
      for (let i = 0; i < quantity; i++) {
        const existing = prev[i]
        const unit = manualDeviceEntry ? undefined : units[i]
        const paymentTerm = existing?.paymentTerm ?? 'installment'
        const renewalType = existing?.renewalType ?? 'annual'
        const priceForTerm = productQuery.data
          ? resolveGpsUnitPrice(productQuery.data, {
              contractKind,
              paymentTerm,
              renewalType,
            })
          : paymentTerm === 'cash'
            ? contractKind === 'subscription_renewal'
              ? subscriptionRenewalUnitPrice(cashPrice)
              : contractKind === 'ownership_transfer'
                ? 0
                : cashPrice
            : contractKind === 'subscription_renewal'
              ? subscriptionRenewalUnitPrice(cashPrice)
              : contractKind === 'ownership_transfer'
                ? 0
                : installmentPrice
        if (existing) {
          next.push({
            ...existing,
            productUnitId: manualDeviceEntry ? undefined : unit?.id ?? existing.productUnitId,
            imei: manualDeviceEntry ? undefined : unit?.imei ?? existing.imei,
            unitPrice: priceForTerm,
            serialNumber: manualDeviceEntry
              ? existing.serialNumber
              : existing.serialNumber || unit?.serial_number || '',
          })
        } else {
          next.push(
            createDeviceLine(priceForTerm, manualDeviceEntry ? undefined : unit, {
              contractDate,
              minDownPercent,
            }),
          )
        }
      }
      return next
    })
  }, [
    quantity,
    cashPrice,
    installmentPrice,
    unitsQuery.data,
    contractDate,
    minDownPercent,
    contractKind,
    manualDeviceEntry,
    productQuery.data,
  ])

  useEffect(() => {
    if (contractKind !== 'ownership_transfer' || !sourceTransferInvoice) {
      return
    }

    const sourceLine = sourceTransferInvoice.lines?.find(
      (line) =>
        line.line_type === 'device' ||
        Boolean(line.serial_number || line.sim_number || line.product_unit_id),
    )

    setQuantity(1)
    setDeviceLines([
      {
        ...createDeviceLine(0, undefined, { contractDate, minDownPercent }),
        serialNumber: sourceLine?.serial_number ?? '',
        simNumber: sourceLine?.sim_number ?? '',
        username: sourceLine?.username ?? '',
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
    ])
  }, [sourceTransferInvoice, contractKind, contractDate, minDownPercent])

  const grossInstallationFeePerUnit =
    contractKind === 'new_contract' && enableInstallationFee && applyInstallationFee
      ? Number(installationFee)
      : 0
  const netInstallationFeePerUnit = Math.max(0, grossInstallationFeePerUnit - feeDiscountAmount)
  const netInstallationFeeTotal = netInstallationFeePerUnit * deviceLines.length

  const devicesSubtotal = deviceLines.reduce((sum, line) => sum + lineNetTotal(line), 0)
  const totalEstimate = devicesSubtotal + netInstallationFeeTotal

  const paidAtCheckout = useMemo(() => {
    let paid = netInstallationFeeTotal
    for (const line of deviceLines) {
      const net = lineNetTotal(line)
      paid += linePaidNow(line.paymentTerm, line.cashSchedule, net, line.downPayment)
    }
    return paid
  }, [deviceLines, netInstallationFeeTotal])

  const customerDistributorQuery = useQuery({
    queryKey: ['customer', selectedCustomer?.id, 'distributor-profile-pos'],
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

  const allLinesValid = deviceLines.every(
    (line) => validateDeviceLine(line, minDownPercent, maxInstallmentCount).valid,
  )

  useEffect(() => {
    setInstallationFee(defaultInstallationFee)
  }, [defaultInstallationFee])

  const checkoutMutation = useMutation({
    mutationFn: async (payload: CheckoutPayload) => {
      const { data } = await api.post<SalesInvoice>('/sales-invoices/checkout', payload)
      return data
    },
    onSuccess: (invoice) => {
      setLastInvoice(invoice)
      setSubmitAttempted(false)
      setSuccessMsg(
        `تم إنشاء التعاقد #${invoice.invoice_number ?? invoice.id} — ${invoice.lines?.length ?? 0} بند`,
      )
      setQuantity(1)
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['gps-stock'] })
      queryClient.invalidateQueries({ queryKey: ['product-units'] })
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['installments'] })
    },
  })

  const updateDeviceLine = (index: number, line: DeviceLineDraft) => {
    setDeviceLines((prev) => prev.map((item, i) => (i === index ? line : item)))
  }

  const handleCheckout = (e: FormEvent) => {
    e.preventDefault()
    setSubmitAttempted(true)
    const customerId = selectedCustomer?.id
    const sourceReady =
      transactionSource === 'branch'
        ? Boolean(selectedBranch)
        : transactionSource === 'distributor'
          ? Boolean(selectedDistributor)
          : Boolean(selectedSalesRep)
    if (!customerId || !sourceReady || deviceLines.length === 0) return
    if (!manualDeviceEntry && !warehouseId) return
    if (!manualDeviceEntry && !allowNegativeInventory && quantity > available) return
    if (!allLinesValid) return
    if (contractKind === 'ownership_transfer' && !sourceTransferInvoice) return

    const units = unitsQuery.data ?? []
    const lines: CheckoutPayload['lines'] = deviceLines.map((line, index) => {
      const unit = manualDeviceEntry ? undefined : units[index]
      const renewalDate =
        line.renewalType === 'annual' ? addDays(contractDate, 365) : undefined
      const base = {
        line_type: 'device' as const,
        product_unit_id: manualDeviceEntry ? undefined : line.productUnitId ?? unit?.id,
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
        renewal_type: line.renewalType,
        subscription_renewal_date: renewalDate,
      }

      if (line.paymentTerm === 'installment') {
        return {
          ...base,
          installment_plan: {
            installment_count: lineInstallmentCount(line, maxInstallmentCount),
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
    })

    if (
      !manualDeviceEntry &&
      !allowNegativeInventory &&
      lines.some((l) => l.line_type === 'device' && !l.product_unit_id)
    ) {
      return
    }

    const payload: CheckoutPayload = {
      customer_id: customerId,
      branch_id: resolvedBranchId || undefined,
      contract_kind: contractKind,
      installation_fee: grossInstallationFeePerUnit,
      discount_amount: feeDiscountAmount,
      invoice_date: contractDate,
      lines,
    }

    if (warehouseId) {
      payload.warehouse_id = warehouseId
    }

    if (transactionSource === 'distributor' && selectedDistributor) {
      payload.distributor_id = selectedDistributor.id
    }

    if (transactionSource === 'sales' && selectedSalesRep) {
      payload.sales_user_id = selectedSalesRep.id
      if (resolvedBranchId) payload.branch_id = resolvedBranchId
    }

    if (selectedPromotionId) {
      payload.promotion_id = Number(selectedPromotionId)
    }

    if (distributorBalanceAmount > 0) {
      payload.distributor_balance_amount = distributorBalanceAmount
    }

    if (contractKind === 'ownership_transfer' && sourceTransferInvoice) {
      payload.source_sales_invoice_id = sourceTransferInvoice.id
    }

    checkoutMutation.mutate(payload)
  }

  const hasDeviceSale = deviceLines.length > 0

  const sourceReady =
    transactionSource === 'branch'
      ? Boolean(selectedBranch)
      : transactionSource === 'distributor'
        ? Boolean(selectedDistributor)
        : Boolean(selectedSalesRep)

  const validationSummary = useMemo(() => {
    if (!submitAttempted) return []

    const messages: string[] = []
    if (!selectedCustomer) messages.push('يجب اختيار العميل')
    if (contractKind === 'ownership_transfer' && !sourceTransferInvoice) {
      messages.push('يجب اختيار التعاقد الأصلي لنقل الملكية')
    }
    if (!sourceReady) {
      if (transactionSource === 'branch') messages.push('يجب اختيار الفرع')
      else if (transactionSource === 'distributor') messages.push('يجب اختيار الموزع')
      else messages.push('يجب اختيار موظف المبيعات')
    }
    if (deviceLines.length > 0 && !warehouseId) {
      messages.push('يجب اختيار مخزن لبيع الأجهزة')
    }
    if (deviceLines.length === 0) {
      messages.push('يجب إضافة جهاز واحد على الأقل')
    }
    deviceLines.forEach((line, index) => {
      const result = validateDeviceLine(line, minDownPercent, maxInstallmentCount)
      if (!result.valid) {
        messages.push(`جهاز ${index + 1}: ${result.errors[0]}`)
      }
    })
    return messages
  }, [
    submitAttempted,
    selectedCustomer,
    sourceReady,
    transactionSource,
    deviceLines,
    warehouseId,
    minDownPercent,
    maxInstallmentCount,
    contractKind,
    sourceTransferInvoice,
  ])

  const hasDeviceFieldErrors =
    submitAttempted &&
    deviceLines.some((line) => !validateDeviceLine(line, minDownPercent, maxInstallmentCount).valid)
  const hasWarehouseError =
    submitAttempted && !manualDeviceEntry && hasDeviceSale && !warehouseId
  const hasSourceTransferError =
    submitAttempted && contractKind === 'ownership_transfer' && !sourceTransferInvoice

  const branchLabel =
    selectedBranch?.name_ar ||
    selectedBranch?.name ||
    selectedDistributor?.branch?.name_ar ||
    selectedDistributor?.branch?.name ||
    (contextBranchId
      ? (branchesQuery.data ?? []).find((b) => b.id === contextBranchId)?.name_ar ??
        (branchesQuery.data ?? []).find((b) => b.id === contextBranchId)?.name
      : undefined) ||
    undefined

  const submitDisabled =
    checkoutMutation.isPending ||
    !selectedCustomer ||
    !sourceReady ||
    deviceLines.length === 0 ||
    (contractKind === 'ownership_transfer' && !sourceTransferInvoice) ||
    (!manualDeviceEntry && !warehouseId) ||
    (!manualDeviceEntry && !allowNegativeInventory && quantity > available) ||
    !allLinesValid

  const submitInvalid = submitDisabled && !checkoutMutation.isPending

  return (
    <SalesPageShell
      title="تعاقد جديد"
      headerExtra={
        contractKind === 'subscription_renewal' ? (
          <div className="rounded-lg border border-primary/25 bg-primary/5 px-sm py-xs text-sm">
            <span className="text-on-surface-variant">سعر التجديد (25% كاش): </span>
            <span className="font-bold tabular-nums text-primary">
              {renewalReferencePrice.toLocaleString('ar-EG')} ج.م
            </span>
          </div>
        ) : warehouseId ? (
          <PosStockInfoBar
            available={available}
            cashPrice={cashPrice}
            installmentPrice={installmentPrice}
            loading={productQuery.isLoading || stockQuery.isLoading}
            allowNegativeInventory={allowNegativeInventory}
          />
        ) : productQuery.data ? (
          <div className="rounded-lg border border-outline-variant/70 bg-surface-container-low px-sm py-xs text-sm">
            <span className="text-on-surface-variant">كاش: </span>
            <span className="font-bold tabular-nums">{cashPrice.toLocaleString('ar-EG')} ج.م</span>
          </div>
        ) : null
      }
      actions={<StartTourButton tourId="pos" />}
    >
      <PosContractTypeTabs />
      <PosContractKindSelector
        value={contractKind}
        onChange={(kind) => {
          setContractKind(kind)
          if (kind !== 'ownership_transfer') {
            setSourceTransferInvoice(null)
          }
        }}
      />
      {contractKind === 'ownership_transfer' && (
        <p className="mb-md rounded-lg border border-primary/25 bg-primary/5 px-md py-sm text-sm text-on-surface-variant">
          العميل المختار أدناه هو <strong className="text-on-surface">المالك الجديد</strong>. سيتم
          نقل التعاقد والأقساط المتبقية إليه بعد اعتماد نقل الملكية.
        </p>
      )}
      {!manualDeviceEntry && !warehouseId && (
        <p
          className={`mb-md rounded-lg border p-sm text-sm ${
            submitAttempted
              ? 'border-error/30 bg-error/[0.07] text-error'
              : 'border-tertiary/30 bg-tertiary/5 text-on-surface-variant'
          }`}
        >
          يرجى اختيار مخزن من الشريط العلوي لبدء تعاقد الأجهزة.
        </p>
      )}
      <form
        id="pos-checkout-form"
        onSubmit={handleCheckout}
        className="pos-form w-full pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0"
      >
        <div className="grid grid-cols-1 items-start gap-md lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
          <div className="flex min-h-0 min-w-0 flex-col gap-md lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto lg:overscroll-contain lg:pe-1">
            {contractKind === 'ownership_transfer' && (
              <PosOwnershipTransferSection
                selectedSourceInvoice={sourceTransferInvoice}
                onSourceInvoiceChange={setSourceTransferInvoice}
                submitAttempted={submitAttempted}
              />
            )}

            <PosContractHeader
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
              customerLabel={contractKind === 'ownership_transfer' ? 'المالك الجديد' : 'العميل'}
              sectionNumber={contractKind === 'ownership_transfer' ? 2 : 1}
              submitAttempted={submitAttempted}
            />

            <PosSectionCard
              number={contractKind === 'ownership_transfer' ? 3 : 2}
              title="الأجهزة"
              subtitle={
                contractKind === 'ownership_transfer'
                  ? 'بيانات الجهاز من التعاقد الأصلي — الأقساط المتبقية تنتقل للمالك الجديد'
                  : 'حدد عدد الأجهزة وبيانات كل جهاز وطريقة الدفع'
              }
              highlighted={hasDeviceFieldErrors || hasWarehouseError || hasSourceTransferError}
              contentClassName="space-y-md overflow-visible p-sm sm:p-md"
            >
              <PosDevicesToolbar
                quantity={quantity}
                maxQuantity={maxQuantity}
                onQuantityChange={setQuantity}
                enableInstallationFee={contractKind === 'new_contract' && enableInstallationFee}
                applyInstallationFee={applyInstallationFee}
                onApplyInstallationFeeChange={setApplyInstallationFee}
                allowDisableFeeInSale={allowDisableFeeInSale}
                installationFeePerUnit={installationFee}
                onInstallationFeeChange={setInstallationFee}
                feeDiscountAmount={feeDiscountAmount}
                feeDiscountPercent={feeDiscountPercent}
                onFeeDiscountChange={({ amount, percent }) => {
                  setFeeDiscountAmount(amount)
                  setFeeDiscountPercent(percent)
                }}
              />

              {hasDeviceSale ? (
                <div className="flex flex-col gap-md overflow-visible">
                  {deviceLines.map((line, index) => (
                    <DeviceLineCard
                      key={line.key}
                      index={index}
                      line={line}
                      contractDate={contractDate}
                      contractKind={contractKind}
                      product={productQuery.data}
                      cashPrice={cashPrice}
                      installmentPrice={installmentPrice}
                      onChange={(next) => updateDeviceLine(index, next)}
                      minDownPercent={minDownPercent}
                      maxInstallmentCount={maxInstallmentCount}
                      employees={employeesQuery.data ?? []}
                      employeesLoading={employeesQuery.isLoading}
                      showErrors={submitAttempted}
                      hidePaymentSection={contractKind === 'ownership_transfer'}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-on-surface-variant">
                  اختر عدد الأجهزة من الأعلى لبدء إدخال بيانات الأجهزة.
                </p>
              )}
            </PosSectionCard>
          </div>

          <PosContractSummary
            branchLabel={branchLabel}
            contractDate={contractDate}
            devicesSubtotal={devicesSubtotal}
            servicesSubtotal={0}
            netInstallationFeeTotal={netInstallationFeeTotal}
            deviceCount={deviceLines.length}
            paidAtCheckout={paidAtCheckout}
            totalEstimate={totalEstimate}
            promotions={activePromotionsQuery.data ?? []}
            selectedPromotionId={selectedPromotionId}
            onPromotionChange={setSelectedPromotionId}
            showPromotions={deviceLines.length > 0}
            devicesOnly
            validationSummary={validationSummary}
            checkoutError={
              checkoutMutation.isError ? getErrorMessage(checkoutMutation.error) : undefined
            }
            successBlock={
              successMsg && lastInvoice ? (
                <div className="rounded-lg bg-secondary/10 p-sm text-sm text-secondary">
                  <p>{successMsg}</p>
                  <div className="mt-sm flex flex-col gap-1">
                    {(lastInvoice.lines ?? [])
                      .filter((line) => !isServiceInvoiceLine(line))
                      .map((line, index) => {
                        const term = line.payment_term ?? lastInvoice.payment_term
                        const typeLabel = term === 'cash' ? 'كاش' : 'تقسيط'
                        return (
                          <Link
                            key={line.id}
                            to={contractPrintPath(lastInvoice.id, {
                              lineId: line.id,
                              autoPrint: false,
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                          >
                            <Icon name="print" size={18} />
                            طباعة عقد {typeLabel} — جهاز {index + 1}
                          </Link>
                        )
                      })}
                  </div>
                </div>
              ) : undefined
            }
            submitDisabled={submitDisabled}
            submitPending={checkoutMutation.isPending}
            submitInvalid={submitInvalid}
            distributorBalanceAvailable={distributorBalanceAvailable}
            distributorBalanceAmount={distributorBalanceAmount}
            onDistributorBalanceAmountChange={setDistributorBalanceAmount}
          />
        </div>
        <PosMobileCheckoutBar
          totalEstimate={totalEstimate}
          paidAtCheckout={paidAtCheckout}
          submitDisabled={submitDisabled}
          submitPending={checkoutMutation.isPending}
          submitInvalid={submitInvalid}
        />
      </form>
    </SalesPageShell>
  )
}
