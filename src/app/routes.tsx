import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from '../layouts/AppShell'
import { useAuthStore } from '../stores/authStore'
import { canAccessRoute, getDefaultRoute } from '../lib/permissions'
import { LoginPage } from '../pages/LoginPage'
import { DashboardPage } from '../pages/DashboardPage'
import { InventoryPage } from '../pages/InventoryPage'
import { PosPage } from '../pages/PosPage'
import { AccessoriesSalesPage } from '../pages/AccessoriesSalesPage'
import { MaintenanceServicesPage } from '../pages/MaintenanceServicesPage'
import { CustomersPage } from '../pages/CustomersPage'
import { CustomerDetailPage } from '../pages/CustomerDetailPage'
import { DistributorsPage } from '../pages/DistributorsPage'
import { DistributorDetailPage } from '../pages/DistributorDetailPage'
import { DailyBranchReportPage } from '../pages/DailyBranchReportPage'
import { DailyBranchReportPrintPage } from '../pages/DailyBranchReportPrintPage'
import { InstallmentContractPrintPage } from '../pages/InstallmentContractPrintPage'
import { InvoiceReviewPage } from '../pages/InvoiceReviewPage'
import { InvoicesPage } from '../pages/InvoicesPage'
import { InstallmentCollectionPage } from '../pages/InstallmentCollectionPage'
import { DepartmentsPage } from '../pages/DepartmentsPage'
import { DepartmentDetailPage } from '../pages/DepartmentDetailPage'
import { BranchesPage } from '../pages/BranchesPage'
import { GpsManagementPage } from '../pages/enterprise/GpsManagementPage'
import { BranchDetailPage } from '../pages/enterprise/BranchDetailPage'
import { HrmDashboardPage } from '../modules/hrm/pages/HrmDashboardPage'
import { HrmAttendancePage } from '../modules/hrm/pages/HrmAttendancePage'
import { HrmLeavesPage } from '../modules/hrm/pages/HrmLeavesPage'
import { HrmShiftsPage } from '../modules/hrm/pages/HrmShiftsPage'
import { HrmPayrollPage } from '../modules/hrm/pages/HrmPayrollPage'
import { HrmHolidaysPage } from '../modules/hrm/pages/HrmHolidaysPage'
import { HrmSettingsPage } from '../modules/hrm/pages/HrmSettingsPage'
import { HrmEmployeesPage } from '../modules/hrm/pages/HrmEmployeesPage'
import { HrmLeaveTypesPage } from '../modules/hrm/pages/HrmLeaveTypesPage'
import { HrmAllowancesPage } from '../modules/hrm/pages/HrmAllowancesPage'
import { HrmPayrollGroupsPage } from '../modules/hrm/pages/HrmPayrollGroupsPage'
import { AccountingDashboardPage } from '../modules/accounting/pages/AccountingDashboardPage'
import { ChartOfAccountsPage } from '../modules/accounting/pages/ChartOfAccountsPage'
import { AccountLedgerPage } from '../modules/accounting/pages/AccountLedgerPage'
import { JournalEntriesPage } from '../modules/accounting/pages/JournalEntriesPage'
import { TransfersPage } from '../modules/accounting/pages/TransfersPage'
import { TransactionMapPage } from '../modules/accounting/pages/TransactionMapPage'
import { ReportsPage } from '../modules/accounting/pages/ReportsPage'
import { BudgetsPage } from '../modules/accounting/pages/BudgetsPage'
import { AccountingSettingsPage } from '../modules/accounting/pages/AccountingSettingsPage'
import { AdminUsersPage } from '../modules/admin/pages/AdminUsersPage'
import { AdminRolesPage } from '../modules/admin/pages/AdminRolesPage'
import { AdminRolePermissionsPage } from '../modules/admin/pages/AdminRolePermissionsPage'
import { AdminActivityLogPage } from '../modules/admin/pages/AdminActivityLogPage'
import { AdminSystemSettingsPage } from '../modules/admin/pages/AdminSystemSettingsPage'
import { CrmPipelinePage } from '../modules/crm/pages/CrmPipelinePage'
import { CrmFollowUpsPage } from '../modules/crm/pages/CrmFollowUpsPage'
import { CrmActivitiesPage } from '../modules/crm/pages/CrmActivitiesPage'
import { CrmCallLogsPage } from '../modules/crm/pages/CrmCallLogsPage'
import { CrmOrderRequestsPage } from '../modules/crm/pages/CrmOrderRequestsPage'
import { CrmMarketplacePage } from '../modules/crm/pages/CrmMarketplacePage'
import { CrmCampaignsPage } from '../modules/crm/pages/CrmCampaignsPage'
import { CrmProposalsPage } from '../modules/crm/pages/CrmProposalsPage'
import { CrmReportsPage } from '../modules/crm/pages/CrmReportsPage'
import { CrmSettingsPage } from '../modules/crm/pages/CrmSettingsPage'
import { PortalLoginPage } from '../modules/crm/portal/PortalLoginPage'
import { PortalLayout } from '../modules/crm/portal/PortalLayout'
import { PortalDashboardPage } from '../modules/crm/portal/PortalDashboardPage'
import { PortalInvoicesPage } from '../modules/crm/portal/PortalInvoicesPage'
import { PortalLedgerPage } from '../modules/crm/portal/PortalLedgerPage'
import { PortalOrderRequestsPage } from '../modules/crm/portal/PortalOrderRequestsPage'
import { usePortalAuthStore } from '../stores/portalAuthStore'

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

function PortalProtectedRoute() {
  const token = usePortalAuthStore((s) => s.token)
  if (!token) {
    return <Navigate to="/portal/login" replace />
  }
  return <Outlet />
}

function PortalPublicRoute() {
  const token = usePortalAuthStore((s) => s.token)
  if (token) {
    return <Navigate to="/portal" replace />
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
            <Route path="sales/accessories" element={<AccessoriesSalesPage />} />
            <Route path="sales/maintenance" element={<MaintenanceServicesPage />} />
            <Route path="daily-reports" element={<DailyBranchReportPage />} />
            <Route path="daily-reports/:id/print" element={<DailyBranchReportPrintPage />} />
            <Route path="distributors" element={<DistributorsPage />} />
            <Route path="distributors/:id" element={<DistributorDetailPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/:id" element={<CustomerDetailPage />} />
            <Route path="invoices/review" element={<InvoiceReviewPage />} />
            <Route path="invoices/:id/contract-print" element={<InstallmentContractPrintPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="installments" element={<InstallmentCollectionPage />} />
            <Route path="accounting" element={<AccountingDashboardPage />} />
            <Route path="accounting/chart-of-accounts" element={<ChartOfAccountsPage />} />
            <Route path="accounting/chart-of-accounts/:id/ledger" element={<AccountLedgerPage />} />
            <Route path="accounting/journal-entries" element={<JournalEntriesPage />} />
            <Route path="accounting/transfers" element={<TransfersPage />} />
            <Route path="accounting/transactions" element={<TransactionMapPage />} />
            <Route path="accounting/reports" element={<ReportsPage />} />
            <Route path="accounting/budgets" element={<BudgetsPage />} />
            <Route path="accounting/settings" element={<AccountingSettingsPage />} />
            <Route path="hrm" element={<HrmDashboardPage />} />
            <Route path="hrm/employees" element={<HrmEmployeesPage />} />
            <Route path="hrm/attendance" element={<HrmAttendancePage />} />
            <Route path="hrm/leaves" element={<HrmLeavesPage />} />
            <Route path="hrm/leave-types" element={<HrmLeaveTypesPage />} />
            <Route path="hrm/shifts" element={<HrmShiftsPage />} />
            <Route path="hrm/holidays" element={<HrmHolidaysPage />} />
            <Route path="hrm/allowances" element={<HrmAllowancesPage />} />
            <Route path="hrm/payroll" element={<HrmPayrollPage />} />
            <Route path="hrm/payroll-groups" element={<HrmPayrollGroupsPage />} />
            <Route path="hrm/settings" element={<HrmSettingsPage />} />
            <Route path="admin/users" element={<AdminUsersPage />} />
            <Route path="admin/roles" element={<AdminRolesPage />} />
            <Route path="admin/roles/:roleId/permissions" element={<AdminRolePermissionsPage />} />
            <Route path="admin/activity-log" element={<AdminActivityLogPage />} />
            <Route path="admin/settings" element={<AdminSystemSettingsPage />} />
            <Route path="crm" element={<CrmPipelinePage />} />
            <Route path="crm/follow-ups" element={<CrmFollowUpsPage />} />
            <Route path="crm/activities" element={<CrmActivitiesPage />} />
            <Route path="crm/call-logs" element={<CrmCallLogsPage />} />
            <Route path="crm/order-requests" element={<CrmOrderRequestsPage />} />
            <Route path="crm/marketplace" element={<CrmMarketplacePage />} />
            <Route path="crm/campaigns" element={<CrmCampaignsPage />} />
            <Route path="crm/proposals" element={<CrmProposalsPage />} />
            <Route path="crm/reports" element={<CrmReportsPage />} />
            <Route path="crm/settings" element={<CrmSettingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route element={<PortalPublicRoute />}>
        <Route path="/portal/login" element={<PortalLoginPage />} />
      </Route>

      <Route element={<PortalProtectedRoute />}>
        <Route path="/portal" element={<PortalLayout />}>
          <Route index element={<PortalDashboardPage />} />
          <Route path="invoices" element={<PortalInvoicesPage />} />
          <Route path="ledger" element={<PortalLedgerPage />} />
          <Route path="order-requests" element={<PortalOrderRequestsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
