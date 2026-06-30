import { Link } from 'react-router-dom'
import { useMemo, useState, useEffect, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type {
  Branch,
  CheckoutPayload,
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
  Service,
} from '../api/types'
import { contractPrintPath, isServiceInvoiceLine, serviceContractPrintPath } from '../lib/sales'
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
  validateInstallmentLine,
  validateCashLine,
  type DeviceLineDraft,
} from '../components/pos/DeviceLineCard'
import {
  PosContractHeader,
  type TransactionSource,
} from '../components/pos/PosContractHeader'
import type { DiscountMode } from '../lib/discount'
import {
  createServiceLine,
  lineInstallmentCount as serviceLineInstallmentCount,
  linePaidNow as serviceLinePaidNow,
  lineTotal as serviceLineTotal,
  ServiceLineCard,
  validateServiceLineInstallment,
  validateServiceLineCash,
  type ServiceLineDraft,
} from '../components/services/ServiceLineCard'

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
  const salesSettings = useOrgSettingsStore((s) => s.sales)
  const allowNegativeInventory = salesSettings?.allow_negative_inventory ?? false
  const enableInstallationFee = salesSettings?.enable_installation_fee ?? true
  const defaultInstallationFee = salesSettings?.default_installation_fee ?? 500
  const allowDisableFeeInSale = salesSettings?.allow_disable_installation_fee_in_sale ?? true
  const minDownPercent = salesSettings?.min_down_payment_percent ?? 10
  const maxInstallmentCount = salesSettings?.max_installment_months ?? 24

  const [transactionSource, setTransactionSource] = useState<TransactionSource>('distributor')
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
  const [serviceLines, setServiceLines] = useState<ServiceLineDraft[]>([])
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [applyInstallationFee, setApplyInstallationFee] = useState(true)
  const [installationFee, setInstallationFee] = useState(defaultInstallationFee)
  const [feeDiscountAmount, setFeeDiscountAmount] = useState(0)
  const [feeDiscountPercent, setFeeDiscountPercent] = useState(0)
  const [feeDiscountMode, setFeeDiscountMode] = useState<DiscountMode>('amount')
  const [contractDate, setContractDate] = useState(() => new Date().toISOString().split('T')[0])
  const [lastInvoice, setLastInvoice] = useState<SalesInvoice | null>(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [selectedPromotionId, setSelectedPromotionId] = useState<number | ''>('')

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
    queryKey: ['employees', 'pos', resolvedBranchId],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 100,
        'filter[status]': 'active',
      }
      if (resolvedBranchId) params['filter[branch_id]'] = resolvedBranchId
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', { params })
      return data.data
    },
    enabled: Boolean(resolvedBranchId) || Boolean(warehouseId),
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

  const servicesQuery = useQuery({
    queryKey: ['services', 'pos'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Service>>('/services', {
        params: { per_page: 100, 'filter[is_active]': 1 },
      })
      return data.data
    },
  })

  const cashPrice = Number(productQuery.data?.cash_price ?? productQuery.data?.sell_price ?? 0)
  const installmentPrice = Number(
    productQuery.data?.installment_price ?? productQuery.data?.sell_price ?? 0,
  )
  const available = stockQuery.data?.available ?? unitsQuery.data?.length ?? 0
  const maxQuantity = allowNegativeInventory ? 999 : available

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
        const unit = units[i]
        const priceForTerm =
          existing?.paymentTerm === 'cash' ? cashPrice : installmentPrice
        if (existing) {
          next.push({
            ...existing,
            productUnitId: unit?.id ?? existing.productUnitId,
            imei: unit?.imei ?? existing.imei,
            unitPrice: priceForTerm,
            serialNumber: existing.serialNumber || unit?.serial_number || '',
          })
        } else {
          next.push(
            createDeviceLine(installmentPrice, unit, {
              contractDate,
              minDownPercent,
            }),
          )
        }
      }
      return next
    })
  }, [quantity, cashPrice, installmentPrice, unitsQuery.data, contractDate, minDownPercent])

  const grossInstallationFeePerUnit =
    enableInstallationFee && applyInstallationFee ? Number(installationFee) : 0
  const netInstallationFeePerUnit = Math.max(0, grossInstallationFeePerUnit - feeDiscountAmount)
  const netInstallationFeeTotal = netInstallationFeePerUnit * deviceLines.length

  const devicesSubtotal = deviceLines.reduce((sum, line) => sum + lineNetTotal(line), 0)
  const servicesSubtotal = serviceLines.reduce((sum, line) => sum + serviceLineTotal(line), 0)
  const totalEstimate = devicesSubtotal + servicesSubtotal + netInstallationFeeTotal

  const paidAtCheckout = useMemo(() => {
    let paid = netInstallationFeeTotal
    for (const line of deviceLines) {
      const net = lineNetTotal(line)
      paid += linePaidNow(line.paymentTerm, line.cashSchedule, net, line.downPayment)
    }
    for (const line of serviceLines) {
      paid += serviceLinePaidNow(line)
    }
    return paid
  }, [deviceLines, serviceLines, netInstallationFeeTotal])

  const allLinesValid =
    deviceLines.every(
      (line) =>
        validateInstallmentLine(line, minDownPercent, maxInstallmentCount).valid &&
        validateCashLine(line).valid,
    ) &&
    serviceLines.every(
      (line) =>
        validateServiceLineInstallment(line, minDownPercent, maxInstallmentCount).valid &&
        validateServiceLineCash(line).valid,
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
      setSuccessMsg(
        `تم إنشاء التعاقد #${invoice.invoice_number ?? invoice.id} — ${invoice.lines?.length ?? 0} بند`,
      )
      setQuantity(1)
      setServiceLines([])
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

  const updateServiceLine = (index: number, line: ServiceLineDraft) => {
    setServiceLines((prev) => prev.map((item, i) => (i === index ? line : item)))
  }

  const addCatalogService = () => {
    if (!selectedServiceId) return
    const service = (servicesQuery.data ?? []).find((item) => item.id === Number(selectedServiceId))
    if (!service) return

    const cash = Number(service.cash_price ?? service.default_price)
    const installment = Number(service.installment_price ?? service.default_price)

    setServiceLines((prev) => [
      ...prev,
      createServiceLine(
        {
          service_id: service.id,
          description: service.name_ar || service.name,
          unit_price: cash,
          cashPrice: cash,
          installmentPrice: installment,
        },
        { contractDate, minDownPercent },
      ),
    ])
    setSelectedServiceId('')
  }

  const handleCheckout = (e: FormEvent) => {
    e.preventDefault()
    const customerId = selectedCustomer?.id
    const sourceReady =
      transactionSource === 'branch'
        ? Boolean(selectedBranch)
        : transactionSource === 'distributor'
          ? Boolean(selectedDistributor)
          : Boolean(selectedSalesRep)
    const hasDevices = deviceLines.length > 0
    const hasServices = serviceLines.length > 0
    if (!customerId || !sourceReady || (!hasDevices && !hasServices)) return
    if (hasDevices && !warehouseId) return
    if (hasDevices && !allowNegativeInventory && quantity > available) return
    if (!allLinesValid) return

    const units = unitsQuery.data ?? []
    const devicePayload: CheckoutPayload['lines'] = deviceLines.map((line, index) => {
      const unit = units[index]
      const renewalDate =
        line.renewalType === 'annual' ? addDays(contractDate, 365) : undefined
      const base = {
        line_type: 'device' as const,
        product_unit_id: line.productUnitId ?? unit?.id,
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

    const servicePayload: CheckoutPayload['lines'] = serviceLines.map((line) => {
      const base = {
        line_type: 'service' as const,
        service_id: line.service_id,
        description: line.description.trim(),
        unit_price: line.unit_price,
        payment_term: line.paymentTerm,
        cash_schedule: line.paymentTerm === 'cash' ? line.cashSchedule : undefined,
      }

      if (line.paymentTerm === 'installment') {
        return {
          ...base,
          installment_plan: {
            installment_count: serviceLineInstallmentCount(line, maxInstallmentCount),
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

    const lines = [...devicePayload, ...servicePayload]

    if (hasDevices && !allowNegativeInventory && lines.some((l) => l.line_type === 'device' && !l.product_unit_id)) {
      return
    }

    const payload: CheckoutPayload = {
      customer_id: customerId,
      branch_id: resolvedBranchId || undefined,
      installation_fee: grossInstallationFeePerUnit,
      discount_amount: feeDiscountAmount,
      invoice_date: contractDate,
      lines,
    }

    if (hasDevices && warehouseId) {
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

    checkoutMutation.mutate(payload)
  }

  const stickySummary = deviceLines.length + serviceLines.length > 1
  const hasDeviceSale = deviceLines.length > 0

  return (
    <SalesPageShell
      title="تعاقد جديد"
      subtitle="بيع الأجهزة والخدمات من صفحة واحدة — كاش أو قسط لكل بند"
      actions={<StartTourButton tourId="pos" />}
    >
      {!warehouseId && (
        <p className="mb-md rounded-lg border border-tertiary/30 bg-tertiary/5 p-sm text-sm text-on-surface-variant">
          لبيع الأجهزة يرجى اختيار مخزن من الشريط العلوي. يمكنك إضافة الخدمات بدون مخزن.
        </p>
      )}
      <form onSubmit={handleCheckout} className="pos-form flex w-full flex-col gap-md">
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
            productName={productQuery.data?.name_ar || productQuery.data?.name}
            available={available}
            unitPrice={Number(installmentPrice)}
            quantity={quantity}
            maxQuantity={maxQuantity}
            onQuantityChange={setQuantity}
            productLoading={productQuery.isLoading || stockQuery.isLoading}
            allowNegativeInventory={allowNegativeInventory}
            enableInstallationFee={enableInstallationFee}
            applyInstallationFee={applyInstallationFee}
            onApplyInstallationFeeChange={setApplyInstallationFee}
            allowDisableFeeInSale={allowDisableFeeInSale}
            installationFeePerUnit={installationFee}
            onInstallationFeeChange={setInstallationFee}
            feeDiscountAmount={feeDiscountAmount}
            feeDiscountPercent={feeDiscountPercent}
            feeDiscountMode={feeDiscountMode}
            onFeeDiscountChange={({ amount, percent, mode }) => {
              setFeeDiscountAmount(amount)
              setFeeDiscountPercent(percent)
              setFeeDiscountMode(mode)
            }}
            deviceCount={deviceLines.length}
            netInstallationFeeTotal={netInstallationFeeTotal}
          />

          {hasDeviceSale && (
            <div className="flex w-full flex-col gap-md">
              {deviceLines.map((line, index) => (
                <DeviceLineCard
                  key={line.key}
                  index={index}
                  line={line}
                  contractDate={contractDate}
                  cashPrice={cashPrice}
                  installmentPrice={installmentPrice}
                  onChange={(next) => updateDeviceLine(index, next)}
                  minDownPercent={minDownPercent}
                  maxInstallmentCount={maxInstallmentCount}
                  employees={employeesQuery.data ?? []}
                  employeesLoading={employeesQuery.isLoading}
                />
              ))}
            </div>
          )}

          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
            <div className="mb-sm flex flex-wrap items-center justify-between gap-sm">
              <h3 className="font-semibold text-on-surface">الخدمات</h3>
              <div className="flex flex-wrap items-center gap-sm">
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="min-w-[200px] rounded-lg border border-outline-variant px-sm py-2 text-sm"
                >
                  <option value="">اختر خدمة من الكتالوج</option>
                  {(servicesQuery.data ?? []).map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name_ar || service.name} — كاش{' '}
                      {Number(service.cash_price ?? service.default_price).toLocaleString('ar-EG')} /
                      قسط{' '}
                      {Number(service.installment_price ?? service.default_price).toLocaleString('ar-EG')}{' '}
                      ج.م
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addCatalogService}
                  disabled={!selectedServiceId}
                  className="rounded-lg bg-primary px-md py-2 text-sm font-bold text-on-primary disabled:opacity-50"
                >
                  إضافة خدمة
                </button>
              </div>
            </div>

            {serviceLines.length === 0 ? (
              <p className="text-sm text-on-surface-variant">لم تُضف خدمات بعد.</p>
            ) : (
              <div className="flex flex-col gap-md">
                {serviceLines.map((line, index) => (
                  <ServiceLineCard
                    key={line.id}
                    line={line}
                    index={index}
                    contractDate={contractDate}
                    minDownPercent={minDownPercent}
                    maxInstallmentCount={maxInstallmentCount}
                    onChange={(next) => updateServiceLine(index, next)}
                    onRemove={() =>
                      setServiceLines((prev) => prev.filter((_, i) => i !== index))
                    }
                  />
                ))}
              </div>
            )}
          </div>

          <div
            className={`w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-md ${
              stickySummary ? 'sticky bottom-0 z-10 border-t shadow-md' : ''
            }`}
          >
            <div className="mb-sm grid gap-sm text-sm text-on-surface-variant md:grid-cols-3">
              {(activePromotionsQuery.data?.length ?? 0) > 0 && deviceLines.length > 0 && (
                <div className="md:col-span-3 rounded-lg border border-primary/30 bg-primary/5 p-sm">
                  <label className="mb-xs block text-sm font-medium text-on-surface">عروض نشطة</label>
                  <select
                    value={selectedPromotionId}
                    onChange={(e) =>
                      setSelectedPromotionId(e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full rounded-lg border border-outline-variant px-sm py-2 text-sm"
                  >
                    <option value="">بدون عرض</option>
                    {(activePromotionsQuery.data ?? []).map((promo) => (
                      <option key={promo.id} value={promo.id}>
                        {promo.name_ar}
                        {promo.promotion_type === 'percent'
                          ? ` (${promo.discount_value}%)`
                          : ` (${Number(promo.discount_value).toLocaleString('ar-EG')} ج.م)`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-between tabular-nums md:flex-col md:gap-xs">
                <span>قيمة الأجهزة (بعد الخصم)</span>
                <span className="font-medium text-on-surface">
                  {devicesSubtotal.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
              <div className="flex justify-between tabular-nums md:flex-col md:gap-xs">
                <span>قيمة الخدمات</span>
                <span className="font-medium text-on-surface">
                  {servicesSubtotal.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
              <div className="flex justify-between tabular-nums md:flex-col md:gap-xs">
                <span>رسوم التركيب ({deviceLines.length} × جهاز)</span>
                <span className="font-medium text-on-surface">
                  {netInstallationFeeTotal.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
              <div className="flex justify-between tabular-nums md:flex-col md:gap-xs">
                <span>المطلوب عند التعاقد</span>
                <span className="font-medium text-on-surface">
                  {paidAtCheckout.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
            </div>
            <p className="mb-sm text-lg font-bold tabular-nums">
              إجمالي التعاقد: {totalEstimate.toLocaleString('ar-EG')} ج.م
            </p>
            {checkoutMutation.isError && (
              <p className="mb-sm text-sm text-error">
                {getErrorMessage(checkoutMutation.error)}
              </p>
            )}
            {successMsg && lastInvoice && (
              <div className="mb-sm rounded-lg bg-secondary/10 p-sm text-sm text-secondary">
                <p>{successMsg}</p>
                <div className="mt-sm flex flex-col gap-1">
                  {(lastInvoice.lines ?? [])
                    .filter((line) => !isServiceInvoiceLine(line))
                    .map((line, index) => (
                      <Link
                        key={line.id}
                        to={contractPrintPath(lastInvoice.id, { lineId: line.id, autoPrint: false })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                      >
                        <Icon name="print" size={18} />
                        طباعة عقد الجهاز {index + 1}
                      </Link>
                    ))}
                  {(lastInvoice.lines ?? [])
                    .filter((line) => isServiceInvoiceLine(line))
                    .map((line, index) => (
                      <Link
                        key={line.id}
                        to={serviceContractPrintPath(lastInvoice.id, line.id, { autoPrint: false })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                      >
                        <Icon name="print" size={18} />
                        طباعة عقد الخدمة {index + 1}
                        {line.description ? ` — ${line.description}` : ''}
                      </Link>
                    ))}
                </div>
              </div>
            )}
            <button
              type="submit"
              data-tour="pos-submit"
              disabled={
                checkoutMutation.isPending ||
                !selectedCustomer ||
                (transactionSource === 'branch'
                  ? !selectedBranch
                  : transactionSource === 'distributor'
                    ? !selectedDistributor
                    : !selectedSalesRep) ||
                (deviceLines.length === 0 && serviceLines.length === 0) ||
                (hasDeviceSale && !warehouseId) ||
                (hasDeviceSale && !allowNegativeInventory && quantity > available) ||
                !allLinesValid ||
                serviceLines.some((line) => !line.description.trim() || line.unit_price <= 0)
              }
              className="flex w-full items-center justify-center gap-xs rounded-lg bg-secondary py-4 text-base font-bold text-on-secondary transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Icon name="check_circle" />
              {checkoutMutation.isPending ? 'جاري الحفظ...' : 'إتمام التعاقد'}
            </button>
          </div>
        </form>
    </SalesPageShell>
  )
}
