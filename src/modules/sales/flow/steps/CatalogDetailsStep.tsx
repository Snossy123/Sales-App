import type { PosFlowDraft } from '../posFlowTypes'
import { AccessoryDetailsStep } from './AccessoryDetailsStep'
import { ServiceDetailsStep } from './ServiceDetailsStep'

interface CatalogDetailsStepProps {
  draft: PosFlowDraft
  onPatch: (partial: Partial<PosFlowDraft>) => void
  showErrors?: boolean
}

export function CatalogDetailsStep({
  draft,
  onPatch,
  showErrors = false,
}: CatalogDetailsStepProps) {
  return (
    <div className="space-y-md">
      <section className="space-y-md">
        <h2 className="text-lg font-extrabold text-on-surface">الخدمات</h2>
        <ServiceDetailsStep draft={draft} onPatch={onPatch} showErrors={showErrors} requireService={false} />
      </section>
      <section className="space-y-md border-t border-outline-variant/50 pt-md">
        <h2 className="text-lg font-extrabold text-on-surface">الإكسسوارات</h2>
        <AccessoryDetailsStep draft={draft} onPatch={onPatch} />
      </section>
    </div>
  )
}
