import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { Customer } from '../api/types'
import { useProcedureDraft } from '../hooks/useProcedureDraft'
import { useAuthStore } from '../stores/authStore'
import {
  PROCEDURE_DRAFT_IDS,
  readProcedureDraft,
  useProcedureDraftStore,
} from '../stores/procedureDraftStore'
import { CustomerAttachmentsSection } from '../components/customers/CustomerAttachmentsSection'
import { CustomerPhoneFields } from '../components/customers/CustomerPhoneFields'
import { AsyncState } from '../components/AsyncState'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'
import { TextArea } from '../components/ui/TextArea'
import { TextInput } from '../components/ui/TextInput'
import {
  customerToPhoneEntries,
  emptyGuarantorForm,
  guarantorToForm,
  hasGuarantorData,
  phoneEntriesToPayload,
  type CustomerPhoneEntry,
  type GuarantorFormState,
} from '../lib/customerForm'

const inputClass = 'w-full rounded border border-outline-variant px-sm py-2'

type CustomerEditDraft = {
  form: { name: string; national_id: string; address: string; distinctive_mark: string }
  phones: CustomerPhoneEntry[]
  withGuarantor: boolean
  guarantor: GuarantorFormState
}

function snapshotFromCustomer(customer: Customer): CustomerEditDraft {
  const existingGuarantor = customer.guarantors?.[0]
  return {
    form: {
      name: customer.name ?? '',
      national_id: customer.national_id ?? '',
      address: customer.address ?? '',
      distinctive_mark: customer.distinctive_mark ?? '',
    },
    phones: customerToPhoneEntries(customer),
    withGuarantor: Boolean(existingGuarantor),
    guarantor: guarantorToForm(existingGuarantor),
  }
}

export function CustomerEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const draftId = id ? PROCEDURE_DRAFT_IDS.customerEdit(id) : ''
  const restoredRef = useRef(false)
  const [form, setForm] = useState({ name: '', national_id: '', address: '', distinctive_mark: '' })
  const [phones, setPhones] = useState<CustomerPhoneEntry[]>([])
  const [withGuarantor, setWithGuarantor] = useState(false)
  const [guarantor, setGuarantor] = useState(emptyGuarantorForm)

  const customerQuery = useQuery({
    queryKey: ['customer', id, 'edit'],
    queryFn: async () => {
      const { data } = await api.get<Customer>(`/customers/${id}`, {
        params: { include: 'guarantors' },
      })
      return data
    },
    enabled: Boolean(id),
  })

  useEffect(() => {
    const customer = customerQuery.data
    if (!customer || !id) return
    if (!restoredRef.current) {
      const saved = readProcedureDraft<CustomerEditDraft>(PROCEDURE_DRAFT_IDS.customerEdit(id), userId)
      restoredRef.current = true
      if (saved) {
        setForm(saved.form)
        setPhones(saved.phones)
        setWithGuarantor(saved.withGuarantor)
        setGuarantor(saved.guarantor)
        return
      }
    } else if (readProcedureDraft<CustomerEditDraft>(PROCEDURE_DRAFT_IDS.customerEdit(id), userId)) {
      return
    }
    const baseline = snapshotFromCustomer(customer)
    setForm(baseline.form)
    setPhones(baseline.phones)
    setWithGuarantor(baseline.withGuarantor)
    setGuarantor(baseline.guarantor)
  }, [customerQuery.data, id, userId])

  const customerDraftSnapshot = useMemo<CustomerEditDraft>(
    () => ({ form, phones, withGuarantor, guarantor }),
    [form, phones, withGuarantor, guarantor],
  )
  const serverSnapshot = customerQuery.data ? snapshotFromCustomer(customerQuery.data) : null
  const isCustomerEditDirty = Boolean(
    serverSnapshot && JSON.stringify(customerDraftSnapshot) !== JSON.stringify(serverSnapshot),
  )

  useProcedureDraft({
    id: draftId,
    userId,
    titleAr: customerQuery.data?.name ? `تعديل عميل — ${customerQuery.data.name}` : 'تعديل عميل',
    resumePath: id ? `/customers/${id}/edit` : '/customers',
    snapshot: customerDraftSnapshot,
    isMeaningful: isCustomerEditDirty,
    enabled: Boolean(id && customerQuery.data),
  })

  const handleGuarantorModeChange = (next: boolean) => {
    setWithGuarantor(next)
    if (!next) {
      setGuarantor(emptyGuarantorForm)
    }
  }

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        ...form,
        ...phoneEntriesToPayload(phones),
      }

      if (withGuarantor && hasGuarantorData(guarantor)) {
        payload.guarantors = [guarantor]
      } else {
        payload.guarantors = []
      }

      const { data } = await api.patch<Customer>(`/customers/${id}`, payload)
      return data
    },
    onSuccess: (customer) => {
      if (draftId) useProcedureDraftStore.getState().clearDraft(draftId, userId)
      navigate(`/customers/${customer.id}`)
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    updateMutation.mutate()
  }

  const customer = customerQuery.data

  return (
    <SalesPageShell
      title="تعديل عميل"
      subtitle={customer?.name ?? 'تحديث بيانات العميل'}
      actions={
        <Link
          to={id ? `/customers/${id}` : '/customers'}
          className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-md py-sm text-sm font-medium text-on-surface hover:bg-surface-container"
        >
          <Icon name="arrow_forward" size={18} />
          العودة
        </Link>
      }
    >
      <AsyncState
        isLoading={customerQuery.isLoading}
        isError={customerQuery.isError}
        error={customerQuery.error}
      >
        {customer && (
          <form onSubmit={handleSubmit} className="space-y-md">
            <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
              <h3 className="mb-sm text-sm font-bold text-on-surface">بيانات العميل</h3>
              <div className="grid grid-cols-12 gap-sm">
                <label className="col-span-12 block text-sm sm:col-span-4">
                  <span className="mb-xs block text-on-surface-variant">السيد *</span>
                  <TextInput
                    mode="arabic"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className={inputClass}
                  />
                </label>
                <label className="col-span-12 block text-sm sm:col-span-4">
                  <span className="mb-xs block text-on-surface-variant">الرقم القومي</span>
                  <TextInput
                    mode="phone"
                    value={form.national_id}
                    onChange={(e) => setForm({ ...form, national_id: e.target.value })}
                    dir="ltr"
                    className={inputClass}
                  />
                </label>
                <label className="col-span-12 block text-sm sm:col-span-4">
                  <span className="mb-xs block text-on-surface-variant">العنوان</span>
                  <TextInput
                    mode="arabic"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className={inputClass}
                  />
                </label>
                <CustomerPhoneFields phones={phones} onChange={setPhones} />
                <label className="col-span-12 block text-sm">
                  <span className="mb-xs block text-on-surface-variant">علامة مميزة بالتفصيل</span>
                  <TextArea
                    mode="arabic"
                    value={form.distinctive_mark}
                    onChange={(e) => setForm({ ...form, distinctive_mark: e.target.value })}
                    rows={3}
                    className={inputClass}
                  />
                </label>
                <div className="col-span-12 block text-sm">
                  <span className="mb-xs block text-on-surface-variant">الضامن</span>
                  <div className="flex w-fit gap-1 rounded-lg border border-outline-variant p-0.5 text-sm">
                    <button
                      type="button"
                      onClick={() => handleGuarantorModeChange(true)}
                      className={`rounded px-md py-1.5 font-medium ${
                        withGuarantor ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
                      }`}
                    >
                      ضامن
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGuarantorModeChange(false)}
                      className={`rounded px-md py-1.5 font-medium ${
                        !withGuarantor ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
                      }`}
                    >
                      بدون ضامن
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {withGuarantor && (
              <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
                <h3 className="mb-sm text-sm font-bold text-on-surface">بيانات الضامن</h3>
                <div className="grid grid-cols-12 gap-sm">
                  <label className="col-span-12 block text-sm sm:col-span-4">
                    <span className="mb-xs block text-on-surface-variant">الاسم *</span>
                    <TextInput
                      mode="arabic"
                      value={guarantor.name}
                      onChange={(e) => setGuarantor({ ...guarantor, name: e.target.value })}
                      required
                      className={inputClass}
                    />
                  </label>
                  <label className="col-span-12 block text-sm sm:col-span-4">
                    <span className="mb-xs block text-on-surface-variant">الرقم القومي</span>
                    <TextInput
                      mode="phone"
                      value={guarantor.national_id}
                      onChange={(e) => setGuarantor({ ...guarantor, national_id: e.target.value })}
                      dir="ltr"
                      className={inputClass}
                    />
                  </label>
                  <label className="col-span-12 block text-sm sm:col-span-4">
                    <span className="mb-xs block text-on-surface-variant">الصلة</span>
                    <TextInput
                      mode="arabic"
                      value={guarantor.relationship}
                      onChange={(e) => setGuarantor({ ...guarantor, relationship: e.target.value })}
                      className={inputClass}
                    />
                  </label>
                  <label className="col-span-12 block text-sm sm:col-span-6">
                    <span className="mb-xs block text-on-surface-variant">العنوان</span>
                    <TextInput
                      mode="arabic"
                      value={guarantor.address}
                      onChange={(e) => setGuarantor({ ...guarantor, address: e.target.value })}
                      className={inputClass}
                    />
                  </label>
                  <label className="col-span-12 block text-sm sm:col-span-6">
                    <span className="mb-xs block text-on-surface-variant">رقم الهاتف *</span>
                    <TextInput
                      mode="phone"
                      value={guarantor.phone}
                      onChange={(e) => setGuarantor({ ...guarantor, phone: e.target.value })}
                      required
                      dir="ltr"
                      className={inputClass}
                    />
                  </label>
                </div>
              </section>
            )}

            <CustomerAttachmentsSection mode="view" customerId={customer.id} />

            {updateMutation.isError && (
              <p className="text-sm text-error">{getErrorMessage(updateMutation.error)}</p>
            )}

            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-bold text-on-primary sm:w-auto sm:px-xl disabled:opacity-50"
            >
              {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </form>
        )}
      </AsyncState>
    </SalesPageShell>
  )
}
