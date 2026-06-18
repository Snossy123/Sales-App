import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../api/client'
import type { CollectionPaymentAccount, InstallmentItem } from '../../api/types'
import { AsyncState } from '../../components/AsyncState'
import { DataTable } from '../../components/DataTable'
import { FilterBar } from '../../components/FilterBar'
import { Icon } from '../../components/Icon'
import { SalesPageShell } from '../../components/SalesPageShell'
import { StatusBadge } from '../../components/StatusBadge'
import { formatInvoiceDate, normalizeInstallmentItem } from '../../lib/sales'

type InstallmentRow = InstallmentItem & Record<string, unknown>

const paymentMethodOptions = [
  { value: 'wallet', label: 'محفظة' },
  { value: 'instapay', label: 'انستا' },
  { value: 'bank_transfer', label: 'تحويل بنكي' },
]

const transferMethods = ['wallet', 'instapay', 'bank_transfer']

export function ExternalCollectionPage() {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<InstallmentRow | null>(null)
  const [amount, setAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [accountId, setAccountId] = useState<number | ''>('')
  const [senderNumber, setSenderNumber] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')

  const installmentsQuery = useQuery({
    queryKey: ['installments', 'external'],
    queryFn: async () => {
      const { data } = await api.get<{ data: InstallmentItem[] }>('/installments', {
        params: { per_page: 500, include: 'salesInvoice.customer' },
      })
      return data.data.map((item) => normalizeInstallmentItem(item)).filter((item) => item.status !== 'paid')
    },
  })

  const accountsQuery = useQuery({
    queryKey: ['collection-accounts', 'active', paymentMethod],
    queryFn: async () => {
      const { data } = await api.get<{ data: CollectionPaymentAccount[] }>('/collection-accounts/active', {
        params: transferMethods.includes(paymentMethod) ? { payment_method: paymentMethod } : undefined,
      })
      return data.data
    },
    enabled: transferMethods.includes(paymentMethod),
  })

  const filteredRows = useMemo(() => {
    const q = customerSearch.trim().toLowerCase()
    const rows = (installmentsQuery.data ?? []) as InstallmentRow[]
    if (!q) return rows
    return rows.filter((row) => {
      const name = String(row.customer_name ?? '').toLowerCase()
      const invoice = String(row.invoice_number ?? '').toLowerCase()
      return name.includes(q) || invoice.includes(q)
    })
  }, [installmentsQuery.data, customerSearch])

  useEffect(() => {
    setAccountId('')
  }, [paymentMethod])

  const collectMutation = useMutation({
    mutationFn: async () => {
      if (!selected?.sales_invoice_id) throw new Error('فاتورة غير محددة')
      const { data } = await api.post('/external-collections/collect', {
        sales_invoice_id: selected.sales_invoice_id,
        installment_item_id: selected.id,
        amount,
        payment_method: paymentMethod,
        collection_payment_account_id: accountId || undefined,
        sender_transfer_number: senderNumber || undefined,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      setSelected(null)
      setAmount(0)
      setSenderNumber('')
      setAccountId('')
    },
  })

  const selectRow = (row: InstallmentRow) => {
    setSelected(row)
    setAmount(Number(row.total_due ?? row.remaining ?? Number(row.amount) - Number(row.paid_amount)))
  }

  return (
    <SalesPageShell
      title="التحصيلات الخارجية"
      subtitle="تحصيل الأقساط عبر التحويل — مركز الاتصال"
    >
      <AsyncState
        isLoading={installmentsQuery.isLoading}
        isError={installmentsQuery.isError}
        error={installmentsQuery.error}
      >
        <FilterBar
          search={customerSearch}
          onSearchChange={setCustomerSearch}
          searchPlaceholder="بحث بالعميل أو رقم الفاتورة..."
          showClear={Boolean(customerSearch)}
          onClear={() => setCustomerSearch('')}
        />

        <div className="mt-md grid gap-md lg:grid-cols-[minmax(0,1fr)_min(22rem,38%)]">
          <DataTable<InstallmentRow>
            data={filteredRows}
            keyExtractor={(row) => row.id}
            pageSize={10}
            emptyMessage="لا توجد أقساط مستحقة"
            columns={[
              { key: 'invoice_number', header: 'فاتورة' },
              { key: 'customer_name', header: 'العميل', render: (row) => row.customer_name ?? '—' },
              { key: 'installment_number', header: 'قسط #' },
              { key: 'amount', header: 'مبلغ القسط', render: (row) => Number(row.amount).toLocaleString('ar-EG') },
              {
                key: 'due_date',
                header: 'الاستحقاق',
                render: (row) => formatInvoiceDate(String(row.due_date)),
              },
              {
                key: 'status',
                header: 'الحالة',
                render: (row) => <StatusBadge status={String(row.display_tier ?? row.status)} />,
              },
              {
                key: 'actions',
                header: '',
                render: (row) => (
                  <button type="button" onClick={() => selectRow(row)} className="text-sm text-primary hover:underline">
                    تحصيل
                  </button>
                ),
              },
            ]}
          />

          {selected ? (
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-md">
              <h3 className="mb-md text-lg font-semibold">تحصيل خارجي</h3>
              <dl className="mb-md space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-on-surface-variant">العميل</dt>
                  <dd>{selected.customer_name as string}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-on-surface-variant">الإجمالي المستحق</dt>
                  <dd className="font-bold tabular-nums">
                    {Number(selected.total_due ?? 0).toLocaleString('ar-EG')} ج.م
                  </dd>
                </div>
              </dl>

              {selected.has_open_reconciliation && (
                <p className="mb-sm rounded-lg bg-orange-50 px-sm py-2 text-sm text-orange-800">
                  يوجد تصالح مفتوح — لا يمكن التحصيل
                </p>
              )}

              <div className="mb-md space-y-sm">
                <label className="block text-sm text-on-surface-variant">طريقة الدفع</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded border border-outline-variant px-sm py-2"
                >
                  {paymentMethodOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>

                {transferMethods.includes(paymentMethod) && (
                  <>
                    <label className="block text-sm text-on-surface-variant">حساب التحويل المفعل</label>
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full rounded border border-outline-variant px-sm py-2 text-sm"
                    >
                      <option value="">اختر الحساب</option>
                      {(accountsQuery.data ?? []).map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.beneficiary_name} — {acc.account_number}
                          {acc.bank_name ? ` (${acc.bank_name})` : ''}
                        </option>
                      ))}
                    </select>

                    <label className="block text-sm text-on-surface-variant">رقم التحويل من العميل</label>
                    <input
                      value={senderNumber}
                      onChange={(e) => setSenderNumber(e.target.value)}
                      className="w-full rounded border border-outline-variant px-sm py-2"
                      dir="ltr"
                      placeholder="01xxxxxxxxx"
                    />
                  </>
                )}

                <label className="block text-sm text-on-surface-variant">مبلغ التحصيل</label>
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

              <button
                type="button"
                onClick={() => collectMutation.mutate()}
                disabled={
                  collectMutation.isPending ||
                  amount <= 0 ||
                  Boolean(selected.has_open_reconciliation) ||
                  (transferMethods.includes(paymentMethod) && (!accountId || !senderNumber.trim()))
                }
                className="flex w-full items-center justify-center gap-xs rounded-lg bg-primary py-3 font-bold text-on-primary disabled:opacity-60"
              >
                <Icon name="payments" />
                {collectMutation.isPending ? 'جاري التحصيل...' : 'تأكيد التحصيل الخارجي'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-xl border border-dashed border-outline-variant p-md text-sm text-on-surface-variant">
              اختر قسطاً لبدء التحصيل الخارجي
            </div>
          )}
        </div>
      </AsyncState>
    </SalesPageShell>
  )
}
