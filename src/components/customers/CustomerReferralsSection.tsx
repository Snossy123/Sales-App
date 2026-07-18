import { Link } from 'react-router-dom'
import type { Customer, ReferralLead } from '../../api/types'
import { formatReferralDateTime, referralStatusLabel } from '../../modules/crm/lib/referralLeads'
import { StatusBadge } from '../StatusBadge'

interface CustomerReferralsSectionProps {
  customer: Customer
}

export function CustomerReferralsSection({ customer }: CustomerReferralsSectionProps) {
  const referrer =
    customer.referred_by_customer ??
    (customer as Customer & { referredByCustomer?: Customer['referred_by_customer'] })
      .referredByCustomer
  const referredCustomers =
    customer.referred_customers ??
    (customer as Customer & { referredCustomers?: Customer['referred_customers'] }).referredCustomers ??
    []
  const referralLeads =
    customer.referral_leads ??
    (customer as Customer & { referralLeads?: ReferralLead[] }).referralLeads ??
    []

  const hasAny = Boolean(referrer) || referredCustomers.length > 0 || referralLeads.length > 0

  return (
    <section id="customer-referrals" className="mb-md scroll-mt-24">
      <h2 className="mb-sm text-lg font-semibold">الترشيحات</h2>

      {!hasAny ? (
        <p className="rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-lg text-center text-sm text-on-surface-variant">
          لا توجد ترشيحات مرتبطة بهذا العميل
        </p>
      ) : (
        <div className="space-y-md">
          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
            <h3 className="mb-sm text-sm font-semibold text-on-surface-variant">من رشّحه</h3>
            {referrer ? (
              <Link
                to={`/customers/${referrer.id}`}
                className="inline-flex flex-col gap-0.5 text-primary hover:underline"
              >
                <span className="font-medium">{referrer.name}</span>
                <span className="text-sm tabular-nums text-on-surface-variant">{referrer.phone}</span>
              </Link>
            ) : (
              <p className="text-sm text-on-surface-variant">
                {customer.acquisition_source === 'social' ? 'مصدر اجتماعي' : '—'}
              </p>
            )}
          </div>

          {referredCustomers.length > 0 && (
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
              <h3 className="mb-sm text-sm font-semibold text-on-surface-variant">
                عملاء رشّحهم ({referredCustomers.length})
              </h3>
              <ul className="space-y-2 text-sm">
                {referredCustomers.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-2">
                    <Link to={`/customers/${c.id}`} className="font-medium text-primary hover:underline">
                      {c.name}
                    </Link>
                    <span className="tabular-nums text-on-surface-variant">{c.phone}</span>
                    <StatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {referralLeads.length > 0 && (
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
              <h3 className="mb-sm text-sm font-semibold text-on-surface-variant">
                ترشيحات قيد المتابعة ({referralLeads.length})
              </h3>
              <ul className="space-y-3 text-sm">
                {referralLeads.map((lead) => (
                  <li
                    key={lead.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-outline-variant/60 px-sm py-2"
                  >
                    <div>
                      <p className="font-medium">{lead.name?.trim() || lead.phone}</p>
                      <p className="text-xs tabular-nums text-on-surface-variant">
                        {lead.phone}
                        {' · '}
                        {formatReferralDateTime(lead.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={lead.status} label={referralStatusLabel(lead.status)} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
