import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getErrorMessage } from '../../api/client'
import type { ServiceEvaluationQuestion } from '../../api/types'
import { AsyncState } from '../../components/AsyncState'
import { DataTable } from '../../components/DataTable'
import { Modal } from '../../components/Modal'
import { PageHeader } from '../../components/PageHeader'
import { StatusBadge } from '../../components/StatusBadge'
import {
  ANSWER_TYPE_LABELS,
  createEvaluationQuestion,
  deleteEvaluationQuestion,
  listEvaluationQuestions,
  updateEvaluationQuestion,
} from './api'

const QUERY_KEY = ['review', 'evaluation-questions']

const emptyForm = {
  question_ar: '',
  answer_type: 'text' as ServiceEvaluationQuestion['answer_type'],
  sort_order: 0,
  is_active: true,
}

export function EvaluationQuestionsPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ServiceEvaluationQuestion | null>(null)
  const [form, setForm] = useState(emptyForm)

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: listEvaluationQuestions,
  })

  const saveMutation = useMutation({
    mutationFn: () =>
      editing ? updateEvaluationQuestion(editing.id, form) : createEvaluationQuestion(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      setOpen(false)
      setEditing(null)
      setForm(emptyForm)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteEvaluationQuestion,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  const openEdit = (row: ServiceEvaluationQuestion) => {
    setEditing(row)
    setForm({
      question_ar: row.question_ar,
      answer_type: row.answer_type,
      sort_order: row.sort_order ?? 0,
      is_active: row.is_active ?? true,
    })
    setOpen(true)
  }

  return (
    <div>
      <PageHeader
        title="أسئلة التقييم"
        subtitle="إدارة أسئلة تقييم العملاء بعد تركيب الأجهزة"
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-primary px-md py-2 text-sm font-bold text-on-primary"
          >
            إضافة سؤال
          </button>
        }
      />

      {(saveMutation.isError || deleteMutation.isError) && (
        <p className="mb-sm text-sm text-error">
          {getErrorMessage(saveMutation.error ?? deleteMutation.error)}
        </p>
      )}

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<ServiceEvaluationQuestion & Record<string, unknown>>
          data={(query.data ?? []) as (ServiceEvaluationQuestion & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          pageSize={15}
          columns={[
            { key: 'sort_order', header: 'الترتيب', className: 'tabular-nums' },
            { key: 'question_ar', header: 'السؤال' },
            {
              key: 'answer_type',
              header: 'نوع الإجابة',
              render: (row) => ANSWER_TYPE_LABELS[row.answer_type],
            },
            {
              key: 'is_active',
              header: 'الحالة',
              render: (row) => (
                <StatusBadge
                  status={row.is_active ? 'active' : 'inactive'}
                  label={row.is_active ? 'نشط' : 'غير نشط'}
                />
              ),
            },
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    className="text-sm text-primary hover:underline"
                  >
                    تعديل
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(row.id)}
                    disabled={deleteMutation.isPending}
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

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'تعديل السؤال' : 'إضافة سؤال'}
        size="md"
      >
        <form
          className="space-y-md"
          onSubmit={(e) => {
            e.preventDefault()
            saveMutation.mutate()
          }}
        >
          <div>
            <label className="mb-1 block text-sm font-medium">نص السؤال</label>
            <textarea
              value={form.question_ar}
              onChange={(e) => setForm((f) => ({ ...f, question_ar: e.target.value }))}
              required
              rows={3}
              className="w-full rounded-lg border border-outline-variant px-sm py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">نوع الإجابة</label>
            <select
              value={form.answer_type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  answer_type: e.target.value as ServiceEvaluationQuestion['answer_type'],
                }))
              }
              className="w-full rounded-lg border border-outline-variant px-sm py-2 text-sm"
            >
              {Object.entries(ANSWER_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-md">
            <div>
              <label className="mb-1 block text-sm font-medium">الترتيب</label>
              <input
                type="number"
                min={0}
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                className="w-full rounded-lg border border-outline-variant px-sm py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
                نشط
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-sm">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-outline-variant px-md py-2 text-sm"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="rounded-lg bg-primary px-md py-2 text-sm font-bold text-on-primary"
            >
              {saveMutation.isPending ? 'جاري الحفظ…' : 'حفظ'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
