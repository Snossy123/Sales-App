import { useEffect, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { SalesInvoice } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { ServiceReceiptDocument } from '../components/contracts/ServiceReceiptDocument'
import { Icon } from '../components/Icon'
import { printInstallmentContractElement } from '../lib/printInstallmentContract'
import '../styles/installment-contract.css'

export function ServiceContractPrintPage() {
  const { id = '', lineId = '' } = useParams<{ id: string; lineId?: string }>()
  const [searchParams] = useSearchParams()
  const autoPrint = searchParams.get('print') === '1'
  const contractRef = useRef<HTMLDivElement>(null)
  const didAutoPrint = useRef(false)
  const invoiceId = Number(id)
  const line = Number(lineId)

  const query = useQuery({
    queryKey: ['sales-invoice', 'service-contract-print', invoiceId],
    queryFn: async () => {
      const { data } = await api.get<SalesInvoice>(`/sales-invoices/${invoiceId}`, {
        params: {
          include: 'customer,branch,lines.service,lines.technician,lines.productUnit',
        },
      })
      return data
    },
    enabled: Number.isFinite(invoiceId) && invoiceId > 0,
  })

  useEffect(() => {
    if (!autoPrint || !query.data || didAutoPrint.current) return
    didAutoPrint.current = true
    const timer = window.setTimeout(() => {
      const el = contractRef.current?.querySelector('.installment-contract')
      if (el instanceof HTMLElement) {
        void printInstallmentContractElement(el)
      }
    }, 500)
    return () => window.clearTimeout(timer)
  }, [autoPrint, query.data])

  const handlePrint = async () => {
    const el = contractRef.current?.querySelector('.installment-contract')
    if (!(el instanceof HTMLElement)) return
    await printInstallmentContractElement(el)
  }

  return (
    <div className="installment-contract-page">
      <div className="installment-contract-toolbar no-print">
        <Link
          to="/pos"
          className="flex items-center gap-1 rounded-lg border border-outline-variant bg-white px-md py-sm text-sm text-on-surface hover:bg-surface-container"
        >
          <Icon name="arrow_forward" size={18} />
          رجوع
        </Link>
        <button type="button" onClick={() => void handlePrint()} disabled={!query.data}>
          <Icon name="print" size={18} />
          طباعة عقد الخدمة
        </button>
      </div>

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {query.data && (
          <div ref={contractRef}>
            <ServiceReceiptDocument
              invoice={query.data}
              lineId={Number.isFinite(line) && line > 0 ? line : undefined}
            />
          </div>
        )}
      </AsyncState>
    </div>
  )
}
