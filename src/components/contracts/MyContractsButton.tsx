import { Link } from 'react-router-dom'
import { Icon } from '../Icon'

export function MyContractsButton() {
  return (
    <Link
      to="/invoices/mine"
      className="inline-flex items-center gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm text-sm font-bold text-on-surface hover:bg-surface-container-low"
    >
      <Icon name="receipt_long" size={18} />
      تعاقداتي
    </Link>
  )
}
