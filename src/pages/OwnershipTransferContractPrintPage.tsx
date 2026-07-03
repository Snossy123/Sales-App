import { useEffect, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import { AsyncState } from '../components/AsyncState'
import { Icon } from '../Icon'
import { mockContractPreviewHtml } from '../lib/contractTemplates'
import { contractKindLabel } from '../lib/contractKinds'

const ownershipTransferLabel = contractKindLabel('ownership_transfer')

async function fetchOwnershipTransferContract(invoiceId: number): Promise<string> {
  try {
    const { data } = await api.get<string>(
      `/sales-invoices/${invoiceId}/ownership-transfer-contract`,
      {
        headers: { Accept: 'text/html' },
        responseType: 'text',
      },
    )
    return typeof data === 'string' ? data : mockContractPreviewHtml('ownership_transfer')
  } catch {
    return mockContractPreviewHtml('ownership_transfer')
  }
}

export function OwnershipTransferContractPrintPage() {
  const { id = '' } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const autoPrint = searchParams.get('print') === '1'
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const invoiceId = Number(id)

  const query = useQuery({
    queryKey: ['ownership-transfer-contract-print', invoiceId],
    queryFn: () => fetchOwnershipTransferContract(invoiceId),
    enabled: Number.isFinite(invoiceId) && invoiceId > 0,
  })

  useEffect(() => {
    if (query.data && iframeRef.current) {
      iframeRef.current.srcdoc = query.data
    }
  }, [query.data])

  useEffect(() => {
    if (autoPrint && query.data) {
      const timer = window.setTimeout(() => window.print(), 400)
      return () => window.clearTimeout(timer)
    }
  }, [autoPrint, query.data])

  return (
    <div className="min-h-screen bg-surface-container-low p-md">
      <div className="no-print mb-md flex flex-wrap items-center gap-sm">
        <Link
          to="/invoices/review"
          className="inline-flex items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm text-sm text-on-surface hover:bg-surface-container"
        >
          <Icon name="arrow_forward" size={18} />
          رجوع
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
        >
          <Icon name="print" size={18} />
          طباعة عقد {ownershipTransferLabel}
        </button>
      </div>

      <AsyncState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error ? getErrorMessage(query.error) : undefined}
      >
        <iframe
          ref={iframeRef}
          title={`عقد ${ownershipTransferLabel}`}
          className="mx-auto block min-h-[1100px] w-full max-w-[210mm] border-0 bg-white shadow-md"
        />
      </AsyncState>
    </div>
  )
}
