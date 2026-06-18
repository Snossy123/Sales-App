import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { PaginatedResponse } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { RefundPaymentModal, type RefundPaymentTarget } from '../components/payments/RefundPaymentModal'
import { SalesPageShell } from '../components/SalesPageShell'

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
  pos_cash: 'نقدي POS',
}

export function PaymentsPage() {
  const [statusFilter, setStatusFilter] = useState('active')
  const [refundTarget, setRefundTarget] = useState<RefundPaymentTarget | null>(null)

  const paymentsQuery = useQuery({
    queryKey: ['payment-transactions', statusFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 100 }
      if (statusFilter) params.status = statusFilter
      const { data } = await api.get<PaginatedResponse<PaymentTransactionRow>>('/payment-transactions', { params })
      return data.data ?? []
    },
  })

  return (
    <SalesPageShell title="سجل المدفوعات" subtitle="عرض واسترداد عمليات التحصيل">
      <FilterBar
        selects={[
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
        showClear={Boolean(statusFilter)}
        onClear={() => setStatusFilter('')}
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
                r.status === 'active' && Number(r.amount) > 0 ? (
                  <button type="button" onClick={() => setRefundTarget(r)} className="text-sm text-primary hover:underline">
                    استرداد
                  </button>
                ) : (
                  '—'
                ),
            },
          ]}
        />
      </AsyncState>

      <RefundPaymentModal
        payment={refundTarget}
        open={Boolean(refundTarget)}
        onClose={() => setRefundTarget(null)}
        invalidateKeys={[['payment-transactions']]}
      />
    </SalesPageShell>
  )
}
