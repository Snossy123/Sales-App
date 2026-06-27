import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { Customer } from '../api/types'
import { CustomerAttachmentsSection } from '../components/customers/CustomerAttachmentsSection'
import { AsyncState } from '../components/AsyncState'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'
import { customerToForm, emptyCustomerForm } from '../lib/customerForm'

const inputClass = 'w-full rounded border border-outline-variant px-sm py-2'

export function CustomerEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyCustomerForm)

  const customerQuery = useQuery({
    queryKey: ['customer', id, 'edit'],
    queryFn: async () => {
      const { data } = await api.get<Customer>(`/customers/${id}`)
      return data
    },
    enabled: Boolean(id),
  })

  useEffect(() => {
    const customer = customerQuery.data
    if (!customer) return
    setForm(customerToForm(customer))
  }, [customerQuery.data])

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.patch<Customer>(`/customers/${id}`, form)
      return data
    },
    onSuccess: (customer) => {
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
