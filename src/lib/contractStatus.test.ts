import { describe, expect, it } from 'vitest'
import {
  contractCaseStatusLabels,
  contractCaseTypeLabels,
  contractStatusLabel,
  contractStatusLabels,
} from './contractStatus'

describe('contractStatus', () => {
  it('maps known contract statuses to Arabic labels', () => {
    expect(contractStatusLabel('active')).toBe('نشط')
    expect(contractStatusLabel('in_problem')).toBe('في مشكلة')
    expect(contractStatusLabel('returned')).toBe('مسترجع')
    expect(contractStatusLabel('exchanged')).toBe('مستبدل')
    expect(contractStatusLabel('cancelled')).toBe('ملغى')
    expect(contractStatusLabels.cancelled).toBe('ملغى')
  })

  it('defaults missing status to active and passes unknown values through', () => {
    expect(contractStatusLabel(null)).toBe('نشط')
    expect(contractStatusLabel(undefined)).toBe('نشط')
    expect(contractStatusLabel('archived')).toBe('archived')
  })

  it('labels contract case types and statuses', () => {
    expect(contractCaseTypeLabels.support).toBe('دعم فني')
    expect(contractCaseTypeLabels.return).toBe('استرجاع')
    expect(contractCaseTypeLabels.exchange).toBe('استبدال')
    expect(contractCaseTypeLabels.cancel).toBe('إلغاء تعاقد')
    expect(contractCaseStatusLabels.open).toBe('مفتوحة')
    expect(contractCaseStatusLabels.in_progress).toBe('قيد المعالجة')
    expect(contractCaseStatusLabels.completed).toBe('مكتملة')
    expect(contractCaseStatusLabels.cancelled).toBe('ملغاة')
  })
})
