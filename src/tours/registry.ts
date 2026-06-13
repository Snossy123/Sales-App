import { accountingTour } from './configs/accounting.tour'
import { crmTour } from './configs/crm.tour'
import { dashboardTour } from './configs/dashboard.tour'
import { hrmTour } from './configs/hrm.tour'
import { invoicesTour } from './configs/invoices.tour'
import { posTour } from './configs/pos.tour'
import { reportsTour } from './configs/reports.tour'
import type { TourConfig, TourId } from './types'

export const tourRegistry: Record<TourId, TourConfig> = {
  dashboard: dashboardTour,
  pos: posTour,
  invoices: invoicesTour,
  accounting: accountingTour,
  hrm: hrmTour,
  crm: crmTour,
  reports: reportsTour,
}

export function getTourConfig(tourId: TourId): TourConfig | undefined {
  return tourRegistry[tourId]
}

export const allTourConfigs = Object.values(tourRegistry)
