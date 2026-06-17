import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { PaginatedResponse, SalesInvoice, TransactionMapPayload } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import { ToastBanner } from '../../../components/ToastBanner'
import { formatDate, formatMoney } from '../../../lib/accounting'

export function TransactionMapPage() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [depositTo, setDepositTo] = useState('')
  const [paymentAccount, setPaymentAccount] = useState('')
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  const listQuery = useQuery({
    queryKey: ['accounting', 'transactions', 'unmapped'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<SalesInvoice>>('/accounting/transactions', {
        params: { per_page: 50, unmapped_only: 1 },
      })
      return data.data
    },
  })

  const mapQuery = useQuery({
    queryKey: ['accounting', 'transactions', 'map', selectedId],
    queryFn: async () => {
      const { data } = await api.get<TransactionMapPayload>('/accounting/transactions/map', {
        params: { sales_invoice_id: selectedId! },
      })
      return data
    },
    enabled: selectedId != null,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.post('/accounting/transactions/save-map', {
        sales_invoice_id: selectedId,
        deposit_to: Number(depositTo),
        payment_account: Number(paymentAccount),
      })
    },
    onSuccess: () => {
      setToast('تم ربط الفاتورة بنجاح')
      setSelectedId(null)
      setDepositTo('')
      setPaymentAccount('')
      setError('')
      queryClient.invalidateQueries({ queryKey: ['accounting', 'transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounting', 'dashboard'] })
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const openMap = (invoice: SalesInvoice) => {
    setSelectedId(invoice.id)
    setDepositTo('')
    setPaymentAccount('')
    setError('')
  }

  const closeMap = () => {
    setSelectedId(null)
    setError('')
  }

  return (
    <div>
      <PageHeader
        title="ربط المبيعات"
        subtitle="فواتير المبيعات المؤكدة التي لم تُربط بعد في الدفاتر المحاسبية"
      />

      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}

      <AsyncState
        isLoading={listQuery.isLoading}
        isError={listQuery.isError}
        error={listQuery.error}
      >
        <DataTable<SalesInvoice & Record<string, unknown>>
          data={(listQuery.data ?? []) as (SalesInvoice & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          pageSize={10}
          emptyMessage="كل فواتير المبيعات مربوطة"
          columns={[
            { key: 'invoice_number', header: 'رقم الفاتورة' },
            {
              key: 'invoice_date',
              header: 'التاريخ',
              render: (row) => formatDate(row.invoice_date),
            },
            {
              key: 'customer',
              header: 'العميل',
              render: (row) => row.customer?.name ?? '—',
            },
            {
              key: 'branch',
              header: 'الفرع',
              render: (row) => {
                const branch = row.branch as { name_ar?: string; name?: string } | undefined
                return branch?.name_ar || branch?.name || '—'
              },
            },
            {
              key: 'total',
              header: 'الإجمالي',
              className: 'tabular-nums',
              render: (row) => formatMoney(row.total),
            },
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <button
                  type="button"
                  onClick={() => openMap(row)}
                  className="rounded-lg bg-primary px-sm py-xs text-xs font-bold text-on-primary hover:opacity-90"
                >
                  ربط
                </button>
              ),
            },
          ]}
        />
      </AsyncState>

      <Modal
        open={selectedId != null}
        onClose={closeMap}
        title={`ربط فاتورة ${mapQuery.data?.invoice?.invoice_number ?? selectedId ?? ''}`}
        size="lg"
      >
        {mapQuery.isLoading ? (
          <p className="text-sm text-on-surface-variant">جاري التحميل...</p>
        ) : mapQuery.data?.invoice ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              saveMutation.mutate()
            }}
            className="flex flex-col gap-md"
          >
            <div className="rounded-lg bg-surface-container-low p-sm text-sm">
              <p>
                <span className="text-on-surface-variant">العميل: </span>
                {mapQuery.data.invoice.customer?.name ?? '—'}
              </p>
              <p>
                <span className="text-on-surface-variant">المبلغ: </span>
                {formatMoney(mapQuery.data.invoice.total)}
              </p>
            </div>

            <div>
              <label className="mb-xs block text-sm font-medium text-on-surface-variant">
                حساب الإيداع (deposit_to)
              </label>
              <select
                value={depositTo}
                onChange={(e) => setDepositTo(e.target.value)}
                required
                className="w-full rounded-lg border border-outline-variant px-sm py-2 text-sm"
              >
                <option value="">اختر الحساب</option>
                {mapQuery.data.accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.gl_code ? `${acc.gl_code} — ` : ''}
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-xs block text-sm font-medium text-on-surface-variant">
                حساب الدفع (payment_account)
              </label>
              <select
                value={paymentAccount}
                onChange={(e) => setPaymentAccount(e.target.value)}
                required
                className="w-full rounded-lg border border-outline-variant px-sm py-2 text-sm"
              >
                <option value="">اختر الحساب</option>
                {mapQuery.data.accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.gl_code ? `${acc.gl_code} — ` : ''}
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p className="rounded-lg bg-error-container/40 px-sm py-xs text-sm text-error">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-sm">
              <button
                type="button"
                onClick={closeMap}
                className="rounded-lg border border-outline-variant px-md py-sm text-sm"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary disabled:opacity-60"
              >
                {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ الربط'}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-error">تعذر تحميل بيانات الربط</p>
        )}
      </Modal>
    </div>
  )
}
