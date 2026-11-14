import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../api/client'
import type { Branch, SalesInvoice } from '../../api/types'
import { canAccessBranch, userHasPermission } from '../../lib/access'
import { canEditContract } from '../../lib/contractEdit'
import { useAuthStore } from '../../stores/authStore'
import { SalesPageShell } from '../SalesPageShell'

export function ContractExecutionBranchEditor({ invoice, branches, loading, error }: {
  invoice: SalesInvoice
  branches: Branch[]
  loading: boolean
  error: boolean
}) {
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [branchId, setBranchId] = useState(invoice.action_branch_id ? String(invoice.action_branch_id) : '')
  const allowed = canEditContract(user, invoice) && userHasPermission(user, 'sales.invoices.change_action_branch')
  const options = branches.filter((branch) => branch.is_active !== false && canAccessBranch(user, branch))
  const mutation = useMutation({
    mutationFn: async () => api.patch(`/sales-invoices/${invoice.id}/execution-branch`, { action_branch_id: Number(branchId) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries()
      navigate(`/contracts/${invoice.id}`)
    },
  })

  return <SalesPageShell title="تغيير فرع التنفيذ" subtitle={`التعاقد ${invoice.invoice_number || `#${invoice.id}`}`}>
    <form className="space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg"
      onSubmit={(event) => { event.preventDefault(); if (allowed && branchId && Number(branchId) !== invoice.action_branch_id && !mutation.isPending) mutation.mutate() }}>
      <p className="text-sm text-on-surface-variant">يتم تغيير فرع تنفيذ العملية فقط، وتظل الأجهزة وبياناتها والمدفوعات والأقساط كما هي.</p>
      {!allowed && <p role="alert" className="text-sm text-error">ليس لديك صلاحية تغيير فرع التنفيذ لهذا التعاقد.</p>}
      <label className="flex flex-col gap-2">
        <span>فرع التنفيذ</span>
        <select className="input" value={branchId} onChange={(event) => setBranchId(event.target.value)} disabled={!allowed || loading || mutation.isPending}>
          <option value="">اختر فرع التنفيذ</option>
          {invoice.action_branch_id && !options.some((branch) => branch.id === invoice.action_branch_id) && <option value={invoice.action_branch_id}>{invoice.action_branch?.name_ar || invoice.action_branch?.name || `الفرع الحالي (${invoice.action_branch_id})`}</option>}
          {options.map((branch) => <option key={branch.id} value={branch.id}>{branch.name_ar || branch.name}</option>)}
        </select>
      </label>
      {error && <p role="alert" className="text-sm text-error">تعذر تحميل الفروع. أعد تحميل الصفحة.</p>}
      {mutation.isError && <p role="alert" className="text-sm text-error">{getErrorMessage(mutation.error)}</p>}
      <div className="flex gap-sm">
        <button type="submit" className="rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary disabled:opacity-50"
          disabled={!allowed || !branchId || Number(branchId) === invoice.action_branch_id || loading || error || mutation.isPending}>{mutation.isPending ? 'جارٍ الحفظ...' : 'حفظ فرع التنفيذ'}</button>
        <Link className="rounded-lg border border-outline-variant px-md py-sm text-sm" to={`/contracts/${invoice.id}`}>رجوع</Link>
      </div>
    </form>
  </SalesPageShell>
}
