type BadgeVariant = 'paid' | 'pending' | 'overdue' | 'active' | 'blocked' | 'default'

const variantStyles: Record<BadgeVariant, string> = {
  paid: 'bg-secondary/10 text-secondary',
  pending: 'bg-[#ef9900]/10 text-[#653e00]',
  overdue: 'bg-error/10 text-error',
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
  confirmed: 'مؤكدة',
  pending_review: 'بانتظار المراجعة',
  rejected: 'مرفوضة',
  active: 'نشط',
  available: 'متاح',
  cash: 'نقدي',
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
  pending_review: 'pending',
  unpaid: 'pending',
  negotiation: 'pending',
  new: 'pending',
  contacted: 'pending',
  overdue: 'overdue',
  grace: 'pending',
  upcoming: 'default',
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
