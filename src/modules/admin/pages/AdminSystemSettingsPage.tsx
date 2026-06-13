import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { OrganizationSettings } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { PageHeader } from '../../../components/PageHeader'
import { ToastBanner } from '../../../components/ToastBanner'

const MODULES = [
  { key: 'crm', label: 'CRM' },
  { key: 'hrm', label: 'الموارد البشرية' },
  { key: 'accounting', label: 'المحاسبة' },
] as const

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

export function AdminSystemSettingsPage() {
  const queryClient = useQueryClient()
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({
    name: '',
    name_ar: '',
    phone: '',
    email: '',
    address: '',
    enabled_modules: [] as string[],
  })

  const query = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => {
      const { data } = await api.get<OrganizationSettings>('/admin/settings')
      return data
    },
  })

  useEffect(() => {
    if (query.data?.organization) {
      const org = query.data.organization
      setForm({
        name: org.name ?? '',
        name_ar: org.name_ar ?? '',
        phone: org.phone ?? '',
        email: org.email ?? '',
        address: org.address ?? '',
        enabled_modules: org.enabled_modules ?? [],
      })
    }
  }, [query.data])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.put<OrganizationSettings>('/admin/settings', form)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] })
      setToast('تم حفظ الإعدادات')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const toggleModule = (key: string) => {
    setForm((prev) => ({
      ...prev,
      enabled_modules: prev.enabled_modules.includes(key)
        ? prev.enabled_modules.filter((m) => m !== key)
        : [...prev.enabled_modules, key],
    }))
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  return (
    <div>
      <PageHeader title="إعدادات النظام" subtitle="بيانات المنظمة والوحدات المفعّلة" />
      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <form onSubmit={handleSubmit} className="max-w-xl space-y-md rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
          <div className="grid gap-sm sm:grid-cols-2">
            <input placeholder="اسم المنظمة (EN)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
            <input placeholder="اسم المنظمة (AR)" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} className={inputClass} />
            <input placeholder="الهاتف" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} dir="ltr" />
            <input type="email" placeholder="البريد" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} dir="ltr" />
            <textarea placeholder="العنوان" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className={`${inputClass} sm:col-span-2`} />
          </div>

          <div>
            <p className="mb-sm text-sm font-medium text-on-surface">الوحدات المفعّلة</p>
            <div className="flex flex-wrap gap-sm">
              {MODULES.map((m) => (
                <label key={m.key} className="flex cursor-pointer items-center gap-xs rounded-lg border border-outline-variant px-md py-sm text-sm">
                  <input type="checkbox" checked={form.enabled_modules.includes(m.key)} onChange={() => toggleModule(m.key)} />
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          {saveMutation.isError && (
            <p className="text-sm text-error">{getErrorMessage(saveMutation.error)}</p>
          )}

          <button type="submit" disabled={saveMutation.isPending} className="rounded-lg bg-primary px-md py-2 text-sm font-bold text-on-primary">
            {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </form>
      </AsyncState>
    </div>
  )
}
