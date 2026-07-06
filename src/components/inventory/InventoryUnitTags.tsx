import { StatusBadge } from '../StatusBadge'
import { inventoryBucketLabel, productUnitStateLabel } from '../../lib/inventoryBuckets'

interface InventoryUnitTagsProps {
  state?: string | null
  inventoryBucket?: string | null
  className?: string
}

export function InventoryUnitTags({ state, inventoryBucket, className = '' }: InventoryUnitTagsProps) {
  const bucketLabel = inventoryBucketLabel(inventoryBucket)
  const stateLabel = productUnitStateLabel(state)

  if (!bucketLabel && !stateLabel) return null

  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
      {bucketLabel && <StatusBadge status={inventoryBucket ?? 'default'} label={bucketLabel} />}
      {stateLabel && <StatusBadge status={state ?? 'default'} label={stateLabel} />}
    </span>
  )
}
