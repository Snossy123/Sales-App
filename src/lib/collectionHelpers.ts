export type ContractTierFilter = 'all' | 'overdue' | 'due_soon' | 'upcoming' | 'open_reconciliation'

export type FirstDueStatus = 'upcoming' | 'due' | 'overdue'

export const firstDueStatusLabels: Record<FirstDueStatus, string> = {
  upcoming: 'قادم',
  due: 'مستحق',
  overdue: 'متأخر',
}

export const firstDueStatusOptions = [
  { value: '', label: 'كل حالات القسط' },
  { value: 'upcoming', label: firstDueStatusLabels.upcoming },
  { value: 'due', label: firstDueStatusLabels.due },
  { value: 'overdue', label: firstDueStatusLabels.overdue },
] as const

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
  { value: 'due_soon', label: 'مستحقة' },
  { value: 'upcoming', label: 'قادمة' },
  { value: 'open_reconciliation', label: 'تصالح مفتوح' },
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
  payment_method?: string | null
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
  sim_number?: string
  invoice_number?: string
  branch_id?: number
  unpaid_reason?: string | null
  suspended_at?: string | null
  is_suspended?: boolean
  device_in_custody?: boolean
  collection_status?: string | null
  collection_reminder_at?: string | null
  collection_notes?: string | null
  collector_user_id?: number | null
  collector_name?: string | null
  has_open_reconciliation?: boolean
  open_reconciliation_id?: number | null
  reconciliation_enabled?: boolean
  waive_late_fee_on_close?: boolean
  administration_id?: number | null
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

export function rowTotalDue(row: InstallmentCollectionRow): number {
  return Number(
    row.total_due ??
      row.remaining ??
      Math.max(0, Number(row.amount) - Number(row.paid_amount ?? 0)),
  )
}

export type ExcessAllocationPreview = {
  installmentId: number
  sequence: number
  amount: number
  remainingAfter: number
}

export function previewExcessAllocation(
  selected: InstallmentCollectionRow,
  amount: number,
  contractRows: InstallmentCollectionRow[],
): ExcessAllocationPreview[] {
  const leftoverStart = Math.round(amount * 100) / 100
  const selectedSeq = selected.sequence ?? selected.installment_number ?? 0
  const following = contractRows
    .filter((row) => {
      if (row.id === selected.id) return false
      if (row.status === 'paid') return false
      if (row.is_suspended || row.suspended_at) return false
      if (Number(row.sales_invoice_id ?? 0) !== Number(selected.sales_invoice_id ?? 0)) return false
      const seq = row.sequence ?? row.installment_number ?? 0
      return seq > selectedSeq
    })
    .sort((a, b) => (a.sequence ?? a.installment_number ?? 0) - (b.sequence ?? b.installment_number ?? 0))

  const queue = [selected, ...following]
  let leftover = leftoverStart
  const preview: ExcessAllocationPreview[] = []

  for (const row of queue) {
    if (leftover <= 0.009) break
    const due = rowTotalDue(row)
    if (due <= 0.009) continue
    const slice = Math.min(leftover, due)
    leftover = Math.round((leftover - slice) * 100) / 100
    preview.push({
      installmentId: row.id,
      sequence: row.sequence ?? row.installment_number ?? 0,
      amount: Math.round(slice * 100) / 100,
      remainingAfter: Math.round((due - slice) * 100) / 100,
    })
  }

  return preview
}

function dateOnly(value: string | undefined): string {
  return String(value ?? '').slice(0, 10)
}

function localTodayDate(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** Calendar status of the next collectible installment (not the API display_tier). */
export function firstDueStatus(
  row: Pick<InstallmentCollectionRow, 'due_date' | 'display_tier' | 'status'>,
  today?: string,
): FirstDueStatus {
  const todayStr = dateOnly(today ?? localTodayDate())
  const due = dateOnly(row.due_date)
  const tier = row.display_tier ?? row.status

  if (tier === 'overdue') return 'overdue'
  if (due && due > todayStr) return 'upcoming'
  return 'due'
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

export function contractFilterTier(
  rows: InstallmentCollectionRow[],
  today?: string,
): 'overdue' | 'due_soon' | 'upcoming' {
  const unpaid = rows.filter((r) => r.status !== 'paid')
  if (unpaid.length > 0 && unpaid.every((r) => r.is_suspended || r.suspended_at)) {
    return 'upcoming'
  }

  const current = getCurrentInstallment(rows)
  if (!current) return 'upcoming'

  const dueStatus = firstDueStatus(current, today)
  if (dueStatus === 'overdue' || current.display_tier === 'overdue' || current.status === 'overdue') {
    return 'overdue'
  }
  if (dueStatus === 'due' || current.display_tier === 'grace') {
    return 'due_soon'
  }
  return 'upcoming'
}

export function rowAllowsReconciliation(row: Pick<InstallmentCollectionRow, 'reconciliation_enabled'>): boolean {
  return row.reconciliation_enabled !== false
}

export function filterRowsByContractTier(
  rows: InstallmentCollectionRow[],
  tier: ContractTierFilter,
  today?: string,
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
    const contractTier = contractFilterTier(invoiceRows, today)
    if (tier === 'overdue' && contractTier === 'overdue') {
      matchingInvoiceIds.add(invoiceId)
    }
    if (tier === 'due_soon' && contractTier === 'due_soon') {
      matchingInvoiceIds.add(invoiceId)
    }
    if (tier === 'upcoming' && contractTier === 'upcoming') {
      matchingInvoiceIds.add(invoiceId)
    }
    if (tier === 'open_reconciliation' && invoiceRows.some((row) => row.has_open_reconciliation)) {
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
    String(row.sim_number ?? ''),
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

export function buildCollectionFollowUpPayload(input: {
  collectionStatus: string
  collectionReminderAt: string
  collectionNotes: string
}): {
  collection_status?: string | null
  collection_reminder_at?: string | null
  collection_notes?: string | null
} {
  const payload: {
    collection_status?: string | null
    collection_reminder_at?: string | null
    collection_notes?: string | null
  } = {}

  if (input.collectionStatus) {
    payload.collection_status = input.collectionStatus
  }
  if (input.collectionReminderAt) {
    payload.collection_reminder_at = input.collectionReminderAt
  }
  if (input.collectionNotes.trim()) {
    payload.collection_notes = input.collectionNotes.trim()
  }

  return payload
}

export function hasCollectionFollowUpDraft(input: {
  collectionStatus: string
  collectionReminderAt: string
  collectionNotes: string
}): boolean {
  return Object.keys(buildCollectionFollowUpPayload(input)).length > 0
}

export function hasFutureCollectionReminder(
  rows: InstallmentCollectionRow[],
  now: number = Date.now(),
): boolean {
  return rows.some((row) => {
    if (!row.collection_reminder_at) return false
    const reminderAt = new Date(row.collection_reminder_at).getTime()
    return Number.isFinite(reminderAt) && reminderAt > now
  })
}

export function isFullySuspendedContract(rows: InstallmentCollectionRow[]): boolean {
  const unpaid = rows.filter((row) => row.status !== 'paid')
  return unpaid.length > 0 && unpaid.every((row) => Boolean(row.is_suspended || row.suspended_at))
}

export function isParkedFollowUpContract(
  rows: InstallmentCollectionRow[],
  now: number = Date.now(),
): boolean {
  return hasFutureCollectionReminder(rows, now) || isFullySuspendedContract(rows)
}

function invoiceIdsMatching(
  rows: InstallmentCollectionRow[],
  predicate: (invoiceRows: InstallmentCollectionRow[]) => boolean,
): Set<number> {
  const byInvoice = new Map<number, InstallmentCollectionRow[]>()
  for (const row of rows) {
    const invoiceId = Number(row.sales_invoice_id ?? 0)
    const list = byInvoice.get(invoiceId) ?? []
    list.push(row)
    byInvoice.set(invoiceId, list)
  }

  const matching = new Set<number>()
  for (const [invoiceId, invoiceRows] of byInvoice) {
    if (predicate(invoiceRows)) matching.add(invoiceId)
  }
  return matching
}

export function filterRowsWithoutFutureReminder(
  rows: InstallmentCollectionRow[],
  now: number = Date.now(),
): InstallmentCollectionRow[] {
  return filterRowsWithoutParkedFollowUp(rows, now)
}

export function filterRowsWithFutureReminder(
  rows: InstallmentCollectionRow[],
  now: number = Date.now(),
): InstallmentCollectionRow[] {
  return filterRowsWithParkedFollowUp(rows, now)
}

export function filterRowsWithoutParkedFollowUp(
  rows: InstallmentCollectionRow[],
  now: number = Date.now(),
): InstallmentCollectionRow[] {
  const hiddenInvoiceIds = invoiceIdsMatching(rows, (invoiceRows) => isParkedFollowUpContract(invoiceRows, now))
  return rows.filter((row) => !hiddenInvoiceIds.has(Number(row.sales_invoice_id ?? 0)))
}

export function filterRowsWithParkedFollowUp(
  rows: InstallmentCollectionRow[],
  now: number = Date.now(),
): InstallmentCollectionRow[] {
  const hiddenInvoiceIds = invoiceIdsMatching(rows, (invoiceRows) => isParkedFollowUpContract(invoiceRows, now))
  return rows.filter((row) => hiddenInvoiceIds.has(Number(row.sales_invoice_id ?? 0)))
}

export interface ContractCollectionStats {
  total_contracts: number
  overdue_contracts: number
  due_soon_contracts: number
  upcoming_contracts: number
}

export function computeContractStats(
  rows: InstallmentCollectionRow[],
  now: number = Date.now(),
  today?: string,
): ContractCollectionStats {
  const byInvoice = new Map<number, InstallmentCollectionRow[]>()
  for (const row of rows.filter((r) => r.status !== 'paid')) {
    const invoiceId = Number(row.sales_invoice_id ?? 0)
    const list = byInvoice.get(invoiceId) ?? []
    list.push(row)
    byInvoice.set(invoiceId, list)
  }

  let overdue = 0
  let dueSoon = 0
  let upcoming = 0

  for (const invoiceRows of byInvoice.values()) {
    if (isParkedFollowUpContract(invoiceRows, now)) {
      upcoming++
      continue
    }

    const tier = contractFilterTier(invoiceRows, today)
    if (tier === 'overdue') overdue++
    else if (tier === 'due_soon') dueSoon++
    else upcoming++
  }

  return {
    total_contracts: overdue + dueSoon + upcoming,
    overdue_contracts: overdue,
    due_soon_contracts: dueSoon,
    upcoming_contracts: upcoming,
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
