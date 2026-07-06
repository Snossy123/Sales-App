export type ContractTierFilter = 'all' | 'overdue' | 'due_soon'

export type CollectionSortMode = 'priority' | 'reminder'

export const collectionStatusLabels: Record<string, string> = {
  responded: 'تم الرد',
  postponed: 'تأجيلات',
  new_payment_date: 'مواعيد جديدة للدفع',
}

export const collectionStatusOptions = [
  { value: '', label: 'كل حالات التحصيل' },
  { value: 'responded', label: collectionStatusLabels.responded },
  { value: 'postponed', label: collectionStatusLabels.postponed },
  { value: 'new_payment_date', label: collectionStatusLabels.new_payment_date },
]

export const contractTierFilterOptions = [
  { value: 'all', label: 'كل العقود' },
  { value: 'overdue', label: 'متأخرة' },
  { value: 'due_soon', label: 'مستحقة اليوم / فترة السماح' },
] as const

export type InstallmentCollectionRow = {
  id: number
  sales_invoice_id?: number
  installment_number?: number
  sequence?: number
  due_date: string
  amount: string | number
  paid_amount: string | number
  paid_at?: string | null
  status: string
  display_tier?: string
  remaining?: number
  total_due?: number
  customer_id?: number
  customer_name?: string
  customer_phone?: string
  customer_phones?: string[]
  username?: string
  serial_number?: string
  invoice_number?: string
  branch_id?: number
  unpaid_reason?: string | null
  suspended_at?: string | null
  is_suspended?: boolean
  device_in_custody?: boolean
  collection_status?: string | null
  collection_reminder_at?: string | null
  collection_notes?: string | null
  has_open_reconciliation?: boolean
  open_reconciliation_id?: number | null
  remaining_installments?: number
  late_fee_accrued?: string | number
} & Record<string, unknown>

export function rowRemaining(row: InstallmentCollectionRow): number {
  return Number(
    row.remaining ??
      row.total_due ??
      Math.max(0, Number(row.amount) - Number(row.paid_amount ?? 0)),
  )
}

export function getCurrentInstallment(rows: InstallmentCollectionRow[]): InstallmentCollectionRow | undefined {
  return [...rows]
    .filter((r) => r.status !== 'paid' && !r.is_suspended && !r.suspended_at)
    .sort((a, b) => {
      const seqA = a.sequence ?? a.installment_number ?? 0
      const seqB = b.sequence ?? b.installment_number ?? 0
      if (seqA !== seqB) return seqA - seqB
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })[0]
}

export function contractFilterTier(rows: InstallmentCollectionRow[]): ContractTierFilter | 'suspended' | 'other' {
  const unpaid = rows.filter((r) => r.status !== 'paid')
  if (unpaid.length > 0 && unpaid.every((r) => r.is_suspended || r.suspended_at)) {
    return 'suspended'
  }

  const current = getCurrentInstallment(rows)
  if (!current) return 'other'

  const tier = current.display_tier ?? current.status
  if (tier === 'overdue') return 'overdue'
  if (tier === 'upcoming' || tier === 'grace') return 'due_soon'
  return 'other'
}

export function filterRowsByContractTier(
  rows: InstallmentCollectionRow[],
  tier: ContractTierFilter,
): InstallmentCollectionRow[] {
  if (tier === 'all') return rows

  const byInvoice = new Map<number, InstallmentCollectionRow[]>()
  for (const row of rows) {
    const invoiceId = Number(row.sales_invoice_id ?? 0)
    const list = byInvoice.get(invoiceId) ?? []
    list.push(row)
    byInvoice.set(invoiceId, list)
  }

  const matchingInvoiceIds = new Set<number>()
  for (const [invoiceId, invoiceRows] of byInvoice) {
    const contractTier = contractFilterTier(invoiceRows)
    if (tier === 'overdue' && contractTier === 'overdue') {
      matchingInvoiceIds.add(invoiceId)
    }
    if (tier === 'due_soon' && contractTier === 'due_soon') {
      matchingInvoiceIds.add(invoiceId)
    }
  }

  return rows.filter((r) => matchingInvoiceIds.has(Number(r.sales_invoice_id ?? 0)))
}

function normalizePhoneSearch(value: string): string {
  return value.replace(/[\s-]/g, '')
}

function installmentRowSearchHaystack(row: InstallmentCollectionRow): string[] {
  const phones = row.customer_phones?.length
    ? row.customer_phones
    : row.customer_phone
      ? [row.customer_phone]
      : []

  return [
    String(row.customer_name ?? ''),
    String(row.invoice_number ?? ''),
    String(row.username ?? ''),
    String(row.serial_number ?? ''),
    ...phones,
  ]
}

export function filterInstallmentCollectionRows(
  rows: InstallmentCollectionRow[],
  search: string,
): InstallmentCollectionRow[] {
  const q = search.trim().toLowerCase()
  if (!q) return rows

  const normalizedPhoneQuery = normalizePhoneSearch(q)

  return rows.filter((row) => {
    const haystack = installmentRowSearchHaystack(row)

    if (haystack.some((value) => value.toLowerCase().includes(q))) {
      return true
    }

    if (!normalizedPhoneQuery) return false

    return haystack.some((value) => normalizePhoneSearch(value).includes(normalizedPhoneQuery))
  })
}

export interface ContractCollectionStats {
  total_contracts: number
  overdue_contracts: number
  due_soon_contracts: number
}

export function computeContractStats(rows: InstallmentCollectionRow[]): ContractCollectionStats {
  const byInvoice = new Map<number, InstallmentCollectionRow[]>()
  for (const row of rows.filter((r) => r.status !== 'paid')) {
    const invoiceId = Number(row.sales_invoice_id ?? 0)
    const list = byInvoice.get(invoiceId) ?? []
    list.push(row)
    byInvoice.set(invoiceId, list)
  }

  let overdue = 0
  let dueSoon = 0
  for (const invoiceRows of byInvoice.values()) {
    const tier = contractFilterTier(invoiceRows)
    if (tier === 'overdue') overdue++
    if (tier === 'due_soon') dueSoon++
  }

  return {
    total_contracts: byInvoice.size,
    overdue_contracts: overdue,
    due_soon_contracts: dueSoon,
  }
}

/** Mirrors InstallmentDisplayService::tierSortOrder */
export function tierSortOrder(tier?: string): number {
  switch (tier) {
    case 'overdue':
      return 0
    case 'grace':
      return 1
    case 'upcoming':
      return 2
    case 'suspended':
      return 4
    default:
      return 3
  }
}

export function contractCollectionSortKey(
  rows: InstallmentCollectionRow[],
  mode: CollectionSortMode = 'priority',
): number[] {
  const current = getCurrentInstallment(rows)
  const tier = current ? String(current.display_tier ?? current.status) : 'other'
  const tierOrder = tierSortOrder(tier)
  const dueDate = current ? new Date(current.due_date).getTime() : Number.MAX_SAFE_INTEGER
  const totalDue = current ? -rowRemaining(current) : 0

  if (mode === 'reminder') {
    const reminderAt = rows.find((row) => row.collection_reminder_at)?.collection_reminder_at
    const reminderKey = reminderAt ? new Date(reminderAt).getTime() : Number.MAX_SAFE_INTEGER

    return [reminderKey, tierOrder, dueDate, totalDue]
  }

  return [tierOrder, dueDate, totalDue]
}

export function compareCollectionSortKeys(a: number[], b: number[]): number {
  const length = Math.max(a.length, b.length)
  for (let index = 0; index < length; index += 1) {
    const diff = (a[index] ?? 0) - (b[index] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

export function compareContractCollection(
  rowsA: InstallmentCollectionRow[],
  rowsB: InstallmentCollectionRow[],
  mode: CollectionSortMode = 'priority',
): number {
  return compareCollectionSortKeys(
    contractCollectionSortKey(rowsA, mode),
    contractCollectionSortKey(rowsB, mode),
  )
}
