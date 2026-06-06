import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppShell } from '../layouts/AppShell'
import { useAuthStore } from '../stores/authStore'
import { LoginPage } from '../pages/LoginPage'
import { DashboardPage } from '../pages/DashboardPage'
import { InventoryPage } from '../pages/InventoryPage'
import { PosPage } from '../pages/PosPage'
import { CustomersPage } from '../pages/CustomersPage'
import { CustomerDetailPage } from '../pages/CustomerDetailPage'
import { HrDashboardPage } from '../pages/HrDashboardPage'
import { CrmPipelinePage } from '../pages/CrmPipelinePage'

function ProtectedRoute() {
  const token = useAuthStore((s) => s.token)
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

function PublicRoute() {
  const token = useAuthStore((s) => s.token)
  if (token) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="pos" element={<PosPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />
          <Route path="hr" element={<HrDashboardPage />} />
          <Route path="crm" element={<CrmPipelinePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
