import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from '../layouts/AppShell'
import { useAuthStore } from '../stores/authStore'
import { canAccessRoute, getDefaultRoute } from '../lib/permissions'
import { LoginPage } from '../pages/LoginPage'
import { DashboardPage } from '../pages/DashboardPage'
import { InventoryPage } from '../pages/InventoryPage'
import { PosPage } from '../pages/PosPage'
import { CustomersPage } from '../pages/CustomersPage'
import { CustomerDetailPage } from '../pages/CustomerDetailPage'
import { InvoiceReviewPage } from '../pages/InvoiceReviewPage'
import { InvoicesPage } from '../pages/InvoicesPage'
import { InstallmentCollectionPage } from '../pages/InstallmentCollectionPage'
import { DepartmentsPage } from '../pages/DepartmentsPage'
import { DepartmentDetailPage } from '../pages/DepartmentDetailPage'
import { BranchesPage } from '../pages/BranchesPage'
import { GpsManagementPage } from '../pages/enterprise/GpsManagementPage'
import { BranchDetailPage } from '../pages/enterprise/BranchDetailPage'

function ProtectedRoute() {
  const token = useAuthStore((s) => s.token)
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

function RoleRoute() {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()

  if (!canAccessRoute(location.pathname, user)) {
    return <Navigate to={getDefaultRoute(user)} replace />
  }

  return <Outlet />
}

function PublicRoute() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  if (token) {
    return <Navigate to={getDefaultRoute(user)} replace />
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
          <Route element={<RoleRoute />}>
            <Route index element={<DashboardPage />} />
            <Route path="departments" element={<DepartmentsPage />} />
            <Route path="departments/:id" element={<DepartmentDetailPage />} />
            <Route path="branches" element={<BranchesPage />} />
            <Route path="branches/:id" element={<BranchDetailPage />} />
            <Route path="gps/management" element={<GpsManagementPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="pos" element={<PosPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/:id" element={<CustomerDetailPage />} />
            <Route path="invoices/review" element={<InvoiceReviewPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="installments" element={<InstallmentCollectionPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
