import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { CollectionPaymentAccount, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import { StatusBadge } from '../../../components/StatusBadge'
import { EntityRowActions } from '../../../components/crud/EntityRowActions'
import { getEntityCrudConfig } from '../../../lib/crud/entityCrudRegistry'

const paymentMethodLabels: Record<string, string> = {
  wallet: 'محفظة',
  instapay: 'انستا',
  bank_transfer: 'تحويل بنكي',
}

const emptyForm = {
  phone: '',
  payment_method: 'bank_transfer',
  account_number: '',
  beneficiary_name: '',
  bank_name: '',
  transaction_limit: '' as number | '',
  is_active: true,
}

export function CollectionAccountsPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const crudConfig = getEntityCrudConfig('collectionAccounts')

  const accountsQuery = useQuery({
    queryKey: ['collection-accounts'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<CollectionPaymentAccount>>('/collection-accounts', {
        params: { per_page: 100 },
      })
      return data.data
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        phone: form.phone,
        payment_method: form.payment_method,
        account_number: form.account_number,
        beneficiary_name: form.beneficiary_name,
        bank_name: form.bank_name || null,
        is_active: form.is_active,
        transaction_limit: form.transaction_limit === '' ? null : Number(form.transaction_limit),
      }
      if (editId) {
        const { data } = await api.put(`/collection-accounts/${editId}`, payload)
        return data
      }
      const { data } = await api.post('/collection-accounts', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection-accounts'] })
      setShowForm(false)
      setEditId(null)
      setForm(emptyForm)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.patch(`/collection-accounts/${id}/toggle`)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['collection-accounts'] }),
  })

  const openCreate = () => {
    setEditId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (account: CollectionPaymentAccount) => {
    setEditId(account.id)
    setForm({
      phone: account.phone,
      payment_method: account.payment_method,
      account_number: account.account_number,
      beneficiary_name: account.beneficiary_name,
      bank_name: account.bank_name ?? '',
      transaction_limit: account.transaction_limit ?? '',
      is_active: account.is_active,
    })
    setShowForm(true)
  }

  return (
    <div className="p-md">
      <PageHeader
        title="حسابات التحويل"
        subtitle="إدارة حسابات التحصيل الخارجي لكل رقم هاتف"
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-2 text-sm font-bold text-on-primary"
          >
            <Icon name="add" size={18} />
            حساب جديد
          </button>
        }
      />

      <AsyncState
        isLoading={accountsQuery.isLoading}
        isError={accountsQuery.isError}
        error={accountsQuery.error}
      >
        <DataTable<CollectionPaymentAccount>
          data={accountsQuery.data ?? []}
          keyExtractor={(row) => row.id}
          pageSize={15}
          emptyMessage="لا توجد حسابات تحويل"
          columns={[
            { key: 'phone', header: 'الهاتف', render: (row) => <span dir="ltr">{row.phone}</span> },
            {
              key: 'payment_method',
              header: 'الطريقة',
              render: (row) => paymentMethodLabels[row.payment_method] ?? row.payment_method,
            },
            { key: 'account_number', header: 'رقم الحساب', render: (row) => <span dir="ltr">{row.account_number}</span> },
            { key: 'beneficiary_name', header: 'المستفيد' },
            { key: 'bank_name', header: 'البنك', render: (row) => row.bank_name ?? '—' },
            {
              key: 'is_active',
              header: 'الحالة',
              render: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} />,
            },
            {
              key: 'transactions_count',
              header: 'العمليات',
              render: (row) => row.transactions_count ?? 0,
            },
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <div className="flex flex-wrap items-center gap-2">
                  <EntityRowActions
                    row={row}
                    config={crudConfig}
                    queryKeys={[['collection-accounts']]}
                    onEdit={openEdit}
                    showView={false}
                  />
                  <button
                    type="button"
                    onClick={() => toggleMutation.mutate(row.id)}
                    className="text-xs text-on-surface-variant hover:underline"
                  >
                    {row.is_active ? 'إلغاء' : 'تفعيل'}
                  </button>
                </div>
              ),
            },
          ]}
        />
      </AsyncState>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'تعديل حساب' : 'حساب تحويل جديد'}>
        <div className="space-y-sm">
          <input
            placeholder="رقم الهاتف"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-full rounded border border-outline-variant px-sm py-2"
            dir="ltr"
          />
          <select
            value={form.payment_method}
            onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}
            className="w-full rounded border border-outline-variant px-sm py-2"
          >
            {Object.entries(paymentMethodLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            placeholder="رقم الحساب"
            value={form.account_number}
            onChange={(e) => setForm((f) => ({ ...f, account_number: e.target.value }))}
            className="w-full rounded border border-outline-variant px-sm py-2"
            dir="ltr"
          />
          <input
            placeholder="اسم المستفيد"
            value={form.beneficiary_name}
            onChange={(e) => setForm((f) => ({ ...f, beneficiary_name: e.target.value }))}
            className="w-full rounded border border-outline-variant px-sm py-2"
          />
          <input
            placeholder="اسم البنك (اختياري للمحفظة)"
            value={form.bank_name}
            onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
            className="w-full rounded border border-outline-variant px-sm py-2"
          />
          <input
            type="number"
            placeholder="حد العمليات قبل التبديل (اختياري)"
            value={form.transaction_limit}
            onChange={(e) =>
              setForm((f) => ({ ...f, transaction_limit: e.target.value ? Number(e.target.value) : '' }))
            }
            className="w-full rounded border border-outline-variant px-sm py-2"
          />
          <label className="flex items-center gap-xs text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            مفعّل
          </label>
          {saveMutation.isError && (
            <p className="text-sm text-error">{getErrorMessage(saveMutation.error)}</p>
          )}
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !form.phone || !form.account_number || !form.beneficiary_name}
            className="w-full rounded-lg bg-primary py-2 font-bold text-on-primary disabled:opacity-60"
          >
            {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
