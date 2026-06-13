import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { portalApi } from '../../../api/portalClient'
import { getErrorMessage } from '../../../api/client'
import type { SalesInvoice, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { PageHeader } from '../../../components/PageHeader'
import { ToastBanner } from '../../../components/ToastBanner'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

export function PortalOrderRequestsPage() {
  const queryClient = useQueryClient()
  const [notes, setNotes] = useState('')
  const [toast, setToast] = useState('')

  const query = useQuery({
    queryKey: ['portal', 'order-requests'],
    queryFn: async () => {
      const { data } = await portalApi.get<PaginatedResponse<SalesInvoice>>('/portal/order-requests')
      return data.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await portalApi.post<SalesInvoice>('/portal/order-requests', { notes: notes || undefined })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'order-requests'] })
      setNotes('')
      setToast('تم إرسال الطلب')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  return (
    <div>
      <PageHeader title="طلبات الشراء" subtitle="اطلب جهازاً أو خدمة من المتجر" />
      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}
      <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }} className="mb-md rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
        <textarea placeholder="صف الطلب..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
        <button type="submit" disabled={createMutation.isPending || !notes.trim()} className="mt-sm flex items-center gap-xs rounded-lg bg-secondary px-md py-sm text-sm font-bold text-on-secondary disabled:opacity-60">
          <Icon name="send" size={18} /> إرسال الطلب
        </button>
      </form>
      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<SalesInvoice & Record<string, unknown>>
          data={(query.data ?? []) as (SalesInvoice & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          emptyMessage="لا توجد طلبات سابقة"
          columns={[
            { key: 'invoice_number', header: 'رقم الطلب' },
            { key: 'notes', header: 'التفاصيل', render: (row) => row.notes ?? '—' },
            { key: 'status', header: 'الحالة' },
            { key: 'invoice_date', header: 'التاريخ', render: (row) => row.invoice_date ?? '—' },
          ]}
        />
      </AsyncState>
    </div>
  )
}
