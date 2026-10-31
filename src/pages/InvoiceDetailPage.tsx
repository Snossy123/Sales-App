import { Navigate, useParams } from 'react-router-dom'

/** Older links used /invoices/:id. Contract tabs live on /contracts/:id. */
export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/contracts/${id ?? ''}`} replace />
}
