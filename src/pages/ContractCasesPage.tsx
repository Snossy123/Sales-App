import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { PaginatedResponse, SalesInvoice } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import {
  contractCaseStatusLabels,
  contractCaseTypeLabels,
} from '../lib/contractStatus'
import { formatInvoiceDate } from '../lib/sales'

interface ContractCaseRow {
  id: number
  case_type: string
  status: string
  reason?: string | null
  notes?: string | null
  created_at?: string | null
  sales_invoice?: Pick<SalesInvoice, 'id' | 'invoice_number'> & {
    customer?: { id: number; name: string } | null
  }
}

const TYPE_OPTIONS = [
  { value: '', label: 'الكل' },
  ...Object.entries(contractCaseTypeLabels).map(([value, label]) => ({ value, label })),
]

const STATUS_OPTIONS = [
  { value: '', label: 'الكل' },
  ...Object.entries(contractCaseStatusLabels).map(([value, label]) => ({ value, label })),
]

export function ContractCasesPage() {
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const query = useQuery({
    queryKey: ['contract-cases', 'list', typeFilter, statusFilter],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ContractCaseRow>>('/contract-cases', {
        params: {
          per_page: 50,
          ...(typeFilter ? { case_type: typeFilter } : {}),
          ...(statusFilter ? { status: statusFilter } : {}),
        },
      })
      return data.data ?? []
    },
  })

  const rows = query.data ?? []

  return (
    <div>
      <PageHeader
        title="قسم المشاكل"
        subtitle="حالات الدعم والاسترجاع والاستبدال وإلغاء التعاقد"
      />

      <FilterBar
        selects={[
          {
            id: 'case-type',
            label: 'النوع',
            value: typeFilter,
            options: TYPE_OPTIONS,
            onChange: setTypeFilter,
          },
          {
            id: 'case-status',
            label: 'الحالة',
            value: statusFilter,
            options: STATUS_OPTIONS,
            onChange: setStatusFilter,
          },
        ]}
      />

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<ContractCaseRow>
          data={rows}
          keyExtractor={(row) => row.id}
          pageSize={15}
          pageKey={`${typeFilter}-${statusFilter}`}
          emptyMessage="لا توجد مشاكل مسجّلة"
          columns={[
            {
              key: 'customer',
              header: 'العميل',
              render: (row) => row.sales_invoice?.customer?.name ?? '—',
            },
            {
              key: 'invoice',
              header: 'العقد',
              render: (row) => row.sales_invoice?.invoice_number ?? '—',
            },
            {
              key: 'case_type',
              header: 'النوع',
              render: (row) => contractCaseTypeLabels[row.case_type] ?? row.case_type,
            },
            {
              key: 'status',
              header: 'الحالة',
              render: (row) => (
                <StatusBadge
                  status={row.status}
                  label={contractCaseStatusLabels[row.status] ?? row.status}
                />
              ),
            },
            {
              key: 'reason',
              header: 'السبب',
              render: (row) => row.reason || row.notes || '—',
            },
            {
              key: 'created_at',
              header: 'التاريخ',
              render: (row) => (row.created_at ? formatInvoiceDate(row.created_at) : '—'),
            },
            {
              key: 'actions',
              header: '',
              render: (row) =>
                row.sales_invoice?.id ? (
                  <Link
                    to={`/contracts/${row.sales_invoice.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    عرض العقد
                  </Link>
                ) : (
                  '—'
                ),
            },
          ]}
        />
      </AsyncState>
    </div>
  )
}
