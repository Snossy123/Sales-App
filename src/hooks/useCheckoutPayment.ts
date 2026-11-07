import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { CheckoutPayload, CollectionPaymentAccount } from '../api/types'

export interface CheckoutPaymentDraft {
  checkoutPaymentMethod?: string
  checkoutAccountId?: number | ''
  checkoutSenderNumber?: string
}

export function useCheckoutPayment(draft?: CheckoutPaymentDraft | null) {
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState(draft?.checkoutPaymentMethod ?? 'cash')
  const [checkoutAccountId, setCheckoutAccountId] = useState<number | ''>(draft?.checkoutAccountId ?? '')
  const [checkoutSenderNumber, setCheckoutSenderNumber] = useState(draft?.checkoutSenderNumber ?? '')
  const isCheckoutTransfer = checkoutPaymentMethod !== 'cash'
  const checkoutAccountsQuery = useQuery({
    queryKey: ['collection-accounts', 'active', checkoutPaymentMethod],
    queryFn: async () => {
      const { data } = await api.get<{ data: CollectionPaymentAccount[] }>('/collection-accounts/active', {
        params: { payment_method: checkoutPaymentMethod },
      })
      return data.data
    },
    enabled: isCheckoutTransfer,
  })

  const paymentError = (needsPayment: boolean): string => {
    if (!needsPayment || !isCheckoutTransfer) return ''
    if (!checkoutAccountId || !(checkoutAccountsQuery.data ?? []).some((account) => account.id === checkoutAccountId)) {
      return 'اختر حساب التحصيل المفعل'
    }
    return checkoutSenderNumber.trim() ? '' : 'أدخل رقم التحويل من العميل'
  }

  const paymentPayload = (needsPayment: boolean): Pick<CheckoutPayload, 'payment_method' | 'collection_payment_account_id' | 'sender_transfer_number'> =>
    needsPayment ? {
      payment_method: checkoutPaymentMethod,
      ...(isCheckoutTransfer ? {
        collection_payment_account_id: Number(checkoutAccountId),
        sender_transfer_number: checkoutSenderNumber.trim(),
      } : {}),
    } : {}

  return {
    checkoutPaymentMethod, setCheckoutPaymentMethod,
    checkoutAccountId, setCheckoutAccountId,
    checkoutSenderNumber, setCheckoutSenderNumber,
    isCheckoutTransfer, checkoutAccountsQuery,
    paymentError, paymentPayload,
  }
}
