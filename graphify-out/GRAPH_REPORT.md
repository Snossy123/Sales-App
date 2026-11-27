# Graph Report - Sales-App  (2026-11-27)

## Corpus Check
- 534 files · ~330,290 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 25 file(s) not represented in the graph (top: .css 12, (none) 8, .ttf 3)

## Summary
- 3166 nodes · 14308 edges · 115 communities (111 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 109 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `819ee5cc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- getErrorMessage
- StatusBadge
- api/types.ts
- PosPage.tsx
- UninstallDeviceHandoverModal.tsx
- ServiceCombinerPage.tsx
- CustomerContractsSection.tsx
- contractFields.ts
- react
- CrmOwnerDetailPage.tsx
- InventoryProductSettingsPage.tsx
- InventoryPage.tsx
- InstallmentContractDocument.tsx
- CrmReferralsListPage.tsx
- Branch
- registry.ts
- departmentDashboard.ts
- CrmCallLogsPage.tsx
- ContractDetailPage.tsx
- permissionCatalog.ts
- JournalEntriesPage.tsx
- HrmSalesTargetsPage.tsx
- HrmEmployeeDetailPage.tsx
- PosFlowPage.tsx
- DailyBranchReportPage.tsx
- CustomerCreateModal.tsx
- PosOwnershipTransferSection.tsx
- procedureDraftStore.ts
- CrmTasksPage.tsx
- Employee
- dataScope.ts
- PortalLayout.tsx
- package.json
- access.ts
- AdminSystemSettingsPage.tsx
- fontScale.ts
- AdminActivityLogPage.tsx
- InstallmentCollectionPanel.tsx
- collectionHelpers.ts
- crmNavCatalog.ts
- devDependencies
- sales.ts
- useDebouncedValue
- InstallmentCollectionGroupedList.tsx
- InstallmentCollectionPage.tsx
- Icon
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
- BranchInventoryPage.tsx
- DashboardPage.tsx
- pageStats.ts
- EmployeeAttachmentsSection.tsx
- PaymentsPage.tsx
- Tour
- DESIGN.md
- CrmActivitiesPage.tsx
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
- InstallmentContractDocument.tsx
- PricingCatalogPage.tsx
- ProfileAvatar.tsx
- GPS App (Sales-App)
- SalesInvoiceLine
- HrmDashboardPage.tsx
- inventoryBuckets.ts
- main.tsx
- contextStore.ts
- PosOwnershipTransferSection.tsx
- CrmCeoDashboardPage.tsx
- scripts
- SalesInvoice
- CeoEmployeeRankList.tsx
- FunnelPanel.tsx
- useAuthStore
- 5. دورات الحياة وحالات التحوّل (Lifecycles & State Transitions)
- BranchDetailPage.tsx
- formatDatetime12hDisplay
- git-frontend.sh
- tourStore.ts
- vite-env.d.ts
- tsconfig.json
- entrypoint.sh
- vercel.json
- المرجع التفصيلي الشامل لنظام GPS للمبيعات (Exhaustive System Specification)
- FaqPage.tsx
- CustomerOwnershipTransfersSection.tsx
- react-dom
- 6. العمليات والـ Workflows التفصيلية خطوة بخطوة
- axios
- CustomerCollectionActions.tsx
- ChatbotWidget.tsx
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

## Communities (115 total, 4 thin omitted)

### Community 0 - "getErrorMessage"
Cohesion: 0.07
Nodes (50): react-router-dom, getErrorMessage(), DeviceMovement, CorrectionLine, Field, fields, ContractDeletionError(), ContractExecutionBranchEditor() (+42 more)

### Community 1 - "StatusBadge"
Cohesion: 0.05
Nodes (86): ServiceEvaluationAnswer, ServiceEvaluationQuestion, ServiceEvaluationRequestStatus, SubscriptionRenewalQueueItem, SubscriptionRenewalStatus, SupportTask, SupportTaskStatus, DeleteConfirmDialog() (+78 more)

### Community 2 - "api/types.ts"
Cohesion: 0.02
Nodes (88): AccessoryPackageItem, AccountingAccountType, AccountingBudget, AccountingDashboard, AccountPrimaryType, AdministrationDeletionBlockers, ArAgeingContactRow, ArReconciliationReport (+80 more)

### Community 3 - "PosPage.tsx"
Cohesion: 0.07
Nodes (65): ContractKind, GpsProduct, GpsStock, SubscriptionRenewalCandidate, ClosedContractCorrectionEditor(), GpsProductCardProps, createDeviceLine(), DeviceLineCard() (+57 more)

### Community 4 - "UninstallDeviceHandoverModal.tsx"
Cohesion: 0.17
Nodes (15): 4.3 المخزون والأجهزة وحركات الأجهزة والعهد والإكسسوارات (`Inventory`), CustodyVoucher, DepartmentStock, ProductUnit, DeviceHistoryTable(), DeviceReport(), formatMaintenanceAmount(), FULL_WIDTH_LABELS (+7 more)

### Community 5 - "ServiceCombinerPage.tsx"
Cohesion: 0.09
Nodes (60): MyContractsButton(), CustodyVoucherForm(), CustodyVoucherModalProps, RecipientType, CheckoutPaymentSection(), CheckoutPaymentSectionProps, PosContractHeader(), PosContractTypeTabs() (+52 more)

### Community 6 - "CustomerContractsSection.tsx"
Cohesion: 0.15
Nodes (32): InstallmentItem, ContractInstallmentsTab(), SummaryCard(), ConvertCashToInstallmentModal(), CustomerContractsSection(), showInvoiceStatusBadge(), STATUS_FILTER_OPTIONS, assertPaymentVerification() (+24 more)

### Community 7 - "contractFields.ts"
Cohesion: 0.09
Nodes (39): InstallmentPlan, addCalendarMonths(), AR_WEEKDAYS, buildInstallmentRows(), CashDuePayment, cashDuePayments(), cashReviewRows(), cashScheduleLabel() (+31 more)

### Community 8 - "react"
Cohesion: 0.05
Nodes (93): react, @tanstack/react-query, api, axiosApi, AccessoryPackage, AccessoryWarehouseStock, AccountingAccount, AccountingAccTransMapping (+85 more)

### Community 9 - "CrmOwnerDetailPage.tsx"
Cohesion: 0.11
Nodes (32): OwnerDetailResponse, ReferralLeadReport, ReferralLeadReportByUser, ReferralLeadReportSummary, CrmFilterPanel(), CrmPageShell(), CrmKpiCard(), CrmKpiCardProps (+24 more)

### Community 10 - "InventoryProductSettingsPage.tsx"
Cohesion: 0.39
Nodes (7): emptyForm, GpsProductForm, InventoryProductSettingsPage(), PriceField(), serviceCashPrice(), toForm(), toPayload()

### Community 11 - "InventoryPage.tsx"
Cohesion: 0.08
Nodes (38): AddStockForm(), ChartCard(), ChartCardProps, CollapsibleSectionProps, DistributeStockModal(), GpsProductCard(), InsightBanner(), InsightBannerProps (+30 more)

### Community 12 - "InstallmentContractDocument.tsx"
Cohesion: 0.13
Nodes (29): ContractPrintBorder(), ContractPrintFooter(), ContractPrintFooterProps, ContractPrintHeader(), ContractPrintHeaderProps, card(), infoRow(), OwnershipTransferContractDocument() (+21 more)

### Community 13 - "CrmReferralsListPage.tsx"
Cohesion: 0.13
Nodes (36): ReferralLead, ReferralLeadStatus, ReferralReferrerOption, CrmLeadDrawer(), CrmLeadDrawerProps, CRM_INPUT, CRM_PRIMARY_BTN, CRM_SECONDARY_BTN (+28 more)

### Community 14 - "Branch"
Cohesion: 0.08
Nodes (42): 4.2 العملاء والموزعون (`Customers & Distributors`), Branch, Customer, Distributor, SalesRep, PosContractHeaderProps, TransactionSource, posInputClass (+34 more)

### Community 15 - "registry.ts"
Cohesion: 0.20
Nodes (12): accountingTour, crmTour, dashboardTour, hrmTour, invoicesTour, posTour, reportsTour, allTourConfigs (+4 more)

### Community 16 - "departmentDashboard.ts"
Cohesion: 0.21
Nodes (12): DeviceHealthCardsProps, GpsDeviceTableRow, GpsKpiRowProps, chartLegend, chartMonths, deviceHealthCards, GpsDeviceRow, gpsDeviceRows (+4 more)

### Community 17 - "CrmCallLogsPage.tsx"
Cohesion: 0.14
Nodes (37): 4.6 المحاسبة والموارد البشرية و CRM والدعم والدردشة والرسائل (`ERP, CRM & Support`), CallStatementForm, CrmCallLog, Lead, ServiceEvaluationRequest, AppDateTimePicker(), CallLogFormModal(), Field() (+29 more)

### Community 18 - "ContractDetailPage.tsx"
Cohesion: 0.13
Nodes (41): buildContractListColumns(), defaultContractListActions(), filterContractListRows(), reviewOnlyContractListActions(), sortContractsByDateTime(), ContractPrintActions(), ContractPrintActionsProps, deviceLines() (+33 more)

### Community 19 - "permissionCatalog.ts"
Cohesion: 0.07
Nodes (42): 4.1 الهيكل التنظيمي والإعدادات (`Core / Admin`), Role, formatUserRolesLabel(), isProtectedRoleSlug(), MANAGER_DENIED_PERMISSIONS, PROTECTED_ROLE_SLUGS, ROLE_ASSIGNMENT_EXCLUDED, SYSTEM_ROLE_LABELS (+34 more)

### Community 20 - "JournalEntriesPage.tsx"
Cohesion: 0.29
Nodes (13): formatMoney(), AccountOption, emptyJournalLine(), isJournalBalanced(), JournalLineEditor(), JournalLineEditorProps, JournalLineForm, sumJournalLines() (+5 more)

### Community 21 - "HrmSalesTargetsPage.tsx"
Cohesion: 0.22
Nodes (16): HrmUserSalesTarget, formatAccountingMoney(), dateOnly(), SalesTargetFormModal(), SalesTargetFormModalProps, targetFormState(), SalesTargetProgressCard(), SalesTargetProgressCardProps (+8 more)

### Community 22 - "HrmEmployeeDetailPage.tsx"
Cohesion: 0.16
Nodes (16): HrmAllowance, HrmAttendance, HrmJob, HrmPayrollRecord, EmployeeAccountMode, EmployeeAccountModeField(), EmployeeAccountModeFieldProps, inferEmployeeAccountMode() (+8 more)

### Community 23 - "PosFlowPage.tsx"
Cohesion: 0.08
Nodes (53): AccessoryCheckoutPayload, CheckoutPayload, Promotion, Service, PosContractSummaryProps, contractPrintPath(), ownershipTransferContractPrintPath(), buildAccessoryCheckout() (+45 more)

### Community 24 - "DailyBranchReportPage.tsx"
Cohesion: 0.10
Nodes (38): DailyBranchReport, DailyBranchReportInference, DailyBranchReportPrintDocument(), fmtMoney(), Props, AR_DAYS, arabicDayName(), ATTENDANCE_ROW_COUNT (+30 more)

### Community 25 - "CustomerCreateModal.tsx"
Cohesion: 0.14
Nodes (34): PendingAttachment, uploadCustomerAttachments(), CustomerCreateForm(), emptyForm, CustomerPhoneFields(), CustomerPhoneFieldsProps, TextArea(), TextInput() (+26 more)

### Community 26 - "PosOwnershipTransferSection.tsx"
Cohesion: 0.21
Nodes (19): CustomerDeviceHistorySection(), CustomerDeviceHistorySectionProps, CustomerLegacyDevicesFields(), CustomerLegacyDevicesFieldsProps, renewalTypeLabels, defaultSubscriptionRenewalDate(), emptyLegacyDeviceDraft(), hydrateLegacyDeviceDraft() (+11 more)

### Community 27 - "procedureDraftStore.ts"
Cohesion: 0.14
Nodes (23): distributorLabel(), EditableExpenseRequest, EXPENSE_TYPES, ExpenseContract, ExpenseDraft, ExpenseRequestFormProps, IncompleteProceduresBanner(), ExpenseDetail (+15 more)

### Community 28 - "CrmTasksPage.tsx"
Cohesion: 0.11
Nodes (33): CrmTask, CrmTaskBucket, CrmTaskPriority, CrmTaskStatus, createCrmTask(), CRM_TASK_BUCKET_LABELS, CRM_TASK_PIPELINE_STAGES, CRM_TASK_PRIORITY_LABELS (+25 more)

### Community 29 - "Employee"
Cohesion: 0.10
Nodes (34): Employee, ServiceCategory, CashScheduleSelectorProps, DeviceLineDraft, VehicleType, UseDeviceLineEditorInput, ServiceLineDraft, CashSchedule (+26 more)

### Community 30 - "dataScope.ts"
Cohesion: 0.24
Nodes (18): useContextData(), getActiveBranchId(), getAllowedBranchIds(), getAdministrationApiFilters(), getAdministrationBranchFilters(), mergeScopedParams(), canPickAdministration(), canPickBranch() (+10 more)

### Community 31 - "PortalLayout.tsx"
Cohesion: 0.15
Nodes (15): 3.1 المسارات الظاهرة في الشريط الجانبي (Sidebar-Visible Routes), 3.2 المسارات المخفية والمباشرة والطباعة والبوابة وإعادة التوجيه, 3. خريطة الشاشات والمسارات (Routes & Navigation), attachLoadingInterceptors(), finishTrackedRequest(), ContentLoader(), navItems, PortalLayout() (+7 more)

### Community 32 - "package.json"
Cohesion: 0.09
Nodes (22): dependencies, @floating-ui/react@^0.27.20, @hookform/resolvers@^5.4.0, @icon-park/react@^1.4.2, react@^19.2.6, react-day-picker@^10.0.2, react-hook-form@^7.77.0, react-router-dom@^7.17.0 (+14 more)

### Community 33 - "access.ts"
Cohesion: 0.21
Nodes (16): Administration, InventoryOverviewRow, DeviceHealthCards(), GpsDeviceTable(), GpsDeviceTableProps, GpsKpiRow(), CRUD_MANAGE_FALLBACKS, CrudAction (+8 more)

### Community 34 - "AdminSystemSettingsPage.tsx"
Cohesion: 0.07
Nodes (56): AdministrationCollectionSettings, AdministrationMessagingSettings, CustomerMessageLogEntry, GeneralSettings, MessagingSettings, OrganizationProfile, OrganizationSettings, SalesSettings (+48 more)

### Community 35 - "fontScale.ts"
Cohesion: 0.22
Nodes (17): FontSizeControl(), change(), clearTimer(), commit(), endPress(), startLongPress(), applyFontScale(), applyStoredFontScale() (+9 more)

### Community 36 - "AdminActivityLogPage.tsx"
Cohesion: 0.17
Nodes (23): ActivityLogEntry, ActivityLogInsights, computeActivityLogInsights(), exportActivityLogCsv(), startOfDay(), ACTION_LABELS, ActivityAction, DESCRIPTIONS (+15 more)

### Community 37 - "InstallmentCollectionPanel.tsx"
Cohesion: 0.24
Nodes (16): DateTimeInput12hProps, hourOptions, minuteOptions, DateTime12hParts, DayPeriod, emptyDateTime12hParts, formatDatetimeLocal(), isReminderDueToday() (+8 more)

### Community 38 - "collectionHelpers.ts"
Cohesion: 0.19
Nodes (21): computeContractStats(), ContractCollectionStats, contractFilterTier(), contractTierFilterOptions, dateOnly(), filterInstallmentCollectionRows(), filterRowsByContractTier(), filterRowsWithFutureReminder() (+13 more)

### Community 39 - "crmNavCatalog.ts"
Cohesion: 0.11
Nodes (19): DemoRole, EntityRowActionsProps, EditMode, EntityCrudConfig, EntityCrudKey, EntityCrudPermissions, ACTIVE_CRM_ROUTE_PREFIXES, buildActiveCrmNavItems() (+11 more)

### Community 40 - "devDependencies"
Cohesion: 0.09
Nodes (32): devDependencies, eslint@^10.3.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1, eslint-plugin-react-refresh@^0.5.2, globals@^17.6.0, jsdom@^31.0.0, tailwindcss@^4.3.0 (+24 more)

### Community 41 - "sales.ts"
Cohesion: 0.17
Nodes (13): computeInstallmentDownPayment(), customerStatusOptions, distributorStatusOptions, distributorTypeLabels, InstallmentLike, invoiceStatusLabels, invoiceStatusOptions, PaginationMeta (+5 more)

### Community 42 - "useDebouncedValue"
Cohesion: 0.13
Nodes (22): CollectorOption, CollectionFollowUpSidebar(), useDebouncedValue(), buildCollectionFollowUpPayload(), FirstDueStatus, firstDueStatusLabels, firstDueStatusOptions, INSTALLMENT_PAGE_SIZE (+14 more)

### Community 43 - "InstallmentCollectionGroupedList.tsx"
Cohesion: 0.15
Nodes (25): CollectionFollowUpSidebarProps, ContractAllInstallmentsTable(), ContractExpandView, ContractGroup, ContractMetaCell(), ContractOptionsMenu(), CurrentInstallmentCard(), CustomerInstallmentGroup (+17 more)

### Community 44 - "InstallmentCollectionPage.tsx"
Cohesion: 0.13
Nodes (22): collectionStatusFilterOptions, collectorFilterParam(), collectorFilterValues(), ContractTierFilter, refreshCollectionData(), clearInstallmentCollectionFocus(), contractTiers, InstallmentCollectionFocus (+14 more)

### Community 45 - "Icon"
Cohesion: 0.08
Nodes (98): axiosPortal, portalApi, AdminRole, AppRoutes(), PortalProtectedRoute(), PortalPublicRoute(), ProtectedRoute(), PublicRoute() (+90 more)

### Community 46 - "DeviceLineCard.tsx"
Cohesion: 0.07
Nodes (67): CashInstallmentScheduleEditor(), CashInstallmentScheduleEditorProps, CashScheduleSelector(), DeviceLineFieldErrors, IntervalType, lineInstallmentCount(), lineNetTotal(), LinePaymentTerm (+59 more)

### Community 47 - "CustomerComplaintsSection.tsx"
Cohesion: 0.60
Nodes (4): contractCaseStatusLabels, contractCaseTypeLabels, contractStatusLabel(), contractStatusLabels

### Community 48 - "AppShell.tsx"
Cohesion: 0.17
Nodes (20): الشريط العلوي المثبت (`sticky top-0 z-40`) والأشرطة المساعدة, شريط التنقل السفلي للموبايل (`MobileBottomNav.tsx`) والقوائم المختصرة, AppNotification, accessoryAvailable(), accessoryName(), BranchStockTickerBar(), TickerItem, TickerTrack() (+12 more)

### Community 49 - "printPaymentReceipt.ts"
Cohesion: 0.48
Nodes (5): PAYMENT_RECEIPT_PRINT_CSS, absolutizeImageSources(), buildPrintDocument(), printPaymentReceiptElement(), waitForIframeReady()

### Community 50 - "permissions.ts"
Cohesion: 0.15
Nodes (24): AuthUser, MOBILE_NAV_ITEMS, MobileBottomNavItem, NavIcon(), NavIconProps, SidebarNav(), SidebarNavProps, SidebarNavGroup() (+16 more)

### Community 51 - "AppDatePicker"
Cohesion: 0.12
Nodes (14): Application date picker, Dependencies, New files, Updated UI files, Usage, Verification, AppDatePicker(), choose() (+6 more)

### Community 52 - "BranchDetailPage.tsx"
Cohesion: 0.17
Nodes (14): BranchInventoryTableProps, BranchKpiGridProps, BranchOperationsPanelProps, BranchPageHeaderProps, BranchDashboardOptions, BranchKpi, BranchProduct, BranchViewModel (+6 more)

### Community 53 - "UserManualPage.tsx"
Cohesion: 0.14
Nodes (22): react-markdown@^10.1.0, remark-gfm@^4.0.1, react-markdown, remark-gfm, countManualMatches(), manualHeadingId(), ManualSection, manualSectionsMatching() (+14 more)

### Community 54 - "formatArNumber"
Cohesion: 0.15
Nodes (15): BarChartPanelProps, BarSeries, DonutChartPanelProps, GaugeChartPanel(), GaugeChartPanelProps, LineChartPanel(), LineChartPanelProps, LineSeries (+7 more)

### Community 55 - "usePageTour.ts"
Cohesion: 0.20
Nodes (17): StartTourButton(), StartTourButtonProps, buildShepherdTour(), cancelActiveTour(), runTour(), StartTourOptions, useTourRunner(), TourState (+9 more)

### Community 56 - "ContractTemplatePreviewPage.tsx"
Cohesion: 0.19
Nodes (16): ContractTemplate, CONTRACT_TEMPLATES, mockContractPreviewHtml(), sampleOwnershipTransferInvoice(), sampleServiceReceiptInvoice(), TEMPLATE_LABELS, absolutizeCssUrls(), absolutizeImageSources() (+8 more)

### Community 57 - "normalizeDigits.ts"
Cohesion: 0.18
Nodes (21): TextAreaProps, acceptsDigitNormalization(), commitValue(), hasEasternDigits(), insertNormalizedText(), installDigitNormalization(), isTextControl(), normalizeControlValue() (+13 more)

### Community 58 - "InstallmentCollectionPanel.tsx"
Cohesion: 0.11
Nodes (26): AdminUser, CollectionFollowUpLog, CollectionPaymentAccount, DateTimeInput12h(), CollectionFollowUpHistoryModal(), CollectionFollowUpHistoryModalProps, installmentGroupKey(), installmentGroupLabel() (+18 more)

### Community 59 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 60 - "format.ts"
Cohesion: 0.19
Nodes (16): ConvertToInstallmentPreview, Props, fmtContractDateTime(), clock12(), DISPLAY_LOCALE, DISPLAY_TIMEZONE, formatCairoDateTime12h(), formatCalendarYmd() (+8 more)

### Community 61 - "ownershipTransferFinancialBreakdown.ts"
Cohesion: 0.20
Nodes (19): fmtContractDate(), resolveRenewalLabel(), schedulePaymentsLabel(), buildOwnershipTransferFinancialBreakdown(), buildScheduleFromPlan(), collectedOnDisplayedLines(), DISPLAYED_FEE_CATEGORIES, findNextUnpaidSourceItem() (+11 more)

### Community 62 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 63 - "BranchInventoryPage.tsx"
Cohesion: 0.20
Nodes (12): BranchInventoryUnitForm(), CustodyVoucherModal(), CUSTODY_BUCKET_OPTIONS, BranchInventoryPage(), openVisit(), compactSearch(), InventoryView, modelName() (+4 more)

### Community 64 - "DashboardPage.tsx"
Cohesion: 0.22
Nodes (10): DashboardBranchOption, DashboardPeriodFilter(), DashboardPeriodFilterProps, invoicesLabelForPeriod(), options, salesLabelForPeriod(), getScopedBranchIds(), DashboardPage() (+2 more)

### Community 65 - "pageStats.ts"
Cohesion: 0.12
Nodes (21): DashboardStats, DonutSlice, InsightVariant, branchAdminName(), BranchKpis, computeBranchByDeptData(), computeBranchInsights(), computeDashboardStockBarData() (+13 more)

### Community 66 - "EmployeeAttachmentsSection.tsx"
Cohesion: 0.15
Nodes (23): MediaFile, PaymentTransactionReceipt, CustomerAttachmentsSection(), CustomerAttachmentsSectionProps, formatFileSize(), getMediaDisplayName(), formatPaidAt(), paymentMethodLabels (+15 more)

### Community 67 - "PaymentsPage.tsx"
Cohesion: 0.16
Nodes (15): PaymentOriginLink(), RefundPaymentModal(), RefundPaymentTarget, openPaymentReceiptPrint(), ChannelFilter, formatMoney(), formatPaidAt(), paymentMethodLabels (+7 more)

### Community 68 - "Tour"
Cohesion: 0.13
Nodes (5): shepherd.js, StepButton, StepOptions, Tour, TourOptions

### Community 69 - "DESIGN.md"
Cohesion: 0.14
Nodes (13): Brand & Style, Breadcrumbs, Buttons, Colors, Components, Data Tables, Elevation & Depth, KPI Cards (+5 more)

### Community 70 - "CrmActivitiesPage.tsx"
Cohesion: 0.08
Nodes (43): ActivitiesBoardCallRow, ActivitiesBoardInstallationRow, ActivitiesBoardResponse, ActivitiesBoardTaskRow, OwnerLeaderboardResponse, OwnerLeaderboardRow, OwnerLeaderboardSort, OwnerPipelineOwnerRow (+35 more)

### Community 71 - "CustomerPublicProfilePage.tsx"
Cohesion: 0.16
Nodes (13): CustomerPublicProfilePage(), formatDate(), formatMoney(), installmentStatusMeta, paymentMethodLabels, PublicContract, PublicContractLine, PublicCustomerProfileResponse (+5 more)

### Community 72 - "crmPageVisibility.ts"
Cohesion: 0.13
Nodes (29): AdministrationCrmPageSettings, canAccessDepartment(), getUserRole(), hasReviewerRole(), hasRole(), isAnyAdmin(), roleLabelsAr(), roleNames() (+21 more)

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
Cohesion: 0.25
Nodes (8): 1.1 الهدف الأساسي للنظام: ما يفعله وما لا يفعله, 1.2 اللغة واتجاه الواجهة وتطبيع الأرقام, 1.3 سلوك الشاشات الصغيرة والموبايل والقوائم الثابتة والمختصرة, 1. نظرة عامة على النظام والبيئة, السلوك الطبيعي, القائمة الجانبية (`AppShell.tsx` + `SidebarNav.tsx`), المعمارية وأوضاع التشغيل, تفعيل/تعطيل الوحدات (`enabled_modules`)

### Community 77 - "ContractReviewDetails.tsx"
Cohesion: 0.23
Nodes (23): CashDueList(), ContractKindReviewNotice(), ContractReviewDetails(), ContractReviewDetailsProps, CustomerField(), DeviceDetailCard(), DeviceIdentifiersTable(), FinancialSummaryCard() (+15 more)

### Community 78 - "ownershipTransferFeePlans.ts"
Cohesion: 0.20
Nodes (14): AllocatedOwnershipTransferFeeLine, allocateOwnershipTransferFeePlans(), AllocateOwnershipTransferFeePlansInput, allocateProportionalDowns(), buildFeeEntries(), cashLine(), installmentLine(), OwnershipTransferFeeAmounts (+6 more)

### Community 79 - "ReferralNetworkTree.tsx"
Cohesion: 0.38
Nodes (9): ReferralNetworkNode, ChildRow(), formatRate(), formatSales(), initials(), MetricCell(), NetworkNodeCard(), ReferralNetworkTree() (+1 more)

### Community 80 - "useEnterToNextField.ts"
Cohesion: 0.40
Nodes (7): EnterNavigableField, findNextEnterNavigableField(), handleEnterToNextField(), isEnterNavigableField(), isVisibleInForm(), listEnterNavigableFields(), useEnterToNextField()

### Community 81 - "InstallmentContractDocument.tsx"
Cohesion: 0.13
Nodes (25): balanceTermsTokens(), CASH_TERMS_TOKENS, FitJustifiedTerms(), FitOneLine(), fmtAmount(), fmtDMY(), fmtDMYWeekday(), fmtPrintStamp() (+17 more)

### Community 82 - "PricingCatalogPage.tsx"
Cohesion: 0.24
Nodes (12): CATEGORY_LABELS, SERVICE_CATEGORIES, serviceCategoryLabel(), CatalogSection, DevicePriceGuide(), formatPrice(), gpsPrice(), matchesSearch() (+4 more)

### Community 83 - "ProfileAvatar.tsx"
Cohesion: 0.22
Nodes (8): getInitials(), iconSizes, ProfileAvatarProps, ProfileAvatarVariant, sizeClasses, variantIcons, variantStyles, ProfilePhotoUploaderProps

### Community 84 - "GPS App (Sales-App)"
Cohesion: 0.22
Nodes (7): Docker, Environment, GPS App (Sales-App), Handover notes, Local, Requirements, Scripts

### Community 85 - "SalesInvoiceLine"
Cohesion: 0.19
Nodes (10): SalesInvoiceLine, describeDeviceSerials(), DeviceSerialDisplay, DeviceSerialFields, firstDeviceLine(), isDeviceLine(), OwnershipTransferParty, resolveOwnershipTransferDeviceLine() (+2 more)

### Community 86 - "HrmDashboardPage.tsx"
Cohesion: 0.15
Nodes (19): HrmDashboard, BarChartPanel(), usePageTour(), AttendanceRing(), AttendanceRingProps, accentStyles, HrmStatCard(), HrmStatCardProps (+11 more)

### Community 87 - "inventoryBuckets.ts"
Cohesion: 0.29
Nodes (10): DeviceInformation, InventoryUnitTags(), InventoryUnitTagsProps, formatVisitDate(), INVENTORY_BUCKET_LABELS, INVENTORY_BUCKET_SECTION_LABELS, inventoryBucketLabel(), maintenanceVisitStatusLabel() (+2 more)

### Community 88 - "main.tsx"
Cohesion: 0.27
Nodes (6): PortalUser, App(), BranchSetupGate(), RouteLoadingTracker(), queryClient, PortalAuthState

### Community 89 - "contextStore.ts"
Cohesion: 0.33
Nodes (7): Warehouse, BranchSwitcher(), DepartmentSwitcher(), WarehouseSwitcher(), persistActiveBranch(), ContextState, useContextStore

### Community 90 - "PosOwnershipTransferSection.tsx"
Cohesion: 0.11
Nodes (32): vitest, CustomerContractDevice, CustomerCreateModal(), CustomerCreateModalProps, digitsOnly(), GpsUsernameInput(), GpsUsernameInputProps, deviceLine() (+24 more)

### Community 91 - "CrmCeoDashboardPage.tsx"
Cohesion: 0.07
Nodes (38): CeoDashboard, CeoDashboardFollowUp, CeoDashboardInstallationItem, CeoDashboardLeadsBreakdown, DashboardPeriod, CeoCard(), CeoCardProps, CeoFollowUpList() (+30 more)

### Community 92 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, preview, test

### Community 93 - "SalesInvoice"
Cohesion: 0.09
Nodes (34): 4.4 التسعير والعروض والخدمات والتعاقدات ومشاكل العقود (`Pricing, Sales, Contracts & Cases`), 4.5 الأقساط والمدفوعات والتحصيل والمراجعة والمصروفات والبيان اليومي (`Financial Ops`), 4. الكيانات والبيانات والحقول وقواعد التحقق (Entities, Fields & Validation Rules), 6.2 مسار مشاكل العقود (`ContractCases`), InstallmentReconciliation, PaymentTransaction, PriceCatalogItem, SalesInvoice (+26 more)

### Community 94 - "CeoEmployeeRankList.tsx"
Cohesion: 0.60
Nodes (4): CeoDashboardTopEmployee, CeoEmployeeRankList(), CeoEmployeeRankListProps, initialOf()

### Community 95 - "FunnelPanel.tsx"
Cohesion: 0.40
Nodes (3): DEFAULT_COLORS, FunnelPanelProps, FunnelStage

### Community 96 - "useAuthStore"
Cohesion: 0.08
Nodes (59): DistributorCommissionLedgerEntry, contractDateFilterParams(), contractReviewRowClass(), FilterBar(), FilterBarProps, FilterField(), FilterMultiSelect(), FilterMultiSelectConfig (+51 more)

### Community 97 - "5. دورات الحياة وحالات التحوّل (Lifecycles & State Transitions)"
Cohesion: 0.28
Nodes (9): 5.1 دورة حياة العقد والفاتورة والمراجعة (`SalesInvoice`, `ContractStatus`, `Review`), 5.3 دورة حياة وحدات المخزون وحركات الأجهزة (`ProductUnit`, `DeviceMovement`, `StockTransfer`), 5.4 دورة حياة الأقساط والتصالح والمدفوعات ومراجعة التحصيل (`Installments`, `Payments`, `Review`), 5.5 دورة حياة المصروفات ومديونيات الموظفين والتقييمات (`Expenses`, `EmployeeDebt`, `Evaluations`), 5.6 دورة حياة CRM و HRM والمحاسبة والدعم والرسائل والمزامنة, 5. دورات الحياة وحالات التحوّل (Lifecycles & State Transitions), HrmPayrollGroup, StockTransfer (+1 more)

### Community 98 - "BranchDetailPage.tsx"
Cohesion: 0.42
Nodes (7): BranchInventoryTable(), BranchKpiGrid(), BranchOperationsPanel(), BranchPageHeader(), getBranchWarehouseId(), getStatusBadgeClass(), BranchDetailPage()

### Community 99 - "formatDatetime12hDisplay"
Cohesion: 0.46
Nodes (7): CustodyVoucherDetails(), DetailField(), recipientLabel(), resolveMaintenanceContract(), voucherTypeLabel(), formatDatetime12hDisplay(), productUnitDisplayCode()

### Community 100 - "git-frontend.sh"
Cohesion: 0.50
Nodes (3): GIT_CONFIG_GLOBAL, GIT_WORK_TREE, git-frontend.sh script

### Community 101 - "tourStore.ts"
Cohesion: 0.25
Nodes (11): TourProvider(), TourProviderProps, useTourBootstrap(), authHeaders(), getTourPreferencesUrl(), localStorageKey(), persistTourPreferences(), readLocalTours() (+3 more)

### Community 106 - "المرجع التفصيلي الشامل لنظام GPS للمبيعات (Exhaustive System Specification)"
Cohesion: 0.10
Nodes (19): 2.1 الأدوار النظامية المحمية (11 دوراً في `SystemRoleCatalog`), 2.2 قوائم الحظر والاستثناءات (Denylists & Assignment Exclusions), 2.3 تخصيص صلاحيات الأدوار على مستوى الإدارة (`administration_role_permission_overrides`), 2.4 الكتالوج الكامل لمفاتيح الصلاحيات (من `RolePermissionSeeder` و `InventoryPermissionMap`), 2.5 سياق ونطاق البيانات (Data Scoping Rules), 2.6 الاستثناءات والقواعد الخاصة بالصلاحيات, 2. الأدوار والصلاحيات وسياق البيانات (RBAC & Scope), 7.1 التسعير والعروض الترويجية (+11 more)

### Community 107 - "FaqPage.tsx"
Cohesion: 0.36
Nodes (7): FaqAccordionItem(), FaqAccordionItemProps, FaqCategoryGroup, FaqItem, FaqPage(), groupByCategory(), matchesSearch()

### Community 108 - "CustomerOwnershipTransfersSection.tsx"
Cohesion: 0.33
Nodes (8): 5.2 دورة حياة مشاكل العقود ونقل الملكية (`ContractCase`, `OwnershipTransfer`), OwnershipTransfer, OwnershipTransferStatus, CollapsibleSection(), CustomerOwnershipTransfersSection(), CustomerOwnershipTransfersSectionProps, paidInstallmentsTable(), ownershipTransferStatusLabel()

### Community 109 - "react-dom"
Cohesion: 0.38
Nodes (3): react-dom@^19.2.6, react-dom, ContractActionsMenu()

### Community 110 - "6. العمليات والـ Workflows التفصيلية خطوة بخطوة"
Cohesion: 0.33
Nodes (6): 6.1 إنشاء وتأكيد وتعديل وحذف التعاقدات (`POS & Contracts`), 6.3 مسار المخزون وحركات الأجهزة والعهد والصيانة, 6.4 مسار التحصيل والأقساط والمدفوعات والمراجعة والمصروفات, 6.5 مسار المحاسبة و HRM و CRM والبوابة, 6. العمليات والـ Workflows التفصيلية خطوة بخطوة, StockReceipt

### Community 111 - "axios"
Cohesion: 0.53
Nodes (4): axios@^1.17.0, axios, posContextFailure(), PosContextUnavailableError

### Community 112 - "CustomerCollectionActions.tsx"
Cohesion: 0.70
Nodes (4): CollectionActionsSummary, ContractCollectionActions(), summaryQueryKey(), useCollectionActionsSummary()

### Community 113 - "ChatbotWidget.tsx"
Cohesion: 0.40
Nodes (4): BotMessage, ChatResponse, HistoryEntry, SUGGESTIONS

### Community 114 - "UpcomingLeavesList.tsx"
Cohesion: 0.39
Nodes (6): HrmLeave, HrmLeaveType, initials(), UpcomingLeavesList(), UpcomingLeavesListProps, hrmLeaveTypeLabel()

## Knowledge Gaps
- **2 isolated node(s):** `GIT_WORK_TREE`, `GIT_CONFIG_GLOBAL`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 734 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `getErrorMessage`, `StatusBadge`, `api/types.ts`, `PosPage.tsx`, `UninstallDeviceHandoverModal.tsx`, `ServiceCombinerPage.tsx`, `CustomerContractsSection.tsx`, `CrmOwnerDetailPage.tsx`, `InventoryProductSettingsPage.tsx`, `InventoryPage.tsx`, `InstallmentContractDocument.tsx`, `CrmReferralsListPage.tsx`, `Branch`, `CrmCallLogsPage.tsx`, `ContractDetailPage.tsx`, `permissionCatalog.ts`, `JournalEntriesPage.tsx`, `HrmSalesTargetsPage.tsx`, `HrmEmployeeDetailPage.tsx`, `PosFlowPage.tsx`, `DailyBranchReportPage.tsx`, `CustomerCreateModal.tsx`, `PosOwnershipTransferSection.tsx`, `procedureDraftStore.ts`, `CrmTasksPage.tsx`, `dataScope.ts`, `package.json`, `access.ts`, `AdminSystemSettingsPage.tsx`, `fontScale.ts`, `AdminActivityLogPage.tsx`, `InstallmentCollectionPanel.tsx`, `devDependencies`, `useDebouncedValue`, `InstallmentCollectionGroupedList.tsx`, `InstallmentCollectionPage.tsx`, `Icon`, `DeviceLineCard.tsx`, `AppShell.tsx`, `permissions.ts`, `AppDatePicker`, `UserManualPage.tsx`, `usePageTour.ts`, `ContractTemplatePreviewPage.tsx`, `normalizeDigits.ts`, `InstallmentCollectionPanel.tsx`, `format.ts`, `BranchInventoryPage.tsx`, `EmployeeAttachmentsSection.tsx`, `PaymentsPage.tsx`, `CrmActivitiesPage.tsx`, `CustomerPublicProfilePage.tsx`, `SalesInvoice`, `SyncDebugPage.tsx`, `ReferralNetworkTree.tsx`, `useEnterToNextField.ts`, `InstallmentContractDocument.tsx`, `PricingCatalogPage.tsx`, `main.tsx`, `PosOwnershipTransferSection.tsx`, `CrmCeoDashboardPage.tsx`, `SalesInvoice`, `useAuthStore`, `BranchDetailPage.tsx`, `tourStore.ts`, `FaqPage.tsx`, `react-dom`, `CustomerCollectionActions.tsx`, `ChatbotWidget.tsx`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **What connects `GIT_WORK_TREE`, `GIT_CONFIG_GLOBAL` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `getErrorMessage` be split into smaller, more focused modules?**
  _Cohesion score 0.06946386946386947 - nodes in this community are weakly interconnected._
- **Why does `Icon()` connect `Icon` to `getErrorMessage`, `StatusBadge`, `PosPage.tsx`, `ServiceCombinerPage.tsx`, `CustomerContractsSection.tsx`, `react`, `CrmOwnerDetailPage.tsx`, `InventoryProductSettingsPage.tsx`, `InventoryPage.tsx`, `InstallmentContractDocument.tsx`, `CrmReferralsListPage.tsx`, `Branch`, `departmentDashboard.ts`, `ContractDetailPage.tsx`, `permissionCatalog.ts`, `JournalEntriesPage.tsx`, `HrmSalesTargetsPage.tsx`, `HrmEmployeeDetailPage.tsx`, `PosFlowPage.tsx`, `DailyBranchReportPage.tsx`, `CustomerCreateModal.tsx`, `PosOwnershipTransferSection.tsx`, `procedureDraftStore.ts`, `CrmTasksPage.tsx`, `PortalLayout.tsx`, `access.ts`, `AdminSystemSettingsPage.tsx`, `AdminActivityLogPage.tsx`, `InstallmentCollectionPanel.tsx`, `useDebouncedValue`, `InstallmentCollectionGroupedList.tsx`, `InstallmentCollectionPage.tsx`, `DeviceLineCard.tsx`, `AppShell.tsx`, `permissions.ts`, `BranchDetailPage.tsx`, `UserManualPage.tsx`, `usePageTour.ts`, `ContractTemplatePreviewPage.tsx`, `InstallmentCollectionPanel.tsx`, `DashboardPage.tsx`, `EmployeeAttachmentsSection.tsx`, `CrmActivitiesPage.tsx`, `CustomerPublicProfilePage.tsx`, `SalesInvoice`, `ProfileAvatar.tsx`, `HrmDashboardPage.tsx`, `PosOwnershipTransferSection.tsx`, `CrmCeoDashboardPage.tsx`, `CeoEmployeeRankList.tsx`, `useAuthStore`, `BranchDetailPage.tsx`, `FaqPage.tsx`, `CustomerOwnershipTransfersSection.tsx`, `ChatbotWidget.tsx`, `UpcomingLeavesList.tsx`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Should `StatusBadge` be split into smaller, more focused modules?**
  _Cohesion score 0.045103324348607365 - nodes in this community are weakly interconnected._
- **Why does `useAuthStore` connect `useAuthStore` to `getErrorMessage`, `StatusBadge`, `PosPage.tsx`, `ServiceCombinerPage.tsx`, `CustomerContractsSection.tsx`, `react`, `CrmOwnerDetailPage.tsx`, `InventoryProductSettingsPage.tsx`, `InventoryPage.tsx`, `InstallmentContractDocument.tsx`, `CrmReferralsListPage.tsx`, `Branch`, `ContractDetailPage.tsx`, `JournalEntriesPage.tsx`, `PosFlowPage.tsx`, `DailyBranchReportPage.tsx`, `CustomerCreateModal.tsx`, `procedureDraftStore.ts`, `dataScope.ts`, `access.ts`, `AdminSystemSettingsPage.tsx`, `InstallmentCollectionGroupedList.tsx`, `InstallmentCollectionPage.tsx`, `Icon`, `AppShell.tsx`, `usePageTour.ts`, `InstallmentCollectionPanel.tsx`, `BranchInventoryPage.tsx`, `DashboardPage.tsx`, `PaymentsPage.tsx`, `SalesInvoice`, `InstallmentContractDocument.tsx`, `HrmDashboardPage.tsx`, `contextStore.ts`, `SalesInvoice`, `BranchDetailPage.tsx`, `tourStore.ts`, `ChatbotWidget.tsx`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Should `api/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.024719101123595506 - nodes in this community are weakly interconnected._