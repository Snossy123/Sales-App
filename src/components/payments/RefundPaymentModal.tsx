import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../api/client'
import { Modal } from '../Modal'

export interface RefundPaymentTarget {
  id: number
  transaction_number?: string
  amount: string | number
  refunded_amount?: string | number
}

interface Props {
  payment: RefundPaymentTarget | null
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  invalidateKeys?: string[][]
}

export function RefundPaymentModal({
  payment,
  open,
  onClose,
  onSuccess,
  invalidateKeys = [['payment-transactions']],
}: Props) {
  const queryClient = useQueryClient()
  const [refundAmount, setRefundAmount] = useState(0)
  const [refundReason, setRefundReason] = useState('')

  const maxRefundable = payment
    ? Math.max(0, Number(payment.amount) - Number(payment.refunded_amount ?? 0))
    : 0

  useEffect(() => {
    if (payment) {
      setRefundAmount(maxRefundable)
      setRefundReason('')
    }
  }, [payment, maxRefundable])

  const refundMutation = useMutation({
    mutationFn: async () => {
      if (!payment) throw new Error('لم يُحدد دفع')
      const { data } = await api.post(`/payment-transactions/${payment.id}/refund`, {
        amount: refundAmount,
        refund_reason: refundReason || undefined,
      })
      return data
    },
    onSuccess: () => {
      invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }))
      onSuccess?.()
      onClose()
    },
  })

  return (
    <Modal open={open} onClose={onClose} title="استرداد مبلغ">
      {payment && (
        <div className="space-y-sm">
          <p className="text-sm text-on-surface-variant">
            العملية: {payment.transaction_number ?? payment.id} — الحد الأقصى{' '}
            {maxRefundable.toLocaleString('ar-EG')} ج.م
          </p>
          <input
            type="number"
            min={0.01}
            max={maxRefundable}
            value={refundAmount}
            onChange={(e) => setRefundAmount(Number(e.target.value))}
            className="w-full rounded border border-outline-variant px-sm py-2"
          />
          <textarea
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            placeholder="سبب الاسترداد..."
            rows={2}
            className="w-full rounded border border-outline-variant px-sm py-2 text-sm"
          />
          {refundMutation.isError && (
            <p className="text-sm text-error">{getErrorMessage(refundMutation.error)}</p>
          )}
          <button
            type="button"
            onClick={() => refundMutation.mutate()}
            disabled={refundMutation.isPending || refundAmount <= 0}
            className="w-full rounded-lg bg-primary py-2 font-bold text-on-primary disabled:opacity-60"
          >
            {refundMutation.isPending ? 'جاري الاسترداد...' : 'تأكيد الاسترداد'}
          </button>
        </div>
      )}
    </Modal>
  )
}
