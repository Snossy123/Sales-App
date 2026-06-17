import type { ServiceCategory } from '../api/types'

export const SERVICE_CATEGORIES: { value: ServiceCategory; label: string }[] = [
  { value: 'maintenance', label: 'صيانة' },
  { value: 'software', label: 'سوفت وير' },
  { value: 'subscription', label: 'تجديد اشتراك' },
  { value: 'installation', label: 'تركيب وفك' },
  { value: 'transfer', label: 'نقل' },
  { value: 'other', label: 'أخرى' },
]

const CATEGORY_LABELS: Record<ServiceCategory, string> = SERVICE_CATEGORIES.reduce(
  (acc, item) => ({ ...acc, [item.value]: item.label }),
  {} as Record<ServiceCategory, string>,
)

export function serviceCategoryLabel(category: ServiceCategory | string): string {
  return CATEGORY_LABELS[category as ServiceCategory] ?? category
}
