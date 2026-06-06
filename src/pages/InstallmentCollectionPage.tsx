import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { InstallmentItem, PaginatedResponse } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { Icon } from '../components/Icon'
import { useAuthStore } from '../stores/authStore'

type InstallmentRow = InstallmentItem & Record<string, unknown>

export function InstallmentCollectionPage() {
  const queryClient = useQueryClient()
  const branchId = useAuthStore((s) => s.branchId)
  const [selected, setSelected] = useState<InstallmentRow | null>(null)
  const [amount, setAmount] = useState(0)

  const query = useQuery({
    queryKey: ['installments', branchId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<InstallmentItem>>('/installments', {
        params: { per_page: 100 },
      })
      return data.data.filter((i) => i.status !== 'paid')
    },
    enabled: Boolean(branchId),
  })

  const collectMutation = useMutation({
    mutationFn: async () => {
      if (!selected?.sales_invoice_id) throw new Error('فاتورة غير محددة')
      const { data } = await api.post(`/sales-invoices/${selected.sales_invoice_id}/installments/collect`, {
        installment_item_id: selected.id,
        amount,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setSelected(null)
      setAmount(0)
    },
  })

  const selectRow = (row: InstallmentRow) => {
    setSelected(row)
    setAmount(Number(row.remaining ?? Number(row.amount) - Number(row.paid_amount)))
  }

  return (
    <div>
      <h1 className="mb-md text-2xl font-bold text-on-surface">تحصيل الأقساط</h1>
      <p className="mb-md text-sm text-on-surface-variant">
        قسم التحصيل — سداد الأقساط المستحقة والمتأخرة
      </p>

      <div className="grid gap-md lg:grid-cols-2">
        <AsyncState
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
        >
          <DataTable<InstallmentRow>
            data={(query.data ?? []) as InstallmentRow[]}
            keyExtractor={(row) => row.id}
            emptyMessage="لا توجد أقساط مستحقة"
            columns={[
              { key: 'invoice_number', header: 'فاتورة' },
              { key: 'customer_name', header: 'العميل' },
              { key: 'installment_number', header: 'قسط #' },
              { key: 'due_date', header: 'الاستحقاق' },
              {
                key: 'amount',
                header: 'المبلغ',
                render: (row) => Number(row.amount).toLocaleString('ar-EG'),
              },
              {
                key: 'remaining',
                header: 'متبقي',
                render: (row) =>
                  Number(row.remaining ?? Number(row.amount) - Number(row.paid_amount)).toLocaleString('ar-EG'),
              },
              {
                key: 'status',
                header: 'الحالة',
                render: (row) => <StatusBadge status={String(row.status)} />,
              },
              {
                key: 'actions',
                header: '',
                render: (row) => (
                  <button
                    type="button"
                    onClick={() => selectRow(row)}
                    className="text-sm text-primary hover:underline"
                  >
                    تحصيل
                  </button>
                ),
              },
            ]}
          />
        </AsyncState>

        {selected && (
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
            <h2 className="mb-md text-lg font-semibold">تحصيل قسط</h2>
            <dl className="mb-md space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-on-surface-variant">العميل</dt>
                <dd>{selected.customer_name as string}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-on-surface-variant">فاتورة</dt>
                <dd>{selected.invoice_number as string}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-on-surface-variant">قسط رقم</dt>
                <dd>{selected.installment_number as number}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-on-surface-variant">المتبقي</dt>
                <dd className="font-bold tabular-nums">
                  {Number(
                    selected.remaining ?? Number(selected.amount) - Number(selected.paid_amount),
                  ).toLocaleString('ar-EG')}{' '}
                  ج.م
                </dd>
              </div>
            </dl>

            <div className="mb-md">
              <label className="mb-xs block text-sm text-on-surface-variant">مبلغ التحصيل</label>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full rounded border border-outline-variant px-sm py-2 tabular-nums"
              />
            </div>

            {collectMutation.isError && (
              <p className="mb-sm text-sm text-error">{getErrorMessage(collectMutation.error)}</p>
            )}
            {collectMutation.isSuccess && (
              <p className="mb-sm text-sm text-secondary">تم التحصيل بنجاح</p>
            )}

            <button
              type="button"
              onClick={() => collectMutation.mutate()}
              disabled={collectMutation.isPending || amount <= 0}
              className="flex w-full items-center justify-center gap-xs rounded-lg bg-primary py-3 font-bold text-on-primary disabled:opacity-60"
            >
              <Icon name="payments" />
              {collectMutation.isPending ? 'جاري التحصيل...' : 'تأكيد التحصيل'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
