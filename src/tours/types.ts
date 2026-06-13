import type { DemoRole } from '../api/types'

export type TourId =
  | 'dashboard'
  | 'pos'
  | 'invoices'
  | 'accounting'
  | 'hrm'
  | 'crm'
  | 'reports'

export type TourLocale = 'ar' | 'en'

export interface LocalizedText {
  ar: string
  en: string
}

export interface TourStepConfig {
  id: string
  target: string
  title: LocalizedText
  content: LocalizedText
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
  permissions?: string[]
  roles?: DemoRole[]
  requiresRoute?: string
}

export interface TourConfig {
  id: TourId
  route: string
  steps: TourStepConfig[]
}

export interface UserTourPreferences {
  tours?: Partial<Record<TourId, boolean>>
}
