import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { Customer } from '../api/types'
import {
  CustomerAttachmentsSection,
  uploadCustomerAttachments,
  type PendingAttachment,
} from '../components/customers/CustomerAttachmentsSection'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'
import {
  emptyCustomerForm,
  emptyGuarantorForm,
  hasGuarantorData,
} from '../lib/customerForm'
import { getScopedBranchIds } from '../lib/dataScope'
import { useAuthStore } from '../stores/authStore'
import { useContextStore } from '../stores/contextStore'

const inputClass = 'w-full rounded border border-outline-variant px-sm py-2'

export function CustomerAddPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const authBranchId = useAuthStore((s) => s.branchId)
  const branches = useContextStore((s) => s.branches)
  const [form, setForm] = useState(emptyCustomerForm)
  const [formBranchId, setFormBranchId] = useState<number | ''>(authBranchId ?? '')
  const [branchError, setBranchError] = useState('')
  const [withGuarantor, setWithGuarantor] = useState(false)
  const [guarantor, setGuarantor] = useState(emptyGuarantorForm)
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([])

  useEffect(() => {
    if (authBranchId) setFormBranchId(authBranchId)
  }, [authBranchId])

  const availableBranches = useMemo(() => {
    const scopedIds = getScopedBranchIds(user, branches)
    if (scopedIds == null) return branches
    return branches.filter((b) => scopedIds.includes(b.id))
  }, [user, branches])

  const resolvedBranchId = authBranchId ?? (formBranchId ? Number(formBranchId) : null)
  const showBranchPicker = !authBranchId

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
        branch_id: resolvedBranchId,
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
    if (!resolvedBranchId) {
      setBranchError('اختر الفرع قبل حفظ العميل')
      return
    }
    setBranchError('')
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
            {showBranchPicker ? (
              <label className="col-span-12 block text-sm sm:col-span-4">
                <span className="mb-xs block text-on-surface-variant">الفرع *</span>
                <select
                  value={formBranchId}
                  onChange={(e) => {
                    setFormBranchId(e.target.value ? Number(e.target.value) : '')
                    setBranchError('')
                  }}
                  required
                  className={inputClass}
                >
                  <option value="">اختر الفرع</option>
                  {availableBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name_ar ?? b.name}
                    </option>
                  ))}
                </select>
                {branchError && <p className="mt-xs text-xs text-error">{branchError}</p>}
              </label>
            ) : (
              <div className="col-span-12 block text-sm sm:col-span-4">
                <span className="mb-xs block text-on-surface-variant">الفرع</span>
                <p className="rounded border border-outline-variant bg-surface-container px-sm py-2 text-on-surface">
                  {availableBranches.find((b) => b.id === authBranchId)?.name_ar
                    ?? availableBranches.find((b) => b.id === authBranchId)?.name
                    ?? '—'}
                </p>
              </div>
            )}
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
            <label className="col-span-12 block text-sm sm:col-span-4">
              <span className="mb-xs block text-on-surface-variant">رقم الهاتف 1 *</span>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
                dir="ltr"
                className={inputClass}
              />
            </label>
            <label className="col-span-12 block text-sm sm:col-span-4">
              <span className="mb-xs block text-on-surface-variant">رقم الهاتف 2</span>
              <input
                value={form.phone_2}
                onChange={(e) => setForm({ ...form, phone_2: e.target.value })}
                dir="ltr"
                className={inputClass}
              />
            </label>
            <label className="col-span-12 block text-sm sm:col-span-4">
              <span className="mb-xs block text-on-surface-variant">رقم الهاتف 3</span>
              <input
                value={form.phone_3}
                onChange={(e) => setForm({ ...form, phone_3: e.target.value })}
                dir="ltr"
                className={inputClass}
              />
            </label>
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
