import { useEffect, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { PaymentTransactionReceipt } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { PaymentReceiptDocument } from '../components/payments/PaymentReceiptDocument'
import { Icon } from '../components/Icon'
import { useOrgSettingsBootstrap } from '../hooks/useOrgSettings'
import { printPaymentReceiptElement } from '../lib/printPaymentReceipt'
import '../styles/payment-receipt.css'

export function PaymentReceiptPrintPage() {
  useOrgSettingsBootstrap()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const autoPrint = searchParams.get('print') === '1'
  const hasAutoPrinted = useRef(false)
  const receiptRef = useRef<HTMLElement | null>(null)

  const query = useQuery({
    queryKey: ['payment-transactions', 'receipt', id],
    queryFn: async () => {
      const { data } = await api.get<PaymentTransactionReceipt>(`/payment-transactions/${id}`)
      return data
    },
    enabled: Boolean(id),
  })

  const handlePrint = async () => {
    const receiptEl = receiptRef.current
    if (!receiptEl) return
    await printPaymentReceiptElement(receiptEl)
  }

  useEffect(() => {
    if (!autoPrint || !query.data || hasAutoPrinted.current) return

    let cancelled = false
    const run = async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })
      if (cancelled || hasAutoPrinted.current || !receiptRef.current) return
      hasAutoPrinted.current = true
      await printPaymentReceiptElement(receiptRef.current)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [autoPrint, query.data])

  return (
    <div className="payment-receipt-page">
      <div className="payment-receipt-toolbar no-print">
        <Link to="/payments">
          <Icon name="arrow_forward" size={18} />
          رجوع
        </Link>
        <button type="button" onClick={() => void handlePrint()}>
          <Icon name="print" size={18} />
          طباعة الإيصال
        </button>
      </div>

      <p className="payment-receipt-hint no-print">
        للطابعات الحرارية (POS-80): اختر حجم الورق Receipt 80mm وفعّل Print backgrounds.
        إذا كانت الطابعة متوقفة، اضغط Resume من إعدادات الطابعات.
      </p>

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {query.data && (
          <PaymentReceiptDocument
            ref={receiptRef}
            payment={query.data}
          />
        )}
      </AsyncState>
    </div>
  )
}
