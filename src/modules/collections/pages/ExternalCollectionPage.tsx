import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { CollectionPaymentAccount, InstallmentItem } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { SalesPageShell } from '../../../components/SalesPageShell'
import { StatusBadge } from '../../../components/StatusBadge'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { formatInvoiceDate, normalizeInstallmentItem } from '../../../lib/sales'
import { openPaymentReceiptPrint } from '../../../lib/paymentReceipt'
import { NumericInput } from '../../../components/ui/NumericInput'

type InstallmentRow = InstallmentItem & Record<string, unknown>

const paymentMethodOptions = [
  { value: 'wallet', label: 'محفظة' },
  { value: 'instapay', label: 'انستا' },
  { value: 'bank_transfer', label: 'تحويل بنكي' },
]

const transferMethods = ['wallet', 'instapay', 'bank_transfer']
const MIN_SEARCH_LENGTH = 3

export function ExternalCollectionPage() {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<InstallmentRow | null>(null)
  const [amount, setAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [accountId, setAccountId] = useState<number | ''>('')
  const [senderNumber, setSenderNumber] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const debouncedSearch = useDebouncedValue(customerSearch.trim(), 300)
  const canSearch = debouncedSearch.length >= MIN_SEARCH_LENGTH

  const installmentsQuery = useQuery({
    queryKey: ['installments', 'external', debouncedSearch],
    queryFn: async () => {
      const { data } = await api.get<{ data: InstallmentItem[] }>('/installments', {
        params: {
          per_page: 100,
          include: 'salesInvoice.customer',
          'filter[search]': debouncedSearch,
        },
      })
      return data.data.map((item) => normalizeInstallmentItem(item)).filter((item) => item.status !== 'paid')
    },
    enabled: canSearch,
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

  useEffect(() => {
    setAccountId('')
  }, [paymentMethod])

  useEffect(() => {
    setSelected(null)
    setAmount(0)
    setSenderNumber('')
  }, [debouncedSearch])

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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      if (data?.id) {
        openPaymentReceiptPrint(Number(data.id))
      }
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

  const rows = (installmentsQuery.data ?? []) as InstallmentRow[]

  return (
    <SalesPageShell
      title="التحصيلات الخارجية"
      subtitle="مركز اتصال الإدارة — ابحث عن العميل ثم حصّل بالتحويل من أي فرع"
    >
      <div className="mb-md rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
        <label htmlFor="call-center-search" className="mb-xs block text-sm font-medium text-on-surface">
          بحث عن العميل
        </label>
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            id="call-center-search"
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            placeholder="اسم العميل أو الهاتف أو رقم الفاتورة..."
            className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-low pe-sm ps-10 text-base text-on-surface"
          />
        </div>
        {customerSearch.trim() && customerSearch.trim().length < MIN_SEARCH_LENGTH && (
          <p className="mt-sm text-xs text-on-surface-variant">اكتب {MIN_SEARCH_LENGTH} حروف على الأقل للبحث</p>
        )}
      </div>

      {!canSearch ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-md py-xl text-center">
          <Icon name="support_agent" size={40} className="mb-sm text-primary" />
          <p className="font-medium text-on-surface">ابحث عن العميل لعرض الأقساط في فروع الإدارة</p>
          <p className="mt-xs max-w-md text-sm text-on-surface-variant">
            التحصيل بالتحويل فقط، لأي فرع داخل نفس الإدارة
          </p>
        </div>
      ) : (
        <AsyncState
          isLoading={installmentsQuery.isLoading}
          isError={installmentsQuery.isError}
          error={installmentsQuery.error}
        >
          <div className="grid gap-md lg:grid-cols-[minmax(0,1fr)_min(22rem,38%)]">
            <DataTable<InstallmentRow>
              data={rows}
              keyExtractor={(row) => row.id}
              pageSize={10}
              emptyMessage="لا توجد أقساط مطابقة للبحث"
              columns={[
                {
                  key: 'branch_name',
                  header: 'الفرع',
                  render: (row) => String(row.branch_name ?? '—'),
                },
                { key: 'customer_name', header: 'العميل', render: (row) => row.customer_name ?? '—' },
                { key: 'invoice_number', header: 'فاتورة' },
                { key: 'installment_number', header: 'قسط #' },
                {
                  key: 'amount',
                  header: 'مبلغ القسط',
                  render: (row) => Number(row.amount).toLocaleString('ar-EG', { numberingSystem: 'latn' }),
                },
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
                  <div className="flex justify-between gap-sm">
                    <dt className="text-on-surface-variant">العميل</dt>
                    <dd>{selected.customer_name as string}</dd>
                  </div>
                  <div className="flex justify-between gap-sm">
                    <dt className="text-on-surface-variant">الفرع</dt>
                    <dd>{String(selected.branch_name ?? '—')}</dd>
                  </div>
                  <div className="flex justify-between gap-sm">
                    <dt className="text-on-surface-variant">الإجمالي المستحق</dt>
                    <dd className="font-bold tabular-nums">
                      {Number(selected.total_due ?? 0).toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م
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
                            {acc.beneficiary_name} — {acc.account_number || acc.phone}
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
                  <NumericInput
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
      )}
    </SalesPageShell>
  )
}
