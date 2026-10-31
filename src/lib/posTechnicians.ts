import type { Employee } from '../api/types'

export function isEligibleTechnician(employee: Pick<Employee, 'job_title' | 'department'>): boolean {
  const title = employee.job_title ?? ''
  const department = `${employee.department?.name_ar ?? ''} ${employee.department?.name ?? ''}`
  return title.includes('فني') || department.includes('دعم') || /support/i.test(department)
}

export function eligibleTechnicians<T extends Pick<Employee, 'job_title' | 'department'>>(
  employees: T[],
): T[] {
  return employees.filter(isEligibleTechnician)
}
