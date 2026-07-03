import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { Customer } from '../api/types'
import {
  CustomerAttachmentsSection,
  uploadCustomerAttachments,
  type PendingAttachment,
} from '../components/customers/CustomerAttachmentsSection'
import { CustomerPhoneFields } from '../components/customers/CustomerPhoneFields'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'
import {
  defaultPhoneEntries,
  emptyGuarantorForm,
  hasGuarantorData,
  phoneEntriesToPayload,
  type CustomerPhoneEntry,
} from '../lib/customerForm'

const inputClass = 'w-full rounded border border-outline-variant px-sm py-2'

export function CustomerAddPage() {
  const navigate = useNavigate()
  const [phones, setPhones] = useState<CustomerPhoneEntry[]>(defaultPhoneEntries)
  const [form, setForm] = useState({ name: '', national_id: '', address: '', distinctive_mark: '' })
  const [withGuarantor, setWithGuarantor] = useState(false)
  const [guarantor, setGuarantor] = useState(emptyGuarantorForm)
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([])

  const handleGuarantorModeChange = (next: boolean) => {
    setWithGuarantor(next)
    if (!next) {
      setGuarantor(emptyGuarantorForm)
    }
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        ...form,
        ...phoneEntriesToPayload(phones),
      }

      if (withGuarantor && hasGuarantorData(guarantor)) {
        payload.guarantors = [guarantor]
      }

      const { data } = await api.post<Customer>('/customers', payload)

      if (pendingFiles.length > 0) {
        await uploadCustomerAttachments(data.id, pendingFiles)
      }

      return data
    },
    onSuccess: (customer) => {
      navigate(`/customers/${customer.id}`)
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    createMutation.mutate()
  }

  return (
    <SalesPageShell
      title="إضافة عميل"
      subtitle="تسجيل بيانات العميل والضامن والمرفقات"
      actions={
        <Link
          to="/customers"
          className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-md py-sm text-sm font-medium text-on-surface hover:bg-surface-container"
        >
          <Icon name="arrow_forward" size={18} />
          العودة للقائمة
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-md">
        <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
          <h3 className="mb-sm text-sm font-bold text-on-surface">بيانات العميل</h3>
          <div className="grid grid-cols-12 gap-sm">
            <label className="col-span-12 block text-sm sm:col-span-4">
              <span className="mb-xs block text-on-surface-variant">السيد *</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className={inputClass}
              />
            </label>
            <label className="col-span-12 block text-sm sm:col-span-4">
              <span className="mb-xs block text-on-surface-variant">الرقم القومي</span>
              <input
                value={form.national_id}
                onChange={(e) => setForm({ ...form, national_id: e.target.value })}
                dir="ltr"
                className={inputClass}
              />
            </label>
            <label className="col-span-12 block text-sm sm:col-span-4">
              <span className="mb-xs block text-on-surface-variant">العنوان</span>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className={inputClass}
              />
            </label>
            <CustomerPhoneFields phones={phones} onChange={setPhones} />
            <label className="col-span-12 block text-sm">
              <span className="mb-xs block text-on-surface-variant">علامة مميزة بالتفصيل</span>
              <textarea
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
              <input
                value={guarantor.name}
                onChange={(e) => setGuarantor({ ...guarantor, name: e.target.value })}
                required
                className={inputClass}
              />
            </label>
            <label className="col-span-12 block text-sm sm:col-span-4">
              <span className="mb-xs block text-on-surface-variant">الرقم القومي</span>
              <input
                value={guarantor.national_id}
                onChange={(e) => setGuarantor({ ...guarantor, national_id: e.target.value })}
                dir="ltr"
                className={inputClass}
              />
            </label>
            <label className="col-span-12 block text-sm sm:col-span-4">
              <span className="mb-xs block text-on-surface-variant">الصلة</span>
              <input
                value={guarantor.relationship}
                onChange={(e) => setGuarantor({ ...guarantor, relationship: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="col-span-12 block text-sm sm:col-span-6">
              <span className="mb-xs block text-on-surface-variant">العنوان</span>
              <input
                value={guarantor.address}
                onChange={(e) => setGuarantor({ ...guarantor, address: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="col-span-12 block text-sm sm:col-span-6">
              <span className="mb-xs block text-on-surface-variant">رقم الهاتف *</span>
              <input
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

        <CustomerAttachmentsSection
          mode="create"
          pendingFiles={pendingFiles}
          onPendingChange={setPendingFiles}
        />

        {createMutation.isError && (
          <p className="text-sm text-error">{getErrorMessage(createMutation.error)}</p>
        )}

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-bold text-on-primary sm:w-auto sm:px-xl disabled:opacity-50"
        >
          {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ العميل'}
        </button>
      </form>
    </SalesPageShell>
  )
}
