const emptyCustomerForm = {
  name: '',
  national_id: '',
  address: '',
  phone: '',
  phone_2: '',
  phone_3: '',
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

export function customerToForm(customer: {
  name?: string
  national_id?: string | null
  address?: string | null
  phone?: string
  phone_2?: string | null
  phone_3?: string | null
  distinctive_mark?: string | null
}): CustomerFormState {
  return {
    name: customer.name ?? '',
    national_id: customer.national_id ?? '',
    address: customer.address ?? '',
    phone: customer.phone ?? '',
    phone_2: customer.phone_2 ?? '',
    phone_3: customer.phone_3 ?? '',
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
