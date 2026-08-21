import { useEffect, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import { AsyncState } from '../components/AsyncState'
import { ServiceReceiptDocument } from '../components/contracts/ServiceReceiptDocument'
import { Icon } from '../components/Icon'
import { mockContractPreviewHtml, sampleServiceReceiptInvoice } from '../lib/contractTemplates'
import { printInstallmentContractElement } from '../lib/printInstallmentContract'
import '../styles/installment-contract.css'

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
  const contractRef = useRef<HTMLDivElement>(null)
  const didAutoPrint = useRef(false)
  const isServiceReceipt = key === 'service_receipt'

  const query = useQuery({
    queryKey: ['contract-template-preview', key],
    queryFn: () => fetchContractPreview(key),
    enabled: Boolean(key) && !isServiceReceipt,
  })

  useEffect(() => {
    if (query.data && iframeRef.current) {
      iframeRef.current.srcdoc = query.data
    }
  }, [query.data])

  useEffect(() => {
    if (!autoPrint) return
    if (isServiceReceipt) {
      if (didAutoPrint.current) return
      didAutoPrint.current = true
      const timer = window.setTimeout(() => {
        const el = contractRef.current?.querySelector('.installment-contract')
        if (el instanceof HTMLElement) {
          void printInstallmentContractElement(el)
        }
      }, 500)
      return () => window.clearTimeout(timer)
    }
    if (query.data && iframeRef.current?.contentWindow) {
      const timer = window.setTimeout(() => {
        iframeRef.current?.contentWindow?.print()
      }, 500)
      return () => window.clearTimeout(timer)
    }
  }, [autoPrint, isServiceReceipt, query.data])

  const handlePrint = () => {
    if (isServiceReceipt) {
      const el = contractRef.current?.querySelector('.installment-contract')
      if (el instanceof HTMLElement) {
        void printInstallmentContractElement(el)
      }
      return
    }
    iframeRef.current?.contentWindow?.print()
  }

  return (
    <div className={isServiceReceipt ? 'installment-contract-page' : 'min-h-screen bg-surface-container-low p-md'}>
      <div
        className={
          isServiceReceipt
            ? 'installment-contract-toolbar no-print'
            : 'mx-auto mb-md flex max-w-[210mm] items-center justify-between gap-sm'
        }
      >
        <Link
          to="/contract-templates"
          className="flex items-center gap-1 rounded-lg border border-outline-variant bg-white px-md py-sm text-sm text-on-surface hover:bg-surface-container"
        >
          <Icon name="arrow_forward" size={18} />
          رجوع للنماذج
        </Link>
        <button
          type="button"
          onClick={handlePrint}
          disabled={!isServiceReceipt && !query.data}
          className={
            isServiceReceipt
              ? undefined
              : 'flex items-center gap-1 rounded-lg bg-secondary px-md py-sm text-sm font-bold text-on-secondary disabled:opacity-50'
          }
        >
          <Icon name="print" size={18} />
          طباعة
        </button>
      </div>

      {isServiceReceipt ? (
        <div ref={contractRef}>
          <ServiceReceiptDocument invoice={sampleServiceReceiptInvoice()} />
        </div>
      ) : (
        <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
          {query.isError && (
            <p className="mx-auto mb-md max-w-[210mm] text-sm text-error">
              {getErrorMessage(query.error)}
            </p>
          )}
          <iframe
            ref={iframeRef}
            title={`معاينة ${key}`}
            className="mx-auto block min-h-[297mm] w-full max-w-[210mm] border-0 bg-white shadow-md"
          />
        </AsyncState>
      )}
    </div>
  )
}
