import type { OwnershipTransferStatus } from '../api/types'

export function ownershipTransferStatusLabel(
  status: OwnershipTransferStatus | string | null | undefined,
): string {
  if (status === 'pending_installation') {
    return 'بانتظار التركيب'
  }
  if (status === 'completed') {
    return 'تم النقل'
  }
  return '—'
}
