import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../api/client'
import type { Customer, Distributor, SalesInvoice } from '../api/types'
import { CustomerAttachmentsSection } from '../components/customers/CustomerAttachmentsSection'
import { CustomerContractsSection } from '../components/customers/CustomerContractsSection'
import { CustomerOwnershipTransfersSection } from '../components/customers/CustomerOwnershipTransfersSection'
import { CustomerEvaluationsSection } from '../components/customers/CustomerEvaluationsSection'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { Icon } from '../components/Icon'
import { RefundPaymentModal, type RefundPaymentTarget } from '../components/payments/RefundPaymentModal'
import { ProfilePhotoUploader } from '../components/ProfilePhotoUploader'
import { StatusBadge } from '../components/StatusBadge'
import { DeleteConfirmDialog } from '../components/crud/DeleteConfirmDialog'
import { getEntityCrudConfig } from '../lib/crud/entityCrudRegistry'
import { useSoftDelete } from '../lib/crud/useSoftDelete'
import { getUserRole } from '../lib/permissions'
import {
  distributorLabel,
  distributorTypeLabel,
  formatDistributorAgreedAmount,
} from '../lib/sales'
import { useAuthStore } from '../stores/authStore'
import { customerToPhoneEntries } from '../lib/customerForm'

function getCustomerDistributorProfile(customer: Customer): Distributor | undefined {
  return (
    customer.distributor_profile ??
    (customer as Customer & { distributorProfile?: Distributor }).distributorProfile ??
    undefined
  )
}

interface PaymentRow {
  id: number
  transaction_number?: string
  amount: string | number
  refunded_amount?: string | number
  status: string
  payment_source?: string
  paid_at?: string
  sales_invoice?: { invoice_number?: string }
}

const sourceLabels: Record<string, string> = {
  installment: 'قسط',
  external: 'تحصيل خارجي',
  down_payment: 'مقدم',
  pos_cash: 'كاش POS',
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

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const crudConfig = getEntityCrudConfig('customers')
  const canManage = ['super_admin', 'admin', 'sales'].includes(getUserRole(user))
  const canDelete = ['super_admin', 'admin'].includes(getUserRole(user))
  const canRefund = ['super_admin', 'admin', 'collector'].includes(getUserRole(user))
  const [refundTarget, setRefundTarget] = useState<RefundPaymentTarget | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const deleteMutation = useSoftDelete({
    resource: 'customers',
    queryKeys: [['customers']],
    onSuccess: () => navigate('/customers'),
    onError: (message) => setDeleteError(message),
  })

  const query = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { data } = await api.get<Customer>(`/customers/${id}`, {
        params: {
          include: 'guarantors,distributorProfile,salesInvoices.lines.installmentPlan.items,ownershipTransfersFrom,ownershipTransfersTo',
          sales_invoice_status: 'all',
        },
      })
      return data
    },
    enabled: Boolean(id),
  })

  const paymentsQuery = useQuery({
    queryKey: ['payment-transactions', 'customer', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: PaymentRow[] }>('/payment-transactions', {
        params: { customer_id: id, per_page: 50 },
      })
      return (data as { data?: PaymentRow[] }).data ?? []
    },
    enabled: Boolean(id),
  })

  const customer = query.data
  const distributorProfile = customer ? getCustomerDistributorProfile(customer) : undefined
  const hasGuarantor = (customer?.guarantors?.length ?? 0) > 0
  const guarantor = customer?.guarantors?.[0]
  const invoices =
    customer?.sales_invoices ??
    (customer as Customer & { salesInvoices?: SalesInvoice[] })?.salesInvoices ??
    []
  const ownershipTransfersFrom =
    customer?.ownership_transfers_from ??
    (customer as Customer & { ownershipTransfersFrom?: Customer['ownership_transfers_from'] })
      ?.ownershipTransfersFrom ??
    []
  const ownershipTransfersTo =
    customer?.ownership_transfers_to ??
    (customer as Customer & { ownershipTransfersTo?: Customer['ownership_transfers_to'] })
      ?.ownershipTransfersTo ??
    []

  return (
    <div>
      <Link
        to="/customers"
        className="mb-md inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <Icon name="arrow_forward" size={18} />
        العودة للعملاء
      </Link>

      <AsyncState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
      >
        {customer && (
          <>
            {distributorProfile && (
              <div className="mb-md flex flex-wrap items-center justify-between gap-sm rounded-lg border border-primary/30 bg-primary/5 p-md">
                <div className="flex items-start gap-sm">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Icon name="local_shipping" size={22} />
                  </span>
                  <div>
                    <p className="font-semibold text-on-surface">هذا العميل مسجّل كموزّع</p>
                    <p className="mt-xs text-sm text-on-surface-variant">
                      {distributorProfile.code} — {distributorLabel(distributorProfile)}
                      {' · '}
                      {distributorTypeLabel(distributorProfile.type)}
                      {' · '}
                      {formatDistributorAgreedAmount(distributorProfile.agreed_amount)}
                      {' · رصيد: '}
                      {formatDistributorAgreedAmount(distributorProfile.commission_balance)}
                    </p>
                  </div>
                </div>
                <Link
                  to={`/distributors/${distributorProfile.id}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-surface-container-lowest px-md py-sm text-sm font-medium text-primary hover:bg-surface-container"
                >
                  <Icon name="visibility" size={18} />
                  عرض ملف الموزع
                </Link>
              </div>
            )}

            <section className="mb-md overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
              <div className="border-b border-outline-variant/60 bg-surface-container/40 px-lg py-md">
                <div className="grid grid-cols-1 items-start gap-lg sm:grid-cols-[1fr_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-sm">
                      <h1 className="text-2xl font-bold text-on-surface">{customer.name}</h1>
                      <StatusBadge status={customer.status} />
                    </div>
                    {canManage && (
                      <div className="mt-sm flex flex-wrap items-center gap-md">
                        <Link
                          to={`/customers/${customer.id}/edit`}
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Icon name="edit" size={18} />
                          تعديل
                        </Link>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeleteOpen(true)}
                            className="inline-flex items-center gap-1 text-sm text-error hover:underline"
                          >
                            <Icon name="delete" size={18} />
                            حذف
                          </button>
                        )}
                      </div>
                    )}
                    {deleteError && <p className="mt-xs text-xs text-error">{deleteError}</p>}
                  </div>
                  <ProfilePhotoUploader
                    entityType="customer"
                    entityId={customer.id}
                    name={customer.name}
                    photoUrl={customer.profile_photo_url}
                    variant="customer"
                    layout="vertical"
                    canEdit={canManage}
                    queryKeys={[['customer', id ?? ''], ['customers']]}
                  />
                </div>
              </div>

              <dl className="grid gap-md p-lg sm:grid-cols-2 lg:grid-cols-3">
                {customerToPhoneEntries(customer)
                  .filter((entry) => entry.number.trim())
                  .map((entry, index) => (
                    <ProfileDetailItem
                      key={`${entry.number}-${index}`}
                      icon="call"
                      label={(entry.label ?? '').trim() || `رقم الهاتف ${index + 1}`}
                      value={entry.number}
                    />
                  ))}
                <ProfileDetailItem icon="badge" label="الرقم القومي" value={customer.national_id} />
                <ProfileDetailItem
                  icon="location_on"
                  label="العنوان"
                  value={customer.address}
                  className="sm:col-span-2"
                />
                {customer.distinctive_mark && (
                  <ProfileDetailItem
                    icon="place"
                    label="علامة مميزة"
                    value={customer.distinctive_mark}
                  />
                )}
                {customer.city && (
                  <ProfileDetailItem icon="map" label="المدينة" value={customer.city} />
                )}
              </dl>
            </section>

            {hasGuarantor && guarantor ? (
              <section className="mb-md overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
                <div className="border-b border-outline-variant/60 bg-surface-container/40 px-lg py-md">
                  <p className="text-xs font-medium text-on-surface-variant">بيانات الضامن</p>
                  <div className="mt-xs flex flex-wrap items-center gap-sm">
                    <h2 className="text-2xl font-bold text-on-surface">{guarantor.name}</h2>
                    {guarantor.relationship && (
                      <span className="rounded-full bg-secondary/10 px-sm py-0.5 text-xs font-medium text-secondary">
                        {guarantor.relationship}
                      </span>
                    )}
                  </div>
                </div>

                <dl className="grid gap-md p-lg sm:grid-cols-2 lg:grid-cols-3">
                  <ProfileDetailItem icon="call" label="رقم الهاتف" value={guarantor.phone} />
                  <ProfileDetailItem icon="badge" label="الرقم القومي" value={guarantor.national_id} />
                  <ProfileDetailItem icon="group" label="الصلة" value={guarantor.relationship} />
                  <ProfileDetailItem
                    icon="location_on"
                    label="العنوان"
                    value={guarantor.address}
                    className="sm:col-span-2 lg:col-span-3"
                  />
                </dl>
              </section>
            ) : (
              <section className="mb-md rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-lg text-center">
                <Icon name="person_off" size={28} className="mx-auto mb-sm text-on-surface-variant" />
                <p className="text-sm font-medium text-on-surface-variant">بدون ضامن</p>
              </section>
            )}

            <section className="mb-md">
              <h2 className="mb-sm text-lg font-semibold">سجل المدفوعات</h2>
              <DataTable<PaymentRow>
                data={paymentsQuery.data ?? []}
                keyExtractor={(r) => r.id}
                pageSize={10}
                emptyMessage="لا توجد مدفوعات"
                columns={[
                  { key: 'transaction_number', header: 'رقم العملية' },
                  { key: 'invoice', header: 'فاتورة', render: (r) => r.sales_invoice?.invoice_number ?? '—' },
                  {
                    key: 'source',
                    header: 'المصدر',
                    render: (r) => sourceLabels[r.payment_source ?? ''] ?? r.payment_source ?? '—',
                  },
                  {
                    key: 'amount',
                    header: 'المبلغ',
                    render: (r) => Number(r.amount).toLocaleString('ar-EG'),
                  },
                  { key: 'status', header: 'الحالة' },
                  {
                    key: 'actions',
                    header: '',
                    render: (r) =>
                      canRefund && r.status === 'active' && Number(r.amount) > 0 ? (
                        <button
                          type="button"
                          onClick={() => setRefundTarget(r)}
                          className="text-sm text-primary hover:underline"
                        >
                          استرداد
                        </button>
                      ) : (
                        '—'
                      ),
                  },
                ]}
              />
            </section>

            <div className="mb-md">
              <CustomerAttachmentsSection
                mode="view"
                customerId={customer.id}
                canManage={canManage}
              />
            </div>

            <CustomerOwnershipTransfersSection
              transfersFrom={ownershipTransfersFrom}
              transfersTo={ownershipTransfersTo}
            />

            <CustomerContractsSection invoices={invoices} />

            {customer && <CustomerEvaluationsSection customerId={customer.id} />}
          </>
        )}
      </AsyncState>

      <RefundPaymentModal
        payment={refundTarget}
        open={Boolean(refundTarget)}
        onClose={() => setRefundTarget(null)}
        invalidateKeys={id ? [['payment-transactions', 'customer', id]] : undefined}
      />

      {customer && (
        <DeleteConfirmDialog
          open={deleteOpen}
          message={crudConfig.deleteConfirmMessage?.(customer) ?? `حذف "${customer.name}"؟`}
          isPending={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(customer.id)}
          onCancel={() => setDeleteOpen(false)}
        />
      )}
    </div>
  )
}
