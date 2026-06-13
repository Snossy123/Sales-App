const emptyCustomerForm = {
  name: '',
  national_id: '',
  phone: '',
  phone_2: '',
  sim_number: '',
  username: '',
  device_serial: '',
  address: '',
  distributor_id: '' as number | '',
}

export { emptyCustomerForm }

export type CustomerFormState = typeof emptyCustomerForm
