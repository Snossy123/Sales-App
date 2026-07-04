type BadgeVariant = 'paid' | 'pending' | 'overdue' | 'grace' | 'active' | 'blocked' | 'default'

const variantStyles: Record<BadgeVariant, string> = {
  paid: 'bg-secondary/10 text-secondary',
  pending: 'bg-[#ef9900]/10 text-[#653e00]',
  overdue: 'bg-red-100 text-red-800',
  grace: 'bg-yellow-100 text-yellow-900',
  active: 'bg-secondary/10 text-secondary',
  blocked: 'bg-error/10 text-error',
  default: 'bg-surface-container text-on-surface-variant',
}

const statusLabels: Record<string, string> = {
  paid: 'مدفوع',
  partial: 'جزئي',
  unpaid: 'غير مدفوع',
  pending: 'معلق',
  upcoming: 'قادم',
  grace: 'فترة سماح',
  overdue: 'متأخر',
  due_soon: 'مستحق قريباً',
  confirmed: 'مؤكدة',
  pending_review: 'بانتظار المراجعة',
  review_approved: 'تمت المراجعة',
  rejected: 'مرفوضة',
  active: 'نشط',
  available: 'متاح',
  cash: 'كاش',
  installment: 'تقسيط',
}

const statusMap: Record<string, BadgeVariant> = {
  paid: 'paid',
  completed: 'paid',
  confirmed: 'paid',
  active: 'active',
  available: 'active',
  pending: 'pending',
  partial: 'pending',
  pending_review: 'overdue',
  review_approved: 'paid',
  unpaid: 'pending',
  negotiation: 'pending',
  new: 'pending',
  contacted: 'pending',
  overdue: 'overdue',
  grace: 'grace',
  upcoming: 'default',
  due_soon: 'pending',
  rejected: 'overdue',
  blocked: 'blocked',
  inactive: 'blocked',
  sold: 'default',
  won: 'paid',
  lost: 'overdue',
}

interface StatusBadgeProps {
  status: string
  label?: string
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const key = status?.toLowerCase() ?? ''
  const variant = statusMap[key] ?? 'default'

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantStyles[variant]}`}
    >
      {label ?? statusLabels[key] ?? status}
    </span>
  )
}
