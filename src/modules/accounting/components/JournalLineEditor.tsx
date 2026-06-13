import type { AccountingAccount } from '../../../api/types'
import { formatMoney } from '../../../lib/accounting'

export type JournalLineForm = {
  accounting_account_id: number | ''
  amount: string
  type: 'debit' | 'credit'
  note: string
}

export const emptyJournalLine = (): JournalLineForm => ({
  accounting_account_id: '',
  amount: '',
  type: 'debit',
  note: '',
})

export function sumJournalLines(lines: JournalLineForm[], type: 'debit' | 'credit'): number {
  return lines
    .filter((l) => l.type === type)
    .reduce((sum, l) => sum + (Number(l.amount) || 0), 0)
}

export function isJournalBalanced(lines: JournalLineForm[]): boolean {
  const debits = sumJournalLines(lines, 'debit')
  const credits = sumJournalLines(lines, 'credit')
  return debits > 0 && Math.abs(debits - credits) < 0.0001
}

type AccountOption = Pick<AccountingAccount, 'id' | 'name' | 'gl_code' | 'account_primary_type'>

interface JournalLineEditorProps {
  lines: JournalLineForm[]
  accounts: AccountOption[]
  onChange: (lines: JournalLineForm[]) => void
}

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

export function JournalLineEditor({ lines, accounts, onChange }: JournalLineEditorProps) {
  const debits = sumJournalLines(lines, 'debit')
  const credits = sumJournalLines(lines, 'credit')
  const balanced = isJournalBalanced(lines)

  const updateLine = (index: number, patch: Partial<JournalLineForm>) => {
    onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  }

  const removeLine = (index: number) => {
    if (lines.length <= 2) return
    onChange(lines.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-sm">
      {lines.map((line, index) => (
        <div key={index} className="grid gap-xs rounded-lg border border-outline-variant/60 p-sm sm:grid-cols-12">
          <select
            value={line.accounting_account_id}
            onChange={(e) =>
              updateLine(index, { accounting_account_id: e.target.value ? Number(e.target.value) : '' })
            }
            required
            className={`${inputClass} sm:col-span-5`}
          >
            <option value="">اختر الحساب</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.gl_code ? `${account.gl_code} — ` : ''}
                {account.name}
              </option>
            ))}
          </select>
          <select
            value={line.type}
            onChange={(e) => updateLine(index, { type: e.target.value as 'debit' | 'credit' })}
            className={`${inputClass} sm:col-span-2`}
          >
            <option value="debit">مدين</option>
            <option value="credit">دائن</option>
          </select>
          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="المبلغ"
            value={line.amount}
            onChange={(e) => updateLine(index, { amount: e.target.value })}
            required
            className={`${inputClass} sm:col-span-2 tabular-nums`}
            dir="ltr"
          />
          <input
            type="text"
            placeholder="ملاحظة"
            value={line.note}
            onChange={(e) => updateLine(index, { note: e.target.value })}
            className={`${inputClass} sm:col-span-2`}
          />
          <button
            type="button"
            onClick={() => removeLine(index)}
            disabled={lines.length <= 2}
            className="rounded-lg border border-outline-variant px-sm py-2 text-xs text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40 sm:col-span-1"
          >
            حذف
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...lines, emptyJournalLine()])}
        className="rounded-lg border border-dashed border-outline-variant px-md py-xs text-sm text-on-surface-variant hover:bg-surface-container-low"
      >
        + إضافة بند
      </button>

      <div
        className={`rounded-lg px-sm py-xs text-sm ${
          balanced ? 'bg-secondary/10 text-secondary' : 'bg-error-container/30 text-error'
        }`}
      >
        المدين: {formatMoney(debits)} · الدائن: {formatMoney(credits)}
        {!balanced && debits + credits > 0 && ' — القيد غير متوازن'}
      </div>
    </div>
  )
}
