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
