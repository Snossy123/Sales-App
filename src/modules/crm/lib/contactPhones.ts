import type { Customer, Lead, ReferralLead } from '../../../api/types'
import { customerToPhoneEntries } from '../../../lib/customerForm'

export type ContactPhoneOption = {
  key: string
  number: string
  label: string
  display: string
}

export function leadPhoneOptions(lead: Lead): ContactPhoneOption[] {
  const number = lead.phone?.trim()
  if (!number) return []
  return [
    {
      key: `lead-${lead.id}-phone`,
      number,
      label: 'الهاتف',
      display: lead.name ? `${lead.name} — ${number}` : number,
    },
  ]
}

export function referralLeadPhoneOptions(lead: ReferralLead): ContactPhoneOption[] {
  const number = lead.phone?.trim()
  if (!number) return []
  return [
    {
      key: `referral-${lead.id}-phone`,
      number,
      label: 'الهاتف',
      display: lead.name ? `${lead.name} — ${number}` : number,
    },
  ]
}

export function customerPhoneOptions(customer: Customer): ContactPhoneOption[] {
  return customerToPhoneEntries(customer)
    .filter((entry) => entry.number.trim())
    .map((entry, index) => {
      const number = entry.number.trim()
      const label = entry.label?.trim() || (index === 0 ? 'الهاتف' : `رقم ${index + 1}`)
      return {
        key: `customer-${customer.id}-${index}-${number}`,
        number,
        label,
        display: `${customer.name} — ${label}: ${number}`,
      }
    })
}

/** نتيجة بحث موحّدة: رقم واحد لعميل أو ليد أو ترشيح */
export type CallContactOption = {
  optionKey: string
  kind: 'customer' | 'lead' | 'referral'
  customerId: number | null
  leadId: number | null
  referralLeadId: number | null
  name: string
  number: string
  phoneLabel: string
  label: string
}

export function customerToCallContactOptions(customer: Customer): CallContactOption[] {
  return customerPhoneOptions(customer).map((phone) => ({
    optionKey: phone.key,
    kind: 'customer' as const,
    customerId: customer.id,
    leadId: null,
    referralLeadId: null,
    name: customer.name,
    number: phone.number,
    phoneLabel: phone.label,
    label: `عميل · ${customer.name} · ${phone.label}: ${phone.number}`,
  }))
}

export function leadToCallContactOptions(lead: Lead): CallContactOption[] {
  return leadPhoneOptions(lead).map((phone) => ({
    optionKey: phone.key,
    kind: 'lead' as const,
    customerId: lead.converted_customer_id ?? null,
    leadId: lead.id,
    referralLeadId: null,
    name: lead.name,
    number: phone.number,
    phoneLabel: phone.label,
    label: `عميل محتمل · ${lead.name} · ${phone.number}`,
  }))
}

export function referralLeadToCallContactOptions(lead: ReferralLead): CallContactOption[] {
  const name = lead.name?.trim() || lead.phone
  return referralLeadPhoneOptions(lead).map((phone) => ({
    optionKey: phone.key,
    kind: 'referral' as const,
    customerId: lead.converted_customer_id ?? null,
    leadId: null,
    referralLeadId: lead.id,
    name,
    number: phone.number,
    phoneLabel: phone.label,
    label: `ترشيح · ${name} · ${phone.number}`,
  }))
}

export function mergeCallContactOptions(
  customers: Customer[],
  leads: Lead[],
  referrals: ReferralLead[] = [],
): CallContactOption[] {
  return [
    ...customers.flatMap(customerToCallContactOptions),
    ...leads.flatMap(leadToCallContactOptions),
    ...referrals.flatMap(referralLeadToCallContactOptions),
  ]
}

export function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** Convert API/ISO datetime to value for `<input type="datetime-local">`. */
export function isoToDatetimeLocal(value?: string | null): string {
  if (!value) return ''
  const localMatch = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/)
  if (localMatch && !value.includes('Z') && !/[+-]\d{2}:\d{2}$/.test(value)) {
    return localMatch[1]
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value.slice(0, 16)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** Convert datetime-local value to ISO for API. */
export function datetimeLocalToIso(value?: string | null): string | undefined {
  if (!value?.trim()) return undefined
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toISOString()
}

export function nowDatetimeLocal(): string {
  return isoToDatetimeLocal(new Date().toISOString())
}
