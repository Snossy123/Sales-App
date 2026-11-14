import { isAxiosError } from 'axios'
import { Link } from 'react-router-dom'
import { getErrorMessage } from '../../api/client'

export function ContractDeletionError({ error, onOpenContract }: { error: unknown; onOpenContract: () => void }) {
  const data: unknown = isAxiosError(error) ? error.response?.data : null
  const candidates = data && typeof data === 'object' && 'linked_contracts' in data ? data.linked_contracts : null
  const contracts = Array.isArray(candidates) ? candidates.filter((item): item is { id: number; invoice_number: string } =>
    item && typeof item.id === 'number' && Number.isSafeInteger(item.id) && item.id > 0 && typeof item.invoice_number === 'string',
  ) : []

  return <div role="alert" className="mb-md space-y-sm text-sm">
    <p className="text-error">{getErrorMessage(error)}</p>
    {contracts.length > 0 && <div>
      <p className="mb-xs font-medium">العقود المطلوب حذفها أولاً:</p>
      <ul className="space-y-xs">
        {contracts.map((contract) => <li key={contract.id}>
          <Link to={`/contracts/${contract.id}`} onClick={onOpenContract} className="inline-flex items-center gap-2 font-bold text-primary underline">
            <bdi>{contract.invoice_number}</bdi><span className="font-normal">— فتح العقد</span>
          </Link>
        </li>)}
      </ul>
    </div>}
  </div>
}
