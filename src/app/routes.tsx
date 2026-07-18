import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from '../layouts/AppShell'
import { useAuthStore } from '../stores/authStore'
import { canAccessRoute, getDefaultRoute } from '../lib/permissions'
import { LoginPage } from '../pages/LoginPage'
import { DashboardPage } from '../pages/DashboardPage'
import { InventoryPage } from '../pages/InventoryPage'
import { InventoryAddStockPage } from '../pages/InventoryAddStockPage'
import { InventoryTransfersPage } from '../pages/InventoryTransfersPage'
import { InventoryReturnsPage } from '../pages/InventoryReturnsPage'
import { InventoryProductSettingsPage } from '../pages/InventoryProductSettingsPage'
import { WarehousesPage } from '../pages/WarehousesPage'
import { PosPage } from '../pages/PosPage'
import { PosServicesPage } from '../pages/PosServicesPage'
import { AccessoriesSalesPage } from '../pages/AccessoriesSalesPage'
import { AccessoriesCatalogPage } from '../pages/AccessoriesCatalogPage'
import { AccessoryPackagesPage } from '../pages/AccessoryPackagesPage'
import { AccessoryStockPage } from '../pages/AccessoryStockPage'
import { MaintenanceServicesPage } from '../pages/MaintenanceServicesPage'
import { ServicesPage } from '../pages/ServicesPage'
import { ServiceFormPage } from '../pages/ServiceFormPage'
import { ContractTemplatesPage } from '../pages/ContractTemplatesPage'
import { ContractTemplatePreviewPage } from '../pages/ContractTemplatePreviewPage'
import { CustomersPage } from '../pages/CustomersPage'
import { CustomerAddPage } from '../pages/CustomerAddPage'
import { CustomerEditPage } from '../pages/CustomerEditPage'
import { CustomerDetailPage } from '../pages/CustomerDetailPage'
import { DistributorsPage } from '../pages/DistributorsPage'
import { DistributorAddPage } from '../pages/DistributorAddPage'
import { DistributorDetailPage } from '../pages/DistributorDetailPage'
import { DailyBranchReportPage } from '../pages/DailyBranchReportPage'
import { DailyBranchReportPrintPage } from '../pages/DailyBranchReportPrintPage'
import { InstallmentContractPrintPage } from '../pages/InstallmentContractPrintPage'
import { OwnershipTransferContractPrintPage } from '../pages/OwnershipTransferContractPrintPage'
import { ServiceContractPrintPage } from '../pages/ServiceContractPrintPage'
import { InvoiceReviewPage } from '../pages/InvoiceReviewPage'
import { ReviewCollectionsPage } from '../pages/ReviewCollectionsPage'
import { ReviewCollectionDetailPage } from '../pages/ReviewCollectionDetailPage'
import { ReviewExpensesPage } from '../pages/ReviewExpensesPage'
import { ReviewExpenseDetailPage } from '../pages/ReviewExpenseDetailPage'
import { ExpenseNewPage } from '../pages/ExpenseNewPage'
import { BranchInventoryPage } from '../pages/BranchInventoryPage'
import { DeviceMovementsPage } from '../pages/DeviceMovementsPage'
import { DeviceMovementDetailPage } from '../pages/DeviceMovementDetailPage'
import { DeviceMovementNewPage } from '../pages/DeviceMovementNewPage'
import { InvoiceReviewDetailPage } from '../pages/InvoiceReviewDetailPage'
import { InvoiceDetailPage } from '../pages/InvoiceDetailPage'
import { ContractDetailPage } from '../pages/ContractDetailPage'
import { InvoicesPage } from '../pages/InvoicesPage'
import { InstallmentCollectionPage } from '../pages/InstallmentCollectionPage'
import { PaymentReceiptPrintPage } from '../pages/PaymentReceiptPrintPage'
import { PaymentsPage } from '../pages/PaymentsPage'
import { FaqPage } from '../pages/FaqPage'
import { MyProfilePage } from '../pages/MyProfilePage'
import { FeedbackPage } from '../pages/FeedbackPage'
import { PromotionsPage } from '../modules/pricing/pages/PromotionsPage'
import { MessagesPage } from '../modules/chat/pages/MessagesPage'
import { PricingCatalogPage } from '../modules/pricing/pages/PricingCatalogPage'
import { ExternalCollectionPage } from '../modules/collections/pages/ExternalCollectionPage'
import { CollectionAccountsPage } from '../modules/collections/pages/CollectionAccountsPage'
import { DepartmentsPage } from '../pages/DepartmentsPage'
import { DepartmentDetailPage } from '../pages/DepartmentDetailPage'
import { BranchesPage } from '../pages/BranchesPage'
import { SectionsPage } from '../pages/SectionsPage'
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
import { HrmEmployeeDetailPage } from '../modules/hrm/pages/HrmEmployeeDetailPage'
import { HrmSalesTargetsPage } from '../modules/hrm/pages/HrmSalesTargetsPage'
import { HrmZkDevicesPage } from '../modules/hrm/pages/HrmZkDevicesPage'
import { HrmLeaveTypesPage } from '../modules/hrm/pages/HrmLeaveTypesPage'
import { HrmJobsPage } from '../modules/hrm/pages/HrmJobsPage'
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
import { AdminFaqPage } from '../modules/admin/pages/AdminFaqPage'
import { TrashPage } from '../modules/admin/pages/TrashPage'
import { AdminSystemSettingsPage } from '../modules/admin/pages/AdminSystemSettingsPage'
import { CrmFollowUpsPage } from '../modules/crm/pages/CrmFollowUpsPage'
import { CrmActivitiesPage } from '../modules/crm/pages/CrmActivitiesPage'
import { CrmCallLogsPage } from '../modules/crm/pages/CrmCallLogsPage'
import { CrmOrderRequestsPage } from '../modules/crm/pages/CrmOrderRequestsPage'
import { CrmMarketplacePage } from '../modules/crm/pages/CrmMarketplacePage'
import { CrmCampaignsPage } from '../modules/crm/pages/CrmCampaignsPage'
import { CrmProposalsPage } from '../modules/crm/pages/CrmProposalsPage'
import { CrmReportsPage } from '../modules/crm/pages/CrmReportsPage'
import { CrmSettingsPage } from '../modules/crm/pages/CrmSettingsPage'
import { CrmCustomerAddPage } from '../modules/crm/pages/CrmCustomerAddPage'
import { CrmReferralAddPage } from '../modules/crm/pages/CrmReferralAddPage'
import { CrmReferralNetworkPage } from '../modules/crm/pages/CrmReferralNetworkPage'
import { CrmReferralsFollowUpsPage } from '../modules/crm/pages/CrmReferralsFollowUpsPage'
import { CrmReferralsPipelinePage } from '../modules/crm/pages/CrmReferralsPipelinePage'
import { SupportTasksAdminPage } from '../modules/support/pages/SupportTasksAdminPage'
import { MyTasksPage } from '../modules/support/pages/MyTasksPage'
import { EvaluationQuestionsPage } from '../modules/review/pages/EvaluationQuestionsPage'
import { EvaluationQueuePage } from '../modules/review/pages/EvaluationQueuePage'
import { SubscriptionRenewalQueuePage } from '../modules/review/pages/SubscriptionRenewalQueuePage'
import { EvaluationRecordPage } from '../modules/review/pages/EvaluationRecordPage'
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
        <Route element={<RoleRoute />}>
          <Route path="payments/:id/receipt" element={<PaymentReceiptPrintPage />} />
        </Route>
        <Route element={<AppShell />}>
          <Route element={<RoleRoute />}>
            <Route index element={<DashboardPage />} />
            <Route path="departments" element={<DepartmentsPage />} />
            <Route path="departments/:id" element={<DepartmentDetailPage />} />
            <Route path="branches" element={<BranchesPage />} />
            <Route path="branches/:id" element={<BranchDetailPage />} />
            <Route path="sections" element={<SectionsPage />} />
            <Route path="gps/management" element={<GpsManagementPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="inventory/branch" element={<BranchInventoryPage />} />
            <Route path="inventory/movements" element={<DeviceMovementsPage />} />
            <Route path="inventory/movements/new" element={<DeviceMovementNewPage />} />
            <Route path="inventory/movements/:id" element={<DeviceMovementDetailPage />} />
            <Route path="inventory/add" element={<InventoryAddStockPage />} />
            <Route path="inventory/transfers" element={<InventoryTransfersPage />} />
            <Route path="inventory/returns" element={<InventoryReturnsPage />} />
            <Route path="inventory/settings" element={<InventoryProductSettingsPage />} />
            <Route path="inventory/warehouses" element={<WarehousesPage />} />
            <Route path="inventory/accessories" element={<AccessoriesCatalogPage />} />
            <Route path="inventory/accessory-packages" element={<AccessoryPackagesPage />} />
            <Route path="inventory/accessory-stock" element={<AccessoryStockPage />} />
            <Route path="pos" element={<PosPage />} />
            <Route path="pos/services" element={<PosServicesPage />} />
            <Route path="pricing/catalog" element={<PricingCatalogPage />} />
            <Route path="pricing/promotions" element={<PromotionsPage />} />
            <Route path="sales/accessories" element={<AccessoriesSalesPage />} />
            <Route path="sales/maintenance" element={<MaintenanceServicesPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="services/add" element={<ServiceFormPage />} />
            <Route path="services/:id/edit" element={<ServiceFormPage />} />
            <Route path="contract-templates" element={<ContractTemplatesPage />} />
            <Route path="contract-templates/:key/preview" element={<ContractTemplatePreviewPage />} />
            <Route path="daily-reports" element={<DailyBranchReportPage />} />
            <Route path="daily-reports/:id/print" element={<DailyBranchReportPrintPage />} />
            <Route path="distributors" element={<DistributorsPage />} />
            <Route path="distributors/add" element={<DistributorAddPage />} />
            <Route path="distributors/:id" element={<DistributorDetailPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/add" element={<CustomerAddPage />} />
            <Route path="customers/:id/edit" element={<CustomerEditPage />} />
            <Route path="customers/:id" element={<CustomerDetailPage />} />
            <Route path="invoices/review" element={<InvoiceReviewPage />} />
            <Route path="invoices/review/:id" element={<InvoiceReviewDetailPage />} />
            <Route path="review/collections" element={<ReviewCollectionsPage />} />
            <Route path="review/collections/:id" element={<ReviewCollectionDetailPage />} />
            <Route path="review/expenses" element={<ReviewExpensesPage />} />
            <Route path="review/expenses/:id" element={<ReviewExpenseDetailPage />} />
            <Route path="expenses/new" element={<ExpenseNewPage />} />
            <Route path="review/evaluation-queue" element={<EvaluationQueuePage />} />
            <Route path="review/evaluation-queue/:id" element={<EvaluationRecordPage />} />
            <Route path="review/subscription-renewals" element={<SubscriptionRenewalQueuePage />} />
            <Route path="review/evaluation-questions" element={<EvaluationQuestionsPage />} />
            <Route path="invoices/:id/contract-print" element={<InstallmentContractPrintPage />} />
            <Route path="invoices/:id/ownership-transfer-contract" element={<OwnershipTransferContractPrintPage />} />
            <Route path="invoices/:id/service-contract/:lineId" element={<ServiceContractPrintPage />} />
            <Route path="invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="contracts/:id" element={<ContractDetailPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="installments" element={<InstallmentCollectionPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="help/faq" element={<FaqPage />} />
            <Route path="profile" element={<MyProfilePage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="feedback" element={<FeedbackPage />} />
            <Route path="call-center/collections" element={<ExternalCollectionPage />} />
            <Route path="admin/collection-accounts" element={<CollectionAccountsPage />} />
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
            <Route path="hrm/employees/:id" element={<HrmEmployeeDetailPage />} />
            <Route path="hrm/sales-targets" element={<HrmSalesTargetsPage />} />
            <Route path="hrm/jobs" element={<HrmJobsPage />} />
            <Route path="hrm/attendance" element={<HrmAttendancePage />} />
            <Route path="hrm/zk-devices" element={<HrmZkDevicesPage />} />
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
            <Route path="admin/trash" element={<TrashPage />} />
            <Route path="admin/faq" element={<AdminFaqPage />} />
            <Route path="admin/settings" element={<AdminSystemSettingsPage />} />
            <Route path="crm" element={<Navigate to="/crm/referrals" replace />} />
            <Route path="crm/customers/add" element={<CrmCustomerAddPage />} />
            <Route path="crm/referrals" element={<CrmReferralsPipelinePage />} />
            <Route path="crm/referrals/add" element={<CrmReferralAddPage />} />
            <Route path="crm/referrals/network" element={<CrmReferralNetworkPage />} />
            <Route path="crm/referrals/follow-ups" element={<CrmReferralsFollowUpsPage />} />
            <Route path="crm/follow-ups" element={<CrmFollowUpsPage />} />
            <Route path="crm/activities" element={<CrmActivitiesPage />} />
            <Route path="crm/call-logs" element={<CrmCallLogsPage />} />
            <Route path="crm/order-requests" element={<CrmOrderRequestsPage />} />
            <Route path="crm/marketplace" element={<CrmMarketplacePage />} />
            <Route path="crm/campaigns" element={<CrmCampaignsPage />} />
            <Route path="crm/proposals" element={<CrmProposalsPage />} />
            <Route path="crm/reports" element={<CrmReportsPage />} />
            <Route path="crm/settings" element={<CrmSettingsPage />} />
            <Route path="support/tasks" element={<SupportTasksAdminPage />} />
            <Route path="support/my-tasks" element={<MyTasksPage />} />
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
