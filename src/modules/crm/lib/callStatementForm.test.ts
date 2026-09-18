import { describe, expect, it } from 'vitest'
import {
  canCreateTaskFromStatement,
  previewTaskTitle,
  statementFormLabel,
} from './callStatementForm'
import type { CallStatementForm } from '../../../api/types'

const form = (overrides: Partial<CallStatementForm> = {}): CallStatementForm => ({
  outcome: null,
  next_action: null,
  follow_up_date: null,
  notes: '',
  priority: 'medium',
  ...overrides,
})

describe('callStatementForm', () => {
  it('allows creating a task only when a next action is set', () => {
    expect(canCreateTaskFromStatement(undefined)).toBe(false)
    expect(canCreateTaskFromStatement(form())).toBe(false)
    expect(canCreateTaskFromStatement(form({ next_action: 'callback' }))).toBe(true)
  })

  it('builds a task title from the next action and contact', () => {
    expect(previewTaskTitle(form({ next_action: 'callback' }), 'سارة')).toBe(
      'معاودة اتصال — سارة',
    )
    expect(previewTaskTitle(form({ next_action: 'callback' }), '  ')).toBe('معاودة اتصال')
    expect(previewTaskTitle(form(), '')).toBe('متابعة مكالمة')
  })

  it('summarizes statement labels in Arabic', () => {
    expect(statementFormLabel(undefined)).toBe('—')
    expect(
      statementFormLabel(
        form({ outcome: 'interested', next_action: 'callback', priority: 'high' }),
      ),
    ).toBe('مهتم · معاودة اتصال · مستعجل')
  })
})
