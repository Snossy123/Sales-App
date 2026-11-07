import { useEffect, useMemo, useState } from 'react'
import { useProcedureDraft } from '../../hooks/useProcedureDraft'
import {
  PROCEDURE_DRAFT_IDS,
  readProcedureDraft,
  useProcedureDraftStore,
} from '../../stores/procedureDraftStore'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../api/client'
import type { Branch, Distributor, Employee, PaginatedResponse } from '../../api/types'
import { Modal } from '../Modal'
import { NumericInput } from '../ui/NumericInput'
import { TextArea } from '../ui/TextArea'
import { useAuthStore } from '../../stores/authStore'

const EXPENSE_TYPES = [
  { value: 'petty_cash', label: 'مصروفات نثرية' },
  { value: 'distributor_payout', label: 'صرف عمولة الموزع' },
  { value: 'employee_payout', label: 'صرف عمولة الموظف / نسبة تركيب خارجي' },
];

interface ExpenseRequestFormProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

type ExpenseContract = {
  id: number
  invoice_number: string
  invoice_date: string
  customer?: { name: string } | null
}

type ExpenseDraft = {
  expenseType: string
  amount: string
  notes: string
  branchId: number | ''
  distributorId: number | ''
  employeeId: number | ''
  contractIds: number[]
}

function distributorLabel(distributor: Distributor) {
  return distributor.customer?.name || distributor.name_ar || distributor.name
}

export function ExpenseRequestForm({ open, onClose, onSuccess }: ExpenseRequestFormProps) {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const activeBranchId = useAuthStore((s) => s.branchId)
  const userId = user?.id ?? null
  const saved = readProcedureDraft<ExpenseDraft>(PROCEDURE_DRAFT_IDS.expense, userId)
  const [expenseType, setExpenseType] = useState(() =>
    saved?.expenseType === 'operating' ? 'distributor_payout'
      : saved?.expenseType === 'employee_debt' ? 'employee_payout'
      : (saved?.expenseType ?? 'petty_cash'),
  )
  const [amount, setAmount] = useState(() => saved?.amount ?? '')
  const [notes, setNotes] = useState(() => saved?.notes ?? '')
  const [branchId, setBranchId] = useState<number | ''>(
    () => saved?.branchId ?? activeBranchId ?? user?.branch_id ?? '',
  )
  const [distributorId, setDistributorId] = useState<number | ''>(() => saved?.distributorId ?? '')
  const [employeeId, setEmployeeId] = useState<number | ''>(() => saved?.employeeId ?? '')

  const [contractIds, setContractIds] = useState<number[]>(() => saved?.contractIds ?? [])

  const expenseDraftSnapshot = useMemo<ExpenseDraft>(
    () => ({ expenseType, amount, notes, branchId, distributorId, employeeId, contractIds }),
    [expenseType, amount, notes, branchId, distributorId, employeeId, contractIds],
  )

  useEffect(() => {
    if (open && !branchId && activeBranchId) {
      setBranchId(activeBranchId)
    }
  }, [open, branchId, activeBranchId])

  useProcedureDraft({
    id: PROCEDURE_DRAFT_IDS.expense,
    userId,
    titleAr: 'طلب مصروف',
    resumePath: '/expenses/new',
    snapshot: expenseDraftSnapshot,
    isMeaningful: Boolean(
      amount.trim() ||
        notes.trim() ||
        distributorId ||
        employeeId ||
        contractIds.length > 0 ||
        expenseType !== 'petty_cash',
    ),
    enabled: open,
  })

  const branchesQuery = useQuery({
    queryKey: ['branches', 'expense-form'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', { params: { per_page: 100 } })
      return data.data ?? []
    },
    enabled: open,
  })

  const distributorsQuery = useQuery({
    queryKey: ['distributors', 'expense-form', branchId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Distributor>>('/distributors', {
        params: { per_page: 100, 'filter[branch_id]': branchId },
      })
      return data.data ?? []
    },
    enabled: open && expenseType === 'distributor_payout' && Boolean(branchId),
  })

  const employeesQuery = useQuery({
    queryKey: ['employees', 'expense-form', branchId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', {
        params: { per_page: 100, 'filter[branch_id]': branchId },
      })
      return data.data ?? []
    },
    enabled: open && expenseType === 'employee_payout' && Boolean(branchId),
  })

  const contractsQuery = useQuery({
    queryKey: ['sales-invoices', 'expense-form', branchId],
    queryFn: async () => {
      const contracts: ExpenseContract[] = []
      let page = 1
      let lastPage: number
      do {
        const { data } = await api.get<PaginatedResponse<ExpenseContract>>('/sales-invoices', {
          params: { per_page: 100, page, 'filter[branch_id]': branchId },
        })
        contracts.push(...data.data)
        lastPage = data.last_page
        page += 1
      } while (page <= lastPage)
      return contracts
    },
    enabled: open && Boolean(branchId),
  })

  const commissionType = expenseType === 'distributor_payout' || expenseType === 'employee_payout'
  const commissionAvailability = useQuery({
    queryKey: ['expense-contract-commissions', branchId, expenseType],
    queryFn: async () => {
      const { data } = await api.get<{ blocked_contract_ids: number[] }>('/expense-requests/contract-commissions', {
        params: { branch_id: branchId, expense_type: expenseType },
      })
      return data.blocked_contract_ids
    },
    enabled: open && Boolean(branchId) && commissionType,
  })
  const blockedContractIds = new Set(commissionType ? commissionAvailability.data ?? [] : [])
  const hasBlockedSelection = contractIds.some((id) => blockedContractIds.has(id))

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/expense-requests', {
        branch_id: branchId,
        expense_type: expenseType,
        amount: Number(amount),
        notes: notes || undefined,
        distributor_id: distributorId || undefined,
        employee_id: employeeId || undefined,
        contract_ids: contractIds,
      })
      return data
    },
    onError: () => { if (commissionType) void commissionAvailability.refetch() },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expense-contract-commissions'] })
      void queryClient.invalidateQueries({ queryKey: ['review-expenses'] })
      if (expenseType === 'distributor_payout') {
        void queryClient.invalidateQueries({ queryKey: ['sales-invoices'] })
        void queryClient.invalidateQueries({ queryKey: ['sales-invoice'] })
        void queryClient.invalidateQueries({ queryKey: ['distributors'] })
        void queryClient.invalidateQueries({ queryKey: ['distributor'] })
      }
      useProcedureDraftStore.getState().clearDraft(PROCEDURE_DRAFT_IDS.expense, userId)
      setExpenseType('petty_cash')
      setAmount('')
      setNotes('')
      setDistributorId('')
      setEmployeeId('')
      setContractIds([])
      onSuccess?.()
    },
  })

  const needsDistributor = expenseType === 'distributor_payout'
  const needsEmployee = expenseType === 'employee_payout'
  const canSubmit =
    Boolean(branchId && amount) &&
    (!needsDistributor || Boolean(distributorId)) &&
    (!needsEmployee || Boolean(employeeId)) &&
    !hasBlockedSelection &&
    (!commissionType || commissionAvailability.isSuccess) &&
    !submitMutation.isPending

  return (
    <Modal open={open} onClose={onClose} title="تسجيل مصروف">
      <div className="flex max-h-[calc(100dvh-10rem)] flex-col">
        <div className="min-h-0 space-y-3 overflow-y-auto overscroll-contain pe-1">
          <div>
            <label className="mb-1 block text-sm">نوع المصروف</label>
            <select
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
              value={expenseType}
              onChange={(e) => {
                setExpenseType(e.target.value)
                setContractIds([])
                setDistributorId('')
                setEmployeeId('')
              }}
            >
              {EXPENSE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm">الفرع</label>
            <select
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value ? Number(e.target.value) : '')
                setContractIds([])
                setDistributorId('')
                setEmployeeId('')
              }}
            >
              <option value="">اختر الفرع</option>
              {(branchesQuery.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name_ar ?? b.name}
                </option>
              ))}
            </select>
          </div>
          {needsDistributor && (
            <div>
              <label className="mb-1 block text-sm">الموزع</label>
              <select
                className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
                value={distributorId}
                onChange={(e) => setDistributorId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">اختر الموزع</option>
                {(distributorsQuery.data ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {distributorLabel(d)}
                  </option>
                ))}
              </select>
            </div>
          )}
          {needsEmployee && (
            <div>
              <label className="mb-1 block text-sm">الموظف</label>
              <select
                className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">اختر الموظف</option>
                {(employeesQuery.data ?? []).map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm">المبلغ</label>
            <NumericInput
              min={0}
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          {needsDistributor && (
            <p className="text-sm text-on-surface-variant">
              اختر العقود المستحق عنها العمولة. سيتم تسجيل مصدرها باسم الموزع المختار وتسجيل الصرف كمصروف دون تغيير رصيده.
            </p>
          )}
          <div>
            <details className="rounded-lg border border-outline-variant">
              <summary className="cursor-pointer px-3 py-2 text-sm">
                العقود المرتبطة بالمصروف ({contractIds.length})
              </summary>
              <div className="max-h-60 space-y-2 overflow-y-auto px-3 pb-3">
                {contractsQuery.isPending && branchId && <p className="text-sm">جارٍ تحميل العقود...</p>}
                {contractsQuery.isError && (
                  <p role="alert" className="text-sm text-error">{getErrorMessage(contractsQuery.error)}</p>
                )}
                {!branchId && <p className="text-sm">اختر الفرع أولاً</p>}
                {contractsQuery.isSuccess && contractsQuery.data.length === 0 && (
                  <p className="text-sm">لا توجد عقود لهذا الفرع</p>
                )}
                {commissionType && commissionAvailability.isFetching && <p className="text-sm">جارٍ التحقق من العمولات السابقة...</p>}
                {commissionType && commissionAvailability.isError && <p role="alert" className="text-sm text-error">{getErrorMessage(commissionAvailability.error)}</p>}
                {hasBlockedSelection && <p role="alert" className="text-sm text-error">يوجد عقد مختار تم صرف عمولته. أزل اختياره قبل الحفظ.</p>}
                {(contractsQuery.data ?? []).map((contract) => (
                  <label key={contract.id} className={`flex items-center gap-2 text-sm ${blockedContractIds.has(contract.id) ? 'text-on-surface-variant' : ''}`}>
                    <input
                      type="checkbox"
                      checked={contractIds.includes(contract.id)}
                      disabled={!contractIds.includes(contract.id) && commissionType && (!commissionAvailability.isSuccess || blockedContractIds.has(contract.id))}
                      onChange={(event) => setContractIds((ids) => event.target.checked
                        ? [...ids, contract.id]
                        : ids.filter((id) => id !== contract.id))}
                    />
                    <span>{contract.invoice_number} - {contract.customer?.name ?? 'بدون عميل'} - {contract.invoice_date?.slice(0, 10)}{blockedContractIds.has(contract.id) ? ' — سبق تسجيل عمولة من نفس النوع' : ''}</span>
                  </label>
                ))}
              </div>
            </details>
          </div>
          <div>
            <label className="mb-1 block text-sm">ملاحظات / السبب</label>
            <TextArea
              mode="arabic"
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {submitMutation.isError && (
            <p className="text-sm text-error">{getErrorMessage(submitMutation.error)}</p>
          )}
        </div>
        <div className="mt-3 flex shrink-0 justify-end gap-2 border-t border-outline-variant pt-3">
          <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={onClose}>
            إلغاء
          </button>
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 text-sm text-on-primary disabled:opacity-50"
            disabled={!canSubmit}
            onClick={() => submitMutation.mutate()}
          >
            تسجيل المصروف
          </button>
        </div>
      </div>
    </Modal>
  )
}
