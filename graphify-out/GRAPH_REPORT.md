# Graph Report - Sales-App  (2026-11-27)

## Corpus Check
- 530 files · ~329,138 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 25 file(s) not represented in the graph (top: .css 12, (none) 8, .ttf 3)

## Summary
- 3147 nodes · 14266 edges · 109 communities (105 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 109 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b96e9220`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- react
- useAuthStore
- api/types.ts
- PosPage.tsx
- BranchInventoryPage.tsx
- ServiceCombinerPage.tsx
- CustomerContractsSection.tsx
- contractFields.ts
- Icon
- CrmOwnerDetailPage.tsx
- NumericInput
- Modal.tsx
- InstallmentContractDocument.tsx
- CrmReferralsListPage.tsx
- Branch
- registry.ts
- departmentDashboard.ts
- CrmCallLogsPage.tsx
- ContractDetailPage.tsx
- permissionCatalog.ts
- PageHeader.tsx
- HrmSalesTargetsPage.tsx
- HrmEmployeeDetailPage.tsx
- PosFlowPage.tsx
- DailyBranchReportPage.tsx
- CustomerCreateModal.tsx
- PosOwnershipTransferSection.tsx
- MyTasksPage.tsx
- CrmTasksPage.tsx
- vitest
- posFormStyles.ts
- CrmCeoDashboardPage.tsx
- package.json
- DepartmentDetailPage.tsx
- AdminSystemSettingsPage.tsx
- review/api.ts
- AdminActivityLogPage.tsx
- InstallmentCollectionPanel.tsx
- collectionHelpers.ts
- crmNavCatalog.ts
- devDependencies
- sales.ts
- CollectionAssignmentsPage.tsx
- InstallmentCollectionGroupedList.tsx
- InstallmentCollectionPage.tsx
- routes.tsx
- DeviceLineCard.tsx
- CustomerComplaintsSection.tsx
- AppShell.tsx
- printPaymentReceipt.ts
- permissions.ts
- AppDatePicker
- BranchDetailPage.tsx
- UserManualPage.tsx
- formatArNumber
- usePageTour.ts
- ContractTemplatePreviewPage.tsx
- normalizeDigits.ts
- InstallmentCollectionPanel.tsx
- compilerOptions
- format.ts
- ownershipTransferFinancialBreakdown.ts
- compilerOptions
- DashboardPage.tsx
- pageStats.ts
- EmployeeAttachmentsSection.tsx
- ContractFollowUpTab.tsx
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
- PaymentReceiptPrintPage.tsx
- ReferralNetworkTree.tsx
- useEnterToNextField.ts
- InstallmentContractDocument.tsx
- PricingCatalogPage.tsx
- ProfileAvatar.tsx
- GPS App (Sales-App)
- HrmDashboardPage.tsx
- PosOwnershipTransferSection.tsx
- CrmCeoDashboardPage.tsx
- scripts
- CustomerComplaintsSection.tsx
- CeoEmployeeRankList.tsx
- FunnelPanel.tsx
- InvoicesPage.tsx
- services.ts
- CeoFunnelBars.tsx
- git-frontend.sh
- tourStore.ts
- vite-env.d.ts
- tsconfig.json
- entrypoint.sh
- vercel.json
- المرجع التفصيلي الشامل لنظام GPS للمبيعات (Exhaustive System Specification)
- ContractPaymentsTab.tsx
- DemoRole
- roleCatalog.ts
- EvaluationRecordPage.tsx
- TourProvider.tsx
- UpcomingLeavesList.tsx
- 7. قواعد الحسابات والمنطق المالي والتجاري (Business & Calculation Rules)
- 8.3 الحذف الناعم، سلة المهملات، وسجل التدقيق (`Trash & Audit Log`)

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
10. `react-router-dom` - 125 edges

## Surprising Connections (you probably didn't know these)
- `8.4 الأمان، عزل التوكنات، التزامن، وأخطاء الشبكة والـ API` --references--> `ProductUnit`  [INFERRED]
  docs/client-user-manual-ar.md → src/api/types.ts
- `2.6 الاستثناءات والقواعد الخاصة بالصلاحيات` --references--> `userCanCrud()`  [INFERRED]
  docs/client-user-manual-ar.md → src/lib/access.ts
- `4.1 الهيكل التنظيمي والإعدادات (`Core / Admin`)` --references--> `Administration`  [INFERRED]
  docs/client-user-manual-ar.md → src/api/types.ts
- `4.3 المخزون والأجهزة وحركات الأجهزة والعهد والإكسسوارات (`Inventory`)` --references--> `DepartmentStock`  [INFERRED]
  docs/client-user-manual-ar.md → src/api/types.ts
- `4.3 المخزون والأجهزة وحركات الأجهزة والعهد والإكسسوارات (`Inventory`)` --references--> `DeviceMovement`  [INFERRED]
  docs/client-user-manual-ar.md → src/api/types.ts

## Import Cycles
- 2-file cycle: `src/lib/activeBranch.ts -> src/lib/dataScope.ts -> src/lib/activeBranch.ts`
- 2-file cycle: `src/components/pos/DeviceLineCard.tsx -> src/components/pos/useDeviceLineEditor.ts -> src/components/pos/DeviceLineCard.tsx`

## Communities (109 total, 4 thin omitted)

### Community 0 - "react"
Cohesion: 0.05
Nodes (73): 5.3 دورة حياة وحدات المخزون وحركات الأجهزة (`ProductUnit`, `DeviceMovement`, `StockTransfer`), axios, react, react-router-dom, @tanstack/react-query, api, axiosApi, AccessoryPackage (+65 more)

### Community 1 - "useAuthStore"
Cohesion: 0.07
Nodes (58): ContractExecutionBranchEditor(), DeleteConfirmDialog(), DeleteConfirmDialogProps, CustomerCallTimelineSection(), CustomerCallTimelineSectionProps, formatDuration(), CustomerComplaintsSection(), CustomerEvaluationsSection() (+50 more)

### Community 2 - "api/types.ts"
Cohesion: 0.03
Nodes (87): AccessoryPackageItem, AccountingAccountType, AccountingBudget, AccountingDashboard, AccountPrimaryType, ActivitiesBoardCallRow, ActivitiesBoardInstallationRow, ActivitiesBoardResponse (+79 more)

### Community 3 - "PosPage.tsx"
Cohesion: 0.06
Nodes (56): ContractKind, GpsProduct, SubscriptionRenewalCandidate, GpsProductCardProps, CheckoutPaymentSection(), CheckoutPaymentSectionProps, DeviceLineCardProps, PosContractHeader() (+48 more)

### Community 4 - "BranchInventoryPage.tsx"
Cohesion: 0.08
Nodes (44): 4.3 المخزون والأجهزة وحركات الأجهزة والعهد والإكسسوارات (`Inventory`), react-dom, CustodyVoucher, DepartmentStock, ProductUnit, ContractActionsMenu(), BranchInventoryUnitForm(), CustodyVoucherDetails() (+36 more)

### Community 5 - "ServiceCombinerPage.tsx"
Cohesion: 0.07
Nodes (75): CheckoutPayload, Service, ServiceCategory, CustodyVoucherForm(), CustodyVoucherModalProps, RecipientType, PosContractTypeTabs(), PosContractTypeTabsProps (+67 more)

### Community 6 - "CustomerContractsSection.tsx"
Cohesion: 0.16
Nodes (28): ContractInstallmentsTab(), SummaryCard(), CustomerContractsSection(), CustomerContractsSectionProps, showInvoiceStatusBadge(), STATUS_FILTER_OPTIONS, assertPaymentVerification(), buildContractSummary() (+20 more)

### Community 7 - "contractFields.ts"
Cohesion: 0.08
Nodes (43): InstallmentPlan, addCalendarMonths(), AR_WEEKDAYS, buildInstallmentRows(), CashDuePayment, cashDuePayments(), cashReviewRows(), cashScheduleLabel() (+35 more)

### Community 8 - "Icon"
Cohesion: 0.06
Nodes (112): getErrorMessage(), axiosPortal, portalApi, HrmJob, HrmLeaveType, HrmPayrollRecord, PaginatedResponse, Section (+104 more)

### Community 9 - "CrmOwnerDetailPage.tsx"
Cohesion: 0.10
Nodes (36): OwnerLeaderboardResponse, OwnerLeaderboardRow, OwnerLeaderboardSort, ReferralLeadReport, ReferralLeadReportByUser, ReferralLeadReportSummary, CrmKpiCard(), CrmKpiCardProps (+28 more)

### Community 10 - "NumericInput"
Cohesion: 0.12
Nodes (23): AccessoryWarehouseStock, ProductModel, NumericInput(), NumericInputProps, HrmSettingsPage(), emptyForm, nextAccessoryCode(), AccessoriesSalesPage() (+15 more)

### Community 11 - "Modal.tsx"
Cohesion: 0.06
Nodes (63): Administration, Department, AddStockForm(), AddStockFormProps, invalidateStockQueries(), ChartCard(), ChartCardProps, CollapsibleSectionProps (+55 more)

### Community 12 - "InstallmentContractDocument.tsx"
Cohesion: 0.10
Nodes (35): ContractPrintBorder(), ContractPrintFooter(), ContractPrintFooterProps, ContractPrintHeader(), ContractPrintHeaderProps, card(), infoRow(), OwnershipTransferContractDocument() (+27 more)

### Community 13 - "CrmReferralsListPage.tsx"
Cohesion: 0.10
Nodes (52): ReferralLead, ReferralLeadStatus, ReferralLeadTimelineEvent, CustomerReferralsSection(), CustomerReferralsSectionProps, DateTimeInput12h(), useDebouncedValue(), CrmLeadDrawer() (+44 more)

### Community 14 - "Branch"
Cohesion: 0.08
Nodes (55): 4.2 العملاء والموزعون (`Customers & Distributors`), Branch, Customer, Distributor, Employee, SalesRep, CustomerCreateModal(), DeviceLineDraft (+47 more)

### Community 15 - "registry.ts"
Cohesion: 0.20
Nodes (12): accountingTour, crmTour, dashboardTour, hrmTour, invoicesTour, posTour, reportsTour, allTourConfigs (+4 more)

### Community 16 - "departmentDashboard.ts"
Cohesion: 0.16
Nodes (14): InventoryOverviewRow, DeviceHealthCardsProps, GpsDeviceTableRow, GpsKpiRowProps, chartLegend, chartMonths, deviceHealthCards, GpsDeviceRow (+6 more)

### Community 17 - "CrmCallLogsPage.tsx"
Cohesion: 0.13
Nodes (40): 4.6 المحاسبة والموارد البشرية و CRM والدعم والدردشة والرسائل (`ERP, CRM & Support`), 6.4 مسار التحصيل والأقساط والمدفوعات والمراجعة والمصروفات, CallStatementForm, CrmCallLog, Lead, ServiceEvaluationRequest, AppDateTimePicker(), formatDatetime12hDisplay() (+32 more)

### Community 18 - "ContractDetailPage.tsx"
Cohesion: 0.16
Nodes (31): buildContractListColumns(), defaultContractListActions(), reviewOnlyContractListActions(), ContractReviewDecisionPanel(), canExchangeContract(), canManageContractProblems(), canRejectContract(), canReturnContract() (+23 more)

### Community 19 - "permissionCatalog.ts"
Cohesion: 0.10
Nodes (34): isProtectedRoleSlug(), PermissionCard(), PermissionCardProps, PermissionCategorySection(), PermissionCategorySectionProps, PermissionModuleNav(), PermissionModuleNavProps, RolePermissionsEditor() (+26 more)

### Community 20 - "PageHeader.tsx"
Cohesion: 0.10
Nodes (38): AccountingAccount, AccountingAccTransMapping, AccountingSettings, AccountingTransactionLine, BranchAccountingMap, PageHeaderProps, AccountTreeNode, buildAccountTree() (+30 more)

### Community 21 - "HrmSalesTargetsPage.tsx"
Cohesion: 0.29
Nodes (10): dateOnly(), SalesTargetFormModal(), SalesTargetFormModalProps, targetFormState(), aggregateByEmployee(), employeeName(), HrmSalesTargetsPage(), PIE_COLORS (+2 more)

### Community 22 - "HrmEmployeeDetailPage.tsx"
Cohesion: 0.17
Nodes (19): HrmAllowance, HrmAttendance, HrmUserSalesTarget, EmployeeAccountMode, EmployeeAccountModeField(), EmployeeAccountModeFieldProps, inferEmployeeAccountMode(), modeOptions (+11 more)

### Community 23 - "PosFlowPage.tsx"
Cohesion: 0.09
Nodes (45): AccessoryCheckoutPayload, GpsStock, Promotion, MyContractsButton(), createDeviceLine(), DeviceLineCard(), PosContractSummaryProps, applyContractDeviceIdentity() (+37 more)

### Community 24 - "DailyBranchReportPage.tsx"
Cohesion: 0.10
Nodes (38): DailyBranchReport, DailyBranchReportInference, DailyBranchReportPrintDocument(), fmtMoney(), Props, AR_DAYS, arabicDayName(), ATTENDANCE_ROW_COUNT (+30 more)

### Community 25 - "CustomerCreateModal.tsx"
Cohesion: 0.11
Nodes (46): CollectionActionsSummary, ContractProblemWizard(), CustomerAttachmentsSection(), PendingAttachment, uploadCustomerAttachments(), CustomerCreateForm(), emptyForm, CustomerDeviceHistorySection() (+38 more)

### Community 26 - "PosOwnershipTransferSection.tsx"
Cohesion: 0.15
Nodes (19): SalesInvoiceLine, CustomerDeviceHistorySectionProps, CustomerLegacyDevicesFieldsProps, renewalTypeLabels, defaultSubscriptionRenewalDate(), emptyLegacyDeviceDraft(), hydrateLegacyDeviceDraft(), isLegacyDeviceRowFilled() (+11 more)

### Community 27 - "MyTasksPage.tsx"
Cohesion: 0.20
Nodes (20): SupportTask, SupportTaskStatus, CustomerInstallationsSectionProps, assignSupportTask(), installationDevicesFromTask(), isInstallationTask(), listSupportTasks(), SUPPORT_STATUS_LABELS (+12 more)

### Community 28 - "CrmTasksPage.tsx"
Cohesion: 0.11
Nodes (34): CrmTask, CrmTaskBucket, CrmTaskPriority, CrmTaskStatus, createCrmTask(), CRM_TASK_BUCKET_LABELS, CRM_TASK_PIPELINE_STAGES, CRM_TASK_PRIORITY_LABELS (+26 more)

### Community 29 - "vitest"
Cohesion: 0.14
Nodes (13): vitest, money(), repriceDeviceLine(), browserStorage, createSuspendedPosStore(), DraftStorage, empty(), StoredState (+5 more)

### Community 30 - "posFormStyles.ts"
Cohesion: 0.32
Nodes (12): DiscountInput(), DiscountInputProps, OptionalDiscountFields(), OptionalDiscountFieldsProps, PosDevicesToolbar(), PosDevicesToolbarProps, PosMoneyInput(), amountFromPercent() (+4 more)

### Community 31 - "CrmCeoDashboardPage.tsx"
Cohesion: 0.18
Nodes (14): CeoDashboardFollowUp, CeoDashboardInstallationItem, CeoCard(), CeoCardProps, CeoFollowUpList(), CeoFollowUpListProps, chipFor(), displayTitle() (+6 more)

### Community 32 - "package.json"
Cohesion: 0.09
Nodes (28): dependencies, axios@^1.17.0, @floating-ui/react@^0.27.20, @hookform/resolvers@^5.4.0, @icon-park/react@^1.4.2, react@^19.2.6, react-day-picker@^10.0.2, react-dom@^19.2.6 (+20 more)

### Community 33 - "DepartmentDetailPage.tsx"
Cohesion: 0.10
Nodes (36): 2.1 الأدوار النظامية المحمية (11 دوراً في `SystemRoleCatalog`), DailyMissionCard, DailyMissionResponse, DailyMissionRole, DeviceHealthCards(), GpsDeviceTable(), GpsDeviceTableProps, GpsKpiRow() (+28 more)

### Community 34 - "AdminSystemSettingsPage.tsx"
Cohesion: 0.07
Nodes (54): AdministrationCollectionSettings, AdministrationMessagingSettings, CustomerMessageLogEntry, GeneralSettings, MessagingSettings, OrganizationProfile, OrganizationSettings, SalesSettings (+46 more)

### Community 35 - "review/api.ts"
Cohesion: 0.14
Nodes (14): ServiceEvaluationAnswer, ServiceEvaluationRequestStatus, SubscriptionRenewalQueueItem, SubscriptionRenewalStatus, ANSWER_TYPE_LABELS, createEvaluationQuestion(), deleteEvaluationQuestion(), EvaluationRequestFilters (+6 more)

### Community 36 - "AdminActivityLogPage.tsx"
Cohesion: 0.17
Nodes (23): ActivityLogEntry, ActivityLogInsights, computeActivityLogInsights(), exportActivityLogCsv(), startOfDay(), ACTION_LABELS, ActivityAction, DESCRIPTIONS (+15 more)

### Community 37 - "InstallmentCollectionPanel.tsx"
Cohesion: 0.23
Nodes (17): DateTimeInput12hProps, hourOptions, minuteOptions, DateTime12hParts, DayPeriod, emptyDateTime12hParts, formatDatetimeLocal(), isReminderDueToday() (+9 more)

### Community 38 - "collectionHelpers.ts"
Cohesion: 0.18
Nodes (22): computeContractStats(), ContractCollectionStats, contractFilterTier(), contractTierFilterOptions, dateOnly(), filterInstallmentCollectionRows(), filterRowsByContractTier(), filterRowsWithFutureReminder() (+14 more)

### Community 39 - "crmNavCatalog.ts"
Cohesion: 0.16
Nodes (16): isNavItemActive(), resolveNavPath(), CrmNavRow(), CrmSidebarSection(), ACTIVE_CRM_ROUTE_PREFIXES, buildActiveCrmNavItems(), buildCrmNavSections(), CRM_DEFAULT_ROUTE (+8 more)

### Community 40 - "devDependencies"
Cohesion: 0.08
Nodes (28): devDependencies, eslint@^10.3.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1, eslint-plugin-react-refresh@^0.5.2, globals@^17.6.0, jsdom@^31.0.0, tailwindcss@^4.3.0 (+20 more)

### Community 41 - "sales.ts"
Cohesion: 0.11
Nodes (22): DistributorType, ContractPrintActions(), ContractPrintActionsProps, deviceLines(), printLabel(), computeInstallmentDownPayment(), contractPrintPath(), customerStatusOptions (+14 more)

### Community 42 - "CollectionAssignmentsPage.tsx"
Cohesion: 0.22
Nodes (9): CollectionWorkloadRow, CollectorOption, FirstDueStatus, firstDueStatusLabels, firstDueStatusOptions, AssignmentBranchStats, AssignmentContract, dueStatusBadgeStatus (+1 more)

### Community 43 - "InstallmentCollectionGroupedList.tsx"
Cohesion: 0.16
Nodes (25): CollapsibleSection(), ContractAllInstallmentsTable(), ContractExpandView, ContractMetaCell(), ContractOptionsMenu(), CurrentInstallmentCard(), CustomerInstallmentGroup, formatInstallmentPaymentMethod() (+17 more)

### Community 44 - "InstallmentCollectionPage.tsx"
Cohesion: 0.10
Nodes (30): CollectionFollowUpSidebar(), CollectionFollowUpSidebarProps, collectionStatusFilterOptions, collectorFilterParam(), collectorFilterValues(), ContractTierFilter, refreshCollectionData(), clearInstallmentCollectionFocus() (+22 more)

### Community 45 - "routes.tsx"
Cohesion: 0.08
Nodes (47): AppRoutes(), PortalProtectedRoute(), PortalPublicRoute(), ProtectedRoute(), PublicRoute(), RedirectEmployeeReportToOwner(), RoleRoute(), ContentLoader() (+39 more)

### Community 46 - "DeviceLineCard.tsx"
Cohesion: 0.08
Nodes (59): CashInstallmentScheduleEditor(), CashInstallmentScheduleEditorProps, CashScheduleSelector(), CashScheduleSelectorProps, DeviceLineFieldErrors, IntervalType, lineInstallmentCount(), lineNetTotal() (+51 more)

### Community 47 - "CustomerComplaintsSection.tsx"
Cohesion: 0.39
Nodes (6): ContractCaseRow, CustomerComplaintsSectionProps, contractCaseStatusLabels, contractCaseTypeLabels, contractStatusLabel(), contractStatusLabels

### Community 48 - "AppShell.tsx"
Cohesion: 0.06
Nodes (67): 1.3 سلوك الشاشات الصغيرة والموبايل والقوائم الثابتة والمختصرة, الشريط العلوي المثبت (`sticky top-0 z-40`) والأشرطة المساعدة, القائمة الجانبية (`AppShell.tsx` + `SidebarNav.tsx`), تفعيل/تعطيل الوحدات (`enabled_modules`), شريط التنقل السفلي للموبايل (`MobileBottomNav.tsx`) والقوائم المختصرة, zustand@^5.0.14, zustand, AppNotification (+59 more)

### Community 49 - "printPaymentReceipt.ts"
Cohesion: 0.48
Nodes (5): PAYMENT_RECEIPT_PRINT_CSS, absolutizeImageSources(), buildPrintDocument(), printPaymentReceiptElement(), waitForIframeReady()

### Community 50 - "permissions.ts"
Cohesion: 0.16
Nodes (19): AuthUser, MOBILE_NAV_ITEMS, MobileBottomNavItem, NavIcon(), NavIconProps, SidebarNav(), SidebarNavProps, SidebarNavGroup() (+11 more)

### Community 51 - "AppDatePicker"
Cohesion: 0.12
Nodes (14): Application date picker, Dependencies, New files, Updated UI files, Usage, Verification, AppDatePicker(), choose() (+6 more)

### Community 52 - "BranchDetailPage.tsx"
Cohesion: 0.18
Nodes (19): BranchInventoryTable(), BranchInventoryTableProps, BranchKpiGrid(), BranchKpiGridProps, BranchOperationsPanel(), BranchOperationsPanelProps, BranchPageHeader(), BranchPageHeaderProps (+11 more)

### Community 53 - "UserManualPage.tsx"
Cohesion: 0.18
Nodes (18): countManualMatches(), manualHeadingId(), ManualSection, manualSectionsMatching(), ManualSubsection, ParsedManual, parseManual(), toSection() (+10 more)

### Community 54 - "formatArNumber"
Cohesion: 0.17
Nodes (13): BarChartPanel(), BarChartPanelProps, BarSeries, GaugeChartPanel(), GaugeChartPanelProps, LineChartPanelProps, LineSeries, StackedBarChartPanel() (+5 more)

### Community 55 - "usePageTour.ts"
Cohesion: 0.23
Nodes (14): StartTourButton(), buildShepherdTour(), cancelActiveTour(), runTour(), StartTourOptions, useTourRunner(), getTourLabels(), labels (+6 more)

### Community 56 - "ContractTemplatePreviewPage.tsx"
Cohesion: 0.18
Nodes (16): CONTRACT_TEMPLATES, contractTemplateLabel(), mockContractPreviewHtml(), sampleOwnershipTransferInvoice(), sampleServiceReceiptInvoice(), TEMPLATE_LABELS, absolutizeCssUrls(), absolutizeImageSources() (+8 more)

### Community 57 - "normalizeDigits.ts"
Cohesion: 0.06
Nodes (53): attachLoadingInterceptors(), finishTrackedRequest(), PortalUser, App(), BranchSetupGate(), FontSizeControl(), change(), clearTimer() (+45 more)

### Community 58 - "InstallmentCollectionPanel.tsx"
Cohesion: 0.15
Nodes (20): AdminUser, CollectionPaymentAccount, ContractGroup, InstallmentCollectionPanel(), InstallmentCollectionPanelEmpty(), InstallmentCollectionPanelProps, installmentTotalDue(), paymentMethodOptions (+12 more)

### Community 59 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 60 - "format.ts"
Cohesion: 0.16
Nodes (20): ConvertToInstallmentPreview, Props, fmtContractDateTime(), clock12(), DISPLAY_LOCALE, DISPLAY_TIMEZONE, formatAccountingMoney(), formatCairoDateTime12h() (+12 more)

### Community 61 - "ownershipTransferFinancialBreakdown.ts"
Cohesion: 0.24
Nodes (16): buildOwnershipTransferFinancialBreakdown(), buildScheduleFromPlan(), collectedOnDisplayedLines(), DISPLAYED_FEE_CATEGORIES, findNextUnpaidSourceItem(), findTransferServiceInstallmentPlan(), intervalLabel(), isDeferredCash() (+8 more)

### Community 62 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 64 - "DashboardPage.tsx"
Cohesion: 0.21
Nodes (15): DashboardInstallmentSummary, DashboardBranchOption, DashboardPeriod, DashboardPeriodFilter(), DashboardPeriodFilterProps, invoicesLabelForPeriod(), options, salesLabelForPeriod() (+7 more)

### Community 65 - "pageStats.ts"
Cohesion: 0.10
Nodes (25): DashboardStats, InsightVariant, branchAdminName(), BranchKpis, computeBranchByDeptData(), computeBranchInsights(), computeBranchKpis(), computeBranchStatusData() (+17 more)

### Community 66 - "EmployeeAttachmentsSection.tsx"
Cohesion: 0.16
Nodes (18): MediaFile, CustomerAttachmentsSectionProps, formatFileSize(), getMediaDisplayName(), ensureAbsoluteUrl(), getApiOrigin(), isImageMimeType(), isPdfMimeType() (+10 more)

### Community 67 - "ContractFollowUpTab.tsx"
Cohesion: 0.19
Nodes (14): CollectionFollowUpLog, ContractFollowUpTab(), ContractFollowUpTabProps, FollowUpForm(), FollowUpLogCard(), installmentGroupKey(), installmentGroupLabel(), CollectionFollowUpHistoryModal() (+6 more)

### Community 68 - "Tour"
Cohesion: 0.13
Nodes (5): shepherd.js, StepButton, StepOptions, Tour, TourOptions

### Community 69 - "DESIGN.md"
Cohesion: 0.14
Nodes (13): Brand & Style, Breadcrumbs, Buttons, Colors, Components, Data Tables, Elevation & Depth, KPI Cards (+5 more)

### Community 70 - "CrmOwnerDetailPage.tsx"
Cohesion: 0.14
Nodes (21): OwnerDetailResponse, OwnerPipelineOwnerRow, OwnerPipelineResponse, OwnerPipelineStatusRow, isCrmPageEnabled(), CrmChipProps, CrmStatusPill(), CrmStatusPillProps (+13 more)

### Community 71 - "CustomerPublicProfilePage.tsx"
Cohesion: 0.16
Nodes (13): CustomerPublicProfilePage(), formatDate(), formatMoney(), installmentStatusMeta, paymentMethodLabels, PublicContract, PublicContractLine, PublicCustomerProfileResponse (+5 more)

### Community 72 - "crmPageVisibility.ts"
Cohesion: 0.16
Nodes (18): AdministrationCrmPageSettings, navLabels(), CrmHideablePage, crmPageForPath(), CrmPageVisibilityContext, SETTING_KEY, userHasAccountingAccess(), userHasAnyPermissionPrefix() (+10 more)

### Community 73 - "SalesInvoice"
Cohesion: 0.09
Nodes (22): SalesInvoice, ContractInstallmentsTabProps, ContractListColumnOptions, applyWizardDraft(), CancelPreview, CancelPreviewPayment, CaseType, ContractCaseRecord (+14 more)

### Community 74 - "SyncDebugPage.tsx"
Cohesion: 0.18
Nodes (10): BranchOutboxResponse, CloudBranchInfo, CloudChangeRow, CloudInboxRow, CloudPendingResponse, formatDate(), OutboxItem, SyncCheckpoint (+2 more)

### Community 75 - "vite.config.ts"
Cohesion: 0.18
Nodes (7): @tailwindcss/vite@^4.3.0, vite@^8.0.12, @vitejs/plugin-react@^6.0.1, @tailwindcss/vite, vite, @vitejs/plugin-react, appDir

### Community 76 - "1.3 سلوك الشاشات الصغيرة والموبايل والقوائم الثابتة والمختصرة"
Cohesion: 0.40
Nodes (5): 1.1 الهدف الأساسي للنظام: ما يفعله وما لا يفعله, 1.2 اللغة واتجاه الواجهة وتطبيع الأرقام, 1. نظرة عامة على النظام والبيئة, السلوك الطبيعي, المعمارية وأوضاع التشغيل

### Community 77 - "ContractReviewDetails.tsx"
Cohesion: 0.23
Nodes (24): CashDueList(), ContractKindReviewNotice(), ContractReviewDetails(), CustomerField(), DeviceDetailCard(), DeviceIdentifiersTable(), FinancialSummaryCard(), hasAmount() (+16 more)

### Community 78 - "PaymentReceiptPrintPage.tsx"
Cohesion: 0.31
Nodes (7): PaymentTransactionReceipt, formatPaidAt(), paymentMethodLabels, PaymentReceiptDocument, paymentSourceLabels, Props, receivingAccountLabel()

### Community 79 - "ReferralNetworkTree.tsx"
Cohesion: 0.38
Nodes (9): ReferralNetworkNode, ChildRow(), formatRate(), formatSales(), initials(), MetricCell(), NetworkNodeCard(), ReferralNetworkTree() (+1 more)

### Community 80 - "useEnterToNextField.ts"
Cohesion: 0.40
Nodes (7): EnterNavigableField, findNextEnterNavigableField(), handleEnterToNextField(), isEnterNavigableField(), isVisibleInForm(), listEnterNavigableFields(), useEnterToNextField()

### Community 81 - "InstallmentContractDocument.tsx"
Cohesion: 0.15
Nodes (22): balanceTermsTokens(), CASH_TERMS_TOKENS, FitJustifiedTerms(), FitOneLine(), fmtAmount(), fmtDMY(), fmtDMYWeekday(), fmtPrintStamp() (+14 more)

### Community 82 - "PricingCatalogPage.tsx"
Cohesion: 0.17
Nodes (16): FilterBarProps, FilterField(), FilterMultiSelect(), FilterMultiSelectConfig, FilterSelectConfig, FilterSelectOption, multiSelectSummary(), CatalogSection (+8 more)

### Community 83 - "ProfileAvatar.tsx"
Cohesion: 0.22
Nodes (8): getInitials(), iconSizes, ProfileAvatarProps, ProfileAvatarVariant, sizeClasses, variantIcons, variantStyles, ProfilePhotoUploaderProps

### Community 84 - "GPS App (Sales-App)"
Cohesion: 0.22
Nodes (7): Docker, Environment, GPS App (Sales-App), Handover notes, Local, Requirements, Scripts

### Community 86 - "HrmDashboardPage.tsx"
Cohesion: 0.14
Nodes (17): HrmDashboard, DonutChartPanel(), DonutChartPanelProps, DonutSlice, AttendanceRing(), AttendanceRingProps, accentStyles, HrmStatCard() (+9 more)

### Community 90 - "PosOwnershipTransferSection.tsx"
Cohesion: 0.11
Nodes (33): CustomerContractDevice, CustomerCreateModalProps, digitsOnly(), GpsUsernameInput(), GpsUsernameInputProps, posInputClass, posLabelClass, posRequiredWrap() (+25 more)

### Community 91 - "CrmCeoDashboardPage.tsx"
Cohesion: 0.13
Nodes (21): CeoDashboard, CeoDashboardLeadsBreakdown, LineChartPanel(), CeoFunnelBars(), CeoKpiCard(), CeoKpiCardProps, ICON_TONES, CeoDashboardPeriod (+13 more)

### Community 92 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, preview, test

### Community 93 - "CustomerComplaintsSection.tsx"
Cohesion: 0.09
Nodes (25): 4.1 الهيكل التنظيمي والإعدادات (`Core / Admin`), 4.4 التسعير والعروض والخدمات والتعاقدات ومشاكل العقود (`Pricing, Sales, Contracts & Cases`), 4.5 الأقساط والمدفوعات والتحصيل والمراجعة والمصروفات والبيان اليومي (`Financial Ops`), 4. الكيانات والبيانات والحقول وقواعد التحقق (Entities, Fields & Validation Rules), 5.1 دورة حياة العقد والفاتورة والمراجعة (`SalesInvoice`, `ContractStatus`, `Review`), 5.4 دورة حياة الأقساط والتصالح والمدفوعات ومراجعة التحصيل (`Installments`, `Payments`, `Review`), 5.5 دورة حياة المصروفات ومديونيات الموظفين والتقييمات (`Expenses`, `EmployeeDebt`, `Evaluations`), 5.6 دورة حياة CRM و HRM والمحاسبة والدعم والرسائل والمزامنة (+17 more)

### Community 94 - "CeoEmployeeRankList.tsx"
Cohesion: 0.60
Nodes (4): CeoDashboardTopEmployee, CeoEmployeeRankList(), CeoEmployeeRankListProps, initialOf()

### Community 95 - "FunnelPanel.tsx"
Cohesion: 0.40
Nodes (3): DEFAULT_COLORS, FunnelPanelProps, FunnelStage

### Community 96 - "InvoicesPage.tsx"
Cohesion: 0.27
Nodes (13): contractDateFilterParams(), contractReviewRowClass(), filterContractListRows(), sortContractsByDateTime(), ConvertCashToInstallmentModal(), useBranchFilterOptions(), ContractProblemCaseType, contractSortTimestamp() (+5 more)

### Community 98 - "services.ts"
Cohesion: 0.60
Nodes (3): CATEGORY_LABELS, SERVICE_CATEGORIES, serviceCategoryLabel()

### Community 99 - "CeoFunnelBars.tsx"
Cohesion: 0.40
Nodes (4): CeoFunnelBarsProps, DEFAULT_COLORS, FALLBACK, FunnelStage

### Community 100 - "git-frontend.sh"
Cohesion: 0.50
Nodes (3): GIT_CONFIG_GLOBAL, GIT_WORK_TREE, git-frontend.sh script

### Community 101 - "tourStore.ts"
Cohesion: 0.32
Nodes (11): StartTourButtonProps, authHeaders(), getTourPreferencesUrl(), localStorageKey(), persistTourPreferences(), readLocalTours(), syncAuthUserPreferences(), TourState (+3 more)

### Community 106 - "المرجع التفصيلي الشامل لنظام GPS للمبيعات (Exhaustive System Specification)"
Cohesion: 0.18
Nodes (10): 2.2 قوائم الحظر والاستثناءات (Denylists & Assignment Exclusions), 2.3 تخصيص صلاحيات الأدوار على مستوى الإدارة (`administration_role_permission_overrides`), 2.4 الكتالوج الكامل لمفاتيح الصلاحيات (من `RolePermissionSeeder` و `InventoryPermissionMap`), 2.5 سياق ونطاق البيانات (Data Scoping Rules), 2.6 الاستثناءات والقواعد الخاصة بالصلاحيات, 2. الأدوار والصلاحيات وسياق البيانات (RBAC & Scope), 3.1 المسارات الظاهرة في الشريط الجانبي (Sidebar-Visible Routes), 3.2 المسارات المخفية والمباشرة والطباعة والبوابة وإعادة التوجيه (+2 more)

### Community 108 - "ContractPaymentsTab.tsx"
Cohesion: 0.17
Nodes (18): 5.2 دورة حياة مشاكل العقود ونقل الملكية (`ContractCase`, `OwnershipTransfer`), OwnershipTransfer, OwnershipTransferStatus, ContractPaymentsTab(), ContractPaymentsTabProps, formatPaymentMethod(), installmentLabel(), paymentMethodLabels (+10 more)

### Community 109 - "DemoRole"
Cohesion: 0.25
Nodes (8): DemoRole, EntityRowActionsProps, EditMode, EntityCrudConfig, EntityCrudKey, EntityCrudPermissions, CrmNavItemDef, TourStepConfig

### Community 111 - "roleCatalog.ts"
Cohesion: 0.25
Nodes (6): formatUserRolesLabel(), MANAGER_DENIED_PERMISSIONS, PROTECTED_ROLE_SLUGS, ROLE_ASSIGNMENT_EXCLUDED, SYSTEM_ROLE_LABELS, SYSTEM_ROLE_PAGE_HINTS

### Community 112 - "EvaluationRecordPage.tsx"
Cohesion: 0.43
Nodes (7): formatEvaluationAnswer(), getEvaluationRequest(), linkEvaluationCall(), listLinkableCalls(), recordEvaluation(), AnswerState, EvaluationRecordPage()

### Community 113 - "TourProvider.tsx"
Cohesion: 0.33
Nodes (5): shepherd.js@^14.5.1, shepherd.js, TourProvider(), TourProviderProps, useTourBootstrap()

### Community 114 - "UpcomingLeavesList.tsx"
Cohesion: 0.48
Nodes (5): HrmLeave, initials(), UpcomingLeavesList(), UpcomingLeavesListProps, hrmLeaveTypeLabel()

### Community 115 - "7. قواعد الحسابات والمنطق المالي والتجاري (Business & Calculation Rules)"
Cohesion: 0.33
Nodes (6): 7.1 التسعير والعروض الترويجية, 7.2 الأقساط، الغرامات، أولويات التوزيع، والتسويات, 7.3 البيان اليومي للفرع (`DailyBranchReportInferenceService`), 7.4 المحاسبة (`Accounting`), 7.5 الموارد البشرية والرواتب (`HRM PayrollCalculator`), 7. قواعد الحسابات والمنطق المالي والتجاري (Business & Calculation Rules)

### Community 116 - "8.3 الحذف الناعم، سلة المهملات، وسجل التدقيق (`Trash & Audit Log`)"
Cohesion: 0.33
Nodes (6): 8.1 القيم الحدية وتطبيع المدخلات وتعارض الحالات, 8.2 وضع الفروع الأوفلاين والمزامنة (`Offline Branch Mode & Sync`), 8.3 الحذف الناعم، سلة المهملات، وسجل التدقيق (`Trash & Audit Log`), 8.4 الأمان، عزل التوكنات، التزامن، وأخطاء الشبكة والـ API, 8. الحالات الحدية والأخطاء والأمان والتزامن (Edge Cases, Errors & Sync), ServiceEvaluationQuestion

## Knowledge Gaps
- **2 isolated node(s):** `GIT_WORK_TREE`, `GIT_CONFIG_GLOBAL`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 727 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `useAuthStore`, `api/types.ts`, `PosPage.tsx`, `BranchInventoryPage.tsx`, `ServiceCombinerPage.tsx`, `CustomerContractsSection.tsx`, `Icon`, `CrmOwnerDetailPage.tsx`, `NumericInput`, `Modal.tsx`, `InstallmentContractDocument.tsx`, `CrmReferralsListPage.tsx`, `Branch`, `CrmCallLogsPage.tsx`, `ContractDetailPage.tsx`, `permissionCatalog.ts`, `PageHeader.tsx`, `HrmSalesTargetsPage.tsx`, `HrmEmployeeDetailPage.tsx`, `PosFlowPage.tsx`, `DailyBranchReportPage.tsx`, `CustomerCreateModal.tsx`, `PosOwnershipTransferSection.tsx`, `MyTasksPage.tsx`, `CrmTasksPage.tsx`, `posFormStyles.ts`, `CrmCeoDashboardPage.tsx`, `package.json`, `DepartmentDetailPage.tsx`, `AdminSystemSettingsPage.tsx`, `AdminActivityLogPage.tsx`, `InstallmentCollectionPanel.tsx`, `crmNavCatalog.ts`, `CollectionAssignmentsPage.tsx`, `InstallmentCollectionGroupedList.tsx`, `InstallmentCollectionPage.tsx`, `DeviceLineCard.tsx`, `AppShell.tsx`, `permissions.ts`, `AppDatePicker`, `BranchDetailPage.tsx`, `UserManualPage.tsx`, `usePageTour.ts`, `ContractTemplatePreviewPage.tsx`, `normalizeDigits.ts`, `InstallmentCollectionPanel.tsx`, `format.ts`, `DashboardPage.tsx`, `EmployeeAttachmentsSection.tsx`, `ContractFollowUpTab.tsx`, `CrmOwnerDetailPage.tsx`, `CustomerPublicProfilePage.tsx`, `SalesInvoice`, `SyncDebugPage.tsx`, `PaymentReceiptPrintPage.tsx`, `ReferralNetworkTree.tsx`, `useEnterToNextField.ts`, `InstallmentContractDocument.tsx`, `PricingCatalogPage.tsx`, `PosOwnershipTransferSection.tsx`, `CrmCeoDashboardPage.tsx`, `InvoicesPage.tsx`, `ContractPaymentsTab.tsx`, `EvaluationRecordPage.tsx`, `TourProvider.tsx`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **What connects `GIT_WORK_TREE`, `GIT_CONFIG_GLOBAL` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.05454545454545454 - nodes in this community are weakly interconnected._
- **Why does `Icon()` connect `DepartmentDetailPage.tsx` to `react`, `useAuthStore`, `PosPage.tsx`, `ServiceCombinerPage.tsx`, `CustomerContractsSection.tsx`, `Icon`, `CrmOwnerDetailPage.tsx`, `NumericInput`, `Modal.tsx`, `InstallmentContractDocument.tsx`, `CrmReferralsListPage.tsx`, `Branch`, `departmentDashboard.ts`, `ContractDetailPage.tsx`, `permissionCatalog.ts`, `PageHeader.tsx`, `HrmSalesTargetsPage.tsx`, `HrmEmployeeDetailPage.tsx`, `PosFlowPage.tsx`, `DailyBranchReportPage.tsx`, `CustomerCreateModal.tsx`, `PosOwnershipTransferSection.tsx`, `CrmTasksPage.tsx`, `posFormStyles.ts`, `CrmCeoDashboardPage.tsx`, `AdminSystemSettingsPage.tsx`, `AdminActivityLogPage.tsx`, `InstallmentCollectionPanel.tsx`, `sales.ts`, `CollectionAssignmentsPage.tsx`, `InstallmentCollectionGroupedList.tsx`, `InstallmentCollectionPage.tsx`, `routes.tsx`, `DeviceLineCard.tsx`, `AppShell.tsx`, `permissions.ts`, `BranchDetailPage.tsx`, `UserManualPage.tsx`, `usePageTour.ts`, `ContractTemplatePreviewPage.tsx`, `InstallmentCollectionPanel.tsx`, `DashboardPage.tsx`, `EmployeeAttachmentsSection.tsx`, `CrmOwnerDetailPage.tsx`, `CustomerPublicProfilePage.tsx`, `SalesInvoice`, `PaymentReceiptPrintPage.tsx`, `PricingCatalogPage.tsx`, `ProfileAvatar.tsx`, `HrmDashboardPage.tsx`, `PosOwnershipTransferSection.tsx`, `CrmCeoDashboardPage.tsx`, `CeoEmployeeRankList.tsx`, `InvoicesPage.tsx`, `UpcomingLeavesList.tsx`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Should `useAuthStore` be split into smaller, more focused modules?**
  _Cohesion score 0.0741687979539642 - nodes in this community are weakly interconnected._
- **Why does `@tanstack/react-query` connect `react` to `useAuthStore`, `api/types.ts`, `PosPage.tsx`, `BranchInventoryPage.tsx`, `ServiceCombinerPage.tsx`, `CustomerContractsSection.tsx`, `Icon`, `CrmOwnerDetailPage.tsx`, `NumericInput`, `Modal.tsx`, `CrmReferralsListPage.tsx`, `Branch`, `CrmCallLogsPage.tsx`, `ContractDetailPage.tsx`, `PageHeader.tsx`, `HrmSalesTargetsPage.tsx`, `HrmEmployeeDetailPage.tsx`, `PosFlowPage.tsx`, `DailyBranchReportPage.tsx`, `CustomerCreateModal.tsx`, `PosOwnershipTransferSection.tsx`, `MyTasksPage.tsx`, `CrmTasksPage.tsx`, `package.json`, `DepartmentDetailPage.tsx`, `AdminSystemSettingsPage.tsx`, `AdminActivityLogPage.tsx`, `CollectionAssignmentsPage.tsx`, `InstallmentCollectionGroupedList.tsx`, `InstallmentCollectionPage.tsx`, `CustomerComplaintsSection.tsx`, `AppShell.tsx`, `BranchDetailPage.tsx`, `ContractTemplatePreviewPage.tsx`, `normalizeDigits.ts`, `InstallmentCollectionPanel.tsx`, `format.ts`, `DashboardPage.tsx`, `EmployeeAttachmentsSection.tsx`, `ContractFollowUpTab.tsx`, `CrmOwnerDetailPage.tsx`, `CustomerPublicProfilePage.tsx`, `SalesInvoice`, `SyncDebugPage.tsx`, `PaymentReceiptPrintPage.tsx`, `PricingCatalogPage.tsx`, `HrmDashboardPage.tsx`, `PosOwnershipTransferSection.tsx`, `CrmCeoDashboardPage.tsx`, `InvoicesPage.tsx`, `ContractPaymentsTab.tsx`, `EvaluationRecordPage.tsx`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Should `api/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.02502553626149132 - nodes in this community are weakly interconnected._