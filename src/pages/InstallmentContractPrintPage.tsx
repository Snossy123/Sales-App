import { useEffect, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { SalesInvoice } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { InstallmentContractDocument } from '../components/contracts/InstallmentContractDocument'
import { Icon } from '../components/Icon'
import { printInstallmentContractElement } from '../lib/printInstallmentContract'
import '../styles/installment-contract.css'

export function InstallmentContractPrintPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const lineId = searchParams.get('line') ? Number(searchParams.get('line')) : undefined
  const autoPrint = searchParams.get('print') === '1'
  const contractRef = useRef<HTMLDivElement>(null)
  const didAutoPrint = useRef(false)

  const query = useQuery({
    queryKey: ['sales-invoice', 'contract-print', id],
    queryFn: async () => {
      const { data } = await api.get<SalesInvoice>(`/sales-invoices/${id}`, {
        params: {
          include:
            'customer,lines.productUnit,lines.installmentPlan.items,installmentPlan.items,installmentPlans.items,paymentTransactions',
        },
      })
      return data
    },
    enabled: Boolean(id),
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
          طباعة العقد
        </button>
      </div>

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {query.data && (
          <div ref={contractRef}>
            <InstallmentContractDocument invoice={query.data} lineId={lineId} />
          </div>
        )}
      </AsyncState>
    </div>
  )
}
