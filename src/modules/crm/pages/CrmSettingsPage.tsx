import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { CrmSettings } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { PageHeader } from '../../../components/PageHeader'

export function CrmSettingsPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CrmSettings>({
    enable_order_request: true,
    order_request_prefix: 'ORD',
  })

  const query = useQuery({
    queryKey: ['crm-settings'],
    queryFn: async () => {
      const { data } = await api.get<CrmSettings>('/crm/settings')
      return data
    },
  })

  useEffect(() => {
    if (query.data) setForm(query.data)
  }, [query.data])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.put<CrmSettings>('/crm/settings', form)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-settings'] })
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  return (
    <div>
      <PageHeader
        title="إعدادات CRM"
        subtitle="تخصيص سلوك بوابة العملاء وطلبات الشراء"
      />

      <AsyncState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
      >
        <form
          onSubmit={handleSubmit}
          className="max-w-lg space-y-md rounded-lg border border-outline-variant bg-surface-container-lowest p-md"
        >
          <label className="flex cursor-pointer items-center gap-sm">
            <input
              type="checkbox"
              checked={form.enable_order_request ?? false}
              onChange={(e) =>
                setForm({ ...form, enable_order_request: e.target.checked })
              }
              className="h-4 w-4 rounded border-outline-variant"
            />
            <span className="text-sm text-on-surface">تفعيل طلبات الشراء من بوابة العملاء</span>
          </label>

          <div>
            <label
              htmlFor="order_prefix"
              className="mb-1.5 block text-sm font-medium text-on-surface-variant"
            >
              بادئة رقم الطلب
            </label>
            <input
              id="order_prefix"
              value={form.order_request_prefix ?? ''}
              onChange={(e) =>
                setForm({ ...form, order_request_prefix: e.target.value })
              }
              maxLength={10}
              dir="ltr"
              className="w-full rounded border border-outline-variant px-sm py-2 text-sm"
            />
          </div>

          {saveMutation.isError && (
            <p className="text-sm text-error">{getErrorMessage(saveMutation.error)}</p>
          )}

          {saveMutation.isSuccess && (
            <p className="text-sm text-secondary">تم حفظ الإعدادات بنجاح</p>
          )}

          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="rounded-lg bg-primary px-md py-2 text-sm font-bold text-on-primary"
          >
            {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </form>
      </AsyncState>
    </div>
  )
}
