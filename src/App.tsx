import { AppRoutes } from './app/routes'
import { BranchSetupGate } from './components/BranchSetupGate'
import { RouteLoadingTracker } from './components/RouteLoadingTracker'

export default function App() {
  return (
    <>
      <RouteLoadingTracker />
      <BranchSetupGate>
        <AppRoutes />
      </BranchSetupGate>
    </>
  )
}
