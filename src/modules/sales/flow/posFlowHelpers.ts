import type { Branch } from '../../../api/types'
import type { PosFlowDraft } from './posFlowTypes'

export function resolvedBranchId(
  draft: PosFlowDraft,
  contextBranchId: number | null,
  branches: Branch[] = [],
): number | '' {
  if (draft.transactionSource === 'branch') {
    return draft.selectedBranch?.id ?? contextBranchId ?? ''
  }
  if (draft.transactionSource === 'distributor') {
    return draft.selectedDistributor?.branch_id ?? ''
  }
  return (
    draft.selectedSalesRep?.branch_id ??
    contextBranchId ??
    branches.find((branch) => branch.id === contextBranchId)?.id ??
    ''
  )
}

export function isSourceReady(draft: PosFlowDraft): boolean {
  if (draft.transactionSource === 'branch') return Boolean(draft.selectedBranch)
  if (draft.transactionSource === 'distributor') return Boolean(draft.selectedDistributor)
  return Boolean(draft.selectedSalesRep)
}

export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

export function formatMoney(value: number): string {
  return `${value.toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م`
}
