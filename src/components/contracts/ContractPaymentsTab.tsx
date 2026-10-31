import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import type { PaymentTransaction, SalesInvoice } from '../../api/types'
import { formatContractMoney, reconcileContractLedger } from '../../lib/customerContracts'
import { PaymentVerificationPanel } from './PaymentVerificationPanel'
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

function recordedOrMissing(value?: string | null): string {
  return value?.trim() ? value.trim() : 'غير مسجّل'
}

function formatPaymentMethod(value?: string | null): string {
  if (!value?.trim()) return 'غير مسجّل'
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
  const shouldFetchFallback = active && embeddedPayments.length === 0

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

  const ledgerSource = useMemo(
    () => (embeddedPayments.length > 0 ? invoice : { ...invoice, payment_transactions: fallbackQuery.data ?? [] }),
    [embeddedPayments.length, fallbackQuery.data, invoice],
  )
  const ledger = useMemo(() => reconcileContractLedger(ledgerSource), [ledgerSource])

  const payments = useMemo(() => {
    return ledger.confirmedPayments
      .slice()
      .sort((a, b) => {
        const dateA = a.paid_at ? new Date(a.paid_at).getTime() : 0
        const dateB = b.paid_at ? new Date(b.paid_at).getTime() : 0
        return dateB - dateA
      })
  }, [ledger.confirmedPayments])

  const legacyCredits = ledger.legacyCredits

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
              render: (row) => (row.paid_at ? formatInvoiceDate(row.paid_at) : 'غير مسجّل'),
            },
            {
              key: 'amount',
              header: 'المبلغ',
              render: (row) => (
                <span className="whitespace-nowrap">{formatContractMoney(Number(row.amount ?? 0))}</span>
              ),
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
              render: (row) => recordedOrMissing(row.user?.name),
            },
            {
              key: 'notes',
              header: 'ملاحظات',
              render: (row) => row.notes?.trim() || '—',
            },
          ]}
        />
        {legacyCredits.length > 0 ? (
          <div className="mt-md">
            <h3 className="mb-sm text-sm font-semibold text-on-surface">سجل قديم غير مؤكد</h3>
            <p className="mb-sm text-xs text-on-surface-variant">
              مبالغ ظاهرة في جدول الأقساط بدون سند تحصيل. لا تُحسب ضمن المسدد المؤكد.
            </p>
            <DataTable
              data={legacyCredits}
              keyExtractor={(row) => row.installmentItemId}
              pageSize={12}
              columns={[
                {
                  key: 'label',
                  header: 'الحالة',
                  render: () => 'سجل قديم غير مؤكد',
                },
                {
                  key: 'installment',
                  header: 'القسط',
                  render: (row) => row.installmentNumber ?? '—',
                },
                {
                  key: 'amount',
                  header: 'المبلغ',
                  render: (row) => formatContractMoney(row.amount),
                },
                {
                  key: 'paidAt',
                  header: 'تاريخ الجدول',
                  render: (row) => (row.paidAt ? formatInvoiceDate(row.paidAt) : '—'),
                },
              ]}
            />
          </div>
        ) : null}
        <PaymentVerificationPanel invoice={ledgerSource} ledger={ledger} />
      </AsyncState>
    </section>
  )
}
