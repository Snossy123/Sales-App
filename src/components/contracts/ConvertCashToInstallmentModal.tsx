import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../api/client'
import type { ConvertToInstallmentPreview, SalesInvoice } from '../../api/types'
import { formatAccountingMoney, formatDate } from '../../lib/format'
import { computeInstallmentCount, installmentCountExceedsMaxMessage } from '../../lib/sales'
import { Modal } from '../Modal'
import { NumericInput } from '../ui/NumericInput'
import { AsyncState } from '../AsyncState'

interface Props {
  invoice: SalesInvoice | null
  open: boolean
  onClose: () => void
  onSuccess?: (invoice: SalesInvoice) => void
}

export function ConvertCashToInstallmentModal({ invoice, open, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient()
  const [intervalType, setIntervalType] = useState<'monthly' | 'weekly'>('monthly')
  const [installmentAmount, setInstallmentAmount] = useState('')

  useEffect(() => {
    if (open) {
      setIntervalType('monthly')
      setInstallmentAmount('')
    }
  }, [open, invoice?.id])

  const previewQuery = useQuery({
    queryKey: ['convert-to-installment-preview', invoice?.id],
    queryFn: async () => {
      const { data } = await api.get<ConvertToInstallmentPreview>(
        `/sales-invoices/${invoice!.id}/convert-to-installment-preview`,
      )
      return data
    },
    enabled: open && Boolean(invoice?.id),
  })

  const preview = previewQuery.data
  const amount = Number(installmentAmount)
  const count =
    preview && amount > 0
      ? computeInstallmentCount(preview.new_total, amount, preview.paid_amount)
      : 0
  const countError = preview
    ? installmentCountExceedsMaxMessage(count, preview.max_installment_months)
    : null
  const firstDue = preview?.suggested_first_due_date[intervalType]

  const convertMutation = useMutation({
    mutationFn: async () => {
      if (!invoice) throw new Error('لم يُحدد العقد')
      const { data } = await api.post<SalesInvoice>(
        `/sales-invoices/${invoice.id}/convert-to-installment`,
        {
          interval_type: intervalType,
          installment_amount: amount,
        },
      )
      return data
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['sales-invoice'] })
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] })
      onSuccess?.(updated)
      onClose()
    },
  })

  return (
    <Modal open={open} onClose={onClose} title="تحويل من كاش لقسط" size="md">
      <AsyncState
        isLoading={previewQuery.isLoading}
        isError={previewQuery.isError}
        error={previewQuery.error}
      >
        {preview && (
          <div className="space-y-md">
            <dl className="grid grid-cols-2 gap-sm text-sm">
              <div>
                <dt className="text-on-surface-variant">المتبقي</dt>
                <dd className="font-medium tabular-nums">{formatAccountingMoney(preview.remaining)}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">فرق سعر القسط</dt>
                <dd className="font-medium tabular-nums">{formatAccountingMoney(preview.price_diff)}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">سعر الكاش</dt>
                <dd className="tabular-nums">{formatAccountingMoney(preview.cash_price)}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">سعر القسط</dt>
                <dd className="tabular-nums">{formatAccountingMoney(preview.installment_price)}</dd>
              </div>
              <div className="col-span-2 rounded-lg bg-surface-container-low px-sm py-sm">
                <dt className="text-on-surface-variant">المبلغ المموّل</dt>
                <dd className="text-base font-bold tabular-nums">
                  {formatAccountingMoney(preview.financed_amount)}
                </dd>
              </div>
            </dl>

            <p className="text-xs text-on-surface-variant">
              فترة السماح {preview.grace_days} يوم من تاريخ التعاقد
              {preview.invoice_date ? ` (${formatDate(preview.invoice_date)})` : ''}.
              {preview.within_grace
                ? ` متبقي ${preview.grace_days_remaining} يوم.`
                : ' انتهت فترة السماح — الإجراء ما زال متاحاً.'}
            </p>

            <label className="block text-sm">
              <span className="mb-xs block text-on-surface-variant">فترة القسط</span>
              <select
                value={intervalType}
                onChange={(e) => setIntervalType(e.target.value as 'monthly' | 'weekly')}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-2"
              >
                <option value="monthly">شهري</option>
                <option value="weekly">أسبوعي</option>
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-xs block text-on-surface-variant">قيمة القسط</span>
              <NumericInput
                type="number"
                min={0.01}
                step={0.01}
                value={installmentAmount}
                onChange={(e) => setInstallmentAmount(e.target.value)}
                className="w-full rounded-lg border border-outline-variant px-sm py-2"
                dir="ltr"
              />
            </label>

            {count > 0 ? (
              <p className="text-sm">
                عدد الأقساط: <span className="font-bold tabular-nums">{count}</span>
                {firstDue ? (
                  <span className="text-on-surface-variant">
                    {' '}
                    — أول استحقاق {formatDate(firstDue)}
                  </span>
                ) : null}
              </p>
            ) : null}

            {countError ? <p className="text-sm text-error">{countError}</p> : null}
            {convertMutation.isError ? (
              <p className="text-sm text-error">{getErrorMessage(convertMutation.error)}</p>
            ) : null}

            <div className="flex justify-end gap-sm">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-outline-variant px-md py-sm text-sm"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={amount <= 0 || Boolean(countError) || convertMutation.isPending}
                onClick={() => convertMutation.mutate()}
                className="rounded-lg bg-primary px-md py-sm text-sm font-medium text-on-primary disabled:opacity-50"
              >
                {convertMutation.isPending ? 'جاري التحويل...' : 'تأكيد التحويل'}
              </button>
            </div>
          </div>
        )}
      </AsyncState>
    </Modal>
  )
}
