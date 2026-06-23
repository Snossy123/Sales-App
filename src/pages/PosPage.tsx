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
} from '../api/types'
import { contractPrintPath } from '../lib/sales'
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
  type DeviceLineDraft,
} from '../components/pos/DeviceLineCard'
import {
  PosContractHeader,
  type TransactionSource,
} from '../components/pos/PosContractHeader'
import type { DiscountMode } from '../lib/discount'

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export function PosPage() {
  usePageTour('pos')
  const queryClient = useQueryClient()
  const warehouseId = useAuthStore((s) => s.warehouseId)
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
      ? selectedBranch?.id ?? ''
      : transactionSource === 'distributor'
        ? selectedDistributor?.branch_id ?? ''
        : selectedSalesRep?.branch_id ?? ''

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
    enabled: Boolean(warehouseId),
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
    enabled: transactionSource === 'sales' && Boolean(warehouseId),
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
    enabled: Boolean(warehouseId),
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

  const unitPrice = productQuery.data?.sell_price ?? 0
  const available = stockQuery.data?.available ?? unitsQuery.data?.length ?? 0
  const maxQuantity = allowNegativeInventory ? 999 : available

  useEffect(() => {
    const units = unitsQuery.data ?? []
    setDeviceLines((prev) => {
      const next: DeviceLineDraft[] = []
      for (let i = 0; i < quantity; i++) {
        const existing = prev[i]
        const unit = units[i]
        if (existing) {
          next.push({
            ...existing,
            productUnitId: unit?.id ?? existing.productUnitId,
            imei: unit?.imei ?? existing.imei,
            unitPrice: Number(unitPrice),
            serialNumber: existing.serialNumber || unit?.serial_number || '',
          })
        } else {
          next.push(
            createDeviceLine(Number(unitPrice), unit, {
              contractDate,
              minDownPercent,
            }),
          )
        }
      }
      return next
    })
  }, [quantity, unitPrice, unitsQuery.data, contractDate, minDownPercent])

  const grossInstallationFeePerUnit =
    enableInstallationFee && applyInstallationFee ? Number(installationFee) : 0
  const netInstallationFeePerUnit = Math.max(0, grossInstallationFeePerUnit - feeDiscountAmount)
  const netInstallationFeeTotal = netInstallationFeePerUnit * deviceLines.length

  const devicesSubtotal = deviceLines.reduce((sum, line) => sum + lineNetTotal(line), 0)
  const totalEstimate = devicesSubtotal + netInstallationFeeTotal

  const paidAtCheckout = useMemo(() => {
    let paid = netInstallationFeeTotal
    for (const line of deviceLines) {
      const net = lineNetTotal(line)
      if (line.paymentTerm === 'cash') {
        paid += net
      } else {
        paid += line.downPayment
      }
    }
    return paid
  }, [deviceLines, netInstallationFeeTotal])

  const allInstallmentLinesValid = deviceLines.every(
    (line) => validateInstallmentLine(line, minDownPercent, maxInstallmentCount).valid,
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
        `تم إنشاء التعاقد #${invoice.invoice_number ?? invoice.id} — ${invoice.lines?.length ?? 1} جهاز`,
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
    const customerId = selectedCustomer?.id
    const sourceReady =
      transactionSource === 'branch'
        ? Boolean(selectedBranch)
        : transactionSource === 'distributor'
          ? Boolean(selectedDistributor)
          : Boolean(selectedSalesRep)
    if (!customerId || !sourceReady || !warehouseId || quantity <= 0 || deviceLines.length === 0) return
    if (!allowNegativeInventory && quantity > available) return
    if (!allInstallmentLinesValid) return

    const units = unitsQuery.data ?? []
    const lines: CheckoutPayload['lines'] = deviceLines.map((line, index) => {
      const unit = units[index]
      const renewalDate =
        line.renewalType === 'annual' ? addDays(contractDate, 365) : undefined
      const base = {
        product_unit_id: line.productUnitId ?? unit?.id,
        unit_price: line.unitPrice,
        discount: line.discountAmount,
        serial_number: line.serialNumber.trim() || undefined,
        sim_number: line.simNumber.trim() || undefined,
        username: line.username.trim() || undefined,
        payment_term: line.paymentTerm,
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

      return base
    })

    if (!allowNegativeInventory && lines.some((l) => !l.product_unit_id)) return

    const payload: CheckoutPayload = {
      customer_id: customerId,
      warehouse_id: warehouseId,
      branch_id: resolvedBranchId || undefined,
      installation_fee: grossInstallationFeePerUnit,
      discount_amount: feeDiscountAmount,
      invoice_date: contractDate,
      lines,
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

  const stickySummary = deviceLines.length > 1

  return (
    <SalesPageShell
      title="تعاقد جديد"
      subtitle="الهيدر: بيانات التعاقد والمنتج — كل جهاز بعرض كامل تحته"
      actions={<StartTourButton tourId="pos" />}
    >
      {!warehouseId ? (
        <p className="text-on-surface-variant">يرجى اختيار مخزن قبل إتمام التعاقد.</p>
      ) : (
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
            unitPrice={Number(unitPrice)}
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

          <div className="flex w-full flex-col gap-md">
            {deviceLines.map((line, index) => (
              <DeviceLineCard
                key={line.key}
                index={index}
                line={line}
                contractDate={contractDate}
                onChange={(next) => updateDeviceLine(index, next)}
                minDownPercent={minDownPercent}
                maxInstallmentCount={maxInstallmentCount}
                employees={employeesQuery.data ?? []}
                employeesLoading={employeesQuery.isLoading}
              />
            ))}
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
                  {(lastInvoice.lines ?? []).map((line, index) => (
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
                quantity <= 0 ||
                deviceLines.length === 0 ||
                (!allowNegativeInventory && quantity > available) ||
                !allInstallmentLinesValid
              }
              className="flex w-full items-center justify-center gap-xs rounded-lg bg-secondary py-4 text-base font-bold text-on-secondary transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Icon name="check_circle" />
              {checkoutMutation.isPending ? 'جاري الحفظ...' : 'إتمام التعاقد'}
            </button>
          </div>
        </form>
      )}
    </SalesPageShell>
  )
}
