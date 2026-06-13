import { useCallback, useEffect, useRef } from 'react'
import Shepherd from 'shepherd.js'
import type { Tour } from 'shepherd.js'
import { getTourLabels, resolveTourLocale } from '../tours/labels'
import { getTourConfig } from '../tours/registry'
import { resolveTourSteps } from '../tours/resolveSteps'
import type { TourId, TourLocale } from '../tours/types'
import { waitForElement } from '../tours/waitForElement'
import { useAuthStore } from '../stores/authStore'
import { useOrgSettingsStore } from '../stores/orgSettingsStore'
import { useTourStore } from '../stores/tourStore'

type StartTourOptions = {
  force?: boolean
}

let activeTour: Tour | null = null

function cancelActiveTour() {
  if (activeTour?.isActive()) {
    activeTour.cancel()
  }
  activeTour = null
}

async function buildShepherdTour(
  tourId: TourId,
  locale: TourLocale,
  onComplete: () => void,
): Promise<Tour | null> {
  const config = getTourConfig(tourId)
  const user = useAuthStore.getState().user
  if (!config || !user) return null

  const resolvedSteps = resolveTourSteps(config.steps, user, locale)

  const stepsWithElements = []
  for (const step of resolvedSteps) {
    const el = await waitForElement(step.target, 800)
    if (el) stepsWithElements.push(step)
  }

  if (stepsWithElements.length === 0) return null

  const labels = getTourLabels(locale)
  const isRtl = locale === 'ar'

  const tour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
      scrollTo: { behavior: 'smooth', block: 'center' },
      modalOverlayOpeningPadding: 8,
      modalOverlayOpeningRadius: 8,
      classes: isRtl ? 'tour-rtl' : 'tour-ltr',
    },
  })

  for (let index = 0; index < stepsWithElements.length; index++) {
    const step = stepsWithElements[index]
    const isFirst = index === 0
    const isLast = index === stepsWithElements.length - 1
    const stepNumber = index + 1

    tour.addStep({
      id: step.id,
      title: step.title,
      text: `<p>${step.content}</p><span class="shepherd-step-counter">${labels.stepOf(stepNumber, stepsWithElements.length)}</span>`,
      attachTo: {
        element: step.target,
        on: step.placement === 'auto' ? 'bottom' : step.placement,
      },
      beforeShowPromise: () =>
        waitForElement(step.target).then((el) => {
          if (!el) {
            console.warn(`[tour] Target not found: ${step.target}`)
          }
        }),
      buttons: [
        ...(isFirst
          ? []
          : [
              {
                text: labels.back,
                classes: 'shepherd-button shepherd-button-secondary',
                action: () => tour.back(),
              },
            ]),
        {
          text: labels.skip,
          classes: 'shepherd-button shepherd-button-ghost',
          action: () => {
            tour.cancel()
            onComplete()
          },
        },
        {
          text: isLast ? labels.finish : labels.next,
          classes: 'shepherd-button shepherd-button-primary',
          action: () => {
            if (isLast) {
              tour.complete()
              onComplete()
            } else {
              tour.next()
            }
          },
        },
      ],
    })
  }

  return tour
}

export async function runTour(tourId: TourId, onComplete: () => void): Promise<boolean> {
  cancelActiveTour()

  const general = useOrgSettingsStore.getState().general
  const locale = resolveTourLocale(general?.default_locale)

  const tour = await buildShepherdTour(tourId, locale, onComplete)
  if (!tour) return false

  activeTour = tour
  tour.on('cancel', () => {
    activeTour = null
  })
  tour.on('complete', () => {
    activeTour = null
  })

  tour.start()
  return true
}

export function useTourRunner() {
  const user = useAuthStore((s) => s.user)
  const markComplete = useTourStore((s) => s.markComplete)

  const startTour = useCallback(
    async (tourId: TourId, options?: StartTourOptions) => {
      const isCompleted = useTourStore.getState().isCompleted(tourId)
      if (isCompleted && !options?.force) return false

      return runTour(tourId, () => {
        void markComplete(tourId, user)
      })
    },
    [markComplete, user],
  )

  return { startTour }
}

export function useTourBootstrap() {
  const user = useAuthStore((s) => s.user)
  const hydrateFromUser = useTourStore((s) => s.hydrateFromUser)

  useEffect(() => {
    hydrateFromUser(user)
  }, [user, hydrateFromUser])
}

export function usePageTour(tourId: TourId) {
  const user = useAuthStore((s) => s.user)
  const isCompleted = useTourStore((s) => s.isCompleted(tourId))
  const autoStartedRef = useRef(false)
  const { startTour } = useTourRunner()

  useEffect(() => {
    if (!user || isCompleted || autoStartedRef.current) return

    autoStartedRef.current = true
    const timer = window.setTimeout(() => {
      void startTour(tourId)
    }, 600)

    return () => window.clearTimeout(timer)
  }, [user, isCompleted, startTour, tourId])

  return {
    startTour: (options?: StartTourOptions) => startTour(tourId, options),
    isCompleted,
    tourId,
  }
}
