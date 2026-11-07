import { useState } from 'react'
import { ExpenseRequestForm, type EditableExpenseRequest } from '../components/expenses/ExpenseRequestForm'
import { Modal } from '../components/Modal'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import { AsyncState } from '../components/AsyncState'
import { SalesPageShell } from '../components/SalesPageShell'
import { StatusBadge } from '../components/StatusBadge'
import { userHasPermission } from '../lib/access'
import { getDefaultRoute } from '../lib/permissions'
import { formatMoney } from '../lib/theme'
import { useAuthStore } from '../stores/authStore'

interface ExpenseDetail extends EditableExpenseRequest {
  id: number
  reference_number?: string
  expense_type: string
  amount: number
  status: string
  notes?: string
  branch?: { name?: string }
  employee?: { name?: string }
  distributor?: { name?: string }
  creator?: { name?: string }
  contracts?: Array<{
    id: number
    invoice_number?: string
    invoice_date?: string | null
    customer?: { name?: string } | null
  }>
}

const TYPE_LABELS: Record<string, string> = {
  operating: 'تشغيل',
  petty_cash: 'نثرية',
  distributor_payout: 'صرف عمولة',
  employee_payout: 'صرف عمولة الموظف / نسبة تركيب خارجي',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'مسجّل — مراجعة آخر اليوم',
  approved: 'معتمد',
  rejected: 'مرفوض',
  paid: 'مدفوع',
}

export function ReviewExpenseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canApprove = userHasPermission(user, 'review.approve_expenses')
  const canEdit = userHasPermission(user, 'expenses.edit')
  const canDelete = userHasPermission(user, 'expenses.delete')
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const canViewList = userHasPermission(user, 'review.view_expenses')
  const returnPath = canViewList ? '/review/expenses'
    : userHasPermission(user, 'expenses.submit') ? '/expenses/new' : getDefaultRoute(user)

  const query = useQuery({
    queryKey: ['review-expense', id],
    queryFn: async () => {
      const { data } = await api.get<ExpenseDetail>(`/review/expenses/${id}`)
      return data
    },
    enabled: Boolean(id),
  })

  const approveMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ExpenseDetail>(`/review/expenses/${id}/approve`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-expenses'] })
      queryClient.invalidateQueries({ queryKey: ['review-expense', id] })
      if (canViewList) navigate('/review/expenses')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ExpenseDetail>(`/review/expenses/${id}/reject`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-expenses'] })
      queryClient.invalidateQueries({ queryKey: ['review-expense', id] })
      if (canViewList) navigate('/review/expenses')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => { await api.delete(`/review/expenses/${id}`) },
    onSuccess: () => {
      for (const key of ['review-expenses', 'my-expense-requests-today', 'expense-contract-commissions', 'expense-edit-options', 'daily-branch-reports']) {
        void queryClient.invalidateQueries({ queryKey: [key] })
      }
      setDeleteOpen(false)
      navigate(returnPath)
    },
  })
  const actionPending = approveMutation.isPending || rejectMutation.isPending || deleteMutation.isPending

  const expense = query.data
  const pending = expense?.status === 'pending'
  const error = approveMutation.error ?? rejectMutation.error

  return (
    <SalesPageShell
      title="تفاصيل طلب المصروف"
      actions={
        <Link to={returnPath} className="text-sm text-primary hover:underline">
          العودة للقائمة
        </Link>
      }
    >
      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {expense && (
          <div className="space-y-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                status={expense.status === 'rejected' ? 'error' : pending ? 'warning' : 'success'}
                label={STATUS_LABELS[expense.status] ?? expense.status}
              />
              <span className="text-sm">{TYPE_LABELS[expense.expense_type] ?? expense.expense_type}</span>
            </div>
            {(canEdit || canDelete) && (
              <div className="flex flex-wrap gap-2">
                {canEdit && <button type="button" disabled={actionPending} onClick={() => setEditOpen(true)} className="rounded-lg border border-primary px-4 py-2 text-sm text-primary disabled:opacity-50">تعديل المصروف</button>}
                {canDelete && <button type="button" disabled={actionPending} onClick={() => { deleteMutation.reset(); setDeleteOpen(true) }} className="rounded-lg border border-error px-4 py-2 text-sm text-error disabled:opacity-50">حذف المصروف</button>}
              </div>
            )}
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-on-surface-variant">المبلغ</dt>
                <dd className="font-medium">{formatMoney(Number(expense.amount))}</dd>
              </div>
              <div>
                <dt className="text-xs text-on-surface-variant">الفرع</dt>
                <dd>{expense.branch?.name ?? '—'}</dd>
              </div>
              {expense.distributor && (
                <div>
                  <dt className="text-xs text-on-surface-variant">الموزع</dt>
                  <dd>{expense.distributor.name}</dd>
                </div>
              )}
              {expense.employee && (
                <div>
                  <dt className="text-xs text-on-surface-variant">الموظف</dt>
                  <dd>{expense.employee.name}</dd>
                </div>
              )}
              <div className="sm:col-span-2">
                <dt className="text-xs text-on-surface-variant">الملاحظات</dt>
                <dd>{expense.notes ?? '—'}</dd>
              </div>
            </dl>
            <section aria-labelledby="expense-contracts-heading" className="space-y-2">
              <h2 id="expense-contracts-heading" className="text-sm font-medium">العقود المرتبطة بالمصروف</h2>
              {expense.contracts?.length ? (
                <div className="overflow-x-auto rounded-lg border border-outline-variant">
                  <table className="w-full text-start text-sm">
                    <thead className="bg-surface-container-low">
                      <tr>
                        <th scope="col" className="p-3 text-start">رقم العقد</th>
                        <th scope="col" className="p-3 text-start">اسم العميل</th>
                        <th scope="col" className="p-3 text-start">تاريخ العقد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expense.contracts.map((contract) => (
                        <tr key={contract.id} className="border-t border-outline-variant">
                          <td className="p-3">
                            <Link to={`/contracts/${contract.id}`} className="text-primary hover:underline">
                              {contract.invoice_number || `#${contract.id}`}
                            </Link>
                          </td>
                          <td className="p-3">{contract.customer?.name ?? '—'}</td>
                          <td className="p-3">{contract.invoice_date?.slice(0, 10) || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-on-surface-variant">لا توجد عقود مرتبطة بهذا المصروف</p>
              )}
            </section>
            {pending && canApprove && (
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-lg bg-primary px-4 py-2 text-sm text-on-primary disabled:opacity-50"
                  disabled={actionPending}
                  onClick={() => approveMutation.mutate()}
                >
                  موافقة
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-error px-4 py-2 text-sm text-error disabled:opacity-50"
                  disabled={actionPending}
                  onClick={() => rejectMutation.mutate()}
                >
                  رفض
                </button>
              </div>
            )}
            {error && <p className="text-sm text-error">{getErrorMessage(error)}</p>}
          </div>
        )}
      </AsyncState>
      {editOpen && expense && canEdit && (
        <ExpenseRequestForm open expense={expense} onClose={() => setEditOpen(false)} onSuccess={() => setEditOpen(false)} />
      )}
      {canDelete && (
        <Modal open={deleteOpen} onClose={() => { if (!deleteMutation.isPending) setDeleteOpen(false) }} title="حذف المصروف">
          <div className="space-y-4">
            <p>هل تريد حذف المصروف {expense?.reference_number || `#${id}`}؟ سيُستبعد من القوائم والتقارير.</p>
            {deleteMutation.isError && <p role="alert" className="text-sm text-error">{getErrorMessage(deleteMutation.error)}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" disabled={deleteMutation.isPending} onClick={() => setDeleteOpen(false)} className="rounded-lg border px-4 py-2 text-sm">إلغاء</button>
              <button type="button" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()} className="rounded-lg bg-error px-4 py-2 text-sm text-on-error disabled:opacity-50">{deleteMutation.isPending ? 'جاري الحذف…' : 'حذف المصروف'}</button>
            </div>
          </div>
        </Modal>
      )}
    </SalesPageShell>
  )
}
