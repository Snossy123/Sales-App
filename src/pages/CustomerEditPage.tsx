import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { Customer } from '../api/types'
import { CustomerAttachmentsSection } from '../components/customers/CustomerAttachmentsSection'
import { AsyncState } from '../components/AsyncState'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'
import { customerToForm, emptyCustomerForm } from '../lib/customerForm'
import { getScopedBranchIds } from '../lib/dataScope'
import { useAuthStore } from '../stores/authStore'
import { useContextStore } from '../stores/contextStore'

const inputClass = 'w-full rounded border border-outline-variant px-sm py-2'

export function CustomerEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const authBranchId = useAuthStore((s) => s.branchId)
  const branches = useContextStore((s) => s.branches)
  const [form, setForm] = useState(emptyCustomerForm)
  const [formBranchId, setFormBranchId] = useState<number | ''>('')
  const [branchError, setBranchError] = useState('')

  const customerQuery = useQuery({
    queryKey: ['customer', id, 'edit'],
    queryFn: async () => {
      const { data } = await api.get<Customer>(`/customers/${id}`, {
        params: { include: 'branch' },
      })
      return data
    },
    enabled: Boolean(id),
  })

  useEffect(() => {
    const customer = customerQuery.data
    if (!customer) return
    setForm(customerToForm(customer))
    setFormBranchId(customer.branch_id ?? authBranchId ?? '')
  }, [customerQuery.data, authBranchId])

  const availableBranches = useMemo(() => {
    const scopedIds = getScopedBranchIds(user, branches)
    if (scopedIds == null) return branches
    return branches.filter((b) => scopedIds.includes(b.id))
  }, [user, branches])

  const resolvedBranchId = authBranchId ?? (formBranchId ? Number(formBranchId) : null)
  const showBranchPicker = !authBranchId

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        ...form,
        branch_id: resolvedBranchId,
      }
      const { data } = await api.patch<Customer>(`/customers/${id}`, payload)
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
              </div>
            </section>

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
