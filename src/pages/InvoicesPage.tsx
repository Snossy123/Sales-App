import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { PaginatedResponse, SalesInvoice } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { useAuthStore } from '../stores/authStore'

const statusLabels: Record<string, string> = {
  pending_review: 'بانتظار المراجعة',
  confirmed: 'مؤكدة',
  rejected: 'مرفوضة',
}

export function InvoicesPage() {
  const branchId = useAuthStore((s) => s.branchId)
  const [statusFilter, setStatusFilter] = useState('')

  const query = useQuery({
    queryKey: ['sales-invoices', 'all', branchId, statusFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 100,
        'filter[branch_id]': branchId ?? 0,
      }
      if (statusFilter) params['filter[status]'] = statusFilter

      const { data } = await api.get<PaginatedResponse<SalesInvoice>>('/sales-invoices', {
        params,
      })
      return data.data
    },
    enabled: Boolean(branchId),
  })

  return (
    <div>
      <h1 className="mb-md text-2xl font-bold text-on-surface">كل الفواتير</h1>

      <div className="mb-md">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-outline-variant px-sm py-2 text-sm"
        >
          <option value="">كل الحالات</option>
          <option value="pending_review">بانتظار المراجعة</option>
          <option value="confirmed">مؤكدة</option>
          <option value="rejected">مرفوضة</option>
        </select>
      </div>

      <AsyncState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
      >
        <DataTable<SalesInvoice & Record<string, unknown>>
          data={(query.data ?? []) as (SalesInvoice & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          columns={[
            { key: 'invoice_number', header: 'رقم الفاتورة' },
            { key: 'invoice_date', header: 'التاريخ' },
            {
              key: 'customer',
              header: 'العميل',
              render: (row) => row.customer?.name ?? '—',
            },
            {
              key: 'total',
              header: 'الإجمالي',
              render: (row) => `${Number(row.total).toLocaleString('ar-EG')} ج.م`,
            },
            {
              key: 'payment_term',
              header: 'الدفع',
              render: (row) => (row.payment_term === 'installment' ? 'تقسيط' : 'نقدي'),
            },
            {
              key: 'status',
              header: 'حالة المراجعة',
              render: (row) => (
                <StatusBadge
                  status={String(row.status ?? 'confirmed')}
                  label={statusLabels[String(row.status)] ?? String(row.status)}
                />
              ),
            },
            {
              key: 'payment_status',
              header: 'السداد',
              render: (row) => <StatusBadge status={String(row.payment_status)} />,
            },
          ]}
        />
      </AsyncState>
    </div>
  )
}
