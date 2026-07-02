import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type {
  Branch,
  Customer,
  Distributor,
  PaginatedResponse,
  SalesInvoice,
  SalesRep,
  Service,
  ServiceCategory,
  ServiceCheckoutPayload,
} from '../api/types'
import { type ApiPaginated, serviceContractPrintPath } from '../lib/sales'
import { resolveCustomerTransactionSource } from '../lib/posCustomerSource'
import { Icon } from '../components/Icon'
import { PosContractTypeTabs } from '../components/pos/PosContractTypeTabs'
import { SalesPageShell } from '../components/SalesPageShell'
import {
  ServiceContractHeader,
  type TransactionSource,
} from '../components/services/ServiceContractHeader'
import {
  createServiceLine,
  lineInstallmentCount,
  linePaidNow,
  lineTotal,
  ServiceLineCard,
  validateServiceLineInstallment,
  validateServiceLineCash,
  type ServiceLineDraft,
} from '../components/services/ServiceLineCard'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useAuthStore } from '../stores/authStore'
import { useOrgSettingsStore } from '../stores/orgSettingsStore'

interface ServiceSalesPageProps {
  title: string
  subtitle: string
  saleCategory: 'accessories' | 'maintenance'
  defaultLines?: Omit<
    ServiceLineDraft,
    'id' | 'paymentTerm' | 'cashSchedule' | 'downPayment' | 'installmentAmount' | 'intervalType' | 'firstDueDate'
  >[]
  notesPlaceholder?: string
  useCatalog?: boolean
  catalogCategories?: ServiceCategory[]
  showContractTypeTabs?: boolean
}

export function ServiceSalesPage({
  title,
  subtitle,
  saleCategory,
  defaultLines = [],
  notesPlaceholder,
  useCatalog = false,
  catalogCategories,
  showContractTypeTabs = false,
}: ServiceSalesPageProps) {
  const queryClient = useQueryClient()
  const contextBranchId = useAuthStore((s) => s.branchId)
  const salesSettings = useOrgSettingsStore((s) => s.sales)
  const minDownPercent = salesSettings?.min_down_payment_percent ?? 10
  const maxInstallmentCount = salesSettings?.max_installment_months ?? 24

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
  const [lines, setLines] = useState<ServiceLineDraft[]>(() =>
    defaultLines.length > 0
      ? defaultLines.map((line) =>
          createServiceLine(line, { contractDate, minDownPercent }),
        )
      : [],
  )
  const [selectedServiceId, setSelectedServiceId] = useState<number | ''>('')
  const [successMsg, setSuccessMsg] = useState('')
  const [lastInvoice, setLastInvoice] = useState<SalesInvoice | null>(null)
  const [lastInstallmentSale, setLastInstallmentSale] = useState(false)

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
    queryKey: ['branches', 'service-sales'],
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
    queryKey: ['distributors', 'service-sales', debouncedDistributorSearch],
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
    queryKey: ['customers', 'service-sales', debouncedCustomerSearch],
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
    queryKey: ['sales-reps', 'service-sales', debouncedSalesRepSearch],
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
    queryKey: ['services', 'sales', catalogCategories],
    queryFn: async () => {
      const { data } = await api.get<ApiPaginated<Service>>('/services', {
        params: { per_page: 100, 'filter[is_active]': '1' },
      })
      return data
    },
    enabled: useCatalog,
  })

  const catalogServices = useMemo(() => {
    const rows = servicesQuery.data?.data ?? []
    if (!catalogCategories?.length) return rows
    return rows.filter((service) => catalogCategories.includes(service.category))
  }, [servicesQuery.data, catalogCategories])

  const total = useMemo(
    () => lines.reduce((sum, line) => sum + lineTotal(line), 0),
    [lines],
  )

  const paidNow = useMemo(
    () => lines.reduce((sum, line) => sum + linePaidNow(line), 0),
    [lines],
  )

  const balanceDue = Math.max(0, total - paidNow)

  const allLinesValid = lines.every(
    (line) =>
      validateServiceLineInstallment(line, minDownPercent, maxInstallmentCount).valid &&
      validateServiceLineCash(line).valid,
  )

  const sourceReady =
    transactionSource === 'branch'
      ? Boolean(selectedBranch)
      : transactionSource === 'distributor'
        ? Boolean(selectedDistributor)
        : Boolean(selectedSalesRep)

  const saleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer) throw new Error('العميل مطلوب')

      const payload: ServiceCheckoutPayload = {
        customer_id: selectedCustomer.id,
        branch_id: resolvedBranchId ? Number(resolvedBranchId) : undefined,
        sale_category: saleCategory,
        invoice_date: contractDate,
        notes: notes.trim() || undefined,
        items: lines.map((line) => {
          const base = {
            service_id: line.service_id,
            description: line.description,
            unit_price: line.unit_price,
            payment_term: line.paymentTerm,
            cash_schedule: line.paymentTerm === 'cash' ? line.cashSchedule : undefined,
          }

          if (line.paymentTerm === 'installment') {
            return {
              ...base,
              installment_plan: {
                down_payment: line.downPayment,
                installment_amount: line.installmentAmount,
                installment_count: lineInstallmentCount(line, maxInstallmentCount),
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
        }),
      }

      if (transactionSource === 'distributor' && selectedDistributor) {
        payload.distributor_id = selectedDistributor.id
      }

      if (transactionSource === 'sales' && selectedSalesRep) {
        payload.sales_user_id = selectedSalesRep.id
      }

      const { data } = await api.post<SalesInvoice>('/sales-invoices/service-checkout', payload)
      return data
    },
    onSuccess: (invoice) => {
      const hasInstallment = lines.some((line) => line.paymentTerm === 'installment')
      setLastInstallmentSale(hasInstallment)
      setLastInvoice(invoice)
      setSuccessMsg(`تم تسجيل العملية — فاتورة ${invoice.invoice_number ?? `#${invoice.id}`}`)
      setNotes('')
      setLines(
        defaultLines.length > 0
          ? defaultLines.map((line) => createServiceLine(line, { contractDate, minDownPercent }))
          : [],
      )
      setSelectedServiceId('')
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['installments'] })
    },
  })

  const addCatalogLine = () => {
    if (!selectedServiceId) return
    const service = catalogServices.find((item) => item.id === Number(selectedServiceId))
    if (!service) return

    setLines((prev) => [
      ...prev,
      createServiceLine(
        {
          service_id: service.id,
          description: service.name_ar || service.name,
          unit_price: Number(service.cash_price ?? service.default_price),
          cashPrice: Number(service.cash_price ?? service.default_price),
          installmentPrice: Number(service.installment_price ?? service.default_price),
        },
        { contractDate, minDownPercent },
      ),
    ])
    setSelectedServiceId('')
  }

  const addManualLine = () => {
    setLines((prev) => [
      ...prev,
      createServiceLine(
        { description: '', unit_price: 0, cashPrice: 0, installmentPrice: 0 },
        { contractDate, minDownPercent },
      ),
    ])
  }

  const canSubmit =
    Boolean(selectedCustomer) &&
    sourceReady &&
    lines.length > 0 &&
    lines.every((line) => line.description.trim() && line.unit_price > 0) &&
    total > 0 &&
    allLinesValid

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    saleMutation.mutate()
  }

  return (
    <SalesPageShell title={title} subtitle={subtitle}>
      {showContractTypeTabs ? <PosContractTypeTabs /> : null}
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
          <label className="mb-xs block text-sm text-on-surface-variant">ملاحظات</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder={notesPlaceholder}
            className="w-full rounded border border-outline-variant px-sm py-2 text-sm"
          />
        </div>

        <div className="grid gap-md lg:grid-cols-[1fr_minmax(240px,320px)]">
          <div className="space-y-md rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
            <div className="flex items-center justify-between gap-sm">
              <h2 className="font-semibold text-on-surface">البنود</h2>
              {!useCatalog && (
                <button
                  type="button"
                  onClick={addManualLine}
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <Icon name="add" size={18} />
                  إضافة بند
                </button>
              )}
            </div>

            {useCatalog && (
              <div className="flex flex-wrap items-end gap-sm rounded-lg border border-outline-variant/60 bg-surface-container-low p-sm">
                <div className="min-w-[200px] flex-1">
                  <label className="mb-xs block text-sm text-on-surface-variant">اختر خدمة</label>
                  <select
                    value={selectedServiceId}
                    onChange={(e) =>
                      setSelectedServiceId(e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full rounded border border-outline-variant px-sm py-2 text-sm"
                  >
                    <option value="">—</option>
                    {catalogServices.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name_ar || service.name} —{' '}
                        {Number(service.default_price).toLocaleString('ar-EG')} ج.م
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={addCatalogLine}
                  disabled={!selectedServiceId}
                  className="flex items-center gap-1 rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary disabled:opacity-50"
                >
                  <Icon name="add" size={18} />
                  إضافة للبنود
                </button>
              </div>
            )}

            {lines.length === 0 ? (
              <p className="rounded-lg border border-dashed border-outline-variant p-md text-center text-sm text-on-surface-variant">
                {useCatalog ? 'اختر خدمة من الكتalog لإضافتها' : 'أضف بنداً واحداً على الأقل'}
              </p>
            ) : (
              <div className="space-y-sm">
                {lines.map((line, index) => (
                  <ServiceLineCard
                    key={line.id}
                    line={line}
                    index={index}
                    contractDate={contractDate}
                    minDownPercent={minDownPercent}
                    maxInstallmentCount={maxInstallmentCount}
                    onChange={(updated) =>
                      setLines((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
                    }
                    onRemove={() => setLines((prev) => prev.filter((l) => l.id !== line.id))}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-md">
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
              <h2 className="mb-md font-semibold text-on-surface">ملخص الفاتورة</h2>
              <dl className="space-y-sm text-sm">
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
              </dl>
            </div>

            {saleMutation.isError && (
              <p className="text-sm text-error">{getErrorMessage(saleMutation.error)}</p>
            )}
            {successMsg && (
              <div className="space-y-sm rounded-lg bg-secondary/10 p-sm text-sm text-secondary">
                <p>{successMsg}</p>
                {lastInvoice?.lines?.map((line, index) => (
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
              disabled={saleMutation.isPending || !canSubmit}
              className="flex w-full items-center justify-center gap-xs rounded-lg bg-primary py-4 text-base font-bold text-on-primary disabled:opacity-50"
            >
              <Icon name="save" />
              {saleMutation.isPending ? 'جاري الحفظ...' : 'تسجيل العملية'}
            </button>
          </div>
        </div>
      </form>
    </SalesPageShell>
  )
}
