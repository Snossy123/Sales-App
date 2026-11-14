import type { ContractTierFilter } from './collectionHelpers'

const STORAGE_KEY = 'installment-collection-focus'

const contractTiers = new Set<ContractTierFilter>([
  'all',
  'overdue',
  'due_soon',
  'upcoming',
  'open_reconciliation',
])

export interface InstallmentCollectionFocus {
  customerId: number
  selectedBranchId?: number | null
  customerSearch: string
  statusFilter: string
  contractTierFilter: ContractTierFilter
  collectionStatusFilter: string
  collectorFilter: string
  sortByReminder: boolean
  followUpToday?: boolean
  paidToday?: boolean
  completedContracts?: boolean
}

function isFocus(value: unknown): value is InstallmentCollectionFocus {
  if (!value || typeof value !== 'object') return false
  const focus = value as InstallmentCollectionFocus
  return (
    typeof focus.customerId === 'number' &&
    (focus.selectedBranchId === undefined || focus.selectedBranchId === null || typeof focus.selectedBranchId === 'number') &&
    typeof focus.customerSearch === 'string' &&
    typeof focus.statusFilter === 'string' &&
    contractTiers.has(focus.contractTierFilter) &&
    typeof focus.collectionStatusFilter === 'string' &&
    typeof focus.collectorFilter === 'string' &&
    typeof focus.sortByReminder === 'boolean' &&
    (focus.followUpToday === undefined || typeof focus.followUpToday === 'boolean') &&
    (focus.paidToday === undefined || typeof focus.paidToday === 'boolean') &&
    (focus.completedContracts === undefined || typeof focus.completedContracts === 'boolean')
  )
}

export function readInstallmentCollectionFocus(): InstallmentCollectionFocus | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isFocus(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveInstallmentCollectionFocus(focus: InstallmentCollectionFocus) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(focus))
}

export function clearInstallmentCollectionFocus() {
  sessionStorage.removeItem(STORAGE_KEY)
}
