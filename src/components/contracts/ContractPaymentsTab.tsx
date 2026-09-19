import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import type { PaymentTransaction, SalesInvoice } from '../../api/types'
import { formatContractMoney, getInstallmentItems } from '../../lib/customerContracts'
import { formatInvoiceDate } from '../../lib/sales'
import { AsyncState } from '../AsyncState'
import { DataTable } from '../DataTable'

const paymentMethodLabels: Record<string, string> = {
  cash: 'نقدي',
  wallet: 'محفظة',
  instapay: 'إنستاباي',
  bank_transfer: 'تحويل بنكي',
  card: 'بطاقة',
  distributor_balance: 'رصيد موزع',
}

interface ContractPaymentsTabProps {
  invoice: SalesInvoice
  active: boolean
}

function formatPaymentMethod(value?: string | null): string {
  if (!value?.trim()) return '—'
  return value
    .split(',')
    .map((method) => method.trim())
    .filter(Boolean)
    .map((method) => paymentMethodLabels[method] ?? method)
    .join(' + ')
}

function installmentLabel(payment: PaymentTransaction): string | number {
  const item = payment.installment_item
  return item?.installment_number ?? item?.sequence ?? '—'
}

export function ContractPaymentsTab({ invoice, active }: ContractPaymentsTabProps) {
  const embeddedPayments = invoice.payment_transactions ?? []
  const hasPaidInstallments = getInstallmentItems(invoice).some(
    (item) => Number(item.paid_amount ?? 0) > 0 || Boolean(item.paid_at),
  )
  const shouldFetchFallback = active && embeddedPayments.length === 0 && hasPaidInstallments

  const fallbackQuery = useQuery({
    queryKey: ['payment-transactions', 'contract', invoice.id],
    queryFn: async () => {
      const { data } = await api.get<{ data: PaymentTransaction[] }>('/payment-transactions', {
        params: { sales_invoice_id: invoice.id, per_page: 100, status: 'active' },
      })
      return data.data ?? []
    },
    enabled: shouldFetchFallback,
  })

  const payments = useMemo(() => {
    const rows = embeddedPayments.length > 0 ? embeddedPayments : (fallbackQuery.data ?? [])
    return [...rows].sort((a, b) => {
      const dateA = a.paid_at ? new Date(a.paid_at).getTime() : 0
      const dateB = b.paid_at ? new Date(b.paid_at).getTime() : 0
      return dateB - dateA
    })
  }, [embeddedPayments, fallbackQuery.data])

  return (
    <section>
      <AsyncState
        isLoading={shouldFetchFallback && fallbackQuery.isLoading}
        isError={shouldFetchFallback && fallbackQuery.isError}
        error={fallbackQuery.error}
      >
        <DataTable<PaymentTransaction>
          data={payments}
          keyExtractor={(row) => row.id}
          pageSize={12}
          emptyMessage="لا توجد مدفوعات على هذا التعاقد"
          columns={[
            {
              key: 'paid_at',
              header: 'التاريخ',
              render: (row) => (row.paid_at ? formatInvoiceDate(row.paid_at) : '—'),
            },
            {
              key: 'amount',
              header: 'المبلغ',
              render: (row) => formatContractMoney(Number(row.amount ?? 0)),
            },
            {
              key: 'payment_method',
              header: 'طريقة الدفع',
              render: (row) => formatPaymentMethod(row.payment_method),
            },
            {
              key: 'installment',
              header: 'القسط',
              render: (row) => installmentLabel(row),
            },
            {
              key: 'collector',
              header: 'المحصّل',
              render: (row) => row.user?.name ?? '—',
            },
            {
              key: 'notes',
              header: 'ملاحظات',
              render: (row) => row.notes?.trim() || '—',
            },
          ]}
        />
      </AsyncState>
    </section>
  )
}
