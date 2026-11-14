import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../api/client'
import type { Branch, Employee, SalesInvoice } from '../../api/types'
import { canAccessBranch, userHasPermission } from '../../lib/access'
import { canEditContract } from '../../lib/contractEdit'
import { contractStatusLabel } from '../../lib/contractStatus'
import { useAuthStore } from '../../stores/authStore'
import { SalesPageShell } from '../SalesPageShell'

const fields = [
  ['serial_number', 'السيريال'], ['sim_number', 'رقم الشريحة'], ['username', 'اسم المستخدم'],
  ['vehicle_type', 'نوع المركبة'], ['vehicle_plate_letters', 'حروف اللوحة'], ['vehicle_plate_numbers', 'أرقام اللوحة'],
  ['chassis_number', 'الشاسيه'], ['engine_number', 'الموتور'], ['vehicle_info', 'بيانات المركبة'],
] as const
type Field = typeof fields[number][0]
type CorrectionLine = Record<Field, string> & { id: number; technician_id: number | null }

export function ClosedContractCorrectionEditor({ invoice, branches, employees, loading }: {
  invoice: SalesInvoice; branches: Branch[]; employees: Employee[]; loading: boolean
}) {
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const allowed = canEditContract(user, invoice)
  const canChangeBranch = userHasPermission(user, 'sales.invoices.change_action_branch')
  const [branchId, setBranchId] = useState(String(invoice.action_branch_id ?? ''))
  const [date, setDate] = useState(invoice.invoice_date?.slice(0, 10) ?? '')
  const [notes, setNotes] = useState(invoice.notes ?? '')
  const [lines, setLines] = useState<CorrectionLine[]>(() => (invoice.lines ?? []).map((line) => ({
    ...Object.fromEntries(fields.map(([key]) => [key, String(line[key] ?? '')])) as Record<Field, string>,
    id: line.id,
    technician_id: line.technician_id ?? null,
  })))
  const payload: Record<string, unknown> = {}
  if (canChangeBranch && branchId && branchId !== String(invoice.action_branch_id ?? '')) payload.action_branch_id = Number(branchId)
  if (date !== invoice.invoice_date?.slice(0, 10)) payload.invoice_date = date
  if (notes !== (invoice.notes ?? '')) payload.notes = notes
  const changedLines = lines.flatMap((line) => {
    const original = invoice.lines?.find((item) => item.id === line.id)
    if (!original) return []
    const changes: Record<string, unknown> = {}
    for (const [key] of fields) {
      if (line[key] !== String(original[key] ?? '')) changes[key] = line[key]
    }
    if (line.technician_id !== (original.technician_id ?? null)) changes.technician_id = line.technician_id
    return Object.keys(changes).length ? [{ id: line.id, ...changes }] : []
  })
  if (changedLines.length) payload.lines = changedLines
  const hasChanges = Object.keys(payload).length > 0
  const mutation = useMutation({
    mutationFn: () => api.patch(`/sales-invoices/${invoice.id}/corrections`, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries()
      navigate(`/contracts/${invoice.id}`)
    },
  })
  const options = branches.filter((branch) => branch.is_active !== false && canAccessBranch(user, branch))
  const patchLine = (id: number, changes: Partial<CorrectionLine>) => setLines((current) => current.map((line) => line.id === id ? { ...line, ...changes } : line))

  return <SalesPageShell title="تصحيح بيانات عقد مغلق" subtitle={`التعاقد ${invoice.invoice_number || `#${invoice.id}`} — ${contractStatusLabel(invoice.contract_status)}`}>
    <form className="space-y-md" onSubmit={(event) => { event.preventDefault(); if (allowed && hasChanges && !mutation.isPending) mutation.mutate() }}>
      <div className="rounded-xl border border-primary/25 bg-primary/5 p-md text-sm">
        تصحيح البيانات المسجلة فقط. يظل العقد {contractStatusLabel(invoice.contract_status)}، وتظل المبالغ والأقساط والمدفوعات وحالة المخزون كما هي.
      </div>
      {!allowed && <p role="alert" className="text-sm text-error">ليس لديك صلاحية تصحيح هذا التعاقد.</p>}
      <fieldset disabled={!allowed || mutation.isPending} className="space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
        <p className="font-medium">العميل: {invoice.customer?.name || `#${invoice.customer_id}`}</p>
        <div className="grid gap-md sm:grid-cols-2">
          <label className="flex flex-col gap-2">فرع التنفيذ
            <select className="input" value={branchId} onChange={(event) => setBranchId(event.target.value)} disabled={!canChangeBranch || loading}>
              <option value="">اختر فرع التنفيذ</option>
              {invoice.action_branch_id && !options.some((branch) => branch.id === invoice.action_branch_id) && <option value={invoice.action_branch_id}>{invoice.action_branch?.name_ar || invoice.action_branch?.name || `الفرع الحالي (${invoice.action_branch_id})`}</option>}
              {options.map((branch) => <option key={branch.id} value={branch.id}>{branch.name_ar || branch.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2">تاريخ التعاقد<input required type="date" className="input" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        </div>
        <label className="flex flex-col gap-2">ملاحظات<textarea className="input" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        {lines.map((line, index) => <div key={line.id} className="space-y-sm border-t border-outline-variant pt-md">
          <p className="font-bold">بيانات البند {index + 1} المسجلة في العقد</p>
          <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
            {fields.map(([key, label]) => <label key={key} className="flex flex-col gap-2">{label}
              {key === 'vehicle_type' ? <select className="input" value={line[key]} onChange={(event) => patchLine(line.id, { [key]: event.target.value })}>
                <option value="">غير محدد</option><option value="car">سيارة</option><option value="tuk_tuk">توك توك</option><option value="motorcycle">موتوسيكل</option><option value="other">أخرى</option>
              </select> : <input className="input" value={line[key]} onChange={(event) => patchLine(line.id, { [key]: event.target.value })} />}
            </label>)}
            <label className="flex flex-col gap-2">الفني
              <select className="input" value={line.technician_id ?? ''} onChange={(event) => patchLine(line.id, { technician_id: event.target.value ? Number(event.target.value) : null })}>
                <option value="">غير محدد</option>
                {line.technician_id && !employees.some((employee) => employee.id === line.technician_id) && <option value={line.technician_id}>{invoice.lines?.find((item) => item.id === line.id)?.technician?.name || `الفني (${line.technician_id})`}</option>}
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
              </select>
            </label>
          </div>
        </div>)}
      </fieldset>
      {mutation.isError && <p role="alert" className="text-sm text-error">{getErrorMessage(mutation.error)}</p>}
      <div className="flex gap-sm">
        <button type="submit" className="rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary disabled:opacity-50" disabled={!allowed || !hasChanges || !date || mutation.isPending}>{mutation.isPending ? 'جارٍ الحفظ...' : 'حفظ تصحيح البيانات'}</button>
        <Link className="rounded-lg border border-outline-variant px-md py-sm text-sm" to={`/contracts/${invoice.id}`}>رجوع</Link>
      </div>
    </form>
  </SalesPageShell>
}
