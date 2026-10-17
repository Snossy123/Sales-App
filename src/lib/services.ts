import type { ServiceCategory } from '../api/types'

export const SERVICE_CATEGORIES: { value: ServiceCategory; label: string }[] = [
  { value: 'maintenance', label: 'صيانة' },
  { value: 'software', label: 'سوفت وير' },
  { value: 'subscription', label: 'تجديد اشتراك' },
  { value: 'installation', label: 'تركيب' },
  { value: 'uninstall', label: 'فك' },
  { value: 'transfer', label: 'نقل' },
  { value: 'site_transfer', label: 'نقل على الموقع' },
  { value: 'ownership_transfer', label: 'نقل ملكية' },
  { value: 'programming', label: 'برمجة' },
  { value: 'reset_password', label: 'Reset Password' },
  { value: 'other', label: 'أخرى' },
]

const CATEGORY_LABELS: Record<string, string> = {
  ...SERVICE_CATEGORIES.reduce(
    (acc, item) => ({ ...acc, [item.value]: item.label }),
    {} as Record<string, string>,
  ),
  on_site_transfer: 'نقل على الموقع',
}

export function serviceCategoryLabel(category: ServiceCategory | string): string {
  return CATEGORY_LABELS[category] ?? category
}
