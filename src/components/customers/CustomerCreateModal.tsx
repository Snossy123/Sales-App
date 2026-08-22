import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../api/client'
import type { Customer } from '../../api/types'
import { Modal } from '../Modal'
import { TextArea } from '../ui/TextArea'
import { TextInput } from '../ui/TextInput'
import { CustomerPhoneFields } from './CustomerPhoneFields'
import {
  CustomerAttachmentsSection,
  uploadCustomerAttachments,
  type PendingAttachment,
} from './CustomerAttachmentsSection'
import {
  defaultPhoneEntries,
  emptyGuarantorForm,
  hasGuarantorData,
  phoneEntriesToPayload,
  type CustomerPhoneEntry,
} from '../../lib/customerForm'

const inputClass = 'w-full rounded border border-outline-variant px-sm py-2'

interface CustomerCreateModalProps {
  open: boolean
  onClose: () => void
  onCreated: (customer: Customer) => void
}

const emptyForm = { name: '', national_id: '', address: '', distinctive_mark: '' }

export function CustomerCreateModal({ open, onClose, onCreated }: CustomerCreateModalProps) {
  const queryClient = useQueryClient()
  const [phones, setPhones] = useState<CustomerPhoneEntry[]>(defaultPhoneEntries())
  const [form, setForm] = useState(emptyForm)
  const [withGuarantor, setWithGuarantor] = useState(false)
  const [guarantor, setGuarantor] = useState(emptyGuarantorForm)
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([])

  const resetForm = () => {
    setPhones(defaultPhoneEntries())
    setForm(emptyForm)
    setWithGuarantor(false)
    setGuarantor(emptyGuarantorForm)
    setPendingFiles([])
  }

  useEffect(() => {
    if (open) resetForm()
  }, [open])

  const handleGuarantorModeChange = (next: boolean) => {
    setWithGuarantor(next)
    if (!next) setGuarantor(emptyGuarantorForm)
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
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      onCreated(customer)
      onClose()
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    createMutation.mutate()
  }

  if (!open) return null

  return createPortal(
    <Modal open={open} onClose={onClose} title="إضافة عميل" size="lg">
      <form onSubmit={handleSubmit} className="max-h-[min(70vh,640px)] space-y-md overflow-y-auto pe-xs">
        <section>
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
          <section className="rounded-lg border border-outline-variant p-sm">
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

        <CustomerAttachmentsSection
          mode="create"
          pendingFiles={pendingFiles}
          onPendingChange={setPendingFiles}
        />

        {createMutation.isError && (
          <p className="text-sm text-error">{getErrorMessage(createMutation.error)}</p>
        )}

        <div className="flex justify-end gap-sm">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-outline-variant px-md py-2 text-sm font-bold text-on-surface-variant"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-lg bg-primary px-md py-2 text-sm font-bold text-on-primary disabled:opacity-50"
          >
            {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ العميل'}
          </button>
        </div>
      </form>
    </Modal>,
    document.body,
  )
}
