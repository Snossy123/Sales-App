# Graph Report - Sales-App  (2026-11-28)

## Corpus Check
- 536 files · ~331,568 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 25 file(s) not represented in the graph (top: .css 12, (none) 8, .ttf 3)

## Summary
- 3181 nodes · 14345 edges · 113 communities (109 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 117 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1c636e2a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useAuthStore
- StatusBadge
- api/types.ts
- PosPage.tsx
- BranchInventoryPage.tsx
- ServiceCombinerPage.tsx
- CustomerContractsSection.tsx
- contractFields.ts
- react
- CrmOwnerDetailPage.tsx
- CrmReferralsListPage.tsx
- getErrorMessage
- InstallmentContractDocument.tsx
- CrmReferralsListPage.tsx
- Branch
- registry.ts
- departmentDashboard.ts
- CrmCallLogsPage.tsx
- ContractDetailPage.tsx
- permissionCatalog.ts
- PageHeader
- HrmEmployeesPage.tsx
- suspendedPosStore.ts
- PosFlowPage.tsx
- DailyBranchReportPage.tsx
- CustomerCreateModal.tsx
- PosOwnershipTransferSection.tsx
- procedureDraftStore.ts
- CrmTasksPage.tsx
- ServiceCombinerPage.tsx
- administrationScope.ts
- MyTasksPage.tsx
- package.json
- react-router-dom
- AdminSystemSettingsPage.tsx
- digitInput.ts
- AdminActivityLogPage.tsx
- InstallmentCollectionPanel.tsx
- collectionHelpers.ts
- CeoInstallationList.tsx
- devDependencies
- ContractPrintActions.tsx
- CollectionAssignmentsPage.tsx
- InstallmentCollectionGroupedList.tsx
- InstallmentCollectionPage.tsx
- Icon
- DeviceLineCard.tsx
- ClosedContractCorrectionEditor.tsx
- AppShell.tsx
- printPaymentReceipt.ts
- permissions.ts
- AppDatePicker
- BranchDetailPage.tsx
- UserManualPage.tsx
- Task 6 Report: Frontend — contract tab + status label
- usePageTour.ts
- ContractTemplatePreviewPage.tsx
- normalizeDigits.ts
- CollectionFollowUpHistoryModal.tsx
- compilerOptions
- format.ts
- ownershipTransferFinancialBreakdown.ts
- compilerOptions
- ContractFollowUpTab.tsx
- CeoPeriodToggle.tsx
- pageStats.ts
- EmployeeAttachmentsSection.tsx
- PaymentsPage.tsx
- Tour
- DESIGN.md
- CrmOwnerDetailPage.tsx
- CustomerPublicProfilePage.tsx
- crmPageVisibility.ts
- SalesInvoice
- SyncDebugPage.tsx
- vite.config.ts
- 1.3 سلوك الشاشات الصغيرة والموبايل والقوائم الثابتة والمختصرة
- ContractReviewDetails.tsx
- ownershipTransferFeePlans.ts
- ReferralNetworkTree.tsx
- useEnterToNextField.ts
- contractFields.test.ts
- PricingCatalogPage.tsx
- ProfileAvatar.tsx
- GPS App (Sales-App)
- SalesInvoiceLine
- HrmDashboardPage.tsx
- roleCatalog.ts
- PaymentReceiptDocument.tsx
- 7. قواعد الحسابات والمنطق المالي والتجاري (Business & Calculation Rules)
- PosOwnershipTransferSection.tsx
- CrmCeoDashboardPage.tsx
- scripts
- ContractPaymentsTab.tsx
- CeoEmployeeRankList.tsx
- FunnelPanel.tsx
- FilterBar.tsx
- 5. دورات الحياة وحالات التحوّل (Lifecycles & State Transitions)
- getUserRole
- formatNumber
- git-frontend.sh
- HrmStatCard.tsx
- vite-env.d.ts
- tsconfig.json
- entrypoint.sh
- vercel.json
- المرجع التفصيلي الشامل لنظام GPS للمبيعات (Exhaustive System Specification)
- CompleteTaskModal.tsx
- CustomerOwnershipTransfersSection.tsx
- react-dom
- SupportTask
- axios
- UpcomingLeavesList.tsx

## God Nodes (most connected - your core abstractions)
1. `Icon()` - 318 edges
2. `react` - 242 edges
3. `AsyncState()` - 240 edges
4. `getErrorMessage()` - 221 edges
5. `useAuthStore` - 214 edges
6. `@tanstack/react-query` - 192 edges
7. `api` - 176 edges
8. `DataTable()` - 146 edges
9. `AppRoutes()` - 139 edges
10. `react-router-dom` - 126 edges

## Surprising Connections (you probably didn't know these)
- `8.4 الأمان، عزل التوكنات، التزامن، وأخطاء الشبكة والـ API` --references--> `ProductUnit`  [INFERRED]
  docs/client-user-manual-ar.md → src/api/types.ts
- `4.5 الأقساط والمدفوعات والتحصيل والمراجعة والمصروفات والبيان اليومي (`Financial Ops`)` --references--> `InstallmentReconciliation`  [INFERRED]
  docs/client-user-manual-ar.md → src/api/types.ts
- `2.6 الاستثناءات والقواعد الخاصة بالصلاحيات` --references--> `userCanCrud()`  [INFERRED]
  docs/client-user-manual-ar.md → src/lib/access.ts
- `Concerns` --references--> `uniqueResolvedPlans()`  [INFERRED]
  .superpowers/sdd/task-6-report.md → src/lib/customerContracts.ts
- `Review follow-up (Task 6 finding)` --references--> `splitOwnershipTransferInstallmentItems()`  [INFERRED]
  .superpowers/sdd/task-6-report.md → src/lib/customerContracts.ts

## Import Cycles
- 2-file cycle: `src/lib/activeBranch.ts -> src/lib/dataScope.ts -> src/lib/activeBranch.ts`
- 2-file cycle: `src/components/pos/DeviceLineCard.tsx -> src/components/pos/useDeviceLineEditor.ts -> src/components/pos/DeviceLineCard.tsx`

## Communities (113 total, 4 thin omitted)

### Community 0 - "useAuthStore"
Cohesion: 0.08
Nodes (51): RoleRoute(), ContractDeletionError(), contractDateFilterParams(), contractReviewRowClass(), ConvertCashToInstallmentModal(), DepartmentSwitcher(), SalesPageShellProps, WarehouseSwitcher() (+43 more)

### Community 1 - "StatusBadge"
Cohesion: 0.06
Nodes (48): ServiceEvaluationAnswer, ServiceEvaluationQuestion, ServiceEvaluationRequestStatus, SubscriptionRenewalQueueItem, SubscriptionRenewalStatus, CustomerCallTimelineSection(), CustomerCallTimelineSectionProps, formatDuration() (+40 more)

### Community 2 - "api/types.ts"
Cohesion: 0.03
Nodes (85): AccessoryPackageItem, AccountingAccountType, AccountingDashboard, AccountingSettings, AccountPrimaryType, AdministrationDeletionBlockers, ArAgeingContactRow, ArReconciliationReport (+77 more)

### Community 3 - "PosPage.tsx"
Cohesion: 0.06
Nodes (69): ContractKind, GpsProduct, SubscriptionRenewalCandidate, Warehouse, GpsProductCardProps, createDeviceLine(), DeviceLineCard(), DeviceLineCardProps (+61 more)

### Community 4 - "BranchInventoryPage.tsx"
Cohesion: 0.08
Nodes (51): 4.3 المخزون والأجهزة وحركات الأجهزة والعهد والإكسسوارات (`Inventory`), 5.3 دورة حياة وحدات المخزون وحركات الأجهزة (`ProductUnit`, `DeviceMovement`, `StockTransfer`), CustodyVoucher, DepartmentStock, DeviceMovement, ProductUnit, StockTransfer, BranchInventoryUnitForm() (+43 more)

### Community 5 - "ServiceCombinerPage.tsx"
Cohesion: 0.09
Nodes (58): DistributorType, CustodyVoucherForm(), CustodyVoucherModal(), CustodyVoucherModalProps, RecipientType, CheckoutPaymentSection(), posModeToggleGroupClass, posRequiredWrap() (+50 more)

### Community 6 - "CustomerContractsSection.tsx"
Cohesion: 0.13
Nodes (35): ContractInstallmentsTab(), ContractInstallmentsTabProps, installmentBadgeStatus(), InstallmentsTable(), sortInstallmentItems(), SummaryCard(), CustomerContractsSection(), CustomerContractsSectionProps (+27 more)

### Community 7 - "contractFields.ts"
Cohesion: 0.11
Nodes (40): addCalendarMonths(), AR_WEEKDAYS, buildInstallmentRows(), CashDuePayment, cashDuePayments(), cashReviewRows(), cashScheduleLabel(), computeInstallmentDueDate() (+32 more)

### Community 8 - "react"
Cohesion: 0.06
Nodes (74): react, @tanstack/react-query, api, axiosApi, portalApi, ChatConversationSummary, HrmAttendance, HrmPayrollRecord (+66 more)

### Community 9 - "CrmOwnerDetailPage.tsx"
Cohesion: 0.16
Nodes (19): ReferralLeadReport, ReferralLeadReportByUser, ReferralLeadReportSummary, CrmKpiCard(), CrmKpiCardProps, VARIANT_STYLES, buildStatusBreakdown(), formatReportDateLabel() (+11 more)

### Community 10 - "CrmReferralsListPage.tsx"
Cohesion: 0.15
Nodes (24): OwnerLeaderboardResponse, OwnerLeaderboardRow, OwnerLeaderboardSort, DateTimeInput12h(), useDebouncedValue(), ReferralStatusModal(), CrmBulkActionBar(), CrmBulkActionBarProps (+16 more)

### Community 11 - "getErrorMessage"
Cohesion: 0.08
Nodes (52): getErrorMessage(), Department, AddStockForm(), AddStockFormProps, invalidateStockQueries(), ChartCard(), ChartCardProps, DistributeStockModal() (+44 more)

### Community 12 - "InstallmentContractDocument.tsx"
Cohesion: 0.09
Nodes (47): ContractPrintBorder(), ContractPrintFooter(), ContractPrintFooterProps, ContractPrintHeader(), ContractPrintHeaderProps, balanceTermsTokens(), CASH_TERMS_TOKENS, FitJustifiedTerms() (+39 more)

### Community 13 - "CrmReferralsListPage.tsx"
Cohesion: 0.13
Nodes (34): ReferralLead, ReferralLeadStatus, ReferralReferrerOption, CustomerReferralsSection(), CrmLeadDrawer(), CrmLeadDrawerProps, CRM_PRIMARY_BTN, CRM_SECONDARY_BTN (+26 more)

### Community 14 - "Branch"
Cohesion: 0.12
Nodes (36): 4.2 العملاء والموزعون (`Customers & Distributors`), 4.4 التسعير والعروض والخدمات والتعاقدات ومشاكل العقود (`Pricing, Sales, Contracts & Cases`), 4. الكيانات والبيانات والحقول وقواعد التحقق (Entities, Fields & Validation Rules), Branch, Customer, Distributor, PriceCatalogItem, SalesRep (+28 more)

### Community 15 - "registry.ts"
Cohesion: 0.20
Nodes (12): accountingTour, crmTour, dashboardTour, hrmTour, invoicesTour, posTour, reportsTour, allTourConfigs (+4 more)

### Community 16 - "departmentDashboard.ts"
Cohesion: 0.19
Nodes (13): InventoryOverviewRow, DeviceHealthCardsProps, GpsDeviceTableRow, GpsKpiRowProps, chartLegend, chartMonths, deviceHealthCards, GpsDeviceRow (+5 more)

### Community 17 - "CrmCallLogsPage.tsx"
Cohesion: 0.11
Nodes (43): 4.6 المحاسبة والموارد البشرية و CRM والدعم والدردشة والرسائل (`ERP, CRM & Support`), 6.4 مسار التحصيل والأقساط والمدفوعات والمراجعة والمصروفات, AccountingBudget, CallStatementForm, CallStatementNextAction, CallStatementOutcome, CallStatementPriority, CrmCallLog (+35 more)

### Community 18 - "ContractDetailPage.tsx"
Cohesion: 0.16
Nodes (34): buildContractListColumns(), defaultContractListActions(), filterContractListRows(), reviewOnlyContractListActions(), sortContractsByDateTime(), ContractReviewDecisionPanel(), userHasPermission(), canExchangeContract() (+26 more)

### Community 19 - "permissionCatalog.ts"
Cohesion: 0.10
Nodes (34): isProtectedRoleSlug(), PermissionCard(), PermissionCardProps, PermissionCategorySection(), PermissionCategorySectionProps, PermissionModuleNav(), PermissionModuleNavProps, RolePermissionsEditor() (+26 more)

### Community 20 - "PageHeader"
Cohesion: 0.11
Nodes (39): AccountingAccount, AccountingAccTransMapping, AccountingTransactionLine, CustomerInstallationsSection(), CustomerInstallationsSectionProps, PageHeader(), ToastBanner(), AccountTreeNode (+31 more)

### Community 21 - "HrmEmployeesPage.tsx"
Cohesion: 0.09
Nodes (38): HrmAllowance, HrmJob, HrmUserSalesTarget, ProfileEntityType, ProfilePhotoUploader(), formatAccountingMoney(), EmployeeAccountMode, EmployeeAccountModeField() (+30 more)

### Community 22 - "suspendedPosStore.ts"
Cohesion: 0.13
Nodes (16): zustand@^5.0.14, zustand, money(), repriceDeviceLine(), browserStorage, createSuspendedPosStore(), DraftStorage, empty() (+8 more)

### Community 23 - "PosFlowPage.tsx"
Cohesion: 0.08
Nodes (53): AccessoryCheckoutPayload, CheckoutPayload, Promotion, MyContractsButton(), PosContractSummary(), PosContractSummaryProps, UninstallDeviceHandoverModal(), contractPrintPath() (+45 more)

### Community 24 - "DailyBranchReportPage.tsx"
Cohesion: 0.10
Nodes (38): DailyBranchReport, DailyBranchReportInference, DailyBranchReportPrintDocument(), fmtMoney(), Props, AR_DAYS, arabicDayName(), ATTENDANCE_ROW_COUNT (+30 more)

### Community 25 - "CustomerCreateModal.tsx"
Cohesion: 0.13
Nodes (33): PendingAttachment, uploadCustomerAttachments(), CustomerCreateForm(), emptyForm, CustomerPhoneFields(), CustomerPhoneFieldsProps, TextArea(), TextAreaProps (+25 more)

### Community 26 - "PosOwnershipTransferSection.tsx"
Cohesion: 0.20
Nodes (23): CustomerDeviceHistorySection(), CustomerLegacyDevicesFields(), CustomerLegacyDevicesFieldsProps, deviceLine(), invoiceForDevice(), PosOwnershipTransferSection(), DEVICE_ORIGIN_LABELS, renewalTypeLabels (+15 more)

### Community 27 - "procedureDraftStore.ts"
Cohesion: 0.13
Nodes (21): distributorLabel(), EditableExpenseRequest, EXPENSE_TYPES, ExpenseContract, ExpenseDraft, ExpenseRequestFormProps, ExpenseDetail, draftKey() (+13 more)

### Community 28 - "CrmTasksPage.tsx"
Cohesion: 0.11
Nodes (33): CrmTask, CrmTaskBucket, CrmTaskPriority, CrmTaskStatus, createCrmTask(), CRM_TASK_BUCKET_LABELS, CRM_TASK_PIPELINE_STAGES, CRM_TASK_PRIORITY_LABELS (+25 more)

### Community 29 - "ServiceCombinerPage.tsx"
Cohesion: 0.06
Nodes (58): CustomerContractDevice, Employee, Service, CustomerCreateModal(), CustomerCreateModalProps, CheckoutPaymentSectionProps, DeviceLineDraft, PosContractTypeTabs() (+50 more)

### Community 30 - "administrationScope.ts"
Cohesion: 0.70
Nodes (4): getAdministrationApiFilters(), getAdministrationBranchFilters(), mergeScopedParams(), getScopeApiFilters()

### Community 31 - "MyTasksPage.tsx"
Cohesion: 0.30
Nodes (15): SupportTaskStatus, assignSupportTask(), installationDevicesFromTask(), isInstallationTask(), listSupportTasks(), SUPPORT_STATUS_LABELS, SUPPORT_STATUS_TRANSITIONS, SupportTaskFilters (+7 more)

### Community 32 - "package.json"
Cohesion: 0.09
Nodes (28): dependencies, @floating-ui/react@^0.27.20, @hookform/resolvers@^5.4.0, @icon-park/react@^1.4.2, react@^19.2.6, react-day-picker@^10.0.2, react-hook-form@^7.77.0, react-markdown@^10.1.0 (+20 more)

### Community 33 - "react-router-dom"
Cohesion: 0.10
Nodes (36): react-router-dom, Administration, AdminRole, Section, DeviceHealthCards(), GpsDeviceTable(), GpsDeviceTableProps, GpsKpiRow() (+28 more)

### Community 34 - "AdminSystemSettingsPage.tsx"
Cohesion: 0.07
Nodes (55): 4.1 الهيكل التنظيمي والإعدادات (`Core / Admin`), AdministrationCollectionSettings, AdministrationMessagingSettings, CustomerMessageLogEntry, GeneralSettings, MessagingSettings, OrganizationProfile, OrganizationSettings (+47 more)

### Community 35 - "digitInput.ts"
Cohesion: 0.06
Nodes (49): attachLoadingInterceptors(), finishTrackedRequest(), axiosPortal, PortalUser, App(), BranchSetupGate(), SetupStatus, ContentLoader() (+41 more)

### Community 36 - "AdminActivityLogPage.tsx"
Cohesion: 0.17
Nodes (23): ActivityLogEntry, ActivityLogInsights, computeActivityLogInsights(), exportActivityLogCsv(), startOfDay(), ACTION_LABELS, ActivityAction, DESCRIPTIONS (+15 more)

### Community 37 - "InstallmentCollectionPanel.tsx"
Cohesion: 0.12
Nodes (30): DateTimeInput12hProps, hourOptions, minuteOptions, InstallmentCollectionPanel(), InstallmentCollectionPanelEmpty(), installmentTotalDue(), paymentMethodOptions, PaymentRow (+22 more)

### Community 38 - "collectionHelpers.ts"
Cohesion: 0.17
Nodes (23): collectionStatusFilterOptions, computeContractStats(), ContractCollectionStats, contractFilterTier(), contractTierFilterOptions, dateOnly(), filterInstallmentCollectionRows(), filterRowsByContractTier() (+15 more)

### Community 39 - "CeoInstallationList.tsx"
Cohesion: 0.18
Nodes (14): CeoDashboardFollowUp, CeoDashboardInstallationItem, CeoCard(), CeoCardProps, CeoFollowUpList(), CeoFollowUpListProps, chipFor(), displayTitle() (+6 more)

### Community 40 - "devDependencies"
Cohesion: 0.08
Nodes (27): devDependencies, eslint@^10.3.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1, eslint-plugin-react-refresh@^0.5.2, globals@^17.6.0, jsdom@^31.0.0, tailwindcss@^4.3.0 (+19 more)

### Community 41 - "ContractPrintActions.tsx"
Cohesion: 0.39
Nodes (8): ContractPrintActions(), ContractPrintActionsProps, deviceLines(), printLabel(), InvoiceContractSummary, isServiceInvoiceLine(), ownershipTransferContractPrintPath(), usesServiceContractPrint()

### Community 42 - "CollectionAssignmentsPage.tsx"
Cohesion: 0.20
Nodes (10): CollectionWorkloadRow, CollectorOption, FirstDueStatus, firstDueStatusLabels, firstDueStatusOptions, AssignmentBranchCard(), AssignmentBranchStats, AssignmentContract (+2 more)

### Community 43 - "InstallmentCollectionGroupedList.tsx"
Cohesion: 0.14
Nodes (27): CollectionActionsSummary, ContractCollectionActions(), summaryQueryKey(), useCollectionActionsSummary(), ContractAllInstallmentsTable(), ContractExpandView, ContractMetaCell(), ContractOptionsMenu() (+19 more)

### Community 44 - "InstallmentCollectionPage.tsx"
Cohesion: 0.09
Nodes (37): AdminUser, CollectionPaymentAccount, CollectionFollowUpSidebar(), CollectionFollowUpSidebarProps, ContractGroup, InstallmentCollectionPanelProps, buildCollectionFollowUpPayload(), collectorFilterParam() (+29 more)

### Community 45 - "Icon"
Cohesion: 0.09
Nodes (101): DistributorCommissionLedgerEntry, AppRoutes(), PortalProtectedRoute(), PortalPublicRoute(), ProtectedRoute(), PublicRoute(), RedirectEmployeeReportToOwner(), AsyncState() (+93 more)

### Community 46 - "DeviceLineCard.tsx"
Cohesion: 0.10
Nodes (47): CashInstallmentScheduleEditor(), CashInstallmentScheduleEditorProps, CashScheduleSelector(), CashScheduleSelectorProps, DeviceLineFieldErrors, IntervalType, lineInstallmentCount(), lineNetTotal() (+39 more)

### Community 47 - "ClosedContractCorrectionEditor.tsx"
Cohesion: 0.20
Nodes (12): ClosedContractCorrectionEditor(), CorrectionLine, Field, fields, ContractExecutionBranchEditor(), canAccessBranch(), contractCaseStatusLabels, contractCaseTypeLabels (+4 more)

### Community 48 - "AppShell.tsx"
Cohesion: 0.09
Nodes (34): 1.3 سلوك الشاشات الصغيرة والموبايل والقوائم الثابتة والمختصرة, الشريط العلوي المثبت (`sticky top-0 z-40`) والأشرطة المساعدة, القائمة الجانبية (`AppShell.tsx` + `SidebarNav.tsx`), تفعيل/تعطيل الوحدات (`enabled_modules`), شريط التنقل السفلي للموبايل (`MobileBottomNav.tsx`) والقوائم المختصرة, AccessoryWarehouseStock, AppNotification, accessoryAvailable() (+26 more)

### Community 49 - "printPaymentReceipt.ts"
Cohesion: 0.48
Nodes (5): PAYMENT_RECEIPT_PRINT_CSS, absolutizeImageSources(), buildPrintDocument(), printPaymentReceiptElement(), waitForIframeReady()

### Community 50 - "permissions.ts"
Cohesion: 0.15
Nodes (24): AuthUser, NavIcon(), NavIconProps, SidebarNav(), SidebarNavProps, SidebarNavGroup(), SidebarNavGroupProps, SidebarNavItem() (+16 more)

### Community 51 - "AppDatePicker"
Cohesion: 0.13
Nodes (13): Application date picker, Dependencies, New files, Updated UI files, Usage, Verification, AppDatePicker(), choose() (+5 more)

### Community 52 - "BranchDetailPage.tsx"
Cohesion: 0.18
Nodes (18): GpsStock, BranchInventoryTable(), BranchInventoryTableProps, BranchKpiGrid(), BranchKpiGridProps, BranchOperationsPanel(), BranchOperationsPanelProps, BranchPageHeader() (+10 more)

### Community 53 - "UserManualPage.tsx"
Cohesion: 0.18
Nodes (18): countManualMatches(), manualHeadingId(), ManualSection, manualSectionsMatching(), ManualSubsection, ParsedManual, parseManual(), toSection() (+10 more)

### Community 54 - "Task 6 Report: Frontend — contract tab + status label"
Cohesion: 0.18
Nodes (9): OwnershipTransferSourceLink(), Task 6: Frontend — contract tab + status label, Behavior, Concerns, Files, Review follow-up (Task 6 finding), Task 6 Report: Frontend — contract tab + status label, Test evidence (+1 more)

### Community 55 - "usePageTour.ts"
Cohesion: 0.15
Nodes (25): StartTourButton(), StartTourButtonProps, buildShepherdTour(), cancelActiveTour(), runTour(), StartTourOptions, usePageTour(), useTourRunner() (+17 more)

### Community 56 - "ContractTemplatePreviewPage.tsx"
Cohesion: 0.15
Nodes (19): ContractTemplate, CONTRACT_TEMPLATES, contractTemplateLabel(), mockContractPreviewHtml(), sampleOwnershipTransferInvoice(), sampleServiceReceiptInvoice(), TEMPLATE_LABELS, absolutizeCssUrls() (+11 more)

### Community 57 - "normalizeDigits.ts"
Cohesion: 0.19
Nodes (20): DiscountInput(), DiscountInputProps, OptionalDiscountFields(), OptionalDiscountFieldsProps, PosDevicesToolbar(), PosDevicesToolbarProps, posControlHeightClass, PosMoneyInputProps (+12 more)

### Community 58 - "CollectionFollowUpHistoryModal.tsx"
Cohesion: 0.38
Nodes (6): CollectionFollowUpLog, CollectionFollowUpHistoryModal(), CollectionFollowUpHistoryModalProps, installmentGroupKey(), installmentGroupLabel(), collectionStatusLabels

### Community 59 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 60 - "format.ts"
Cohesion: 0.24
Nodes (14): fmtContractDateTime(), clock12(), DISPLAY_LOCALE, DISPLAY_TIMEZONE, formatCairoDateTime12h(), formatCalendarYmd(), formatDate(), formatDateTime() (+6 more)

### Community 61 - "ownershipTransferFinancialBreakdown.ts"
Cohesion: 0.24
Nodes (16): buildOwnershipTransferFinancialBreakdown(), buildScheduleFromPlan(), collectedOnDisplayedLines(), DISPLAYED_FEE_CATEGORIES, findNextUnpaidSourceItem(), findTransferServiceInstallmentPlan(), intervalLabel(), isDeferredCash() (+8 more)

### Community 62 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 63 - "ContractFollowUpTab.tsx"
Cohesion: 0.36
Nodes (8): ContractFollowUpTab(), ContractFollowUpTabProps, FollowUpForm(), FollowUpLogCard(), installmentGroupKey(), installmentGroupLabel(), collectionStatusOptions, getInstallmentNumber()

### Community 64 - "CeoPeriodToggle.tsx"
Cohesion: 0.15
Nodes (13): DashboardBranchOption, DashboardPeriod, DashboardPeriodFilter(), DashboardPeriodFilterProps, invoicesLabelForPeriod(), options, salesLabelForPeriod(), CeoDashboardPeriod (+5 more)

### Community 65 - "pageStats.ts"
Cohesion: 0.13
Nodes (20): DashboardStats, InsightVariant, branchAdminName(), BranchKpis, computeBranchByDeptData(), computeBranchInsights(), computeDashboardStockBarData(), computeDepartmentBarData() (+12 more)

### Community 66 - "EmployeeAttachmentsSection.tsx"
Cohesion: 0.17
Nodes (19): MediaFile, CustomerAttachmentsSection(), CustomerAttachmentsSectionProps, formatFileSize(), getMediaDisplayName(), ensureAbsoluteUrl(), getApiOrigin(), isImageMimeType() (+11 more)

### Community 67 - "PaymentsPage.tsx"
Cohesion: 0.06
Nodes (36): KpiCard(), KpiCardProps, PaginationProps, PaymentOriginLink(), RefundPaymentTarget, openPaymentReceiptPrint(), ExpenseRow, ExpensesListResponse (+28 more)

### Community 68 - "Tour"
Cohesion: 0.13
Nodes (5): shepherd.js, StepButton, StepOptions, Tour, TourOptions

### Community 69 - "DESIGN.md"
Cohesion: 0.14
Nodes (13): Brand & Style, Breadcrumbs, Buttons, Colors, Components, Data Tables, Elevation & Depth, KPI Cards (+5 more)

### Community 70 - "CrmOwnerDetailPage.tsx"
Cohesion: 0.12
Nodes (32): ActivitiesBoardCallRow, ActivitiesBoardInstallationRow, ActivitiesBoardResponse, ActivitiesBoardTaskRow, OwnerDetailResponse, OwnerPipelineOwnerRow, OwnerPipelineResponse, OwnerPipelineStatusRow (+24 more)

### Community 71 - "CustomerPublicProfilePage.tsx"
Cohesion: 0.16
Nodes (13): CustomerPublicProfilePage(), formatDate(), formatMoney(), installmentStatusMeta, paymentMethodLabels, PublicContract, PublicContractLine, PublicCustomerProfileResponse (+5 more)

### Community 72 - "crmPageVisibility.ts"
Cohesion: 0.07
Nodes (42): AdministrationCrmPageSettings, DemoRole, BotMessage, ChatResponse, HistoryEntry, SUGGESTIONS, isAnyAdmin(), navLabels() (+34 more)

### Community 73 - "SalesInvoice"
Cohesion: 0.16
Nodes (13): applyWizardDraft(), CancelPreview, CancelPreviewPayment, CaseType, ContractCaseRecord, ContractProblemWizard(), ContractProblemWizardProps, originalPaymentLabel() (+5 more)

### Community 74 - "SyncDebugPage.tsx"
Cohesion: 0.18
Nodes (11): BranchOutboxResponse, CloudBranchInfo, CloudChangeRow, CloudInboxRow, CloudPendingResponse, formatDate(), OutboxItem, SyncCheckpoint (+3 more)

### Community 75 - "vite.config.ts"
Cohesion: 0.18
Nodes (7): @tailwindcss/vite@^4.3.0, vite@^8.0.12, @vitejs/plugin-react@^6.0.1, @tailwindcss/vite, vite, @vitejs/plugin-react, appDir

### Community 76 - "1.3 سلوك الشاشات الصغيرة والموبايل والقوائم الثابتة والمختصرة"
Cohesion: 0.40
Nodes (5): 1.1 الهدف الأساسي للنظام: ما يفعله وما لا يفعله, 1.2 اللغة واتجاه الواجهة وتطبيع الأرقام, 1. نظرة عامة على النظام والبيئة, السلوك الطبيعي, المعمارية وأوضاع التشغيل

### Community 77 - "ContractReviewDetails.tsx"
Cohesion: 0.23
Nodes (24): CashDueList(), ContractKindReviewNotice(), ContractReviewDetails(), CustomerField(), DeviceDetailCard(), DeviceIdentifiersTable(), FinancialSummaryCard(), hasAmount() (+16 more)

### Community 78 - "ownershipTransferFeePlans.ts"
Cohesion: 0.18
Nodes (15): vitest@^3.2.4, vitest, AllocatedOwnershipTransferFeeLine, allocateOwnershipTransferFeePlans(), AllocateOwnershipTransferFeePlansInput, buildFeeEntries(), cashLine(), installmentLine() (+7 more)

### Community 79 - "ReferralNetworkTree.tsx"
Cohesion: 0.26
Nodes (13): ReferralNetworkNode, CRM_INPUT, ChildRow(), formatRate(), formatSales(), initials(), MetricCell(), NetworkNodeCard() (+5 more)

### Community 80 - "useEnterToNextField.ts"
Cohesion: 0.40
Nodes (7): EnterNavigableField, findNextEnterNavigableField(), handleEnterToNextField(), isEnterNavigableField(), isVisibleInForm(), listEnterNavigableFields(), useEnterToNextField()

### Community 81 - "contractFields.test.ts"
Cohesion: 0.16
Nodes (9): 4.5 الأقساط والمدفوعات والتحصيل والمراجعة والمصروفات والبيان اليومي (`Financial Ops`), 6.1 إنشاء وتأكيد وتعديل وحذف التعاقدات (`POS & Contracts`), InstallmentItem, InstallmentPlan, PaymentTransaction, ContractPaymentSummary, installmentTableColumnCount(), LineFinancialSummary (+1 more)

### Community 82 - "PricingCatalogPage.tsx"
Cohesion: 0.16
Nodes (17): AccessoryPackage, ProductModel, ServiceCategory, CATEGORY_LABELS, SERVICE_CATEGORIES, serviceCategoryLabel(), CatalogSection, DevicePriceGuide() (+9 more)

### Community 83 - "ProfileAvatar.tsx"
Cohesion: 0.22
Nodes (8): getInitials(), iconSizes, ProfileAvatarProps, ProfileAvatarVariant, sizeClasses, variantIcons, variantStyles, ProfilePhotoUploaderProps

### Community 84 - "GPS App (Sales-App)"
Cohesion: 0.22
Nodes (7): Docker, Environment, GPS App (Sales-App), Handover notes, Local, Requirements, Scripts

### Community 85 - "SalesInvoiceLine"
Cohesion: 0.09
Nodes (24): SalesInvoice, SalesInvoiceLine, ContractListColumnOptions, ContractReviewDecisionPanelProps, ContractReviewDetailsProps, Props, InstallmentContractDocumentProps, OwnershipTransferContractDocumentProps (+16 more)

### Community 86 - "HrmDashboardPage.tsx"
Cohesion: 0.11
Nodes (27): HrmDashboard, BarChartPanel(), BarChartPanelProps, BarSeries, DonutChartPanel(), DonutChartPanelProps, DonutSlice, GaugeChartPanel() (+19 more)

### Community 87 - "roleCatalog.ts"
Cohesion: 0.22
Nodes (7): getRoleLabel(), formatUserRolesLabel(), MANAGER_DENIED_PERMISSIONS, PROTECTED_ROLE_SLUGS, ROLE_ASSIGNMENT_EXCLUDED, SYSTEM_ROLE_LABELS, SYSTEM_ROLE_PAGE_HINTS

### Community 88 - "PaymentReceiptDocument.tsx"
Cohesion: 0.36
Nodes (7): PaymentTransactionReceipt, formatPaidAt(), paymentMethodLabels, PaymentReceiptDocument, paymentSourceLabels, Props, receivingAccountLabel()

### Community 89 - "7. قواعد الحسابات والمنطق المالي والتجاري (Business & Calculation Rules)"
Cohesion: 0.33
Nodes (6): 7.1 التسعير والعروض الترويجية, 7.2 الأقساط، الغرامات، أولويات التوزيع، والتسويات, 7.3 البيان اليومي للفرع (`DailyBranchReportInferenceService`), 7.4 المحاسبة (`Accounting`), 7.5 الموارد البشرية والرواتب (`HRM PayrollCalculator`), 7. قواعد الحسابات والمنطق المالي والتجاري (Business & Calculation Rules)

### Community 90 - "PosOwnershipTransferSection.tsx"
Cohesion: 0.14
Nodes (20): DeviceOrigin, digitsOnly(), GpsUsernameInput(), GpsUsernameInputProps, buildRegisterCustomerDevicePayload(), ContractDeviceOption, CustomerContractDevicePickerProps, MANUAL_CONTRACT_DEVICE_ID (+12 more)

### Community 91 - "CrmCeoDashboardPage.tsx"
Cohesion: 0.11
Nodes (22): CeoDashboard, CeoDashboardLeadsBreakdown, LineChartPanel(), LineChartPanelProps, LineSeries, CeoFunnelBars(), CeoFunnelBarsProps, DEFAULT_COLORS (+14 more)

### Community 92 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, preview, test

### Community 93 - "ContractPaymentsTab.tsx"
Cohesion: 0.24
Nodes (13): ContractPaymentsTab(), ContractPaymentsTabProps, formatPaymentMethod(), installmentLabel(), paymentMethodLabels, recordedOrMissing(), AuditList(), methods (+5 more)

### Community 94 - "CeoEmployeeRankList.tsx"
Cohesion: 0.60
Nodes (4): CeoDashboardTopEmployee, CeoEmployeeRankList(), CeoEmployeeRankListProps, initialOf()

### Community 95 - "FunnelPanel.tsx"
Cohesion: 0.40
Nodes (3): DEFAULT_COLORS, FunnelPanelProps, FunnelStage

### Community 96 - "FilterBar.tsx"
Cohesion: 0.16
Nodes (12): FilterBarProps, FilterField(), FilterMultiSelect(), FilterMultiSelectConfig, FilterSelectConfig, FilterSelectOption, multiSelectSummary(), DIRECTION_OPTIONS (+4 more)

### Community 97 - "5. دورات الحياة وحالات التحوّل (Lifecycles & State Transitions)"
Cohesion: 0.38
Nodes (7): 5.1 دورة حياة العقد والفاتورة والمراجعة (`SalesInvoice`, `ContractStatus`, `Review`), 5.4 دورة حياة الأقساط والتصالح والمدفوعات ومراجعة التحصيل (`Installments`, `Payments`, `Review`), 5.5 دورة حياة المصروفات ومديونيات الموظفين والتقييمات (`Expenses`, `EmployeeDebt`, `Evaluations`), 5.6 دورة حياة CRM و HRM والمحاسبة والدعم والرسائل والمزامنة, 5. دورات الحياة وحالات التحوّل (Lifecycles & State Transitions), HrmPayrollGroup, draft()

### Community 98 - "getUserRole"
Cohesion: 0.70
Nodes (5): getUserRole(), hasReviewerRole(), hasRole(), roleLabelsAr(), roleNames()

### Community 99 - "formatNumber"
Cohesion: 0.50
Nodes (4): formatCount(), formatCount(), formatNumber(), toFiniteNumber()

### Community 100 - "git-frontend.sh"
Cohesion: 0.50
Nodes (3): GIT_CONFIG_GLOBAL, GIT_WORK_TREE, git-frontend.sh script

### Community 101 - "HrmStatCard.tsx"
Cohesion: 0.50
Nodes (3): accentStyles, HrmStatCardProps, StatAccent

### Community 106 - "المرجع التفصيلي الشامل لنظام GPS للمبيعات (Exhaustive System Specification)"
Cohesion: 0.17
Nodes (11): 2.1 الأدوار النظامية المحمية (11 دوراً في `SystemRoleCatalog`), 2.2 قوائم الحظر والاستثناءات (Denylists & Assignment Exclusions), 2.3 تخصيص صلاحيات الأدوار على مستوى الإدارة (`administration_role_permission_overrides`), 2.4 الكتالوج الكامل لمفاتيح الصلاحيات (من `RolePermissionSeeder` و `InventoryPermissionMap`), 2.5 سياق ونطاق البيانات (Data Scoping Rules), 2.6 الاستثناءات والقواعد الخاصة بالصلاحيات, 2. الأدوار والصلاحيات وسياق البيانات (RBAC & Scope), 3.1 المسارات الظاهرة في الشريط الجانبي (Sidebar-Visible Routes) (+3 more)

### Community 107 - "CompleteTaskModal.tsx"
Cohesion: 0.50
Nodes (3): CompleteTaskModalProps, InstallationHandoverDevice, InstallationHandoverItem

### Community 108 - "CustomerOwnershipTransfersSection.tsx"
Cohesion: 0.27
Nodes (10): 5.2 دورة حياة مشاكل العقود ونقل الملكية (`ContractCase`, `OwnershipTransfer`), OwnershipTransfer, OwnershipTransferStatus, CollapsibleSection(), CollapsibleSectionProps, CustomerOwnershipTransfersSection(), CustomerOwnershipTransfersSectionProps, paidInstallmentsTable() (+2 more)

### Community 109 - "react-dom"
Cohesion: 0.47
Nodes (3): react-dom@^19.2.6, react-dom, ContractActionsMenu()

### Community 110 - "SupportTask"
Cohesion: 0.17
Nodes (12): 6.2 مسار مشاكل العقود (`ContractCases`), 6.3 مسار المخزون وحركات الأجهزة والعهد والصيانة, 6.5 مسار المحاسبة و HRM و CRM والبوابة, 6. العمليات والـ Workflows التفصيلية خطوة بخطوة, 8.1 القيم الحدية وتطبيع المدخلات وتعارض الحالات, 8.2 وضع الفروع الأوفلاين والمزامنة (`Offline Branch Mode & Sync`), 8.3 الحذف الناعم، سلة المهملات، وسجل التدقيق (`Trash & Audit Log`), 8.4 الأمان، عزل التوكنات، التزامن، وأخطاء الشبكة والـ API (+4 more)

### Community 111 - "axios"
Cohesion: 0.53
Nodes (4): axios@^1.17.0, axios, posContextFailure(), PosContextUnavailableError

### Community 114 - "UpcomingLeavesList.tsx"
Cohesion: 0.39
Nodes (6): HrmLeave, HrmLeaveType, initials(), UpcomingLeavesList(), UpcomingLeavesListProps, hrmLeaveTypeLabel()

## Knowledge Gaps
- **2 isolated node(s):** `GIT_WORK_TREE`, `GIT_CONFIG_GLOBAL`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 739 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `useAuthStore`, `StatusBadge`, `api/types.ts`, `PosPage.tsx`, `BranchInventoryPage.tsx`, `ServiceCombinerPage.tsx`, `CustomerContractsSection.tsx`, `CrmOwnerDetailPage.tsx`, `CrmReferralsListPage.tsx`, `getErrorMessage`, `InstallmentContractDocument.tsx`, `CrmReferralsListPage.tsx`, `Branch`, `CrmCallLogsPage.tsx`, `ContractDetailPage.tsx`, `permissionCatalog.ts`, `PageHeader`, `HrmEmployeesPage.tsx`, `PosFlowPage.tsx`, `DailyBranchReportPage.tsx`, `CustomerCreateModal.tsx`, `PosOwnershipTransferSection.tsx`, `procedureDraftStore.ts`, `CrmTasksPage.tsx`, `ServiceCombinerPage.tsx`, `MyTasksPage.tsx`, `package.json`, `react-router-dom`, `AdminSystemSettingsPage.tsx`, `digitInput.ts`, `AdminActivityLogPage.tsx`, `InstallmentCollectionPanel.tsx`, `CeoInstallationList.tsx`, `CollectionAssignmentsPage.tsx`, `InstallmentCollectionGroupedList.tsx`, `InstallmentCollectionPage.tsx`, `Icon`, `DeviceLineCard.tsx`, `ClosedContractCorrectionEditor.tsx`, `AppShell.tsx`, `permissions.ts`, `AppDatePicker`, `BranchDetailPage.tsx`, `UserManualPage.tsx`, `usePageTour.ts`, `ContractTemplatePreviewPage.tsx`, `normalizeDigits.ts`, `ContractFollowUpTab.tsx`, `EmployeeAttachmentsSection.tsx`, `PaymentsPage.tsx`, `CrmOwnerDetailPage.tsx`, `CustomerPublicProfilePage.tsx`, `crmPageVisibility.ts`, `SalesInvoice`, `SyncDebugPage.tsx`, `ReferralNetworkTree.tsx`, `useEnterToNextField.ts`, `PricingCatalogPage.tsx`, `PaymentReceiptDocument.tsx`, `PosOwnershipTransferSection.tsx`, `CrmCeoDashboardPage.tsx`, `ContractPaymentsTab.tsx`, `FilterBar.tsx`, `CompleteTaskModal.tsx`, `CustomerOwnershipTransfersSection.tsx`, `react-dom`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **What connects `GIT_WORK_TREE`, `GIT_CONFIG_GLOBAL` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useAuthStore` be split into smaller, more focused modules?**
  _Cohesion score 0.07668231611893583 - nodes in this community are weakly interconnected._
- **Why does `Icon()` connect `Icon` to `useAuthStore`, `StatusBadge`, `PosPage.tsx`, `ServiceCombinerPage.tsx`, `CustomerContractsSection.tsx`, `react`, `CrmReferralsListPage.tsx`, `getErrorMessage`, `InstallmentContractDocument.tsx`, `CrmReferralsListPage.tsx`, `Branch`, `departmentDashboard.ts`, `ContractDetailPage.tsx`, `permissionCatalog.ts`, `PageHeader`, `HrmEmployeesPage.tsx`, `PosFlowPage.tsx`, `DailyBranchReportPage.tsx`, `CustomerCreateModal.tsx`, `PosOwnershipTransferSection.tsx`, `CrmTasksPage.tsx`, `ServiceCombinerPage.tsx`, `react-router-dom`, `AdminSystemSettingsPage.tsx`, `digitInput.ts`, `AdminActivityLogPage.tsx`, `InstallmentCollectionPanel.tsx`, `CeoInstallationList.tsx`, `ContractPrintActions.tsx`, `CollectionAssignmentsPage.tsx`, `InstallmentCollectionGroupedList.tsx`, `InstallmentCollectionPage.tsx`, `DeviceLineCard.tsx`, `AppShell.tsx`, `permissions.ts`, `BranchDetailPage.tsx`, `UserManualPage.tsx`, `usePageTour.ts`, `ContractTemplatePreviewPage.tsx`, `normalizeDigits.ts`, `EmployeeAttachmentsSection.tsx`, `PaymentsPage.tsx`, `CrmOwnerDetailPage.tsx`, `CustomerPublicProfilePage.tsx`, `crmPageVisibility.ts`, `SalesInvoice`, `ProfileAvatar.tsx`, `HrmDashboardPage.tsx`, `CrmCeoDashboardPage.tsx`, `CeoEmployeeRankList.tsx`, `FilterBar.tsx`, `HrmStatCard.tsx`, `CustomerOwnershipTransfersSection.tsx`, `UpcomingLeavesList.tsx`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Should `StatusBadge` be split into smaller, more focused modules?**
  _Cohesion score 0.06077694235588972 - nodes in this community are weakly interconnected._
- **Why does `useAuthStore` connect `useAuthStore` to `StatusBadge`, `PosPage.tsx`, `BranchInventoryPage.tsx`, `ServiceCombinerPage.tsx`, `CustomerContractsSection.tsx`, `react`, `getErrorMessage`, `InstallmentContractDocument.tsx`, `CrmReferralsListPage.tsx`, `Branch`, `ContractDetailPage.tsx`, `PageHeader`, `HrmEmployeesPage.tsx`, `PosFlowPage.tsx`, `DailyBranchReportPage.tsx`, `CustomerCreateModal.tsx`, `PosOwnershipTransferSection.tsx`, `procedureDraftStore.ts`, `ServiceCombinerPage.tsx`, `MyTasksPage.tsx`, `react-router-dom`, `AdminSystemSettingsPage.tsx`, `InstallmentCollectionPanel.tsx`, `InstallmentCollectionGroupedList.tsx`, `InstallmentCollectionPage.tsx`, `Icon`, `ClosedContractCorrectionEditor.tsx`, `AppShell.tsx`, `BranchDetailPage.tsx`, `usePageTour.ts`, `PaymentsPage.tsx`, `CrmOwnerDetailPage.tsx`, `crmPageVisibility.ts`, `SalesInvoice`, `HrmDashboardPage.tsx`, `ContractPaymentsTab.tsx`, `FilterBar.tsx`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Should `api/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.02566158781074579 - nodes in this community are weakly interconnected._