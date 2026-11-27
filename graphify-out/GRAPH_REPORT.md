# Graph Report - Sales-App  (2026-11-27)

## Corpus Check
- 525 files · ~325,867 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 25 file(s) not represented in the graph (top: .css 12, (none) 8, .ttf 3)

## Summary
- 3129 nodes · 14126 edges · 106 communities (102 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 109 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a31fc0d1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- react
- AsyncState
- api/types.ts
- PosPage.tsx
- BranchInventoryPage.tsx
- ServiceCombinerPage.tsx
- SalesInvoice
- contractFields.ts
- Icon
- CrmOwnerDetailPage.tsx
- routes.tsx
- InventoryPage.tsx
- InstallmentContractDocument.tsx
- CrmReferralsListPage.tsx
- Branch
- usePageTour.ts
- DeviceLineCard.tsx
- CrmCallLogsPage.tsx
- ContractDetailPage.tsx
- permissionCatalog.ts
- JournalEntriesPage.tsx
- getErrorMessage
- HrmEmployeeDetailPage.tsx
- PosFlowPage.tsx
- DailyBranchReportPage.tsx
- CustomerCreateModal.tsx
- PosOwnershipTransferSection.tsx
- CustomerDetailPage.tsx
- CrmTasksPage.tsx
- Employee
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
- AdministrationMessagingSettingsCard.tsx
- InstallmentCollectionGroupedList.tsx
- InstallmentCollectionPage.tsx
- AppShell.tsx
- CustomerContractDevicePicker.tsx
- المرجع التفصيلي الشامل لنظام GPS للمبيعات (Exhaustive System Specification)
- dataScope.ts
- procedureDraftStore.ts
- permissions.ts
- AppDatePicker
- BranchDetailPage.tsx
- UserManualPage.tsx
- formatArNumber
- vitest
- ContractTemplatePreviewPage.tsx
- fontScale.ts
- ExternalCollectionPage.tsx
- compilerOptions
- format.ts
- ownershipTransferFinancialBreakdown.ts
- compilerOptions
- PortalLayout.tsx
- DashboardPage.tsx
- pageStats.ts
- EmployeeAttachmentsSection.tsx
- ContractFollowUpTab.tsx
- Tour
- DESIGN.md
- digitInput.ts
- CustomerPublicProfilePage.tsx
- crmPageVisibility.ts
- ContractProblemWizard.tsx
- SyncDebugPage.tsx
- vite.config.ts
- App.tsx
- axios
- useOrgSettingsStore
- ReferralNetworkTree.tsx
- useEnterToNextField.ts
- nextInstallmentInterval
- PricingCatalogPage.tsx
- ProfileAvatar.tsx
- GPS App (Sales-App)
- contextStore.ts
- NavIcon.tsx
- react-dom
- BranchStockTickerBar.tsx
- main.tsx
- printPaymentReceipt.ts
- CeoPeriodToggle.tsx
- scripts
- contractStatus.ts
- CeoEmployeeRankList.tsx
- FunnelPanel.tsx
- ChatbotWidget.tsx
- OverpaymentConfirmDialog.tsx
- services.ts
- CeoFunnelBars.tsx
- git-frontend.sh
- ModuleToggleCard.tsx
- vite-env.d.ts
- tsconfig.json
- entrypoint.sh
- vercel.json

## God Nodes (most connected - your core abstractions)
1. `Icon()` - 318 edges
2. `react` - 241 edges
3. `AsyncState()` - 238 edges
4. `getErrorMessage()` - 219 edges
5. `useAuthStore` - 214 edges
6. `@tanstack/react-query` - 191 edges
7. `api` - 175 edges
8. `DataTable()` - 146 edges
9. `AppRoutes()` - 138 edges
10. `react-router-dom` - 123 edges

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

## Communities (106 total, 4 thin omitted)

### Community 0 - "react"
Cohesion: 0.06
Nodes (64): react, react-router-dom, @tanstack/react-query, api, axiosApi, AccessoryPackage, ChatConversationSummary, HrmPayrollRecord (+56 more)

### Community 1 - "AsyncState"
Cohesion: 0.06
Nodes (86): portalApi, DistributorCommissionLedgerEntry, HrmAttendance, AsyncState(), ContractDeletionError(), DataTable(), DataTableProps, FilterBar() (+78 more)

### Community 2 - "api/types.ts"
Cohesion: 0.02
Nodes (90): 5.3 دورة حياة وحدات المخزون وحركات الأجهزة (`ProductUnit`, `DeviceMovement`, `StockTransfer`), AccessoryPackageItem, AccountingAccountType, AccountingBudget, AccountingDashboard, AccountPrimaryType, AdministrationDeletionBlockers, ArAgeingContactRow (+82 more)

### Community 3 - "PosPage.tsx"
Cohesion: 0.06
Nodes (70): ContractKind, GpsProduct, GpsStock, SubscriptionRenewalCandidate, ClosedContractCorrectionEditor(), ContractExecutionBranchEditor(), GpsProductCardProps, CheckoutPaymentSection() (+62 more)

### Community 4 - "BranchInventoryPage.tsx"
Cohesion: 0.07
Nodes (61): 4.3 المخزون والأجهزة وحركات الأجهزة والعهد والإكسسوارات (`Inventory`), CustodyVoucher, DepartmentStock, ProductUnit, SupportTask, SupportTaskStatus, BranchInventoryUnitForm(), CustodyVoucherDetails() (+53 more)

### Community 5 - "ServiceCombinerPage.tsx"
Cohesion: 0.08
Nodes (68): ServiceCategory, PosContractTypeTabs(), PosContractTypeTabsProps, posModeToggleGroupClass, posRequiredWrap(), posSourceToggle(), posStaticFieldClass, posToggleBtn() (+60 more)

### Community 6 - "SalesInvoice"
Cohesion: 0.06
Nodes (69): 4.5 الأقساط والمدفوعات والتحصيل والمراجعة والمصروفات والبيان اليومي (`Financial Ops`), 5.2 دورة حياة مشاكل العقود ونقل الملكية (`ContractCase`, `OwnershipTransfer`), 6.1 إنشاء وتأكيد وتعديل وحذف التعاقدات (`POS & Contracts`), 6.2 مسار مشاكل العقود (`ContractCases`), InstallmentItem, InstallmentPlan, InstallmentReconciliation, OwnershipTransfer (+61 more)

### Community 7 - "contractFields.ts"
Cohesion: 0.07
Nodes (69): SalesInvoiceLine, CashDueList(), ContractKindReviewNotice(), ContractReviewDetails(), CustomerField(), DeviceDetailCard(), DeviceIdentifiersTable(), FinancialSummaryCard() (+61 more)

### Community 8 - "Icon"
Cohesion: 0.08
Nodes (67): AdminRole, HrmJob, Section, EntityRowActions(), hasPermission(), Icon(), Modal(), PageHeader() (+59 more)

### Community 9 - "CrmOwnerDetailPage.tsx"
Cohesion: 0.06
Nodes (67): ActivitiesBoardCallRow, ActivitiesBoardInstallationRow, ActivitiesBoardResponse, ActivitiesBoardTaskRow, OwnerDetailResponse, OwnerLeaderboardResponse, OwnerLeaderboardRow, OwnerLeaderboardSort (+59 more)

### Community 10 - "routes.tsx"
Cohesion: 0.07
Nodes (60): AppRoutes(), PortalProtectedRoute(), PortalPublicRoute(), ProtectedRoute(), PublicRoute(), RedirectEmployeeReportToOwner(), RoleRoute(), ExpenseRequestForm() (+52 more)

### Community 11 - "InventoryPage.tsx"
Cohesion: 0.06
Nodes (56): ChartCard(), ChartCardProps, BarChartPanel(), DonutChartPanel(), CollapsibleSection(), CollapsibleSectionProps, CustomerEvaluationsSection(), CustomerEvaluationsSectionProps (+48 more)

### Community 12 - "InstallmentContractDocument.tsx"
Cohesion: 0.08
Nodes (53): ContractPrintBorder(), ContractPrintFooter(), ContractPrintFooterProps, ContractPrintHeader(), ContractPrintHeaderProps, balanceTermsTokens(), CASH_TERMS_TOKENS, FitJustifiedTerms() (+45 more)

### Community 13 - "CrmReferralsListPage.tsx"
Cohesion: 0.11
Nodes (47): ReferralLead, ReferralLeadStatus, ReferralReferrerOption, CustomerReferralsSection(), CustomerReferralsSectionProps, DateTimeInput12h(), CrmLeadDrawer(), CrmLeadDrawerProps (+39 more)

### Community 14 - "Branch"
Cohesion: 0.10
Nodes (45): 4.2 العملاء والموزعون (`Customers & Distributors`), Branch, Customer, Distributor, SalesRep, PosContractHeaderProps, TransactionSource, posInputClass (+37 more)

### Community 15 - "usePageTour.ts"
Cohesion: 0.08
Nodes (40): StartTourButton(), StartTourButtonProps, TourProvider(), TourProviderProps, buildShepherdTour(), cancelActiveTour(), runTour(), StartTourOptions (+32 more)

### Community 16 - "DeviceLineCard.tsx"
Cohesion: 0.11
Nodes (43): CashInstallmentScheduleEditor(), CashInstallmentScheduleEditorProps, CashScheduleSelector(), CashScheduleSelectorProps, DeviceLineCard(), DeviceLineFieldErrors, IntervalType, lineInstallmentCount() (+35 more)

### Community 17 - "CrmCallLogsPage.tsx"
Cohesion: 0.11
Nodes (42): 4.6 المحاسبة والموارد البشرية و CRM والدعم والدردشة والرسائل (`ERP, CRM & Support`), CallStatementForm, CrmCallLog, Lead, ServiceEvaluationRequest, AppDateTimePicker(), Props, TextArea() (+34 more)

### Community 18 - "ContractDetailPage.tsx"
Cohesion: 0.15
Nodes (40): buildContractListColumns(), contractDateFilterParams(), contractReviewRowClass(), defaultContractListActions(), filterContractListRows(), reviewOnlyContractListActions(), sortContractsByDateTime(), ContractProblemWizard() (+32 more)

### Community 19 - "permissionCatalog.ts"
Cohesion: 0.07
Nodes (41): 4.1 الهيكل التنظيمي والإعدادات (`Core / Admin`), Role, formatUserRolesLabel(), MANAGER_DENIED_PERMISSIONS, PROTECTED_ROLE_SLUGS, ROLE_ASSIGNMENT_EXCLUDED, SYSTEM_ROLE_LABELS, SYSTEM_ROLE_PAGE_HINTS (+33 more)

### Community 20 - "JournalEntriesPage.tsx"
Cohesion: 0.11
Nodes (38): AccountingAccount, AccountingAccTransMapping, AccountingSettings, AccountingTransactionLine, BranchAccountingMap, KpiCard(), KpiCardProps, usePageTour() (+30 more)

### Community 21 - "getErrorMessage"
Cohesion: 0.11
Nodes (37): getErrorMessage(), Department, AddStockForm(), AddStockFormProps, invalidateStockQueries(), DistributeStockModalProps, RefundPaymentModal(), ReturnStockModal() (+29 more)

### Community 22 - "HrmEmployeeDetailPage.tsx"
Cohesion: 0.10
Nodes (36): HrmAllowance, HrmLeave, HrmLeaveType, HrmUserSalesTarget, formatAccountingMoney(), initials(), UpcomingLeavesList(), UpcomingLeavesListProps (+28 more)

### Community 23 - "PosFlowPage.tsx"
Cohesion: 0.11
Nodes (36): 4.4 التسعير والعروض والخدمات والتعاقدات ومشاكل العقود (`Pricing, Sales, Contracts & Cases`), 4. الكيانات والبيانات والحقول وقواعد التحقق (Entities, Fields & Validation Rules), AccessoryCheckoutPayload, CheckoutPayload, PriceCatalogItem, Promotion, Service, MyContractsButton() (+28 more)

### Community 24 - "DailyBranchReportPage.tsx"
Cohesion: 0.10
Nodes (38): DailyBranchReport, DailyBranchReportInference, DailyBranchReportPrintDocument(), fmtMoney(), Props, AR_DAYS, arabicDayName(), ATTENDANCE_ROW_COUNT (+30 more)

### Community 25 - "CustomerCreateModal.tsx"
Cohesion: 0.14
Nodes (34): CustomerAttachmentsSection(), CustomerAttachmentsSectionProps, formatFileSize(), getMediaDisplayName(), PendingAttachment, uploadCustomerAttachments(), CustomerCreateForm(), emptyForm (+26 more)

### Community 26 - "PosOwnershipTransferSection.tsx"
Cohesion: 0.12
Nodes (32): CustomerContractDevice, CustomerCreateModal(), CustomerCreateModalProps, CustomerDeviceHistorySection(), CustomerDeviceHistorySectionProps, CustomerLegacyDevicesFields(), CustomerLegacyDevicesFieldsProps, CustodyVoucherForm() (+24 more)

### Community 27 - "CustomerDetailPage.tsx"
Cohesion: 0.08
Nodes (32): DeleteConfirmDialog(), DeleteConfirmDialogProps, CustomerCallTimelineSection(), formatDuration(), CustomerComplaintsSection(), CustomerInstallationsSection(), CustomerInstallationsSectionProps, CustomerWarrantySection() (+24 more)

### Community 28 - "CrmTasksPage.tsx"
Cohesion: 0.11
Nodes (32): CrmTask, CrmTaskBucket, CrmTaskPriority, CrmTaskStatus, createCrmTask(), CRM_TASK_BUCKET_LABELS, CRM_TASK_PIPELINE_STAGES, CRM_TASK_PRIORITY_LABELS (+24 more)

### Community 29 - "Employee"
Cohesion: 0.11
Nodes (26): Employee, DeviceLineDraft, UseDeviceLineEditorInput, ServicePaymentState, CheckoutPaymentDraft, money(), repriceDeviceLine(), isAccessoriesDraftMeaningful() (+18 more)

### Community 30 - "posFormStyles.ts"
Cohesion: 0.13
Nodes (26): DiscountInput(), DiscountInputProps, OptionalDiscountFields(), OptionalDiscountFieldsProps, PosDevicesToolbar(), PosDevicesToolbarProps, posControlHeightClass, posRequiredWrapClass (+18 more)

### Community 31 - "CrmCeoDashboardPage.tsx"
Cohesion: 0.11
Nodes (27): CeoDashboard, CeoDashboardFollowUp, CeoDashboardInstallationItem, CeoDashboardLeadsBreakdown, CeoCard(), CeoCardProps, CeoFollowUpList(), CeoFollowUpListProps (+19 more)

### Community 32 - "package.json"
Cohesion: 0.08
Nodes (31): dependencies, axios@^1.17.0, @floating-ui/react@^0.27.20, @hookform/resolvers@^5.4.0, @icon-park/react@^1.4.2, react@^19.2.6, react-day-picker@^10.0.2, react-hook-form@^7.77.0 (+23 more)

### Community 33 - "DepartmentDetailPage.tsx"
Cohesion: 0.15
Nodes (25): Administration, InventoryOverviewRow, DeviceHealthCards(), DeviceHealthCardsProps, GpsDeviceTable(), GpsDeviceTableProps, GpsDeviceTableRow, GpsKpiRow() (+17 more)

### Community 34 - "AdminSystemSettingsPage.tsx"
Cohesion: 0.15
Nodes (27): CustomerMessageLogEntry, GeneralSettings, MessagingSettings, OrganizationProfile, OrganizationSettings, SalesSettings, SecuritySettings, useOrgSettingsBootstrap() (+19 more)

### Community 35 - "review/api.ts"
Cohesion: 0.12
Nodes (28): ServiceEvaluationAnswer, ServiceEvaluationQuestion, ServiceEvaluationRequestStatus, SubscriptionRenewalQueueItem, SubscriptionRenewalStatus, ANSWER_TYPE_LABELS, createEvaluationQuestion(), deleteEvaluationQuestion() (+20 more)

### Community 36 - "AdminActivityLogPage.tsx"
Cohesion: 0.13
Nodes (27): ActivityLogEntry, AdminUser, ActivityLogInsights, computeActivityLogInsights(), exportActivityLogCsv(), startOfDay(), ACTION_LABELS, ActivityAction (+19 more)

### Community 37 - "InstallmentCollectionPanel.tsx"
Cohesion: 0.14
Nodes (27): DateTimeInput12hProps, hourOptions, minuteOptions, InstallmentCollectionPanel(), InstallmentCollectionPanelEmpty(), installmentTotalDue(), paymentMethodOptions, PaymentRow (+19 more)

### Community 38 - "collectionHelpers.ts"
Cohesion: 0.14
Nodes (28): computeContractStats(), contractCollectionSortKey(), ContractCollectionStats, contractFilterTier(), contractTierFilterOptions, dateOnly(), filterInstallmentCollectionRows(), filterRowsByContractTier() (+20 more)

### Community 39 - "crmNavCatalog.ts"
Cohesion: 0.08
Nodes (26): 2.1 الأدوار النظامية المحمية (11 دوراً في `SystemRoleCatalog`), 2.2 قوائم الحظر والاستثناءات (Denylists & Assignment Exclusions), 2.3 تخصيص صلاحيات الأدوار على مستوى الإدارة (`administration_role_permission_overrides`), 2.4 الكتالوج الكامل لمفاتيح الصلاحيات (من `RolePermissionSeeder` و `InventoryPermissionMap`), 2.5 سياق ونطاق البيانات (Data Scoping Rules), 2.6 الاستثناءات والقواعد الخاصة بالصلاحيات, 2. الأدوار والصلاحيات وسياق البيانات (RBAC & Scope), DemoRole (+18 more)

### Community 40 - "devDependencies"
Cohesion: 0.08
Nodes (28): devDependencies, eslint@^10.3.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1, eslint-plugin-react-refresh@^0.5.2, globals@^17.6.0, jsdom@^31.0.0, tailwindcss@^4.3.0 (+20 more)

### Community 41 - "sales.ts"
Cohesion: 0.11
Nodes (24): DistributorType, ContractPrintActions(), deviceLines(), printLabel(), CONTRACT_KINDS, contractKindLabel(), KIND_LABELS, REVIEW_CONTRACT_KIND_OPTIONS (+16 more)

### Community 42 - "AdministrationMessagingSettingsCard.tsx"
Cohesion: 0.13
Nodes (24): AdministrationCollectionSettings, AdministrationMessagingSettings, AdministrationCollectionSettingsCard(), CollectionDraft, draftFromAdministration(), payloadFromDraft(), AdministrationCrmPagesSettingsCard(), draftFromAdministration() (+16 more)

### Community 43 - "InstallmentCollectionGroupedList.tsx"
Cohesion: 0.14
Nodes (24): CollectionActionsSummary, ContractCollectionActions(), summaryQueryKey(), useCollectionActionsSummary(), ContractAllInstallmentsTable(), ContractExpandView, ContractMetaCell(), ContractOptionsMenu() (+16 more)

### Community 44 - "InstallmentCollectionPage.tsx"
Cohesion: 0.12
Nodes (23): CollectorOption, collectionStatusFilterOptions, collectorFilterParam(), collectorFilterValues(), ContractTierFilter, refreshCollectionData(), clearInstallmentCollectionFocus(), contractTiers (+15 more)

### Community 45 - "AppShell.tsx"
Cohesion: 0.15
Nodes (22): 1.3 سلوك الشاشات الصغيرة والموبايل والقوائم الثابتة والمختصرة, الشريط العلوي المثبت (`sticky top-0 z-40`) والأشرطة المساعدة, القائمة الجانبية (`AppShell.tsx` + `SidebarNav.tsx`), تفعيل/تعطيل الوحدات (`enabled_modules`), شريط التنقل السفلي للموبايل (`MobileBottomNav.tsx`) والقوائم المختصرة, AppNotification, ChatbotWidget(), IncompleteProceduresBanner() (+14 more)

### Community 46 - "CustomerContractDevicePicker.tsx"
Cohesion: 0.15
Nodes (19): DeviceOrigin, digitsOnly(), GpsUsernameInput(), GpsUsernameInputProps, posScanClass, ContractDeviceOption, CustomerContractDevicePickerProps, MANUAL_CONTRACT_DEVICE_ID (+11 more)

### Community 47 - "المرجع التفصيلي الشامل لنظام GPS للمبيعات (Exhaustive System Specification)"
Cohesion: 0.09
Nodes (24): 5.1 دورة حياة العقد والفاتورة والمراجعة (`SalesInvoice`, `ContractStatus`, `Review`), 5.4 دورة حياة الأقساط والتصالح والمدفوعات ومراجعة التحصيل (`Installments`, `Payments`, `Review`), 5.5 دورة حياة المصروفات ومديونيات الموظفين والتقييمات (`Expenses`, `EmployeeDebt`, `Evaluations`), 5.6 دورة حياة CRM و HRM والمحاسبة والدعم والرسائل والمزامنة, 5. دورات الحياة وحالات التحوّل (Lifecycles & State Transitions), 6.3 مسار المخزون وحركات الأجهزة والعهد والصيانة, 6.4 مسار التحصيل والأقساط والمدفوعات والمراجعة والمصروفات, 6.5 مسار المحاسبة و HRM و CRM والبوابة (+16 more)

### Community 48 - "dataScope.ts"
Cohesion: 0.21
Nodes (20): BranchSwitcher(), useContextData(), getActiveBranchId(), getAllowedBranchIds(), persistActiveBranch(), getAdministrationApiFilters(), getAdministrationBranchFilters(), mergeScopedParams() (+12 more)

### Community 49 - "procedureDraftStore.ts"
Cohesion: 0.14
Nodes (23): distributorLabel(), EditableExpenseRequest, EXPENSE_TYPES, ExpenseContract, ExpenseDraft, ExpenseRequestFormProps, ExpenseDetail, draftKey() (+15 more)

### Community 50 - "permissions.ts"
Cohesion: 0.21
Nodes (19): NavIcon(), SidebarNav(), SidebarNavProps, SidebarNavGroup(), SidebarNavGroupProps, SidebarNavItem(), SidebarNavItemProps, isNavGroupActive() (+11 more)

### Community 51 - "AppDatePicker"
Cohesion: 0.13
Nodes (13): Application date picker, Dependencies, New files, Updated UI files, Usage, Verification, AppDatePicker(), choose() (+5 more)

### Community 52 - "BranchDetailPage.tsx"
Cohesion: 0.18
Nodes (18): BranchInventoryTable(), BranchInventoryTableProps, BranchKpiGrid(), BranchKpiGridProps, BranchOperationsPanel(), BranchOperationsPanelProps, BranchPageHeader(), BranchPageHeaderProps (+10 more)

### Community 53 - "UserManualPage.tsx"
Cohesion: 0.17
Nodes (18): countManualMatches(), manualHeadingId(), ManualSection, manualSectionsMatching(), ManualSubsection, ParsedManual, parseManual(), toSection() (+10 more)

### Community 54 - "formatArNumber"
Cohesion: 0.15
Nodes (15): BarChartPanelProps, BarSeries, DonutChartPanelProps, GaugeChartPanel(), GaugeChartPanelProps, LineChartPanel(), LineChartPanelProps, LineSeries (+7 more)

### Community 55 - "vitest"
Cohesion: 0.18
Nodes (14): vitest, AuthUser, getUserRole(), hasReviewerRole(), hasRole(), isAnyAdmin(), roleLabelsAr(), roleNames() (+6 more)

### Community 56 - "ContractTemplatePreviewPage.tsx"
Cohesion: 0.19
Nodes (16): ContractTemplate, CONTRACT_TEMPLATES, mockContractPreviewHtml(), sampleOwnershipTransferInvoice(), sampleServiceReceiptInvoice(), TEMPLATE_LABELS, absolutizeCssUrls(), absolutizeImageSources() (+8 more)

### Community 57 - "fontScale.ts"
Cohesion: 0.22
Nodes (17): FontSizeControl(), change(), clearTimer(), commit(), endPress(), startLongPress(), applyFontScale(), applyStoredFontScale() (+9 more)

### Community 58 - "ExternalCollectionPage.tsx"
Cohesion: 0.18
Nodes (16): CollectionPaymentAccount, CollectionFollowUpSidebar(), CollectionFollowUpSidebarProps, ContractGroup, InstallmentCollectionPanelProps, InstallmentCollectionRow, customerAllPhoneNumbers(), INSTALLMENT_PAGE_SIZE (+8 more)

### Community 59 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 60 - "format.ts"
Cohesion: 0.21
Nodes (16): fmtContractDateTime(), clock12(), DISPLAY_LOCALE, DISPLAY_TIMEZONE, formatCairoDateTime12h(), formatCalendarYmd(), formatDate(), formatDateTime() (+8 more)

### Community 61 - "ownershipTransferFinancialBreakdown.ts"
Cohesion: 0.24
Nodes (16): buildOwnershipTransferFinancialBreakdown(), buildScheduleFromPlan(), collectedOnDisplayedLines(), DISPLAYED_FEE_CATEGORIES, findNextUnpaidSourceItem(), findTransferServiceInstallmentPlan(), intervalLabel(), isDeferredCash() (+8 more)

### Community 62 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 63 - "PortalLayout.tsx"
Cohesion: 0.18
Nodes (13): 3.1 المسارات الظاهرة في الشريط الجانبي (Sidebar-Visible Routes), 3.2 المسارات المخفية والمباشرة والطباعة والبوابة وإعادة التوجيه, 3. خريطة الشاشات والمسارات (Routes & Navigation), ContentLoader(), navItems, PortalLayout(), axios, AxiosRequestConfig (+5 more)

### Community 64 - "DashboardPage.tsx"
Cohesion: 0.20
Nodes (15): DashboardInstallmentSummary, DashboardBranchOption, DashboardPeriod, DashboardPeriodFilter(), DashboardPeriodFilterProps, invoicesLabelForPeriod(), options, salesLabelForPeriod() (+7 more)

### Community 65 - "pageStats.ts"
Cohesion: 0.16
Nodes (14): DashboardStats, DonutSlice, InsightVariant, branchAdminName(), BranchKpis, computeBranchByDeptData(), computeBranchInsights(), computeDashboardStockBarData() (+6 more)

### Community 66 - "EmployeeAttachmentsSection.tsx"
Cohesion: 0.21
Nodes (14): MediaFile, ensureAbsoluteUrl(), getApiOrigin(), isImageMimeType(), isPdfMimeType(), resolveMediaUrl(), resolvePublicStorageUrl(), LogoUploader() (+6 more)

### Community 67 - "ContractFollowUpTab.tsx"
Cohesion: 0.19
Nodes (14): CollectionFollowUpLog, ContractFollowUpTab(), ContractFollowUpTabProps, FollowUpForm(), FollowUpLogCard(), installmentGroupKey(), installmentGroupLabel(), CollectionFollowUpHistoryModal() (+6 more)

### Community 68 - "Tour"
Cohesion: 0.13
Nodes (5): shepherd.js, StepButton, StepOptions, Tour, TourOptions

### Community 69 - "DESIGN.md"
Cohesion: 0.14
Nodes (13): Brand & Style, Breadcrumbs, Buttons, Colors, Components, Data Tables, Elevation & Depth, KPI Cards (+5 more)

### Community 70 - "digitInput.ts"
Cohesion: 0.29
Nodes (12): acceptsDigitNormalization(), commitValue(), hasEasternDigits(), insertNormalizedText(), installDigitNormalization(), isTextControl(), normalizeControlValue(), placeCursor() (+4 more)

### Community 71 - "CustomerPublicProfilePage.tsx"
Cohesion: 0.16
Nodes (13): CustomerPublicProfilePage(), formatDate(), formatMoney(), installmentStatusMeta, paymentMethodLabels, PublicContract, PublicContractLine, PublicCustomerProfileResponse (+5 more)

### Community 72 - "crmPageVisibility.ts"
Cohesion: 0.19
Nodes (11): AdministrationCrmPageSettings, CrmHideablePage, crmPageForPath(), CrmPageVisibilityContext, SETTING_KEY, canSeeNavItem(), resolveNavItem(), asPermissionList() (+3 more)

### Community 73 - "ContractProblemWizard.tsx"
Cohesion: 0.15
Nodes (12): applyWizardDraft(), CancelPreview, CancelPreviewPayment, CaseType, ContractCaseRecord, ContractProblemWizardProps, originalPaymentLabel(), PAYMENT_METHOD_LABELS (+4 more)

### Community 74 - "SyncDebugPage.tsx"
Cohesion: 0.18
Nodes (11): BranchOutboxResponse, CloudBranchInfo, CloudChangeRow, CloudInboxRow, CloudPendingResponse, formatDate(), OutboxItem, SyncCheckpoint (+3 more)

### Community 75 - "vite.config.ts"
Cohesion: 0.18
Nodes (7): @tailwindcss/vite@^4.3.0, vite@^8.0.12, @vitejs/plugin-react@^6.0.1, @tailwindcss/vite, vite, @vitejs/plugin-react, appDir

### Community 76 - "App.tsx"
Cohesion: 0.27
Nodes (8): 1.1 الهدف الأساسي للنظام: ما يفعله وما لا يفعله, 1.2 اللغة واتجاه الواجهة وتطبيع الأرقام, 1. نظرة عامة على النظام والبيئة, السلوك الطبيعي, المعمارية وأوضاع التشغيل, App(), BranchSetupGate(), RouteLoadingTracker()

### Community 77 - "axios"
Cohesion: 0.33
Nodes (6): axios, attachLoadingInterceptors(), finishTrackedRequest(), axiosPortal, posContextFailure(), PosContextUnavailableError

### Community 78 - "useOrgSettingsStore"
Cohesion: 0.29
Nodes (9): PaymentTransactionReceipt, formatPaidAt(), paymentMethodLabels, PaymentReceiptDocument, paymentSourceLabels, Props, receivingAccountLabel(), applyThemeColor() (+1 more)

### Community 79 - "ReferralNetworkTree.tsx"
Cohesion: 0.38
Nodes (9): ReferralNetworkNode, ChildRow(), formatRate(), formatSales(), initials(), MetricCell(), NetworkNodeCard(), ReferralNetworkTree() (+1 more)

### Community 80 - "useEnterToNextField.ts"
Cohesion: 0.40
Nodes (7): EnterNavigableField, findNextEnterNavigableField(), handleEnterToNextField(), isEnterNavigableField(), isVisibleInForm(), listEnterNavigableFields(), useEnterToNextField()

### Community 81 - "nextInstallmentInterval"
Cohesion: 0.51
Nodes (8): addDays(), addMonthsNoOverflow(), formatDateOnly(), installmentDueDate(), InstallmentIntervalType, lastInstallmentDate(), nextInstallmentInterval(), parseDateOnly()

### Community 82 - "PricingCatalogPage.tsx"
Cohesion: 0.36
Nodes (9): CatalogSection, DevicePriceGuide(), formatPrice(), gpsPrice(), matchesSearch(), PriceGroup(), PriceRow(), PricingCatalogPage() (+1 more)

### Community 83 - "ProfileAvatar.tsx"
Cohesion: 0.22
Nodes (8): getInitials(), iconSizes, ProfileAvatarProps, ProfileAvatarVariant, sizeClasses, variantIcons, variantStyles, ProfilePhotoUploaderProps

### Community 84 - "GPS App (Sales-App)"
Cohesion: 0.25
Nodes (7): Docker, Environment, GPS App (Sales-App), Handover notes, Local, Requirements, Scripts

### Community 85 - "contextStore.ts"
Cohesion: 0.43
Nodes (5): Warehouse, DepartmentSwitcher(), WarehouseSwitcher(), ContextState, useContextStore

### Community 86 - "NavIcon.tsx"
Cohesion: 0.29
Nodes (5): MOBILE_NAV_ITEMS, MobileBottomNavItem, NavIconProps, NAV_ICON_MAP, ParkIconComponent

### Community 87 - "react-dom"
Cohesion: 0.38
Nodes (3): react-dom@^19.2.6, react-dom, ContractActionsMenu()

### Community 88 - "BranchStockTickerBar.tsx"
Cohesion: 0.43
Nodes (6): AccessoryWarehouseStock, accessoryAvailable(), accessoryName(), BranchStockTickerBar(), TickerItem, TickerTrack()

### Community 89 - "main.tsx"
Cohesion: 0.43
Nodes (3): PortalUser, queryClient, PortalAuthState

### Community 90 - "printPaymentReceipt.ts"
Cohesion: 0.48
Nodes (5): PAYMENT_RECEIPT_PRINT_CSS, absolutizeImageSources(), buildPrintDocument(), printPaymentReceiptElement(), waitForIframeReady()

### Community 91 - "CeoPeriodToggle.tsx"
Cohesion: 0.33
Nodes (6): CeoDashboardPeriod, CeoDateRange, CeoPeriodToggle(), CeoPeriodToggleProps, DateField(), OPTIONS

### Community 92 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, preview, test

### Community 93 - "contractStatus.ts"
Cohesion: 0.60
Nodes (4): contractCaseStatusLabels, contractCaseTypeLabels, contractStatusLabel(), contractStatusLabels

### Community 94 - "CeoEmployeeRankList.tsx"
Cohesion: 0.60
Nodes (4): CeoDashboardTopEmployee, CeoEmployeeRankList(), CeoEmployeeRankListProps, initialOf()

### Community 95 - "FunnelPanel.tsx"
Cohesion: 0.40
Nodes (3): DEFAULT_COLORS, FunnelPanelProps, FunnelStage

### Community 96 - "ChatbotWidget.tsx"
Cohesion: 0.40
Nodes (4): BotMessage, ChatResponse, HistoryEntry, SUGGESTIONS

### Community 97 - "OverpaymentConfirmDialog.tsx"
Cohesion: 0.60
Nodes (4): formatMoney(), OverpaymentConfirmDialog(), OverpaymentConfirmDialogProps, ExcessAllocationPreview

### Community 98 - "services.ts"
Cohesion: 0.60
Nodes (3): CATEGORY_LABELS, SERVICE_CATEGORIES, serviceCategoryLabel()

### Community 99 - "CeoFunnelBars.tsx"
Cohesion: 0.40
Nodes (4): CeoFunnelBarsProps, DEFAULT_COLORS, FALLBACK, FunnelStage

### Community 100 - "git-frontend.sh"
Cohesion: 0.50
Nodes (3): GIT_CONFIG_GLOBAL, GIT_WORK_TREE, git-frontend.sh script

### Community 101 - "ModuleToggleCard.tsx"
Cohesion: 0.67
Nodes (3): ModuleToggleCard(), ModuleToggleCardProps, ModuleDefinition

## Knowledge Gaps
- **2 isolated node(s):** `GIT_WORK_TREE`, `GIT_CONFIG_GLOBAL`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 728 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `AsyncState`, `api/types.ts`, `PosPage.tsx`, `BranchInventoryPage.tsx`, `ServiceCombinerPage.tsx`, `SalesInvoice`, `Icon`, `CrmOwnerDetailPage.tsx`, `routes.tsx`, `InventoryPage.tsx`, `InstallmentContractDocument.tsx`, `CrmReferralsListPage.tsx`, `Branch`, `usePageTour.ts`, `DeviceLineCard.tsx`, `CrmCallLogsPage.tsx`, `ContractDetailPage.tsx`, `permissionCatalog.ts`, `JournalEntriesPage.tsx`, `getErrorMessage`, `HrmEmployeeDetailPage.tsx`, `PosFlowPage.tsx`, `DailyBranchReportPage.tsx`, `CustomerCreateModal.tsx`, `PosOwnershipTransferSection.tsx`, `CustomerDetailPage.tsx`, `CrmTasksPage.tsx`, `posFormStyles.ts`, `CrmCeoDashboardPage.tsx`, `package.json`, `DepartmentDetailPage.tsx`, `AdminSystemSettingsPage.tsx`, `review/api.ts`, `AdminActivityLogPage.tsx`, `InstallmentCollectionPanel.tsx`, `AdministrationMessagingSettingsCard.tsx`, `InstallmentCollectionGroupedList.tsx`, `InstallmentCollectionPage.tsx`, `AppShell.tsx`, `CustomerContractDevicePicker.tsx`, `dataScope.ts`, `procedureDraftStore.ts`, `permissions.ts`, `AppDatePicker`, `BranchDetailPage.tsx`, `UserManualPage.tsx`, `ContractTemplatePreviewPage.tsx`, `fontScale.ts`, `ExternalCollectionPage.tsx`, `DashboardPage.tsx`, `EmployeeAttachmentsSection.tsx`, `ContractFollowUpTab.tsx`, `CustomerPublicProfilePage.tsx`, `ContractProblemWizard.tsx`, `SyncDebugPage.tsx`, `App.tsx`, `useOrgSettingsStore`, `ReferralNetworkTree.tsx`, `useEnterToNextField.ts`, `PricingCatalogPage.tsx`, `NavIcon.tsx`, `react-dom`, `BranchStockTickerBar.tsx`, `main.tsx`, `ChatbotWidget.tsx`, `OverpaymentConfirmDialog.tsx`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **What connects `GIT_WORK_TREE`, `GIT_CONFIG_GLOBAL` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.06344129015060643 - nodes in this community are weakly interconnected._
- **Why does `Icon()` connect `Icon` to `react`, `AsyncState`, `PosPage.tsx`, `ServiceCombinerPage.tsx`, `SalesInvoice`, `CrmOwnerDetailPage.tsx`, `routes.tsx`, `InventoryPage.tsx`, `InstallmentContractDocument.tsx`, `CrmReferralsListPage.tsx`, `Branch`, `usePageTour.ts`, `DeviceLineCard.tsx`, `ContractDetailPage.tsx`, `permissionCatalog.ts`, `JournalEntriesPage.tsx`, `getErrorMessage`, `HrmEmployeeDetailPage.tsx`, `PosFlowPage.tsx`, `DailyBranchReportPage.tsx`, `CustomerCreateModal.tsx`, `PosOwnershipTransferSection.tsx`, `CustomerDetailPage.tsx`, `CrmTasksPage.tsx`, `posFormStyles.ts`, `CrmCeoDashboardPage.tsx`, `DepartmentDetailPage.tsx`, `AdminSystemSettingsPage.tsx`, `AdminActivityLogPage.tsx`, `InstallmentCollectionPanel.tsx`, `sales.ts`, `AdministrationMessagingSettingsCard.tsx`, `InstallmentCollectionGroupedList.tsx`, `InstallmentCollectionPage.tsx`, `AppShell.tsx`, `permissions.ts`, `BranchDetailPage.tsx`, `UserManualPage.tsx`, `ContractTemplatePreviewPage.tsx`, `ExternalCollectionPage.tsx`, `PortalLayout.tsx`, `DashboardPage.tsx`, `EmployeeAttachmentsSection.tsx`, `CustomerPublicProfilePage.tsx`, `ContractProblemWizard.tsx`, `ProfileAvatar.tsx`, `NavIcon.tsx`, `CeoEmployeeRankList.tsx`, `ChatbotWidget.tsx`, `OverpaymentConfirmDialog.tsx`, `ModuleToggleCard.tsx`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Should `AsyncState` be split into smaller, more focused modules?**
  _Cohesion score 0.05879120879120879 - nodes in this community are weakly interconnected._
- **Why does `useAuthStore` connect `routes.tsx` to `react`, `AsyncState`, `PosPage.tsx`, `BranchInventoryPage.tsx`, `ServiceCombinerPage.tsx`, `SalesInvoice`, `Icon`, `CrmOwnerDetailPage.tsx`, `InventoryPage.tsx`, `InstallmentContractDocument.tsx`, `CrmReferralsListPage.tsx`, `Branch`, `usePageTour.ts`, `ContractDetailPage.tsx`, `JournalEntriesPage.tsx`, `getErrorMessage`, `HrmEmployeeDetailPage.tsx`, `PosFlowPage.tsx`, `DailyBranchReportPage.tsx`, `CustomerCreateModal.tsx`, `CustomerDetailPage.tsx`, `DepartmentDetailPage.tsx`, `AdminSystemSettingsPage.tsx`, `review/api.ts`, `InstallmentCollectionPanel.tsx`, `InstallmentCollectionGroupedList.tsx`, `InstallmentCollectionPage.tsx`, `AppShell.tsx`, `dataScope.ts`, `procedureDraftStore.ts`, `BranchDetailPage.tsx`, `DashboardPage.tsx`, `ContractProblemWizard.tsx`, `contextStore.ts`, `BranchStockTickerBar.tsx`, `ChatbotWidget.tsx`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Should `api/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.024366937410415672 - nodes in this community are weakly interconnected._