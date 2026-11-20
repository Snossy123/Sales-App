import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'

const apiBaseUrl = import.meta.env.VITE_API_URL?.trim() || '/api/v1'

interface PublicInstallmentItem {
  id: number
  sequence: number
  due_date: string | null
  amount: number
  paid_amount: number
  remaining_amount: number
  late_fee_accrued: number
  status: string
  paid_at: string | null
}

interface PublicContractLine {
  id: number
  description: string | null
  quantity: number
  line_total: number
  serial_number: string | null
  sim_number: string | null
  vehicle_info: string
}

interface PublicContract {
  id: number
  invoice_number: string
  invoice_date: string | null
  payment_term: string | null
  contract_kind: string | null
  total: number
  paid_amount: number
  balance_due: number
  payment_status: string
  installments_total_count: number
  installments_paid_count: number
  lines: PublicContractLine[]
  installments: PublicInstallmentItem[]
}

interface PublicDevice {
  id: number
  model_name: string
  imei: string | null
  serial_number: string | null
  sim_number: string | null
  state: string | null
  sold_at: string | null
}

interface PublicPayment {
  id: number
  transaction_number: string | null
  invoice_number: string | null
  amount: number
  payment_method: string | null
  payment_source: string | null
  paid_at: string | null
}

interface PublicPaymentAccount {
  id: number
  payment_method: string
  phone: string | null
  account_number: string | null
  beneficiary_name: string | null
  bank_name: string | null
}

interface PublicCustomerProfileResponse {
  organization: {
    name: string | null
    phone: string | null
    logo_url: string | null
  }
  customer: {
    name: string
    phone: string | null
    phone_2: string | null
    city: string | null
    address: string | null
    status: string
    national_id_masked: string | null
    branch_name: string | null
    branch_phone: string | null
    profile_photo_url: string | null
  }
  summary: {
    contracts_count: number
    total_contracts_amount: number
    total_paid: number
    total_balance_due: number
    total_installments_count: number
    paid_installments_count: number
    partial_installments_count: number
    overdue_installments_count: number
    pending_installments_count: number
    suspended_installments_count: number
    remaining_installments_count: number
    overdue_amount: number
    late_fees: number
    progress_percent: number
    next_due: {
      id: number
      invoice_number: string
      sequence: number
      due_date: string | null
      amount: number
      remaining_amount: number
      is_overdue: boolean
    } | null
  }
  contracts: PublicContract[]
  devices: PublicDevice[]
  payments: PublicPayment[]
  support: {
    whatsapp_url: string | null
    follow_up_phone: string | null
    payment_accounts: PublicPaymentAccount[]
  }
}

type TabKey = 'installments' | 'devices' | 'payments' | 'info'

const installmentStatusMeta: Record<string, { label: string; badgeClass: string }> = {
  paid: { label: 'مدفوع', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  partial: { label: 'مدفوع جزئياً', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' },
  overdue: { label: 'متأخر', badgeClass: 'bg-rose-100 text-rose-800 border-rose-200' },
  pending: { label: 'قادم', badgeClass: 'bg-sky-100 text-sky-800 border-sky-200' },
  suspended: { label: 'موقوف', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' },
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'نقدي',
  bank_transfer: 'تحويل بنكي',
  vodafone_cash: 'فودافون كاش',
  instapay: 'إنستاباي',
  card: 'بطاقة',
  wallet: 'محفظة إلكترونية',
}

function formatMoney(value: number | null | undefined): string {
  return `${Number(value ?? 0).toLocaleString('ar-EG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    numberingSystem: 'latn',
  })} ج.م`
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    numberingSystem: 'latn',
  })
}

export function CustomerPublicProfilePage() {
  const { token } = useParams<{ token: string }>()
  const [activeTab, setActiveTab] = useState<TabKey>('installments')
  const [expandedContracts, setExpandedContracts] = useState<Record<number, boolean>>({})

  const query = useQuery({
    queryKey: ['public-customer-profile', token],
    queryFn: async () => {
      const { data } = await axios.get<PublicCustomerProfileResponse>(
        `${apiBaseUrl}/public/customer-profile/${token}`,
      )
      return data
    },
    enabled: Boolean(token),
    retry: false,
  })

  if (query.isLoading) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-surface p-md">
        <div className="flex flex-col items-center gap-sm text-on-surface-variant">
          <Icon name="progress_activity" size={36} className="animate-spin text-primary" />
          <p className="text-sm font-medium">جاري تحميل ملف العميل...</p>
        </div>
      </div>
    )
  }

  if (query.isError || !query.data) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-surface p-md">
        <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-lg text-center shadow-sm">
          <div className="mx-auto mb-md flex h-14 w-14 items-center justify-center rounded-full bg-error/10 text-error">
            <Icon name="link_off" size={28} />
          </div>
          <h1 className="text-lg font-bold text-on-surface">الرابط غير صالح أو منتهي</h1>
          <p className="mt-xs text-sm text-on-surface-variant">
            يرجى التأكد من الرابط المرسل إليك عبر واتساب أو التواصل مع خدمة العملاء للحصول على رابط محدث.
          </p>
        </div>
      </div>
    )
  }

  const { organization, customer, summary, contracts, devices, payments, support } = query.data

  const toggleContract = (contractId: number) => {
    setExpandedContracts((prev) => ({
      ...prev,
      [contractId]: !(prev[contractId] ?? true),
    }))
  }

  const tabs: { key: TabKey; label: string; icon: string; count?: number }[] = [
    { key: 'installments', label: 'الأقساط والتعاقدات', icon: 'calendar_month', count: contracts.length },
    { key: 'devices', label: 'الأجهزة', icon: 'gps_fixed', count: devices.length },
    { key: 'payments', label: 'المدفوعات', icon: 'receipt_long', count: payments.length },
    { key: 'info', label: 'بياناتي والدفع', icon: 'person' },
  ]

  return (
    <div dir="rtl" className="min-h-screen bg-surface pb-12 text-on-surface">
      {/* Top Organization Bar */}
      <header className="border-b border-outline-variant bg-surface-container-lowest">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-sm px-md py-sm">
          <div className="flex items-center gap-sm">
            {organization.logo_url ? (
              <img
                src={organization.logo_url}
                alt={organization.name ?? 'شعار الشركة'}
                className="h-9 w-9 rounded-lg object-contain"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon name="verified_user" size={20} />
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-on-surface">{organization.name ?? 'بوابة العميل'}</p>
              <p className="text-xs text-on-surface-variant">ملف العميل ومتابعة الأقساط</p>
            </div>
          </div>

          {support.whatsapp_url && (
            <a
              href={support.whatsapp_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              <Icon name="chat" size={16} />
              تواصل واتساب
            </a>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-md px-md pt-md">
        {/* Customer Header Card */}
        <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-md shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-md">
            <div className="flex items-center gap-md">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                {customer.profile_photo_url ? (
                  <img
                    src={customer.profile_photo_url}
                    alt={customer.name}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <Icon name="person" size={28} />
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-on-surface">{customer.name}</h1>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      customer.status === 'blocked'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {customer.status === 'blocked' ? 'موقوف' : 'حساب نشط'}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-surface-variant">
                  {customer.phone && (
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Icon name="call" size={14} />
                      {customer.phone}
                    </span>
                  )}
                  {customer.branch_name && (
                    <span className="inline-flex items-center gap-1">
                      <Icon name="store" size={14} />
                      {customer.branch_name}
                    </span>
                  )}
                  {customer.city && (
                    <span className="inline-flex items-center gap-1">
                      <Icon name="location_on" size={14} />
                      {customer.city}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Installment Progress Hero */}
        <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-md shadow-xs">
          <div className="mb-sm flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-on-surface">مؤشر تقدم الأقساط</h2>
              <p className="text-xs text-on-surface-variant">
                تم سداد {summary.paid_installments_count} من أصل {summary.total_installments_count} قسط
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold tabular-nums text-primary">
              {summary.progress_percent}%
            </span>
          </div>

          <div className="h-3 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, summary.progress_percent))}%` }}
            />
          </div>

          {/* KPIs */}
          <div className="mt-md grid grid-cols-2 gap-sm sm:grid-cols-4">
            <div className="rounded-xl border border-outline-variant bg-surface p-sm">
              <p className="text-xs text-on-surface-variant">إجمالي المتبقي</p>
              <p className="mt-1 text-base font-bold tabular-nums text-on-surface">
                {formatMoney(summary.total_balance_due)}
              </p>
            </div>

            <div className="rounded-xl border border-outline-variant bg-surface p-sm">
              <p className="text-xs text-on-surface-variant">إجمالي المدفوع</p>
              <p className="mt-1 text-base font-bold tabular-nums text-emerald-700">
                {formatMoney(summary.total_paid)}
              </p>
            </div>

            <div className="rounded-xl border border-outline-variant bg-surface p-sm">
              <p className="text-xs text-on-surface-variant">القسط القادم</p>
              {summary.next_due ? (
                <>
                  <p
                    className={`mt-1 text-base font-bold tabular-nums ${
                      summary.next_due.is_overdue ? 'text-rose-700' : 'text-on-surface'
                    }`}
                  >
                    {formatMoney(summary.next_due.remaining_amount)}
                  </p>
                  <p className="text-[11px] tabular-nums text-on-surface-variant">
                    {formatDate(summary.next_due.due_date)}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm font-semibold text-emerald-700">لا توجد أقساط مستحقة</p>
              )}
            </div>

            <div
              className={`rounded-xl border p-sm ${
                summary.overdue_installments_count > 0
                  ? 'border-rose-200 bg-rose-50/70'
                  : 'border-outline-variant bg-surface'
              }`}
            >
              <p className="text-xs text-on-surface-variant">المتأخرات</p>
              <p
                className={`mt-1 text-base font-bold tabular-nums ${
                  summary.overdue_installments_count > 0 ? 'text-rose-700' : 'text-on-surface'
                }`}
              >
                {formatMoney(summary.overdue_amount)}
              </p>
              <p className="text-[11px] text-on-surface-variant">
                {summary.overdue_installments_count > 0
                  ? `${summary.overdue_installments_count} قسط متأخر`
                  : 'منتظم في السداد'}
              </p>
            </div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
                  isActive
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <Icon name={tab.icon} size={16} />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                      isActive ? 'bg-white/20 text-white' : 'bg-surface-container-high text-on-surface'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Tab Content: Installments & Contracts */}
        {activeTab === 'installments' && (
          <section className="space-y-md">
            {contracts.length === 0 ? (
              <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-lg text-center text-sm text-on-surface-variant">
                لا توجد تعاقدات مسجلة حالياً.
              </div>
            ) : (
              contracts.map((contract) => {
                const isExpanded = expandedContracts[contract.id] ?? true
                return (
                  <div
                    key={contract.id}
                    className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-xs"
                  >
                    <button
                      type="button"
                      onClick={() => toggleContract(contract.id)}
                      className="flex w-full flex-wrap items-center justify-between gap-sm p-md text-right hover:bg-surface-container/40"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-bold tabular-nums text-on-surface">
                            تعاقد {contract.invoice_number}
                          </span>
                          <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 text-xs text-on-surface-variant">
                            {formatDate(contract.invoice_date)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-on-surface-variant">
                          الإجمالي: <strong className="tabular-nums">{formatMoney(contract.total)}</strong> ·
                          المدفوع: <strong className="tabular-nums text-emerald-700">{formatMoney(contract.paid_amount)}</strong> ·
                          المتبقي: <strong className="tabular-nums text-primary">{formatMoney(contract.balance_due)}</strong>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {contract.installments_total_count > 0 && (
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-primary">
                            {contract.installments_paid_count} / {contract.installments_total_count} قسط
                          </span>
                        )}
                        <Icon
                          name={isExpanded ? 'expand_less' : 'expand_more'}
                          size={20}
                          className="text-on-surface-variant"
                        />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-outline-variant p-md pt-sm space-y-md">
                        {contract.lines.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {contract.lines.map((line) => (
                              <div
                                key={line.id}
                                className="rounded-lg border border-outline-variant bg-surface px-2.5 py-1.5 text-xs text-on-surface-variant"
                              >
                                <span className="font-medium text-on-surface">{line.description ?? 'صنف'}</span>
                                {line.serial_number && (
                                  <span className="mr-2 tabular-nums">({line.serial_number})</span>
                                )}
                                {line.vehicle_info && <span className="mr-2">· {line.vehicle_info}</span>}
                              </div>
                            ))}
                          </div>
                        )}

                        {contract.installments.length === 0 ? (
                          <p className="text-xs text-on-surface-variant">
                            هذا التعاقد لا يحتوي على جدول أقساط.
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[540px] border-collapse text-right text-xs">
                              <thead>
                                <tr className="border-b border-outline-variant text-on-surface-variant">
                                  <th className="py-2 pl-2 font-medium">#</th>
                                  <th className="py-2 px-2 font-medium">تاريخ الاستحقاق</th>
                                  <th className="py-2 px-2 font-medium">قيمة القسط</th>
                                  <th className="py-2 px-2 font-medium">المدفوع</th>
                                  <th className="py-2 px-2 font-medium">المتبقي</th>
                                  <th className="py-2 pr-2 font-medium">الحالة</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-outline-variant/60">
                                {contract.installments.map((item) => {
                                  const meta = installmentStatusMeta[item.status] ?? {
                                    label: item.status,
                                    badgeClass: 'bg-surface-container text-on-surface',
                                  }
                                  return (
                                    <tr key={item.id}>
                                      <td className="py-2.5 pl-2 font-semibold tabular-nums">
                                        {item.sequence}
                                      </td>
                                      <td className="py-2.5 px-2 tabular-nums">
                                        {formatDate(item.due_date)}
                                      </td>
                                      <td className="py-2.5 px-2 tabular-nums">
                                        {formatMoney(item.amount)}
                                      </td>
                                      <td className="py-2.5 px-2 tabular-nums text-emerald-700">
                                        {formatMoney(item.paid_amount)}
                                      </td>
                                      <td className="py-2.5 px-2 font-medium tabular-nums">
                                        {formatMoney(item.remaining_amount)}
                                      </td>
                                      <td className="py-2.5 pr-2">
                                        <span
                                          className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${meta.badgeClass}`}
                                        >
                                          {meta.label}
                                        </span>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </section>
        )}

        {/* Tab Content: Devices */}
        {activeTab === 'devices' && (
          <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-md shadow-xs">
            {devices.length === 0 ? (
              <p className="py-md text-center text-sm text-on-surface-variant">
                لا توجد أجهزة مسجلة باسم العميل حالياً.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
                {devices.map((device) => (
                  <div
                    key={device.id}
                    className="rounded-xl border border-outline-variant bg-surface p-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-on-surface">{device.model_name}</p>
                      {device.sold_at && (
                        <span className="text-xs tabular-nums text-on-surface-variant">
                          {formatDate(device.sold_at)}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-on-surface-variant">
                      {device.serial_number && (
                        <p className="tabular-nums">السيريال: {device.serial_number}</p>
                      )}
                      {device.imei && <p className="tabular-nums">IMEI: {device.imei}</p>}
                      {device.sim_number && (
                        <p className="tabular-nums">رقم الشريحة: {device.sim_number}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Tab Content: Payments */}
        {activeTab === 'payments' && (
          <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-md shadow-xs">
            {payments.length === 0 ? (
              <p className="py-md text-center text-sm text-on-surface-variant">
                لا توجد مدفوعات مسجلة حتى الآن.
              </p>
            ) : (
              <div className="divide-y divide-outline-variant/60">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex flex-wrap items-center justify-between gap-sm py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-semibold text-on-surface">
                        {formatMoney(payment.amount)}
                        {payment.invoice_number && (
                          <span className="mr-2 text-xs font-normal text-on-surface-variant">
                            — تعاقد {payment.invoice_number}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-on-surface-variant">
                        {paymentMethodLabels[payment.payment_method ?? ''] ?? payment.payment_method ?? 'سداد'}
                        {payment.transaction_number && ` · إيصال ${payment.transaction_number}`}
                      </p>
                    </div>
                    <span className="text-xs tabular-nums text-on-surface-variant">
                      {formatDate(payment.paid_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Tab Content: Customer Info & Payment Accounts */}
        {activeTab === 'info' && (
          <section className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-md shadow-xs">
              <h3 className="mb-sm text-sm font-bold text-on-surface">بيانات العميل</h3>
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-on-surface-variant">الاسم</dt>
                  <dd className="font-medium text-on-surface">{customer.name}</dd>
                </div>
                {customer.phone && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-on-surface-variant">الهاتف الأساسي</dt>
                    <dd className="font-medium tabular-nums text-on-surface">{customer.phone}</dd>
                  </div>
                )}
                {customer.phone_2 && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-on-surface-variant">هاتف إضافي</dt>
                    <dd className="font-medium tabular-nums text-on-surface">{customer.phone_2}</dd>
                  </div>
                )}
                {customer.national_id_masked && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-on-surface-variant">الرقم القومي</dt>
                    <dd className="font-medium tabular-nums text-on-surface" dir="ltr">
                      {customer.national_id_masked}
                    </dd>
                  </div>
                )}
                {customer.address && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-on-surface-variant">العنوان</dt>
                    <dd className="font-medium text-on-surface">{customer.address}</dd>
                  </div>
                )}
                {customer.branch_name && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-on-surface-variant">الفرع</dt>
                    <dd className="font-medium text-on-surface">{customer.branch_name}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-md shadow-xs">
              <h3 className="mb-sm text-sm font-bold text-on-surface">طرق الدفع والتواصل</h3>
              {support.payment_accounts.length > 0 ? (
                <div className="space-y-2">
                  {support.payment_accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="rounded-xl border border-outline-variant bg-surface p-sm text-xs"
                    >
                      <p className="font-semibold text-on-surface">
                        {paymentMethodLabels[acc.payment_method] ?? acc.payment_method}
                        {acc.bank_name ? ` — ${acc.bank_name}` : ''}
                      </p>
                      {acc.phone && <p className="mt-1 tabular-nums text-on-surface-variant">رقم: {acc.phone}</p>}
                      {acc.account_number && (
                        <p className="mt-1 tabular-nums text-on-surface-variant">
                          رقم الحساب: {acc.account_number}
                        </p>
                      )}
                      {acc.beneficiary_name && (
                        <p className="mt-0.5 text-on-surface-variant">باسم: {acc.beneficiary_name}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-on-surface-variant">
                  يمكنك السداد في الفرع أو التواصل معنا عبر واتساب لمعرفة وسائل الدفع المتاحة.
                </p>
              )}

              {support.follow_up_phone && (
                <div className="mt-md border-t border-outline-variant pt-sm text-xs text-on-surface-variant">
                  هاتف المتابعة والتحصيل:{' '}
                  <span className="font-semibold tabular-nums text-on-surface">
                    {support.follow_up_phone}
                  </span>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
