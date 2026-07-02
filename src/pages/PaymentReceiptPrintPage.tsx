import { useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { PaymentTransactionReceipt } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { PaymentReceiptDocument } from '../components/payments/PaymentReceiptDocument'
import { Icon } from '../components/Icon'
import '../styles/payment-receipt.css'

export function PaymentReceiptPrintPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const autoPrint = searchParams.get('print') === '1'

  const query = useQuery({
    queryKey: ['payment-transactions', 'receipt', id],
    queryFn: async () => {
      const { data } = await api.get<PaymentTransactionReceipt>(`/payment-transactions/${id}`)
      return data
    },
    enabled: Boolean(id),
  })

  useEffect(() => {
    if (!autoPrint || !query.data) return

    let cancelled = false
    const run = async () => {
      await document.fonts.ready
      const logo = document.querySelector<HTMLImageElement>('.pr-logo')
      if (logo && !logo.complete) {
        await new Promise<void>((resolve) => {
          logo.onload = () => resolve()
          logo.onerror = () => resolve()
        })
      }
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })
      if (!cancelled) window.print()
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
        <button type="button" onClick={() => window.print()}>
          <Icon name="print" size={18} />
          طباعة الإيصال
        </button>
      </div>

      <p className="payment-receipt-hint no-print">
        للطابعات الحرارية (POS-80): تأكد أن الطابعة متصلة (Online) واختر حجم الورق 80mm
        وليس A4، وفعّل Print backgrounds من إعدادات الطباعة.
      </p>

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {query.data && <PaymentReceiptDocument payment={query.data} />}
      </AsyncState>
    </div>
  )
}
