import type { CallStatementForm, CallStatementNextAction, CallStatementOutcome, CallStatementPriority } from '../../../api/types'
import { formatDatetime12hDisplay } from '../../../lib/datetime12h'
import { isoToDatetimeLocal } from './contactPhones'

export const CALL_OUTCOME_OPTIONS: { value: CallStatementOutcome; label: string }[] = [
  { value: 'interested', label: 'مهتم' },
  { value: 'not_interested', label: 'مش مهتم' },
  { value: 'unavailable', label: 'مش متاح' },
  { value: 'callback_requested', label: 'يطلب معاودة' },
]

export const CALL_NEXT_ACTION_OPTIONS: { value: CallStatementNextAction; label: string }[] = [
  { value: 'callback', label: 'معاودة اتصال' },
  { value: 'schedule_visit', label: 'جدولة زيارة' },
  { value: 'prepare_quote', label: 'تجهيز عرض' },
  { value: 'follow_install', label: 'متابعة تركيب' },
  { value: 'collection', label: 'تحصيل' },
  { value: 'other', label: 'أخرى' },
]

export const CALL_PRIORITY_OPTIONS: { value: CallStatementPriority; label: string }[] = [
  { value: 'medium', label: 'عادي' },
  { value: 'high', label: 'مستعجل' },
]

export const emptyStatementForm = (): CallStatementForm => ({
  outcome: null,
  next_action: null,
  follow_up_date: null,
  notes: '',
  priority: 'medium',
})

export function normalizeStatementForm(form?: CallStatementForm | null): CallStatementForm {
  return {
    outcome: form?.outcome ?? null,
    next_action: form?.next_action ?? null,
    follow_up_date: form?.follow_up_date ? isoToDatetimeLocal(form.follow_up_date) : null,
    notes: form?.notes ?? '',
    priority: form?.priority ?? 'medium',
  }
}

export function statementFormLabel(form?: CallStatementForm | null): string {
  if (!form) return '—'
  const parts: string[] = []
  const outcome = CALL_OUTCOME_OPTIONS.find((o) => o.value === form.outcome)?.label
  const action = CALL_NEXT_ACTION_OPTIONS.find((o) => o.value === form.next_action)?.label
  const priority = CALL_PRIORITY_OPTIONS.find((o) => o.value === form.priority)?.label
  if (outcome) parts.push(outcome)
  if (action) parts.push(action)
  if (form.follow_up_date) {
    parts.push(formatDatetime12hDisplay(form.follow_up_date))
  }
  if (priority) parts.push(priority)
  return parts.length ? parts.join(' · ') : '—'
}

export function canCreateTaskFromStatement(form?: CallStatementForm | null): boolean {
  return Boolean(form?.next_action)
}

export function previewTaskTitle(form: CallStatementForm, contactLabel: string): string {
  const action =
    CALL_NEXT_ACTION_OPTIONS.find((o) => o.value === form.next_action)?.label ?? 'متابعة مكالمة'
  const contact = contactLabel.trim()
  return contact ? `${action} — ${contact}` : action
}
