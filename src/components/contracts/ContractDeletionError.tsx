import { isAxiosError } from 'axios'
import { Link } from 'react-router-dom'
import { getErrorMessage } from '../../api/client'
import { StatusBadge } from '../StatusBadge'

export function ContractDeletionError({ error, onOpenContract }: { error: unknown; onOpenContract: () => void }) {
  const data: unknown = isAxiosError(error) ? error.response?.data : null
  const candidates = data && typeof data === 'object' && 'linked_contracts' in data ? data.linked_contracts : null
  const contracts = Array.isArray(candidates) ? candidates.filter((item): item is { id: number; invoice_number: string } =>
    item && typeof item.id === 'number' && Number.isSafeInteger(item.id) && item.id > 0 && typeof item.invoice_number === 'string',
  ) : []
  const expenseCandidates = data && typeof data === 'object' && 'linked_expenses' in data ? data.linked_expenses : null
  const expenses = Array.isArray(expenseCandidates) ? expenseCandidates.filter((item): item is { id: number; reference_number?: string | null; amount: string | number; status: string } =>
    item && Number.isSafeInteger(item.id) && item.id > 0 &&
    (typeof item.amount === 'string' || typeof item.amount === 'number') && typeof item.status === 'string' &&
    (item.reference_number == null || typeof item.reference_number === 'string'),
  ) : []

  return <div role="alert" className="mb-md space-y-sm text-sm">
    <p className="text-error">{getErrorMessage(error)}</p>
    {expenses.length > 0 && <div>
      <p className="mb-xs font-medium">طلبات المصروف المرتبطة:</p>
      <ul className="space-y-sm">
        {expenses.map((expense) => <li key={expense.id} className="flex flex-wrap items-center gap-2">
          <Link to={`/review/expenses/${expense.id}`} onClick={onOpenContract} className="font-bold text-primary underline">
            فتح المصروف <bdi>{expense.reference_number || `#${expense.id}`}</bdi>
          </Link>
          <span>{Number(expense.amount).toLocaleString('ar-EG')} ج</span>
          <StatusBadge status={expense.status} label={expense.status === 'pending' ? 'بانتظار المراجعة' : expense.status === 'approved' ? 'معتمد' : expense.status === 'paid' ? 'مصروف' : expense.status} />
        </li>)}
      </ul>
    </div>}
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
