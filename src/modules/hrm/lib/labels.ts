import type { HrmLeaveType } from '../../../api/types'

export function hrmLeaveTypeLabel(lt?: HrmLeaveType | null): string {
  if (!lt) return '—'
  return lt.leave_type ?? '—'
}
