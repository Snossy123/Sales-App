import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { FilterBar } from '../../../components/FilterBar'
import { PageHeader } from '../../../components/PageHeader'
import { useState } from 'react'

interface TrashRow {
  type: string
  id: number
  label: string
  deleted_at?: string
  deleted_by?: string
}

const typeLabels: Record<string, string> = {
  'installment-items': 'قسط',
  'installment-plans': 'خطة أقساط',
  customers: 'عميل',
  'collection-accounts': 'حساب تحويل',
  'sales-invoices': 'عقد / فاتورة',
}

export function TrashPage() {
  const queryClient = useQueryClient()
  const [typeFilter, setTypeFilter] = useState('')

  const trashQuery = useQuery({
    queryKey: ['trash', typeFilter],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (typeFilter) params.type = typeFilter
      const { data } = await api.get<{ data: TrashRow[] }>('/trash', { params })
      return data.data ?? []
    },
  })

  const restoreMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: number }) => {
      await api.post(`/trash/${type}/${id}/restore`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trash'] }),
  })

  const forceDeleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: number }) => {
      await api.delete(`/trash/${type}/${id}/force`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trash'] }),
  })

  const error = restoreMutation.error ?? forceDeleteMutation.error

  return (
    <div>
      <PageHeader title="سلة المهملات" subtitle="استرجاع أو حذف نهائي للعناصر المحذوفة" />

      <FilterBar
        selects={[
          {
            id: 'type',
            label: 'النوع',
            value: typeFilter,
            onChange: setTypeFilter,
            options: [
              { value: '', label: 'الكل' },
              ...Object.entries(typeLabels).map(([value, label]) => ({ value, label })),
            ],
          },
        ]}
        showClear={Boolean(typeFilter)}
        onClear={() => setTypeFilter('')}
      />

      {error && <p className="mb-sm text-sm text-error">{getErrorMessage(error)}</p>}

      <AsyncState isLoading={trashQuery.isLoading} isError={trashQuery.isError} error={trashQuery.error}>
        <DataTable<TrashRow>
          data={trashQuery.data ?? []}
          keyExtractor={(r) => `${r.type}-${r.id}`}
          pageSize={15}
          emptyMessage="لا توجد عناصر في السلة"
          columns={[
            { key: 'type', header: 'النوع', render: (r) => typeLabels[r.type] ?? r.type },
            { key: 'label', header: 'العنصر' },
            {
              key: 'deleted_at',
              header: 'تاريخ الحذف',
              render: (r) =>
                r.deleted_at ? new Date(r.deleted_at).toLocaleString('ar-EG') : '—',
            },
            { key: 'deleted_by', header: 'حُذف بواسطة', render: (r) => r.deleted_by ?? '—' },
            {
              key: 'actions',
              header: '',
              render: (r) => (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => restoreMutation.mutate({ type: r.type, id: r.id })}
                    disabled={restoreMutation.isPending}
                    className="text-sm text-secondary hover:underline"
                  >
                    استرجاع
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('حذف نهائي؟ لا يمكن التراجع.')) {
                        forceDeleteMutation.mutate({ type: r.type, id: r.id })
                      }
                    }}
                    disabled={forceDeleteMutation.isPending}
                    className="text-sm text-error hover:underline"
                  >
                    حذف نهائي
                  </button>
                </div>
              ),
            },
          ]}
        />
      </AsyncState>
    </div>
  )
}
