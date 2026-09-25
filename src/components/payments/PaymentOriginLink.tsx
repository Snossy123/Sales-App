import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

export function PaymentOriginLink({
  invoiceId,
  children,
}: {
  invoiceId?: number
  children: ReactNode
}) {
  if (!invoiceId) return <>{children}</>

  return (
    <Link to={`/contracts/${invoiceId}`} className="text-primary hover:underline">
      {children}
    </Link>
  )
}
