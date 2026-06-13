import type { ReactNode } from 'react'
import 'shepherd.js/dist/css/shepherd.css'
import '../../tours/tour.css'
import { useTourBootstrap } from '../../hooks/usePageTour'

interface TourProviderProps {
  children: ReactNode
}

export function TourProvider({ children }: TourProviderProps) {
  useTourBootstrap()
  return children
}
