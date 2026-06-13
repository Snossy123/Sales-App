import type { Branch, DailyBranchReport } from '../api/types'

export const TRANSACTION_ROW_COUNT = 34
export const EXPENSE_LINE_COUNT = 10
export const MOVEMENT_LINE_COUNT = 4
export const ATTENDANCE_ROW_COUNT = 8

export interface DailyReportTransactionRow {
  customer_name: string
  transaction_type: string
  amount: number | ''
}

export interface DailyReportTransferRow {
  customer_name: string
  amount: number | ''
  reference: string
}

export interface DailyReportAttendanceRow {
  employee_name: string
  check_in: string
  check_out: string
}

export interface DailyReportExpenseRow {
  description: string
  amount: number | ''
}

export interface DailyReportMovementRow {
  description: string
}

export interface DailyBranchReportFormState {
  report_date: string
  total_amount: number
  expenses_total: number
  net_amount: number
  installations_count: number | ''
  devices_actual: number | ''
  devices_reserved: number | ''
  devices_customer: number | ''
  devices_software: number | ''
  accessories_tape: number | ''
  accessories_cable_ties: number | ''
  accessories_bulb: number | ''
  percentage: string
  devices_entering_count: number | ''
  notes: string
  vodafone_transfers_count: number
  vodafone_transfers_total: number
  vodafone_other_notes: string
  renewal_notes: string
  reviewer_name: string
  branch_manager_name: string
  attendance: DailyReportAttendanceRow[]
  transactions: DailyReportTransactionRow[]
  transfers: DailyReportTransferRow[]
  expense_lines: DailyReportExpenseRow[]
  movements: DailyReportMovementRow[]
}

const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export function arabicDayName(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`)
  return AR_DAYS[date.getDay()] ?? ''
}

export function formatReportHeaderDate(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`)
  const day = date.getDate()
  const month = date.getMonth() + 1
  const year = date.getFullYear()
  return `${day} / ${month} / ${year}`
}

export function formatReportHeaderDateLong(dateStr: string): string {
  return `${arabicDayName(dateStr)} يوم ${formatReportHeaderDate(dateStr)}م`
}

function emptyTransactionRows(): DailyReportTransactionRow[] {
  return Array.from({ length: TRANSACTION_ROW_COUNT }, () => ({
    customer_name: '',
    transaction_type: '',
    amount: '',
  }))
}

function emptyAttendanceRows(): DailyReportAttendanceRow[] {
  return Array.from({ length: ATTENDANCE_ROW_COUNT }, () => ({
    employee_name: '',
    check_in: '',
    check_out: '',
  }))
}

function emptyExpenseRows(): DailyReportExpenseRow[] {
  return Array.from({ length: EXPENSE_LINE_COUNT }, () => ({
    description: '',
    amount: '',
  }))
}

function emptyMovementRows(): DailyReportMovementRow[] {
  return Array.from({ length: MOVEMENT_LINE_COUNT }, () => ({ description: '' }))
}

export function createEmptyDailyReportForm(date = new Date().toISOString().split('T')[0]): DailyBranchReportFormState {
  return {
    report_date: date,
    total_amount: 0,
    expenses_total: 0,
    net_amount: 0,
    installations_count: '',
    devices_actual: '',
    devices_reserved: '',
    devices_customer: '',
    devices_software: '',
    accessories_tape: '',
    accessories_cable_ties: '',
    accessories_bulb: '',
    percentage: '',
    devices_entering_count: '',
    notes: '',
    vodafone_transfers_count: 0,
    vodafone_transfers_total: 0,
    vodafone_other_notes: '',
    renewal_notes: '',
    reviewer_name: '',
    branch_manager_name: '',
    attendance: emptyAttendanceRows(),
    transactions: emptyTransactionRows(),
    transfers: [{ customer_name: '', amount: '', reference: '' }],
    expense_lines: emptyExpenseRows(),
    movements: emptyMovementRows(),
  }
}

export function sumTransactionAmounts(rows: DailyReportTransactionRow[]): number {
  return rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
}

export function sumTransferAmounts(rows: DailyReportTransferRow[]): number {
  return rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
}

export function sumExpenseLines(rows: DailyReportExpenseRow[]): number {
  return rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
}

export function recalcDailyReportTotals(form: DailyBranchReportFormState): DailyBranchReportFormState {
  const total = sumTransactionAmounts(form.transactions)
  const expenses = sumExpenseLines(form.expense_lines)
  const transfersTotal = sumTransferAmounts(form.transfers)
  const transfersCount = form.transfers.filter(
    (row) => row.customer_name.trim() || Number(row.amount) > 0,
  ).length

  return {
    ...form,
    total_amount: total,
    expenses_total: expenses,
    net_amount: Math.max(0, total - expenses),
    vodafone_transfers_total: transfersTotal,
    vodafone_transfers_count: transfersCount,
  }
}

export function formToPayload(form: DailyBranchReportFormState, branchId: number) {
  const normalized = recalcDailyReportTotals(form)

  const num = (value: number | '') => (value === '' ? 0 : Number(value))

  return {
    branch_id: branchId,
    report_date: normalized.report_date,
    total_amount: normalized.total_amount,
    expenses_total: normalized.expenses_total,
    net_amount: normalized.net_amount,
    installations_count: num(normalized.installations_count),
    devices_actual: num(normalized.devices_actual),
    devices_reserved: num(normalized.devices_reserved),
    devices_customer: num(normalized.devices_customer),
    devices_software: num(normalized.devices_software),
    accessories_tape: num(normalized.accessories_tape),
    accessories_cable_ties: num(normalized.accessories_cable_ties),
    accessories_bulb: num(normalized.accessories_bulb),
    percentage: normalized.percentage || null,
    devices_entering_count:
      normalized.devices_entering_count === '' ? null : num(normalized.devices_entering_count),
    notes: normalized.notes || null,
    vodafone_transfers_count: normalized.vodafone_transfers_count,
    vodafone_transfers_total: normalized.vodafone_transfers_total,
    vodafone_other_notes: normalized.vodafone_other_notes || null,
    renewal_notes: normalized.renewal_notes || null,
    reviewer_name: normalized.reviewer_name || null,
    branch_manager_name: normalized.branch_manager_name || null,
    attendance: normalized.attendance.filter((row) => row.employee_name.trim()),
    transactions: normalized.transactions.filter(
      (row) => row.customer_name.trim() || row.transaction_type.trim() || Number(row.amount) > 0,
    ),
    transfers: normalized.transfers.filter(
      (row) => row.customer_name.trim() || Number(row.amount) > 0 || row.reference.trim(),
    ),
    expense_lines: normalized.expense_lines.filter(
      (row) => row.description.trim() || Number(row.amount) > 0,
    ),
    movements: normalized.movements.filter((row) => row.description.trim()),
  }
}

export function reportToForm(report: DailyBranchReport): DailyBranchReportFormState {
  const base = createEmptyDailyReportForm(report.report_date)

  const fillTransactions = [...(report.transactions ?? [])]
  while (fillTransactions.length < TRANSACTION_ROW_COUNT) {
    fillTransactions.push({ customer_name: '', transaction_type: '', amount: 0 })
  }

  const fillAttendance = [...(report.attendance ?? [])]
  while (fillAttendance.length < ATTENDANCE_ROW_COUNT) {
    fillAttendance.push({ employee_name: '', check_in: '', check_out: '' })
  }

  const fillExpenses = [...(report.expense_lines ?? [])]
  while (fillExpenses.length < EXPENSE_LINE_COUNT) {
    fillExpenses.push({ description: '', amount: 0 })
  }

  const fillMovements = [...(report.movements ?? [])]
  while (fillMovements.length < MOVEMENT_LINE_COUNT) {
    fillMovements.push({ description: '' })
  }

  return recalcDailyReportTotals({
    ...base,
    total_amount: Number(report.total_amount),
    expenses_total: Number(report.expenses_total),
    net_amount: Number(report.net_amount),
    installations_count: report.installations_count ?? '',
    devices_actual: report.devices_actual ?? '',
    devices_reserved: report.devices_reserved ?? '',
    devices_customer: report.devices_customer ?? '',
    devices_software: report.devices_software ?? '',
    accessories_tape: report.accessories_tape ?? '',
    accessories_cable_ties: report.accessories_cable_ties ?? '',
    accessories_bulb: report.accessories_bulb ?? '',
    percentage: report.percentage ?? '',
    devices_entering_count: report.devices_entering_count ?? '',
    notes: report.notes ?? '',
    vodafone_transfers_count: report.vodafone_transfers_count ?? 0,
    vodafone_transfers_total: Number(report.vodafone_transfers_total ?? 0),
    vodafone_other_notes: report.vodafone_other_notes ?? '',
    renewal_notes: report.renewal_notes ?? '',
    reviewer_name: report.reviewer_name ?? '',
    branch_manager_name: report.branch_manager_name ?? '',
    attendance: fillAttendance.slice(0, ATTENDANCE_ROW_COUNT),
    transactions: fillTransactions.slice(0, TRANSACTION_ROW_COUNT).map((row) => ({
      customer_name: row.customer_name ?? '',
      transaction_type: row.transaction_type ?? '',
      amount: row.amount === 0 || row.amount ? Number(row.amount) : '',
    })),
    transfers:
      report.transfers && report.transfers.length > 0
        ? report.transfers.map((row) => ({
            customer_name: row.customer_name ?? '',
            amount: row.amount ? Number(row.amount) : '',
            reference: row.reference ?? '',
          }))
        : [{ customer_name: '', amount: '', reference: '' }],
    expense_lines: fillExpenses.slice(0, EXPENSE_LINE_COUNT).map((row) => ({
      description: row.description ?? '',
      amount: row.amount ? Number(row.amount) : '',
    })),
    movements: fillMovements.slice(0, MOVEMENT_LINE_COUNT).map((row) => ({
      description: row.description ?? '',
    })),
  })
}

export function branchDisplayName(branch?: Branch | null): string {
  return branch?.name_ar || branch?.name || '—'
}

export function dailyReportPrintPath(id: number, autoPrint = false): string {
  return `/daily-reports/${id}/print${autoPrint ? '?print=1' : ''}`
}

export const transactionTypeSuggestions = [
  'قسط',
  '5 اقساط',
  'تركيب جديد',
  'سوفت+تركيب+تجديد اشتراك',
  'تجديد',
  'اكسسوار',
  'صيانة',
]
