import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { PaginatedResponse } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { SalesPageShell } from '../components/SalesPageShell'
import { openPaymentReceiptPrint } from '../lib/paymentReceipt'

export interface PaymentTransactionRow {
  id: number
  transaction_number: string
  amount: string | number
  refunded_amount?: string | number
  status: string
  payment_source?: string
  payment_method?: string
  paid_at?: string
  customer?: { name?: string }
  sales_invoice?: { invoice_number?: string }
}

const sourceLabels: Record<string, string> = {
  installment: 'قسط',
  external: 'تحصيل خارجي',
  down_payment: 'مقدم',
  pos_cash: 'كاش POS',
  transportation_fee: 'رسوم تنقلات',
  contract_disbursement: 'أمر دفع',
}

type SourceFilter = '' | 'all_payments' | 'contract_disbursement'

export function PaymentsPage() {
  const [statusFilter, setStatusFilter] = useState('active')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all_payments')

  const paymentsQuery = useQuery({
    queryKey: ['payment-transactions', statusFilter, sourceFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 100 }
      if (statusFilter) params.status = statusFilter
      if (sourceFilter === 'contract_disbursement') {
        params.payment_source = 'contract_disbursement'
      }
      const { data } = await api.get<PaginatedResponse<PaymentTransactionRow>>('/payment-transactions', { params })
      return data.data ?? []
    },
  })

  return (
    <SalesPageShell title="سجل المدفوعات" subtitle="عرض عمليات التحصيل وأوامر الدفع">
      <FilterBar
        selects={[
          {
            id: 'source',
            label: 'النوع',
            value: sourceFilter,
            onChange: (v) => setSourceFilter(v as SourceFilter),
            options: [
              { value: 'all_payments', label: 'كل المدفوعات' },
              { value: 'contract_disbursement', label: 'أوامر الدفع' },
            ],
          },
          {
            id: 'status',
            label: 'الحالة',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: '', label: 'الكل' },
              { value: 'active', label: 'نشط' },
              { value: 'refunded', label: 'مُسترد' },
            ],
          },
        ]}
        showClear={Boolean(statusFilter) || sourceFilter !== 'all_payments'}
        onClear={() => {
          setStatusFilter('')
          setSourceFilter('all_payments')
        }}
      />

      <AsyncState isLoading={paymentsQuery.isLoading} isError={paymentsQuery.isError} error={paymentsQuery.error}>
        <DataTable<PaymentTransactionRow>
          data={paymentsQuery.data ?? []}
          keyExtractor={(r) => r.id}
          pageSize={15}
          emptyMessage="لا توجد مدفوعات"
          columns={[
            { key: 'transaction_number', header: 'رقم العملية' },
            { key: 'customer', header: 'العميل', render: (r) => r.customer?.name ?? '—' },
            { key: 'invoice', header: 'فاتورة', render: (r) => r.sales_invoice?.invoice_number ?? '—' },
            {
              key: 'source',
              header: 'المصدر',
              render: (r) => sourceLabels[r.payment_source ?? ''] ?? r.payment_source ?? '—',
            },
            {
              key: 'amount',
              header: 'المبلغ',
              render: (r) => Number(r.amount).toLocaleString('ar-EG'),
            },
            { key: 'status', header: 'الحالة' },
            {
              key: 'actions',
              header: '',
              render: (r) =>
                r.status === 'active' && Number(r.amount) !== 0 ? (
                  <button
                    type="button"
                    onClick={() => openPaymentReceiptPrint(r.id)}
                    className="text-sm text-primary hover:underline"
                  >
                    طباعة
                  </button>
                ) : (
                  '—'
                ),
            },
          ]}
        />
      </AsyncState>
    </SalesPageShell>
  )
}
