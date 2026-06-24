import { useEffect, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import { AsyncState } from '../components/AsyncState'
import { Icon } from '../components/Icon'
import { mockContractPreviewHtml } from '../lib/contractTemplates'

async function fetchContractPreview(key: string): Promise<string> {
  const { data } = await api.get<string>(`/contract-templates/${key}/preview`, {
    headers: { Accept: 'text/html' },
    responseType: 'text',
  })
  return typeof data === 'string' ? data : mockContractPreviewHtml(key)
}

export function ContractTemplatePreviewPage() {
  const { key = '' } = useParams<{ key: string }>()
  const [searchParams] = useSearchParams()
  const autoPrint = searchParams.get('print') === '1'
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const query = useQuery({
    queryKey: ['contract-template-preview', key],
    queryFn: () => fetchContractPreview(key),
    enabled: Boolean(key),
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
          to="/contract-templates"
          className="flex items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm text-sm"
        >
          <Icon name="arrow_forward" size={18} />
          رجوع للنماذج
        </Link>
        <button
          type="button"
          onClick={handlePrint}
          disabled={!query.data}
          className="flex items-center gap-1 rounded-lg bg-secondary px-md py-sm text-sm font-bold text-on-secondary disabled:opacity-50"
        >
          <Icon name="print" size={18} />
          طباعة
        </button>
      </div>

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {query.isError && (
          <p className="mx-auto mb-md max-w-[210mm] text-sm text-error">{getErrorMessage(query.error)}</p>
        )}
        <iframe
          ref={iframeRef}
          title={`معاينة ${key}`}
          className="mx-auto block min-h-[297mm] w-full max-w-[210mm] border-0 bg-white shadow-md"
        />
      </AsyncState>
    </div>
  )
}
