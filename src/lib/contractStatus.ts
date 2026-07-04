export const contractStatusLabels: Record<string, string> = {
  active: 'نشط',
  in_problem: 'في مشكلة',
  returned: 'مسترجع',
  exchanged: 'مستبدل',
  cancelled: 'ملغى',
}

export const contractCaseTypeLabels: Record<string, string> = {
  support: 'دعم فني',
  return: 'استرجاع',
  exchange: 'استبدال',
}

export const contractCaseStatusLabels: Record<string, string> = {
  open: 'مفتوحة',
  in_progress: 'قيد المعالجة',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
}

export function contractStatusLabel(status?: string | null): string {
  if (!status) return 'نشط'
  return contractStatusLabels[status] ?? status
}
