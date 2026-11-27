import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Branch, Employee, PaginatedResponse, SalesInvoice } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { ClosedContractCorrectionEditor } from '../components/contracts/ClosedContractCorrectionEditor'
import { isClosedContract } from '../lib/contractEdit'
import { PosPage } from './PosPage'
import { ServiceCombinerPage } from './ServiceCombinerPage'

export function InvoiceEditPage() {
  const { id } = useParams<{ id: string }>()
  const editInvoiceId = Number(id)

  const invoiceQuery = useQuery({
    queryKey: ['sales-invoice', 'edit-router', editInvoiceId],
    queryFn: async () => {
      const { data } = await api.get<SalesInvoice>(`/sales-invoices/${editInvoiceId}`, {
        params: {
          include:
            'customer,distributor,salesUser,branch,actionBranch,lines.productUnit,lines.technician,lines.service,lines.installmentPlan.items,lines.productModel,lines.accessoryPackage,paymentTransactions,sourceInvoice,installmentPlans.items',
        },
      })
      return data
    },
    enabled: Number.isFinite(editInvoiceId) && editInvoiceId > 0,
  })

  const branchesQuery = useQuery({
    queryKey: ['branches', 'edit-router'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', { params: { per_page: 200 } })
      return data.data
    },
    enabled: Boolean(invoiceQuery.data && isClosedContract(invoiceQuery.data)),
  })

  const employeesQuery = useQuery({
    queryKey: ['employees', 'edit-router'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', { params: { per_page: 200 } })
      return data.data
    },
    enabled: Boolean(invoiceQuery.data && isClosedContract(invoiceQuery.data)),
  })

  return (
    <AsyncState
      isLoading={invoiceQuery.isLoading}
      isError={invoiceQuery.isError}
      error={invoiceQuery.error}
    >
      {invoiceQuery.data && isClosedContract(invoiceQuery.data) ? (
        <ClosedContractCorrectionEditor
          key={invoiceQuery.data.id}
          invoice={invoiceQuery.data}
          branches={branchesQuery.data ?? []}
          employees={employeesQuery.data ?? []}
          loading={branchesQuery.isLoading}
        />
      ) : invoiceQuery.data?.contract_kind === 'mixed' ? (
        <ServiceCombinerPage editInvoiceId={editInvoiceId} />
      ) : (
        <PosPage />
      )}
    </AsyncState>
  )
}
