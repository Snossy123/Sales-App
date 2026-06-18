import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'

interface FaqItemRow {
  id: number
  question_ar: string
  answer_ar: string
  keywords?: string
  sort_order?: number
  is_published?: boolean
}

const emptyForm = {
  question_ar: '',
  answer_ar: '',
  keywords: '',
  sort_order: 0,
  is_published: true,
}

export function AdminFaqPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<FaqItemRow | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [open, setOpen] = useState(false)

  const itemsQuery = useQuery({
    queryKey: ['admin', 'faq'],
    queryFn: async () => {
      const { data } = await api.get<{ items: FaqItemRow[] }>('/admin/faq')
      return data.items ?? []
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { data } = await api.put(`/admin/faq-items/${editing.id}`, form)
        return data
      }
      const { data } = await api.post('/admin/faq-items', form)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'faq'] })
      queryClient.invalidateQueries({ queryKey: ['faq'] })
      setOpen(false)
      setEditing(null)
      setForm(emptyForm)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/faq-items/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'faq'] })
      queryClient.invalidateQueries({ queryKey: ['faq'] })
    },
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  const openEdit = (row: FaqItemRow) => {
    setEditing(row)
    setForm({
      question_ar: row.question_ar,
      answer_ar: row.answer_ar,
      keywords: row.keywords ?? '',
      sort_order: row.sort_order ?? 0,
      is_published: row.is_published ?? true,
    })
    setOpen(true)
  }

  return (
    <div>
      <PageHeader
        title="إدارة الأسئلة الشائعة"
        subtitle="إضافة وتعديل أسئلة المساعدة والشات بوت"
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
          >
            سؤال جديد
          </button>
        }
      />

      <AsyncState isLoading={itemsQuery.isLoading} isError={itemsQuery.isError} error={itemsQuery.error}>
        <DataTable<FaqItemRow>
          data={itemsQuery.data ?? []}
          keyExtractor={(r) => r.id}
          pageSize={15}
          emptyMessage="لا توجد أسئلة"
          columns={[
            { key: 'question_ar', header: 'السؤال' },
            { key: 'sort_order', header: 'الترتيب' },
            {
              key: 'is_published',
              header: 'منشور',
              render: (r) => (r.is_published ? 'نعم' : 'لا'),
            },
            {
              key: 'actions',
              header: '',
              render: (r) => (
                <div className="flex gap-2">
                  <button type="button" onClick={() => openEdit(r)} className="text-sm text-primary hover:underline">
                    تعديل
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(r.id)}
                    className="text-sm text-error hover:underline"
                  >
                    حذف
                  </button>
                </div>
              ),
            },
          ]}
        />
      </AsyncState>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'تعديل سؤال' : 'سؤال جديد'}>
        <div className="space-y-sm">
          <input
            value={form.question_ar}
            onChange={(e) => setForm((f) => ({ ...f, question_ar: e.target.value }))}
            placeholder="السؤال"
            className="w-full rounded border border-outline-variant px-sm py-2"
          />
          <textarea
            value={form.answer_ar}
            onChange={(e) => setForm((f) => ({ ...f, answer_ar: e.target.value }))}
            placeholder="الإجابة"
            rows={4}
            className="w-full rounded border border-outline-variant px-sm py-2 text-sm"
          />
          <input
            value={form.keywords}
            onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
            placeholder="كلمات مفتاحية (مفصولة بفاصلة)"
            className="w-full rounded border border-outline-variant px-sm py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
            />
            منشور
          </label>
          {saveMutation.isError && (
            <p className="text-sm text-error">{getErrorMessage(saveMutation.error)}</p>
          )}
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !form.question_ar || !form.answer_ar}
            className="w-full rounded-lg bg-primary py-2 font-bold text-on-primary disabled:opacity-60"
          >
            {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
