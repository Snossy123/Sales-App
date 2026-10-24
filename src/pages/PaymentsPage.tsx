import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { PaginatedResponse } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { KpiCard } from '../components/KpiCard'
import { Pagination } from '../components/Pagination'
import { SalesPageShell } from '../components/SalesPageShell'
import { PaymentOriginLink } from '../components/payments/PaymentOriginLink'
import { RefundPaymentModal, type RefundPaymentTarget } from '../components/payments/RefundPaymentModal'
import { openPaymentReceiptPrint } from '../lib/paymentReceipt'
import { userCanPerform } from '../lib/access'
import { useAuthStore } from '../stores/authStore'

export interface PaymentTransactionRow {
  id: number
  transaction_number: string
  amount: string | number
  refunded_amount?: string | number
  status: string
  payment_source?: string
  source_label?: string
  payment_method?: string
  paid_at?: string
  customer?: { name?: string }
  sales_invoice?: { id?: number; invoice_number?: string }
}

interface PaymentsListResponse extends PaginatedResponse<PaymentTransactionRow> {
  total_amount?: string | number
}

const sourceLabels: Record<string, string> = {
  installment: 'قسط',
  external: 'تحصيل خارجي',
  down_payment: 'مقدم',
  pos_cash: 'دفعة تعاقد كاش',
  transportation_fee: 'رسوم تنقلات',
  distributor_balance: 'رصيد عمولة',
  contract_disbursement: 'أمر دفع',
}

type SourceFilter = '' | 'all_payments' | 'contract_disbursement'
type PaymentPeriod = 'day' | 'week' | 'month' | 'year' | 'custom'

const periodOptions: { id: PaymentPeriod; label: string }[] = [
  { id: 'day', label: 'يوم' },
  { id: 'week', label: 'أسبوع' },
  { id: 'month', label: 'شهر' },
  { id: 'year', label: 'سنة' },
  { id: 'custom', label: 'مخصص' },
]

function formatMoney(value: string | number | undefined) {
  return Number(value ?? 0).toLocaleString('ar-EG', { numberingSystem: 'latn' })
}

function formatPaidAt(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const day = date.toLocaleDateString('en-GB', { numberingSystem: 'latn' })
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    numberingSystem: 'latn',
  })
  return `${day} ${time}`
}

export function PaymentsPage() {
  const user = useAuthStore((s) => s.user)
  const canRefund = userCanPerform(user, 'payments.refund')
  const [statusFilter, setStatusFilter] = useState('active')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all_payments')
  const [period, setPeriod] = useState<PaymentPeriod>('day')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [refundTarget, setRefundTarget] = useState<RefundPaymentTarget | null>(null)

  const customReady = period !== 'custom' || Boolean(dateFrom || dateTo)

  const paymentsQuery = useQuery({
    queryKey: ['payment-transactions', statusFilter, sourceFilter, period, dateFrom, dateTo, search, page],
    enabled: customReady,
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 15, page }
      if (statusFilter) params.status = statusFilter
      if (sourceFilter === 'contract_disbursement') {
        params.payment_source = 'contract_disbursement'
      }
      if (search.trim()) params.search = search.trim()
      if (period === 'custom') {
        if (dateFrom) params.paid_from = dateFrom
        if (dateTo) params.paid_to = dateTo
      } else {
        params.period = period
      }
      const { data } = await api.get<PaymentsListResponse>('/payment-transactions', { params })
      return data
    },
  })

  const rows = paymentsQuery.data?.data ?? []
  const hasFilters =
    Boolean(search.trim()) ||
    statusFilter !== 'active' ||
    sourceFilter !== 'all_payments' ||
    period !== 'day' ||
    Boolean(dateFrom || dateTo)

  return (
    <SalesPageShell title="سجل المدفوعات" subtitle="عرض عمليات التحصيل وأوامر الدفع">
      <div className="mb-md flex flex-wrap items-center gap-sm">
        <span className="text-xs font-medium text-on-surface-variant">الفترة:</span>
        <div className="flex flex-wrap gap-1 rounded-lg border border-outline-variant bg-surface-container-low p-0.5">
          {periodOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                setPeriod(opt.id)
                setPage(1)
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                period === opt.id
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <FilterBar
        search={search}
        onSearchChange={(value) => {
          setSearch(value)
          setPage(1)
        }}
        searchPlaceholder="بحث بالعميل"
        dateFrom={period === 'custom' ? dateFrom : undefined}
        dateTo={period === 'custom' ? dateTo : undefined}
        onDateFromChange={
          period === 'custom'
            ? (value) => {
                setDateFrom(value)
                setPage(1)
              }
            : undefined
        }
        onDateToChange={
          period === 'custom'
            ? (value) => {
                setDateTo(value)
                setPage(1)
              }
            : undefined
        }
        selects={[
          {
            id: 'source',
            label: 'النوع',
            value: sourceFilter,
            onChange: (v) => {
              setSourceFilter(v as SourceFilter)
              setPage(1)
            },
            options: [
              { value: 'all_payments', label: 'كل المدفوعات' },
              { value: 'contract_disbursement', label: 'أوامر الدفع' },
            ],
          },
          {
            id: 'status',
            label: 'الحالة',
            value: statusFilter,
            onChange: (value) => {
              setStatusFilter(value)
              setPage(1)
            },
            options: [
              { value: '', label: 'الكل' },
              { value: 'active', label: 'نشط' },
              { value: 'refunded', label: 'مُسترد' },
            ],
          },
        ]}
        showClear={hasFilters}
        onClear={() => {
          setStatusFilter('active')
          setSourceFilter('all_payments')
          setPeriod('day')
          setDateFrom('')
          setDateTo('')
          setSearch('')
          setPage(1)
        }}
      />

      {customReady && paymentsQuery.data ? (
        <div className="mb-md max-w-sm">
          <KpiCard label="إجمالي المدفوعات" value={`${formatMoney(paymentsQuery.data.total_amount)} ج.م`} icon="payments" />
        </div>
      ) : null}

      {customReady ? (
        <AsyncState isLoading={paymentsQuery.isLoading} isError={paymentsQuery.isError} error={paymentsQuery.error}>
          <DataTable<PaymentTransactionRow>
            data={rows}
            keyExtractor={(r) => r.id}
            emptyMessage="لا توجد مدفوعات"
            columns={[
              { key: 'transaction_number', header: 'رقم العملية' },
              { key: 'customer', header: 'العميل', render: (r) => r.customer?.name ?? '—' },
              {
                key: 'invoice',
                header: 'فاتورة',
                render: (r) => (
                  <PaymentOriginLink invoiceId={r.sales_invoice?.id}>
                    {r.sales_invoice?.invoice_number ?? '—'}
                  </PaymentOriginLink>
                ),
              },
              {
                key: 'source',
                header: 'المصدر',
                render: (r) => (
                  <PaymentOriginLink invoiceId={r.sales_invoice?.id}>
                    {r.source_label || sourceLabels[r.payment_source ?? ''] || r.payment_source || '—'}
                  </PaymentOriginLink>
                ),
              },
              { key: 'paid_at', header: 'تاريخ العملية', render: (r) => formatPaidAt(r.paid_at) },
              {
                key: 'amount',
                header: 'المبلغ',
                render: (r) => formatMoney(r.amount),
              },
              { key: 'status', header: 'الحالة' },
              {
                key: 'actions',
                header: '',
                render: (r) => (
                  <div className="flex flex-wrap gap-2">
                    {r.status === 'active' && Number(r.amount) !== 0 ? (
                      <button
                        type="button"
                        onClick={() => openPaymentReceiptPrint(r.id)}
                        className="text-sm text-primary hover:underline"
                      >
                        طباعة
                      </button>
                    ) : null}
                    {canRefund && r.status === 'active' && Number(r.amount) > 0 ? (
                      <button
                        type="button"
                        onClick={() => setRefundTarget(r)}
                        className="text-sm text-error hover:underline"
                      >
                        استرداد
                      </button>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
          {paymentsQuery.data ? (
            <Pagination
              currentPage={paymentsQuery.data.current_page}
              lastPage={paymentsQuery.data.last_page}
              total={paymentsQuery.data.total}
              onPageChange={setPage}
            />
          ) : null}
        </AsyncState>
      ) : (
        <p className="text-sm text-on-surface-variant">حدد تاريخ البداية أو النهاية لعرض المدفوعات.</p>
      )}

      <RefundPaymentModal
        payment={refundTarget}
        open={refundTarget !== null}
        onClose={() => setRefundTarget(null)}
      />
    </SalesPageShell>
  )
}
