import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { HrmSettings } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { PageHeader } from '../../../components/PageHeader'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

export function HrmSettingsPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<HrmSettings>({
    grace_before_checkin: 15,
    grace_after_checkin: 15,
    grace_before_checkout: 15,
    grace_after_checkout: 15,
    payroll_ref_no_prefix: 'PR',
  })

  const query = useQuery({
    queryKey: ['hrm-settings'],
    queryFn: async () => {
      const { data } = await api.get<HrmSettings>('/hrm/settings')
      return data
    },
  })

  useEffect(() => {
    if (query.data) setForm(query.data)
  }, [query.data])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.put<HrmSettings>('/hrm/settings', form)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-settings'] })
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  const graceFields = [
    { key: 'grace_before_checkin', label: 'سماح قبل تسجيل الحضور (د)' },
    { key: 'grace_after_checkin', label: 'سماح بعد تسجيل الحضور (د)' },
    { key: 'grace_before_checkout', label: 'سماح قبل تسجيل الانصراف (د)' },
    { key: 'grace_after_checkout', label: 'سماح بعد تسجيل الانصراف (د)' },
  ] as const

  return (
    <div>
      <PageHeader title="إعدادات الموارد البشرية" subtitle="فترات السماح وبادئة مسير الرواتب" />

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <form onSubmit={handleSubmit} className="max-w-lg space-y-md rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
          <div className="grid gap-sm sm:grid-cols-2">
            {graceFields.map((field) => (
              <div key={field.key}>
                <label className="mb-1 block text-xs text-on-surface-variant">{field.label}</label>
                <input
                  type="number"
                  min={0}
                  value={form[field.key] ?? 0}
                  onChange={(e) => setForm({ ...form, [field.key]: Number(e.target.value) })}
                  className={inputClass}
                  dir="ltr"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="mb-1 block text-xs text-on-surface-variant">بادئة رقم مسير الرواتب</label>
            <input
              value={form.payroll_ref_no_prefix ?? ''}
              onChange={(e) => setForm({ ...form, payroll_ref_no_prefix: e.target.value })}
              maxLength={10}
              dir="ltr"
              className={inputClass}
            />
          </div>

          {saveMutation.isError && (
            <p className="text-sm text-error">{getErrorMessage(saveMutation.error)}</p>
          )}
          {saveMutation.isSuccess && (
            <p className="text-sm text-secondary">تم حفظ الإعدادات بنجاح</p>
          )}

          <button type="submit" disabled={saveMutation.isPending} className="rounded-lg bg-primary px-md py-2 text-sm font-bold text-on-primary">
            {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </form>
      </AsyncState>
    </div>
  )
}
