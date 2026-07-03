import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { Customer, Distributor, DistributorCommissionLedgerEntry, SalesInvoice } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { Icon } from '../components/Icon'
import { ProfileAvatar } from '../components/ProfileAvatar'
import { ProfilePhotoUploader } from '../components/ProfilePhotoUploader'
import { SearchableSelect } from '../components/SearchableSelect'
import { StatusBadge } from '../components/StatusBadge'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import {
  distributorFormStatusOptions,
  distributorLabel,
  distributorContractCustomerCount,
  distributorContractsCount,
  formatDistributorAgreedAmount,
  distributorTypeLabel,
  distributorTypeOptions,
  formatInvoiceDate,
  type ApiPaginated,
} from '../lib/sales'
import { getUserRole } from '../lib/permissions'
import { useAuthStore } from '../stores/authStore'

const inputClass = 'w-full rounded border border-outline-variant px-sm py-2 text-sm'

type EditForm = {
  code: string
  name_ar: string
  phone: string
  address: string
  type: 'center' | 'free'
  customer_id: number | null
  status: 'active' | 'inactive'
  agreed_amount: string
}

function toEditForm(distributor: Distributor): EditForm {
  return {
    code: distributor.code,
    name_ar: distributor.name_ar || distributor.name,
    phone: distributor.phone ?? '',
    address: distributor.address ?? '',
    type: distributor.type ?? 'free',
    customer_id: distributor.customer_id ?? null,
    status: distributor.status === 'inactive' ? 'inactive' : 'active',
    agreed_amount:
      distributor.agreed_amount != null && Number(distributor.agreed_amount) !== 0
        ? String(distributor.agreed_amount)
        : '',
  }
}

function ProfileDetailItem({
  icon,
  label,
  value,
  className = '',
}: {
  icon: string
  label: string
  value?: string | null
  className?: string
}) {
  return (
    <div className={`flex items-start gap-sm ${className}`}>
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant">
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-on-surface-variant">{label}</dt>
        <dd className="mt-0.5 font-medium text-on-surface tabular-nums">{value?.trim() || '—'}</dd>
      </div>
    </div>
  )
}

export function DistributorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const branchId = useAuthStore((s) => s.branchId)
  const user = useAuthStore((s) => s.user)
  const canEdit = ['super_admin', 'admin', 'sales'].includes(getUserRole(user))
  const [showEdit, setShowEdit] = useState(false)
  const [form, setForm] = useState<EditForm | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const debouncedCustomerSearch = useDebouncedValue(customerSearch, 300)

  const query = useQuery({
    queryKey: ['distributor', id],
    queryFn: async () => {
      const { data } = await api.get<Distributor>(`/distributors/${id}`, {
        params: { include: 'customer,customers,salesInvoices' },
      })
      return data
    },
    enabled: Boolean(id),
  })

  const ledgerQuery = useQuery({
    queryKey: ['distributor', id, 'commission-ledger'],
    queryFn: async () => {
      const { data } = await api.get<ApiPaginated<DistributorCommissionLedgerEntry>>(
        `/distributors/${id}/commission-ledger`,
        { params: { per_page: 50 } },
      )
      return data.data ?? []
    },
    enabled: Boolean(id),
  })

  const customersQuery = useQuery({
    queryKey: ['customers', 'distributor-edit', branchId, debouncedCustomerSearch],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 25,
        'filter[status]': 'active',
      }
      if (branchId) params['filter[branch_id]'] = branchId
      const q = debouncedCustomerSearch.trim()
      if (q) {
        if (/^01\d{8,9}$/.test(q.replace(/\s/g, ''))) {
          params['filter[phone]'] = q.replace(/\s/g, '')
        } else {
          params['filter[name]'] = q
        }
      }
      const { data } = await api.get<ApiPaginated<Customer>>('/customers', { params })
      return data.data
    },
    enabled: showEdit && Boolean(branchId),
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: EditForm) => {
      const { data } = await api.patch<Distributor>(`/distributors/${id}`, {
        ...payload,
        name: payload.name_ar.trim(),
        agreed_amount: payload.agreed_amount ? Number(payload.agreed_amount) : 0,
      })
      return data
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['distributor', id], updated)
      queryClient.invalidateQueries({ queryKey: ['distributors'] })
      setShowEdit(false)
    },
  })

  useEffect(() => {
    if (query.data && !showEdit) {
      setForm(toEditForm(query.data))
      setSelectedCustomer(query.data.customer ?? null)
    }
  }, [query.data, showEdit])

  const distributor = query.data
  const customers =
    distributor?.customers ??
    (distributor as Distributor & { customers?: Customer[] })?.customers ??
    []
  const invoices =
    distributor?.sales_invoices ??
    (distributor as Distributor & { salesInvoices?: SalesInvoice[] })?.salesInvoices ??
    []
  const contractCustomersCount = distributor
    ? distributorContractCustomerCount(distributor, invoices)
    : 0
  const contractsCount = distributor ? distributorContractsCount(distributor, invoices) : 0

  const handleCustomerChange = (customer: Customer | null) => {
    setSelectedCustomer(customer)
    if (!form) return

    if (!customer) {
      setForm({ ...form, customer_id: null })
      return
    }

    setForm({
      ...form,
      customer_id: customer.id,
      name_ar: form.name_ar || customer.name,
      phone: customer.phone || form.phone,
      address: customer.address || form.address,
    })
  }

  const handleUpdate = (e: FormEvent) => {
    e.preventDefault()
    if (!form) return
    updateMutation.mutate(form)
  }

  return (
    <div>
      <Link
        to="/distributors"
        className="mb-md inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <Icon name="arrow_forward" size={18} />
        العودة للموزعين
      </Link>

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {distributor && form && (
          <>
            <section className="mb-md overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
              <div className="border-b border-outline-variant/60 bg-surface-container/40 px-lg py-md">
                <div className="grid grid-cols-1 items-start gap-lg sm:grid-cols-[1fr_auto]">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-on-surface-variant">كود الموزع</p>
                    <div className="mt-xs flex flex-wrap items-center gap-sm">
                      <h1 className="text-2xl font-bold tabular-nums text-on-surface">
                        {distributor.code}
                      </h1>
                      <StatusBadge status={distributor.status} />
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setShowEdit(!showEdit)}
                          className="rounded-lg border border-outline-variant px-md py-sm text-sm font-medium text-on-surface hover:bg-surface-container"
                        >
                          {showEdit ? 'إلغاء التعديل' : 'تعديل'}
                        </button>
                      )}
                    </div>
                    <p className="mt-sm text-lg font-medium text-on-surface">
                      {distributorLabel(distributor)}
                    </p>
                  </div>
                  {distributor.customer_id && distributor.customer ? (
                    <ProfilePhotoUploader
                      entityType="customer"
                      entityId={distributor.customer.id}
                      name={distributor.customer.name}
                      photoUrl={distributor.profile_photo_url}
                      variant="distributor"
                      layout="vertical"
                      canEdit={canEdit}
                      queryKeys={[
                        ['distributor', id ?? ''],
                        ['customer', String(distributor.customer.id)],
                        ['distributors'],
                      ]}
                      onUpdated={(url) => {
                        queryClient.setQueryData<Distributor>(['distributor', id], (old) =>
                          old
                            ? {
                                ...old,
                                profile_photo_url: url,
                                customer: old.customer
                                  ? { ...old.customer, profile_photo_url: url }
                                  : old.customer,
                              }
                            : old,
                        )
                      }}
                    />
                  ) : (
                    <div className="flex shrink-0 flex-col items-center gap-xs text-center">
                      <ProfileAvatar
                        name={distributorLabel(distributor)}
                        photoUrl={distributor.profile_photo_url}
                        variant="distributor"
                        size="lg"
                      />
                      <p className="max-w-[140px] text-[11px] leading-tight text-on-surface-variant">
                        اربط عميلاً لتعيين صورة
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <dl className="grid gap-md p-lg sm:grid-cols-2 lg:grid-cols-3">
                <ProfileDetailItem icon="call" label="الهاتف" value={distributor.phone} />
                <ProfileDetailItem
                  icon="location_on"
                  label="العنوان"
                  value={distributor.address}
                  className="sm:col-span-2"
                />
                <ProfileDetailItem
                  icon="category"
                  label="النوع"
                  value={distributorTypeLabel(distributor.type)}
                />
                <ProfileDetailItem
                  icon="person"
                  label="العميل المرتبط"
                  value={distributor.customer?.name}
                />
                <ProfileDetailItem
                  icon="payments"
                  label="عمولة ثابتة لكل عقد"
                  value={formatDistributorAgreedAmount(distributor.agreed_amount)}
                />
                <ProfileDetailItem
                  icon="account_balance_wallet"
                  label="رصيد العمولة"
                  value={formatDistributorAgreedAmount(distributor.commission_balance)}
                />
                <ProfileDetailItem
                  icon="verified"
                  label="المعاملات المؤكدة"
                  value={
                    distributor.commission_tier_threshold
                      ? `${distributor.confirmed_transactions_count ?? 0} / ${distributor.commission_tier_threshold}`
                      : String(distributor.confirmed_transactions_count ?? 0)
                  }
                />
                <ProfileDetailItem
                  icon="groups"
                  label="عملاء التعاقد"
                  value={String(contractCustomersCount)}
                />
                <ProfileDetailItem
                  icon="description"
                  label="عدد التعاقدات"
                  value={String(contractsCount)}
                />
              </dl>

              {distributor.customer && (
                <div className="border-t border-outline-variant/60 px-lg py-sm">
                  <Link
                    to={`/customers/${distributor.customer.id}`}
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Icon name="open_in_new" size={16} />
                    عرض ملف العميل المرتبط
                  </Link>
                </div>
              )}
            </section>

            {showEdit && canEdit && (
              <form
                onSubmit={handleUpdate}
                className="mb-md space-y-md rounded-lg border border-outline-variant bg-surface-container-low p-md"
              >
                <h3 className="text-sm font-bold text-on-surface">تعديل بيانات الموزع</h3>
                <div className="grid grid-cols-12 gap-sm">
                  <label className="col-span-12 block text-sm sm:col-span-6">
                    <span className="mb-xs block text-on-surface-variant">كود الموزع *</span>
                    <input
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      required
                      dir="ltr"
                      placeholder="DIST-001"
                      className={inputClass}
                    />
                  </label>

                  <div className="col-span-12 block text-sm sm:col-span-6">
                    <SearchableSelect
                      label="عميل موجود (اختياري)"
                      options={customersQuery.data ?? []}
                      value={selectedCustomer}
                      onChange={handleCustomerChange}
                      onSearchChange={setCustomerSearch}
                      getOptionValue={(c) => c.id}
                      getOptionLabel={(c) => `${c.name}${c.phone ? ` — ${c.phone}` : ''}`}
                      placeholder="ابحث بالاسم أو الهاتف..."
                      loading={customersQuery.isFetching}
                      emptyMessage="لا يوجد عملاء"
                    />
                  </div>

                  <label className="col-span-12 block text-sm sm:col-span-6">
                    <span className="mb-xs block text-on-surface-variant">الاسم *</span>
                    <input
                      value={form.name_ar}
                      onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
                      required
                      className={inputClass}
                    />
                  </label>

                  <label className="col-span-12 block text-sm sm:col-span-6">
                    <span className="mb-xs block text-on-surface-variant">الهاتف</span>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      dir="ltr"
                      placeholder="01xxxxxxxxx"
                      className={inputClass}
                    />
                  </label>

                  <label className="col-span-12 block text-sm sm:col-span-6">
                    <span className="mb-xs block text-on-surface-variant">النوع</span>
                    <select
                      value={form.type}
                      onChange={(e) =>
                        setForm({ ...form, type: e.target.value as EditForm['type'] })
                      }
                      className={inputClass}
                    >
                      {distributorTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="col-span-12 block text-sm sm:col-span-6">
                    <span className="mb-xs block text-on-surface-variant">الحالة</span>
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm({ ...form, status: e.target.value as EditForm['status'] })
                      }
                      className={inputClass}
                    >
                      {distributorFormStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="col-span-12 block text-sm sm:col-span-6">
                    <span className="mb-xs block text-on-surface-variant">عمولة ثابتة لكل عقد (ج.م)</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.agreed_amount}
                      onChange={(e) =>
                        setForm({ ...form, agreed_amount: e.target.value })
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="col-span-12 block text-sm">
                    <span className="mb-xs block text-on-surface-variant">العنوان</span>
                    <textarea
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      rows={3}
                      className={inputClass}
                    />
                  </label>
                </div>

                {updateMutation.isError && (
                  <p className="text-sm text-error">{getErrorMessage(updateMutation.error)}</p>
                )}

                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="rounded-lg bg-secondary px-xl py-2 text-sm font-bold text-on-secondary disabled:opacity-50"
                >
                  حفظ التعديلات
                </button>
              </form>
            )}

            <section className="mb-md">
              <h2 className="mb-sm text-lg font-semibold">حركات رصيد العمولة</h2>
              <DataTable
                data={(ledgerQuery.data ?? []) as unknown as Record<string, unknown>[]}
                keyExtractor={(row) => row.id as number}
                pageSize={10}
                emptyMessage="لا توجد حركات على الرصيد بعد"
                columns={[
                  {
                    key: 'created_at',
                    header: 'التاريخ',
                    render: (row) => formatInvoiceDate(String(row.created_at ?? '')),
                  },
                  {
                    key: 'type',
                    header: 'النوع',
                    render: (row) => (row.type === 'credit' ? 'إضافة' : 'خصم'),
                  },
                  {
                    key: 'amount',
                    header: 'المبلغ',
                    render: (row) => `${Number(row.amount).toLocaleString('ar-EG')} ج.م`,
                  },
                  {
                    key: 'balance_after',
                    header: 'الرصيد بعد',
                    render: (row) => `${Number(row.balance_after).toLocaleString('ar-EG')} ج.م`,
                  },
                  {
                    key: 'notes',
                    header: 'ملاحظات',
                    render: (row) => String(row.notes ?? '—'),
                  },
                ]}
              />
            </section>

            <section className="mb-md">
              <h2 className="mb-sm text-lg font-semibold">عملاء الموزع</h2>
              <DataTable
                data={customers as unknown as Record<string, unknown>[]}
                keyExtractor={(row) => row.id as number}
                pageSize={10}
                emptyMessage="لا يوجد عملاء مرتبطون بهذا الموزع"
                columns={[
                  { key: 'name', header: 'الاسم' },
                  { key: 'phone', header: 'الهاتف' },
                  {
                    key: 'status',
                    header: 'الحالة',
                    render: (row) => <StatusBadge status={String(row.status)} />,
                  },
                  {
                    key: 'actions',
                    header: '',
                    render: (row) => (
                      <Link
                        to={`/customers/${row.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        عرض
                      </Link>
                    ),
                  },
                ]}
              />
            </section>

            <section>
              <h2 className="mb-sm text-lg font-semibold">التعاقدات</h2>
              <DataTable
                data={invoices as unknown as Record<string, unknown>[]}
                keyExtractor={(row) => row.id as number}
                pageSize={10}
                emptyMessage="لا توجد فواتير لهذا الموزع"
                columns={[
                  { key: 'invoice_number', header: 'رقم الفاتورة' },
                  {
                    key: 'invoice_date',
                    header: 'التاريخ',
                    render: (row) => formatInvoiceDate(String(row.invoice_date)),
                  },
                  {
                    key: 'customer',
                    header: 'العميل',
                    render: (row) => {
                      const customer = row.customer as Customer | undefined
                      return customer?.name ?? '—'
                    },
                  },
                  {
                    key: 'total',
                    header: 'الإجمالي',
                    render: (row) => `${Number(row.total).toLocaleString('ar-EG')} ج.م`,
                  },
                  {
                    key: 'status',
                    header: 'الحالة',
                    render: (row) => <StatusBadge status={String(row.status)} />,
                  },
                ]}
              />
            </section>
          </>
        )}
      </AsyncState>
    </div>
  )
}
