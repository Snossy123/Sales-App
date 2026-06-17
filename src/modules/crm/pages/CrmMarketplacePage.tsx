import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { CrmMarketplace, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import { ToastBanner } from '../../../components/ToastBanner'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

export function CrmMarketplacePage() {
  const queryClient = useQueryClient()
  const [panelOpen, setPanelOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ marketplace: 'facebook_leads', site_key: '', site_id: '' })

  const query = useQuery({
    queryKey: ['crm', 'marketplace'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<CrmMarketplace>>('/crm/marketplace', { params: { per_page: 20 } })
      return data.data
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<CrmMarketplace>('/crm/marketplace', form)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'marketplace'] })
      setPanelOpen(false)
      setToast('تم حفظ التكامل')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/crm/marketplace/${id}`) },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'marketplace'] })
      setToast('تم حذف التكامل')
    },
  })

  return (
    <div>
      <PageHeader title="تكاملات B2B" subtitle="ربط مصادر العملاء المحتملين" actions={
        <button type="button" onClick={() => setPanelOpen(true)} className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary">
          <Icon name="add" size={18} /> تكامل جديد
        </button>
      } />
      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}
      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<CrmMarketplace & Record<string, unknown>>
          data={(query.data ?? []) as (CrmMarketplace & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          pageSize={10}
          columns={[
            { key: 'marketplace', header: 'المنصة' },
            { key: 'site_key', header: 'مفتاح الموقع', render: (row) => row.site_key ?? '—' },
            { key: 'actions', header: '', render: (row) => (
              <button type="button" onClick={() => deleteMutation.mutate(row.id)} className="text-xs text-error hover:underline">حذف</button>
            ) },
          ]}
        />
      </AsyncState>
      <Modal open={panelOpen} onClose={() => setPanelOpen(false)} title="تكامل جديد">
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate() }} className="space-y-sm">
          <select value={form.marketplace} onChange={(e) => setForm({ ...form, marketplace: e.target.value })} className={inputClass}>
            <option value="facebook_leads">Facebook Leads</option>
            <option value="google_ads">Google Ads</option>
          </select>
          <input placeholder="Site Key" value={form.site_key} onChange={(e) => setForm({ ...form, site_key: e.target.value })} className={inputClass} dir="ltr" />
          <input placeholder="Site ID" value={form.site_id} onChange={(e) => setForm({ ...form, site_id: e.target.value })} className={inputClass} dir="ltr" />
          <button type="submit" disabled={saveMutation.isPending} className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary">حفظ</button>
        </form>
      </Modal>
    </div>
  )
}
