import type { TourLocale } from './types'

export interface TourUiLabels {
  next: string
  back: string
  skip: string
  finish: string
  startTour: string
  stepOf: (current: number, total: number) => string
}

const labels: Record<TourLocale, TourUiLabels> = {
  ar: {
    next: 'التالي',
    back: 'السابق',
    skip: 'تخطي',
    finish: 'إنهاء',
    startTour: 'ابدأ الجولة',
    stepOf: (current, total) => `الخطوة ${current} من ${total}`,
  },
  en: {
    next: 'Next',
    back: 'Back',
    skip: 'Skip',
    finish: 'Finish',
    startTour: 'Start Tour',
    stepOf: (current, total) => `Step ${current} of ${total}`,
  },
}

export function getTourLabels(locale: TourLocale): TourUiLabels {
  return labels[locale]
}

export function resolveTourLocale(defaultLocale?: string | null): TourLocale {
  return defaultLocale === 'en' ? 'en' : 'ar'
}
