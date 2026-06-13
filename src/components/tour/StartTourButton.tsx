import { Icon } from './Icon'
import { getTourLabels, resolveTourLocale } from '../tours/labels'
import type { TourId } from '../tours/types'
import { useOrgSettingsStore } from '../stores/orgSettingsStore'
import { useTourRunner } from '../hooks/usePageTour'

interface StartTourButtonProps {
  tourId: TourId
  className?: string
}

export function StartTourButton({ tourId, className = '' }: StartTourButtonProps) {
  const general = useOrgSettingsStore((s) => s.general)
  const locale = resolveTourLocale(general?.default_locale)
  const labels = getTourLabels(locale)
  const { startTour } = useTourRunner()

  return (
    <button
      type="button"
      data-tour-trigger={tourId}
      onClick={() => void startTour(tourId, { force: true })}
      className={`inline-flex items-center gap-xs rounded-lg border border-outline-variant bg-surface-container-low px-sm py-xs text-sm font-medium text-on-surface transition-colors hover:border-primary/40 hover:bg-primary/5 ${className}`}
    >
      <Icon name="tour" size={18} className="text-primary" />
      {labels.startTour}
    </button>
  )
}
