import { AppRoutes } from './app/routes'
import { RouteLoadingTracker } from './components/RouteLoadingTracker'

export default function App() {
  return (
    <>
      <RouteLoadingTracker />
      <AppRoutes />
    </>
  )
}
