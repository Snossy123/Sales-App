export type CustomerPhoneEntry = {
  number: string
  label: string
}

export const DEFAULT_PHONE_COUNT = 3

export const emptyPhoneEntry = (): CustomerPhoneEntry => ({ number: '', label: '' })

export const defaultPhoneEntries = (): CustomerPhoneEntry[] =>
  Array.from({ length: DEFAULT_PHONE_COUNT }, emptyPhoneEntry)

const emptyCustomerForm = {
  name: '',
  national_id: '',
  address: '',
  phone: '',
  phone_label: '',
  phone_2: '',
  phone_2_label: '',
  phone_3: '',
  phone_3_label: '',
  extra_phones: [] as CustomerPhoneEntry[],
  distinctive_mark: '',
}

const emptyGuarantorForm = {
  name: '',
  national_id: '',
  address: '',
  phone: '',
  relationship: '',
}

export { emptyCustomerForm, emptyGuarantorForm }

export type CustomerFormState = typeof emptyCustomerForm
export type GuarantorFormState = typeof emptyGuarantorForm

export function hasGuarantorData(guarantor: GuarantorFormState): boolean {
  return Boolean(guarantor.name.trim() || guarantor.phone.trim())
}

export function customerAllPhoneNumbers(customer: {
  phone?: string
  phone_2?: string | null
  phone_3?: string | null
  extra_phones?: CustomerPhoneEntry[] | null
}): string[] {
  const numbers = [customer.phone, customer.phone_2, customer.phone_3].filter(
    (phone): phone is string => Boolean(phone?.trim()),
  )

  for (const entry of customer.extra_phones ?? []) {
    if (entry.number?.trim()) {
      numbers.push(entry.number.trim())
    }
  }

  return numbers
}

export function phoneEntriesToPayload(entries: CustomerPhoneEntry[]): {
  phone: string
  phone_label: string | null
  phone_2: string | null
  phone_2_label: string | null
  phone_3: string | null
  phone_3_label: string | null
  extra_phones: CustomerPhoneEntry[]
} {
  const normalized = entries.map((entry) => ({
    number: entry.number.trim(),
    label: entry.label.trim(),
  }))

  const [first, second, third, ...rest] = normalized

  return {
    phone: first?.number ?? '',
    phone_label: first?.label || null,
    phone_2: second?.number || null,
    phone_2_label: second?.label || null,
    phone_3: third?.number || null,
    phone_3_label: third?.label || null,
    extra_phones: rest.filter((entry) => entry.number),
  }
}

export function customerToPhoneEntries(customer: {
  phone?: string
  phone_label?: string | null
  phone_2?: string | null
  phone_2_label?: string | null
  phone_3?: string | null
  phone_3_label?: string | null
  extra_phones?: CustomerPhoneEntry[] | null
}): CustomerPhoneEntry[] {
  const entries: CustomerPhoneEntry[] = [
    { number: customer.phone ?? '', label: customer.phone_label ?? '' },
    { number: customer.phone_2 ?? '', label: customer.phone_2_label ?? '' },
    { number: customer.phone_3 ?? '', label: customer.phone_3_label ?? '' },
    ...(customer.extra_phones ?? []),
  ]

  while (entries.length < DEFAULT_PHONE_COUNT) {
    entries.push(emptyPhoneEntry())
  }

  return entries
}

export function customerToForm(customer: {
  name?: string
  national_id?: string | null
  address?: string | null
  phone?: string
  phone_label?: string | null
  phone_2?: string | null
  phone_2_label?: string | null
  phone_3?: string | null
  phone_3_label?: string | null
  extra_phones?: CustomerPhoneEntry[] | null
  distinctive_mark?: string | null
}): CustomerFormState {
  const phonePayload = phoneEntriesToPayload(customerToPhoneEntries(customer))

  return {
    name: customer.name ?? '',
    national_id: customer.national_id ?? '',
    address: customer.address ?? '',
    phone: phonePayload.phone,
    phone_label: phonePayload.phone_label ?? '',
    phone_2: phonePayload.phone_2 ?? '',
    phone_2_label: phonePayload.phone_2_label ?? '',
    phone_3: phonePayload.phone_3 ?? '',
    phone_3_label: phonePayload.phone_3_label ?? '',
    extra_phones: phonePayload.extra_phones,
    distinctive_mark: customer.distinctive_mark ?? '',
  }
}

export function guarantorToForm(guarantor?: {
  name?: string
  national_id?: string | null
  address?: string | null
  phone?: string
  relationship?: string | null
} | null): GuarantorFormState {
  return {
    name: guarantor?.name ?? '',
    national_id: guarantor?.national_id ?? '',
    address: guarantor?.address ?? '',
    phone: guarantor?.phone ?? '',
    relationship: guarantor?.relationship ?? '',
  }
}

export function formatPhoneDisplay(label: string | null | undefined, number: string | null | undefined): string {
  const trimmedNumber = number?.trim()
  if (!trimmedNumber) return '—'
  const trimmedLabel = label?.trim()
  return trimmedLabel ? `${trimmedLabel} — ${trimmedNumber}` : trimmedNumber
}
