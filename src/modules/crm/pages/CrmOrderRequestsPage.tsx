import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { SalesInvoice, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { PageHeader } from '../../../components/PageHeader'
import { StatusBadge } from '../../../components/StatusBadge'
import { ToastBanner } from '../../../components/ToastBanner'

const STATUS_LABELS: Record<string, string> = { draft: 'مسودة', confirmed: 'مؤكد', cancelled: 'ملغى' }

export function CrmOrderRequestsPage() {
  const queryClient = useQueryClient()
  const [toast, setToast] = useState('')

  const query = useQuery({
    queryKey: ['crm', 'order-requests'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<SalesInvoice>>('/crm/order-requests', { params: { per_page: 50, include: 'customer,branch' } })
      return data.data
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const { data } = await api.put<SalesInvoice>(`/crm/order-requests/${id}`, { status })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'order-requests'] })
      setToast('تم تحديث الطلب')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  return (
    <div>
      <PageHeader title="طلبات العملاء" subtitle="طلبات الشراء من بوابة العميل" />
      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}
      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<SalesInvoice & Record<string, unknown>>
          data={(query.data ?? []) as (SalesInvoice & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          pageSize={10}
          columns={[
            { key: 'invoice_number', header: 'الرقم' },
            { key: 'customer', header: 'العميل', render: (row) => row.customer?.name ?? '—' },
            { key: 'notes', header: 'الملاحظات', render: (row) => row.notes ?? '—' },
            { key: 'status', header: 'الحالة', render: (row) => <StatusBadge status={String(row.status)} label={STATUS_LABELS[String(row.status)] ?? String(row.status)} /> },
            { key: 'actions', header: '', render: (row) => String(row.status) === 'draft' ? (
              <button type="button" onClick={() => updateMutation.mutate({ id: row.id, status: 'confirmed' })} className="text-xs text-primary hover:underline">تأكيد</button>
            ) : null },
          ]}
        />
      </AsyncState>
    </div>
  )
}
