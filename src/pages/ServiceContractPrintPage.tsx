import { useEffect, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import { AsyncState } from '../components/AsyncState'
import { Icon } from '../components/Icon'
import { mockContractPreviewHtml } from '../lib/contractTemplates'

async function fetchServiceLineContract(invoiceId: number, lineId: number): Promise<string> {
  try {
    const { data } = await api.get<string>(
      `/sales-invoices/${invoiceId}/lines/${lineId}/contract`,
      {
        headers: { Accept: 'text/html' },
        responseType: 'text',
      },
    )
    return typeof data === 'string' ? data : mockContractPreviewHtml('service_receipt')
  } catch {
    return mockContractPreviewHtml('service_receipt')
  }
}

export function ServiceContractPrintPage() {
  const { id = '', lineId = '' } = useParams<{ id: string; lineId: string }>()
  const [searchParams] = useSearchParams()
  const autoPrint = searchParams.get('print') === '1'
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const invoiceId = Number(id)
  const line = Number(lineId)

  const query = useQuery({
    queryKey: ['service-contract-print', invoiceId, line],
    queryFn: () => fetchServiceLineContract(invoiceId, line),
    enabled: Number.isFinite(invoiceId) && invoiceId > 0 && Number.isFinite(line) && line > 0,
  })

  useEffect(() => {
    if (query.data && iframeRef.current) {
      iframeRef.current.srcdoc = query.data
    }
  }, [query.data])

  useEffect(() => {
    if (autoPrint && query.data && iframeRef.current?.contentWindow) {
      const timer = window.setTimeout(() => {
        iframeRef.current?.contentWindow?.print()
      }, 500)
      return () => window.clearTimeout(timer)
    }
  }, [autoPrint, query.data])

  const handlePrint = () => {
    iframeRef.current?.contentWindow?.print()
  }

  return (
    <div className="min-h-screen bg-surface-container-low p-md">
      <div className="mx-auto mb-md flex max-w-[210mm] items-center justify-between gap-sm">
        <Link
          to="/pos"
          className="flex items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm text-sm"
        >
          <Icon name="arrow_forward" size={18} />
          رجوع
        </Link>
        <button
          type="button"
          onClick={handlePrint}
          disabled={!query.data}
          className="flex items-center gap-1 rounded-lg bg-secondary px-md py-sm text-sm font-bold text-on-secondary disabled:opacity-50"
        >
          <Icon name="print" size={18} />
          طباعة عقد الخدمة
        </button>
      </div>

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {query.isError && (
          <p className="mx-auto mb-md max-w-[210mm] text-sm text-error">
            {getErrorMessage(query.error)}
          </p>
        )}
        <iframe
          ref={iframeRef}
          title="عقد الخدمة"
          className="mx-auto block min-h-[297mm] w-full max-w-[210mm] border-0 bg-white shadow-md"
        />
      </AsyncState>
    </div>
  )
}
