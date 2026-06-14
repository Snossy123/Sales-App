const emptyCustomerForm = {
  name: '',
  national_id: '',
  address: '',
  device_serial: '',
  sim_number: '',
  phone: '',
  phone_2: '',
  phone_3: '',
  distinctive_mark: '',
  distributor_id: '' as number | '',
}

export { emptyCustomerForm }

export type CustomerFormState = typeof emptyCustomerForm
