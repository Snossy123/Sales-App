import { useEffect, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { SalesInvoice } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { OwnershipTransferContractDocument } from '../components/contracts/OwnershipTransferContractDocument'
import { Icon } from '../components/Icon'
import { contractKindLabel } from '../lib/contractKinds'
import { printInstallmentContractElement } from '../lib/printInstallmentContract'
import '../styles/installment-contract.css'

const ownershipTransferLabel = contractKindLabel('ownership_transfer')

export function OwnershipTransferContractPrintPage() {
  const { id = '' } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const autoPrint = searchParams.get('print') === '1'
  const contractRef = useRef<HTMLDivElement>(null)
  const didAutoPrint = useRef(false)
  const invoiceId = Number(id)

  const query = useQuery({
    queryKey: ['sales-invoice', 'ownership-transfer-contract-print', invoiceId],
    queryFn: async () => {
      const { data } = await api.get<SalesInvoice>(`/sales-invoices/${invoiceId}`)
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
          to="/invoices"
          className="flex items-center gap-1 rounded-lg border border-outline-variant bg-white px-md py-sm text-sm text-on-surface hover:bg-surface-container"
        >
          <Icon name="arrow_forward" size={18} />
          رجوع
        </Link>
        <button type="button" onClick={() => void handlePrint()} disabled={!query.data}>
          <Icon name="print" size={18} />
          طباعة عقد {ownershipTransferLabel}
        </button>
      </div>

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {query.data && (
          <div ref={contractRef}>
            <OwnershipTransferContractDocument invoice={query.data} />
          </div>
        )}
      </AsyncState>
    </div>
  )
}
