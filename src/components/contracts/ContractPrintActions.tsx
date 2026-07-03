import { Link } from 'react-router-dom'
import type { SalesInvoice, SalesInvoiceLine } from '../../api/types'
import { contractKindLabel } from '../../lib/contractKinds'
import { contractPrintPath, isServiceInvoiceLine, ownershipTransferContractPrintPath, paymentTermLabel } from '../../lib/sales'
import { Icon } from '../Icon'

function deviceLines(invoice: SalesInvoice): SalesInvoiceLine[] {
  return (invoice.lines ?? []).filter((line) => !isServiceInvoiceLine(line))
}

function printLabel(line: SalesInvoiceLine, invoice: SalesInvoice, index: number, total: number): string {
  const term = line.payment_term ?? invoice.payment_term
  const typeLabel = term === 'cash' ? 'كاش' : 'تقسيط'
  if (total === 1) {
    return term === 'cash' ? 'طباعة عقد كاش' : 'طباعة عقد تقسيط'
  }
  return `طباعة عقد ${typeLabel} — جهاز ${index + 1}`
}

interface ContractPrintActionsProps {
  invoice: SalesInvoice
  autoPrint?: boolean
  className?: string
}

export function ContractPrintActions({
  invoice,
  autoPrint = false,
  className = 'flex w-full items-center justify-center gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-3 text-sm font-bold text-on-surface hover:bg-surface-container-low',
}: ContractPrintActionsProps) {
  if (invoice.contract_kind === 'ownership_transfer') {
    return (
      <Link
        to={ownershipTransferContractPrintPath(invoice.id, { autoPrint })}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        <Icon name="print" size={20} />
        طباعة عقد {contractKindLabel(invoice.contract_kind)}
      </Link>
    )
  }

  const lines = deviceLines(invoice)
  if (lines.length === 0) return null

  if (lines.length === 1) {
    const line = lines[0]
    return (
      <Link
        to={contractPrintPath(invoice.id, { autoPrint, lineId: line.id })}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        <Icon name="print" size={20} />
        {printLabel(line, invoice, 0, 1)}
      </Link>
    )
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {lines.map((line, index) => (
        <Link
          key={line.id}
          to={contractPrintPath(invoice.id, { autoPrint, lineId: line.id })}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
        >
          <Icon name="print" size={20} />
          {printLabel(line, invoice, index, lines.length)}
          <span className="text-xs font-normal text-on-surface-variant">
            ({paymentTermLabel(line.payment_term ?? invoice.payment_term)})
          </span>
        </Link>
      ))}
    </div>
  )
}
