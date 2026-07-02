import { useEffect, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { PaymentTransactionReceipt } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { PaymentReceiptDocument } from '../components/payments/PaymentReceiptDocument'
import { Icon } from '../components/Icon'
import { useOrgSettingsBootstrap } from '../hooks/useOrgSettings'
import '../styles/payment-receipt.css'

async function waitForPrintReady(): Promise<void> {
  await document.fonts.ready
  const logo = document.querySelector<HTMLImageElement>('.pr-logo')
  if (logo) {
    if (logo.complete) {
      try {
        await logo.decode()
      } catch {
        /* ignore decode errors */
      }
    } else {
      await new Promise<void>((resolve) => {
        logo.onload = () => resolve()
        logo.onerror = () => resolve()
      })
    }
  }
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

export function PaymentReceiptPrintPage() {
  useOrgSettingsBootstrap()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const autoPrint = searchParams.get('print') === '1'
  const hasAutoPrinted = useRef(false)

  const query = useQuery({
    queryKey: ['payment-transactions', 'receipt', id],
    queryFn: async () => {
      const { data } = await api.get<PaymentTransactionReceipt>(`/payment-transactions/${id}`)
      return data
    },
    enabled: Boolean(id),
  })

  useEffect(() => {
    if (!autoPrint || !query.data || hasAutoPrinted.current) return

    let cancelled = false
    const run = async () => {
      await waitForPrintReady()
      if (!cancelled && !hasAutoPrinted.current) {
        hasAutoPrinted.current = true
        window.print()
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [autoPrint, query.data])

  const handlePrint = async () => {
    await waitForPrintReady()
    window.print()
  }

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
        للطابعات الحرارية (POS-80): تأكد أن الطابعة ليست متوقفة (Resume) واختر حجم الورق
        Receipt 80mm، وفعّل Print backgrounds. إذا كانت المعاينة فارغة، اضغط «طباعة الإيصال»
        يدوياً بعد ظهور الإيصال على الشاشة.
      </p>

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {query.data && <PaymentReceiptDocument payment={query.data} />}
      </AsyncState>
    </div>
  )
}
