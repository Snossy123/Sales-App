import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../api/client'
import type { SalesInvoice } from '../../api/types'
import { NumericInput } from '../ui/NumericInput'
import { useAuthStore } from '../../stores/authStore'
import { userCanPerform } from '../../lib/access'
import {
  formatContractMoney,
  type ContractLedger,
} from '../../lib/customerContracts'

interface VerificationLog {
  id: number
  action: 'link' | 'record'
  amount: number
  note: string
  user_name: string | null
  created_at: string
  down_payment: boolean
  installment_item_id: number | null
}

const methods = [
  { value: 'cash', label: 'نقدي' },
  { value: 'wallet', label: 'محفظة' },
  { value: 'instapay', label: 'إنستاباي' },
  { value: 'bank_transfer', label: 'تحويل بنكي' },
  { value: 'card', label: 'بطاقة' },
]

interface PaymentVerificationPanelProps {
  invoice: SalesInvoice
  ledger: ContractLedger
}

export function PaymentVerificationPanel({ invoice, ledger }: PaymentVerificationPanelProps) {
  const user = useAuthStore((s) => s.user)
  const canVerify = userCanPerform(user, 'installments.collect')
  const queryClient = useQueryClient()
  const [target, setTarget] = useState('')
  const [action, setAction] = useState<'record' | 'link'>('record')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paidAt, setPaidAt] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [error, setError] = useState('')

  const history = useQuery({
    queryKey: ['payment-verifications', invoice.id],
    queryFn: async () => {
      const { data } = await api.get<{ data: VerificationLog[] }>(
        `/sales-invoices/${invoice.id}/payment-verifications`,
      )
      return data.data ?? []
    },
  })

  const unlinked = ledger.confirmedPayments.filter(
    (payment) => payment.installment_item_id == null && payment.status !== 'refunded' && payment.status !== 'void',
  )
  const hasGap = ledger.legacyCredit > 0.009 || ledger.downPaymentUnverified > 0.009

  const mutation = useMutation({
    mutationFn: async () => {
      const downPayment = target === 'down'
      const installmentItemId = downPayment ? null : Number(target)
      await api.post(`/sales-invoices/${invoice.id}/payment-verifications`, {
        action,
        down_payment: downPayment,
        installment_item_id: installmentItemId,
        payment_transaction_id: action === 'link' ? Number(transactionId) : null,
        amount: action === 'record' ? Number(amount) : null,
        payment_method: action === 'record' ? paymentMethod : null,
        paid_at: action === 'record' ? paidAt : null,
        collector_user_id: action === 'record' ? user?.id ?? null : null,
      })
    },
    onSuccess: () => {
      setError('')
      setAmount('')
      void queryClient.invalidateQueries({ queryKey: ['sales-invoice', 'contract-detail', String(invoice.id)] })
      void queryClient.invalidateQueries({ queryKey: ['payment-verifications', invoice.id] })
    },
    onError: (err: unknown) => {
      setError(getErrorMessage(err))
    },
  })

  if (!canVerify || !hasGap) {
    return history.data && history.data.length > 0 ? <AuditList rows={history.data} /> : null
  }

  return (
    <section className="mt-md space-y-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
      <h3 className="text-sm font-semibold text-on-surface">مراجعة المبالغ غير المؤكدة</h3>
      <p className="text-xs text-on-surface-variant">
        الربط أو تسجيل سند لا يغيّر مبلغ الجدول الأصلي، ولا يحوّل المبلغ تلقائياً.
      </p>
      <div className="grid gap-sm sm:grid-cols-2">
        <label className="block text-xs text-on-surface-variant">
          البند
          <select
            className="mt-xs w-full rounded-lg border border-outline-variant bg-surface px-sm py-sm text-sm"
            value={target}
            onChange={(event) => {
              const value = event.target.value
              setTarget(value)
              const gap = value === 'down'
                ? ledger.downPaymentUnverified
                : ledger.legacyCredits.find((row) => row.installmentItemId === Number(value))?.amount ?? 0
              setAmount(gap ? String(gap) : '')
            }}
          >
            <option value="">اختر</option>
            {ledger.legacyCredits.map((credit) => (
              <option key={credit.installmentItemId} value={credit.installmentItemId}>
                قسط {credit.installmentNumber ?? credit.installmentItemId} — {formatContractMoney(credit.amount)}
              </option>
            ))}
            {ledger.downPaymentUnverified > 0.009 ? (
              <option value="down">مقدمة — {formatContractMoney(ledger.downPaymentUnverified)}</option>
            ) : null}
          </select>
        </label>
        <label className="block text-xs text-on-surface-variant">
          الإجراء
          <select
            className="mt-xs w-full rounded-lg border border-outline-variant bg-surface px-sm py-sm text-sm"
            value={action}
            onChange={(event) => setAction(event.target.value === 'link' ? 'link' : 'record')}
          >
            <option value="record">تسجيل سند</option>
            <option value="link" disabled={unlinked.length === 0}>ربط سند موجود</option>
          </select>
        </label>
        {action === 'link' ? (
          <label className="block text-xs text-on-surface-variant sm:col-span-2">
            السند
            <select
              className="mt-xs w-full rounded-lg border border-outline-variant bg-surface px-sm py-sm text-sm"
              value={transactionId}
              onChange={(event) => setTransactionId(event.target.value)}
            >
              <option value="">اختر سنداً غير مرتبط بقسط</option>
              {unlinked.map((payment) => (
                <option key={payment.id} value={payment.id}>
                  #{payment.id} — {formatContractMoney(Number(payment.amount ?? 0))}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <>
            <label className="block text-xs text-on-surface-variant">
              المبلغ
              <NumericInput
                type="number"
                min="0"
                step="0.01"
                className="mt-xs w-full rounded-lg border border-outline-variant bg-surface px-sm py-sm text-sm"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>
            <label className="block text-xs text-on-surface-variant">
              طريقة الدفع
              <select
                className="mt-xs w-full rounded-lg border border-outline-variant bg-surface px-sm py-sm text-sm"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
              >
                {methods.map((method) => (
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-on-surface-variant">
              التاريخ
              <input
                type="datetime-local"
                className="mt-xs w-full rounded-lg border border-outline-variant bg-surface px-sm py-sm text-sm"
                value={paidAt}
                onChange={(event) => setPaidAt(event.target.value)}
              />
            </label>
            <p className="text-xs text-on-surface-variant sm:col-span-2">
              المحصّل: {user?.name ?? 'غير مسجّل'}
            </p>
          </>
        )}
      </div>
      {error ? <p className="text-sm text-error">{error}</p> : null}
      <button
        type="button"
        disabled={mutation.isPending || !target}
        onClick={() => mutation.mutate()}
        className="rounded-lg bg-primary px-md py-sm text-sm font-medium text-on-primary disabled:opacity-60"
      >
        تأكيد المراجعة
      </button>
      <AuditList rows={history.data ?? []} />
    </section>
  )
}

function AuditList({ rows }: { rows: VerificationLog[] }) {
  if (rows.length === 0) return null
  return (
    <ul className="space-y-xs text-xs text-on-surface-variant">
      {rows.map((row) => (
        <li key={row.id}>
          {row.note} — {formatContractMoney(row.amount)} — {row.user_name ?? '—'}
        </li>
      ))}
    </ul>
  )
}
