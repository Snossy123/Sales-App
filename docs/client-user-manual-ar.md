# المرجع التفصيلي الشامل لنظام GPS للمبيعات (Exhaustive System Specification)

> **الإصدار والمرجعية:** مستخرج مباشرة من الكود الفعلي للنظام (`Sales-API` + `Sales-App`) ووثائق التشغيل المعتمدة لشركة **العراقي للتجارة (Eleraqy Trading)**.
> **الغرض:** مرجع وظيفي وتقني شامل لاختبار 100% من حالات النظام الوظيفية، السلبية، الصلاحيات، تحوّلات الحالات، والحالات الحدية (`Functional`, `Negative`, `RBAC`, `State-Transition`, `Edge-Case`).
> **قاعدة التوثيق:** كل سلوك مذكور هنا موثّق من المصدر الفعلي؛ وأي قاعدة غير محددة صراحة في المصدر تُوسم بـ `[معلومة غير محددة في المصدر / تحتاج تحقق]`.

---

## 1. نظرة عامة على النظام والبيئة

### 1.1 الهدف الأساسي للنظام: ما يفعله وما لا يفعله

#### السلوك الطبيعي
- **ما يفعله النظام:** نظام ERP/CRM مؤسسي (**نظام GPS للمبيعات**) مخصص لشركة **العراقي للتجارة (Eleraqy Trading)**، يغطي دورة العمل التجارية والمالية والإدارية بالكامل:
  1. إدارة الهيكل التنظيمي متعدد المنظمات (`Organizations`)، الإدارات (`Administrations`)، الفروع (`Branches`)، والأقسام (`Sections/Departments`).
  2. إدارة العملاء والموزعين والضامنين وسجل الأجهزة المملوكة والملف العام للعميل (`/c/:token`) وبوابة العميل (`/portal`).
  3. نقاط البيع والتعاقدات (`POS`, `POS Services`, `Accessories Sales`, `POS Flow`): بيع وتقسيط أجهزة تتبع GPS، الخدمات، الإكسسوارات والباكدجات، تجديد الاشتراكات، ونقل الملكية، مع طباعة قوالب العقود والإيصالات.
  4. المخزون: المخزن المركزي للإدارة، مخازن الفروع، التوزيع والإرجاع، حركات الأجهزة (`DeviceMovements`) بتأكيد مزدوج، عهدة الموظفين والعملاء والسوفت والصيانة (`CustodyVouchers`)، الإكسسوارات والباكدجات.
  5. الأقساط والتحصيل والمدفوعات: توليد الجداول، التحصيل الداخلي والخارجي (مركز الاتصال)، توزيع التحصيل، حسابات التحويل، التصالح (`Reconciliation`)، التعليق والاستئناف والترحيل، إجراءات التحصيل، الاسترداد والإلغاء في نفس اليوم.
  6. المراجعة: مراجعة التعاقدات، مراجعة التحصيلات، مراجعة مخزون الفرع، مراجعة المصروفات، طابور تقييم العملاء بعد التنفيذ، وطابور تجديد الاشتراكات.
  7. قسم المشاكل / حالات العقود (`ContractCases`): دعم فني، استرجاع، استبدال، إلغاء تعاقد، والتراجع عن الحالة.
  8. الـ CRM: خط وقائمة الترشيحات (`ReferralLeads`)، شبكة الإحالات الشجرية، المهام، الأنشطة، سجل المكالمات وإفاداتها، لوحة المدير التنفيذي (`CEO Dashboard`)، تقارير الموظفين ولوحة المتصدرين.
  9. المحاسبة (`Accounting`): دليل الحسابات الشجري، قيود اليومية والأرصدة الافتتاحية، التحويلات، الترحيل التلقائي (`TransactionMap`)، الميزانيات، و9 تقارير مالية.
  10. الموارد البشرية (`HRM`): الموظفون، الوظائف، أهداف المبيعات والعمولات، الورديات، الحضور والانصراف، تكامل أجهزة البصمة `ZKTeco` (عبر `UDP Pull` و `ADMS/PUSH`)، الإجازات والعطلات، البدلات والخصومات ومديونيات الموظفين، والرواتب ومسيراتها.
  11. الدعم الفني (`SupportTasks`)، الدردشة الداخلية (`Chat`)، الرسائل التلقائية عبر واتساب (`Messaging`)، الأسئلة الشائعة والمساعد الذكي (`FAQ`)، الملاحظات (`Feedback`)، سلة المهملات (`Trash`)، سجل التدقيق (`Activity Log`)، والعمل الأوفلاين للفروع (`Offline Branch Sync`).
- **ما لا يفعله النظام:**
  - **ليس نظام تتبع أسطول حي على الخريطة (Live Fleet Tracking)**؛ مصطلح «GPS» يشير إلى بيع أجهزة التتبع وتركيبها وإدارة عقودها وأقساطها وصيانتها واشتراكاتها.
  - **لا يحتوي على فواتير مشتريات أو تقادم ذمم دائنة فعلي** (تقرير `AP Ageing` يُرجع مصفوفة فارغة مع رسالة توضح عدم تنفيذ فواتير المشتريات بعد).

#### المعمارية وأوضاع التشغيل
- **الخلفية (`Sales-API`):** Laravel 12 (PHP 8.2)، MySQL 8، مصادقة `Laravel Sanctum` (Bearer tokens)، صلاحيات `spatie/laravel-permission`، سجل تدقيق `spatie/laravel-activitylog`، توثيق OpenAPI على `/docs/api` عبر `dedoc/scramble`.
- **الواجهة (`Sales-App`):** React 19 + TypeScript + Vite 8 + React Router 7 + Zustand + TanStack Query + React Hook Form + Zod + Tailwind CSS v4 + Axios + Recharts + Shepherd.js.
- **وضعان للتشغيل (`ERP_MODE`):**
  - `cloud` (السحابي — الافتراضي): يعمل بكامل الموديولات والترحيل المحاسبي.
  - `branch` (خادم فرع محلي أوفلاين): يعتمد على بوابة `BranchSetupGate` (`GET /api/v1/setup/status`)؛ إذا كان `needs_setup === true` يُعاد التوجيه إجبارياً إلى `/setup`، وإذا اكتمل الإعداد وحاول المستخدم فتح `/setup` يُعاد توجيهه إلى `/login`.
### 1.2 اللغة واتجاه الواجهة وتطبيع الأرقام
- **اتجاه الصفحة واللغة:** واجهة عربية أولاً (`<html dir="rtl" lang="ar">`)، Locale افتراضي `ar` / `ar_SA`، العملة الافتراضية `EGP`، المنطقة الزمنية `Africa/Cairo`، صيغة التاريخ `Y/m/d`، صيغة الوقت `12h`.
- **الخطوط والأيقونات:** `Noto Sans Arabic`، `Noto Naskh Arabic`، `IBM Plex Sans Arabic`، مع `Material Symbols Outlined` و `Font Awesome 6.5`.
- **تطبيق لغة المنظمة (`SetAppLocale`):** يقرأ `settings.general.default_locale` (`ar` أو `en`) ويضبط `app()->setLocale()` لكل طلب API.
- **تطبيع الأرقام (`NormalizeLatinDigits`):** يحوّل تلقائياً الأرقام العربية/الهندية/الفارسية في الـ Query و JSON Body و Form Inputs إلى أرقام لاتينية قبل تنفيذ أي قاعدة تحقق (`Validation`).

### 1.3 سلوك الشاشات الصغيرة والموبايل والقوائم الثابتة والمختصرة

#### القائمة الجانبية (`AppShell.tsx` + `SidebarNav.tsx`)
- مثبتة يمين الشاشة (`fixed right-0 z-50 h-full`).
- **الشاشات الصغيرة (`< 1024px` / `max-lg`):** تعمل كـ **Drawer** منزلق (`max-lg:w-64`, مخفية بـ `max-lg:translate-x-full`) مع خلفية معتمة (`bg-black/40`, `aria-label="إغلاق القائمة"`). تُغلق تلقائياً عند تغيير المسار `location.pathname`.
- **الشاشات الكبيرة (`>= 1024px` / `lg`):** قابلة للطي (`lg:w-64` مفتوحة مقابل `lg:w-[4.5rem]` مطوية) مع حفظ الحالة في `localStorage['sidebar-collapsed']`.
- **نظام الأكورديون:** مجموعة واحدة فقط مفتوحة في آن واحد (`openGroupId`)؛ تفتح تلقائياً المجموعة التي ينتمي لها المسار النشط، والافتراضي عند الدخول هو `'management'` لدوري `super_admin`/`admin` و `null` لباقي الأدوار. النقر على مجموعة والقائمة مطوية يوسّع القائمة ويفتح المجموعة معاً.

#### الشريط العلوي المثبت (`sticky top-0 z-40`) والأشرطة المساعدة
- **زر القائمة:** يفتح/يغلق الـ Drawer على `< 1024px` ويطوي/يوسع القائمة على `>= 1024px`.
- **`BranchSwitcher`:** تبديل الفرع النشط للمستخدم.
- **`SyncStatusIndicator`:** يظهر **فقط** في وضع `mode === 'branch'`؛ يستعلم كل 15 ثانية ويعرض نقطة نابضة تربط إلى `/sync-debug` بالحالات: `ONLINE / SYNCED` (أخضر)، `SYNCING` (برتقالي)، `OFFLINE` أو `SYNC ERROR` (أحمر)، مع آخر مزامنة وعدد العمليات المعلقة والفاشلة.
- **`ChatWidget`:** نافذة الدردشة الداخلية السريعة.
- **`IncompleteProceduresBanner`:** أيقونة سجل مع شارة عدد المسودات غير المكتملة للمستخدم (عدا الصفحة الحالية) تفتح قائمة بأزرار **متابعة** و **تجاهل** (بعد تأكيد `window.confirm`).
- **الإشعارات:** جرس مع عداد `unread_count` (يستعلم `/notifications` كل 60 ثانية)، زر **تعليم الكل كمقروء** (`POST /notifications/read-all`)، وإشعارات حركات الأجهزة (`device_movement_pending` / `device_movement_confirmed` / `device_movement_rejected`) تنقل مباشرة إلى `/inventory/movements/{device_movement_id}`.
- **بطاقة الحساب:** الحرف الأول + الاسم (رابط إلى `/profile`) + تسمية الدور + تسمية نطاق البيانات (`data_scope_label`).
- **شريط مخزون الفرع المتحرك (`BranchStockTickerBar`):** يظهر أسفل الشريط العلوي **فقط** في المسارات `/pos*` و `/sales/accessories*` و `/invoices*`، ويعرض عدد الأجهزة المتاحة للبيع والإكسسوارات المتاحة في المخزن النشط.

#### شريط التنقل السفلي للموبايل (`MobileBottomNav.tsx`) والقوائم المختصرة
- **الشريط السفلي (`md:hidden`, `h-16`, `aria-label="التنقل السريع"`):**
  - **الرئيسية** (`/`): `super_admin`, `admin`, `sales`, `reviewer`, `collector`, `call_center`, `crm`, `accountant`, `hr_manager`.
  - **المخزون** (`/inventory`): `super_admin`, `admin`, `sales`.
  - **المبيعات** (`/pos`): `super_admin`, `admin`, `sales`.
  - **الأقساط** (`/installments`): `collector`.
  - **التقارير** (`/accounting/reports`): `super_admin`, `admin`, `accountant`.
  - **التقارير** (`/crm/reports`): `crm`.
  - *حالة استثنائية:* دور `support` لا يملك أي عناصر في `MOBILE_NAV_ITEMS` فيُخفى الشريط له بالكامل.
- **الاختصارات الثابتة:**
  - زر **«تعاقد جديد»** (`/pos`) أسفل القائمة الجانبية: يظهر لأدوار `super_admin`, `admin`, `sales` فقط، مع نقطة مؤشر عند وجود مسودة غير مكتملة (`posDevice`, `posService`, `posFlow`, `accessories`).
  - زر **«تسجيل الخروج»** في ذيل القائمة الجانبية (`POST /auth/logout` ثم `/login`).
  - **مساعد الأسئلة العائم (`ChatbotWidget`):** ظاهر في كل صفحات `AppShell` عدا صفحات طباعة العقود.
- **وضع طباعة العقود (`isContractPrintPath`):** أي مسار يطابق `/\/(contract-print|ownership-transfer-contract|service-contract)(\/|$)/` يُخفي القائمة الجانبية، الشريط العلوي، `ChatbotWidget`، و `MobileBottomNav` ويزيل الهوامش.
- **تخطيط بوابة العميل (`PortalLayout.tsx`):** قائمة جانبية ثابتة يمين الشاشة (`w-56`) ومحتوى بـ `mr-56` بدون Drawer متجاوب للموبايل؛ تحتوي 3 روابط فقط (`/portal`, `/portal/invoices`, `/portal/ledger`) + تسجيل الخروج (بينما `/portal/order-requests` موجود كمسار غير مدرج في القائمة).

#### تفعيل/تعطيل الوحدات (`enabled_modules`)
- القيم المسموحة في `organizations.enabled_modules`: `['crm', 'hrm', 'accounting']` (الافتراضي: الثلاثة مفعّلة).
- **قيد/ملاحظة فعلية من الكود:** رغم وجود `ModuleGate::allows($module)` و `ModuleSettingsService::isModuleEnabled($module)` وإمكانية التبديل من `/admin/settings`، لا يوجد حالياً Middleware على `routes/api.php` ولا شرط في `permissions.ts` أو `SidebarNav.tsx` يمنع الوصول أو يخفي القائمة بناءً على `enabled_modules`.

---

## 2. الأدوار والصلاحيات وسياق البيانات (RBAC & Scope)

### 2.1 الأدوار النظامية المحمية (11 دوراً في `SystemRoleCatalog`)

| # | Slug (Backend) | الاسم العربي | ربط الواجهة (`DemoRole`) | النطاق الافتراضي (Seeder) | الصفحة الافتراضية (`getDefaultRoute`) |
|---|---|---|---|---|---|
| 1 | `Admin` | مدير النظام | `super_admin` | `scope.organization` | `/` |
| 2 | `AdministrationManager` | مدير الإدارة | `admin` | `scope.administration` | `/crm/ceo` |
| 3 | `BranchManager` | مدير الفرع | `admin` | `scope.branch` | `/crm/ceo` |
| 4 | `Reviewer` | المراجعة | `reviewer` | `scope.branch` | `/sales/mission` |
| 5 | `Sales` | المبيعات | `sales` | `scope.branch` | `/sales/mission` |
| 6 | `Collector` | التحصيل | `collector` | `scope.branch` | `/installments` |
| 7 | `CallCenter` | مركز الاتصال | `call_center` | `scope.administration` | `/call-center/collections` |
| 8 | `Accountant` | المحاسبة | `accountant` | `scope.branch` | `/accounting` |
| 9 | `HrManager` | الموارد البشرية | `hr_manager` | `scope.branch` | `/hrm` |
| 10 | `CrmSpecialist` | مبيعات CRM | `crm` | `scope.branch` | `/crm/referrals` |
| 11 | `SupportEmployee` | الدعم الفني | `support` | `scope.branch` | `/support/my-tasks` |

- **قاعدة Fallback الخطيرة (`StaffAuthorization::ensureStaffRole`):** عند أي طلب لموظف (`user_type !== 'customer_portal'`) لا يملك أي أدوار (`roles->isEmpty()`)، يُسند النظام له دور `Admin` تلقائياً.
- **تسلسل استنتاج `DemoRole` في الواجهة (`access.ts::getUserRole`):** `user.demo_role` ← `Admin` (`super_admin`) ← `AdministrationManager`/`BranchManager`/`Department Admin` (`admin`) ← `SupportEmployee` (`support`) ← `Reviewer` أو اسم عربي يحتوي «مراجعة» أو أي صلاحية `review.*` (`reviewer`) ← مطابقة جزئية لاسم الدور الأول ← مطابقة صلاحيات أساسية ← الافتراضي `'sales'`.

### 2.2 قوائم الحظر والاستثناءات (Denylists & Assignment Exclusions)
1. **نموذج القائمة السوداء للمديرين (`MANAGER_DENIED_PERMISSIONS`):**
   - يحصل `AdministrationManager` و `BranchManager` على **كل الصلاحيات** عدا مفاتيح `scope.*` (يُمنح لكل منهما نطاقه فقط) وعدا الصلاحيات الأربع التالية:
     - `scope.organization`
     - `roles.manage`
     - `payments.refund`
     - `sales.daily_mission`
2. **صلاحيات مستبعدة من التعيين (`PERMISSION_ASSIGNMENT_EXCLUDED`):**
   - لا تُعرض ولا يمكن تعيينها لغير ذوي `scope.organization`:
     - `scope.organization`
     - `roles.manage`
     - `settings.manage`
3. **أدوار مستبعدة من التعيين (`ROLE_ASSIGNMENT_EXCLUDED`):**
   - في الخلفية: `Admin`، `AdministrationManager`، وأي دور يحتوي على صلاحية من `PERMISSION_ASSIGNMENT_EXCLUDED`.
   - في الواجهة: `Admin`، `AdministrationManager`، `Super Admin`.
4. **ملاحظة خاصة بدور `Admin` في `RolePermissionSeeder`:** يمتلك جميع الصلاحيات عدا `trash.force_delete` (لم تُدرج صراحة في مصفوفة `$base` الخاصة بـ `Admin`، بينما يرثها المديرون عبر `$managerBase` لأنها غير مدرجة في `MANAGER_DENIED_PERMISSIONS`).

### 2.3 تخصيص صلاحيات الأدوار على مستوى الإدارة (`administration_role_permission_overrides`)
- **السلوك الطبيعي:** عندما يعدّل `AdministrationManager` دوراً محمياً من `PROTECTED_SLUGS` عبر `PUT /api/v1/admin/roles/{role}`، لا يتغير الدور العام في Spatie، بل يُحفظ تجاوز خاص بزوج `(administration_id, role_id)` في `administration_role_permission_overrides` بعد تصفية `PERMISSION_ASSIGNMENT_EXCLUDED`.
- **إعادة التعيين:** عبر `DELETE /api/v1/admin/roles/{role}/administration-permissions` (متاح فقط لـ `isAdministrationManager`).
- **متى يُتخطى التخصيص:** إذا لم يكن للمستخدم `administration_id`، أو كان يحمل دور `Admin`، أو يملك أي دور لديه `scope.organization`.
- **إنشاء دور مخصص:** غير ذوي `scope.organization` لا يمكنهم تعديل تعريف دور محمي (`403`)، وعند إنشاء دور جديد يتم توليد الـ `name` (slug) تلقائياً (`custom_xxxxxxxxxx`).

### 2.4 الكتالوج الكامل لمفاتيح الصلاحيات (من `RolePermissionSeeder` و `InventoryPermissionMap`)

| المجموعة | مفاتيح الصلاحيات الدقيقة |
|---|---|
| **Dashboard (16)** | `dashboard.view` (تمنح تلقائياً الـ 15 التالية في Seeder): `dashboard.sales_today`, `dashboard.invoices_today`, `dashboard.customers_count`, `dashboard.available_units`, `dashboard.pending_reviews`, `dashboard.overdue_installments`, `dashboard.due_this_week`, `dashboard.outstanding_balance`, `dashboard.recent_invoices`, `dashboard.overdue_installments_list`, `dashboard.pending_review_invoices`, `dashboard.previous_period`, `dashboard.sales_by_payment_term`, `dashboard.sales_by_source`, `dashboard.last_3_months` |
| **Daily Reports & Structure (3)** | `daily_reports.view`, `daily_reports.manage`, `branches.manage` |
| **Inventory — GPS & Stock (5)** | `inventory.gps.view`, `inventory.product.view`, `inventory.product.edit`, `inventory.stock.add`, `inventory.stock.receipts.view` |
| **Inventory — Branch & Custody (13)** | `inventory.branch.view`, `inventory.branch.add`, `inventory.branch.edit`, `inventory.branch.delete`, `inventory.branch.receive.view`, `inventory.branch.receive.add`, `inventory.branch.receive.edit`, `inventory.branch.receive.delete`, `inventory.branch.issue.view`, `inventory.branch.issue.add`, `inventory.branch.issue.edit`, `inventory.branch.issue.delete`, `inventory.branch.maintenance` |
| **Inventory — Transfers & Warehouses (8)** | `stock.distribute.view`, `stock.distribute`, `stock.return.view`, `stock.return`, `warehouses.view`, `warehouses.add`, `warehouses.edit`, `warehouses.sync` |
| **Inventory — Device Movements (7)** | `device_movements.view`, `device_movements.create`, `device_movements.confirm`, `device_movements.reject`, `device_movements.cancel`, `device_movements.transfer_quantity`, `device_movements.transfer_branch` |
| **Inventory — Accessories (12)** | `accessories.view`, `accessories.add`, `accessories.edit`, `accessories.delete`, `accessory_packages.view`, `accessory_packages.add`, `accessory_packages.edit`, `accessory_packages.delete`, `accessory_stock.view`, `accessory_stock.add`, `accessory_stock.distribute`, `accessory_stock.return` |
| **Customers & Distributors (9)** | `customers.manage`, `customers.view`, `customers.add`, `customers.edit`, `customers.delete`, `distributors.view`, `distributors.add`, `distributors.edit`, `distributors.delete` |
| **Promotions & Services (8)** | `promotions.view`, `promotions.add`, `promotions.edit`, `promotions.delete`, `services.view`, `services.add`, `services.edit`, `services.delete` |
| **Sales & POS (9)** | `sales.pos`, `sales.pos.new`, `sales.pos.services`, `sales.pos.accessories`, `sales.pos.catalog`, `sales.invoices.view`, `sales.invoices.change_action_branch`, `sales.invoices.edit_before_review`, `sales.daily_mission` |
| **Review (16)** | `review.view_queue`, `review.view_contracts`, `review.view_detail`, `review.edit_after_review`, `review.approve`, `review.reject`, `review.print`, `review.manage_evaluation_questions`, `review.view_evaluation_queue`, `review.view_subscription_renewals`, `review.record_evaluation`, `review.view_collections`, `review.confirm_collections`, `review.view_branch_inventory`, `review.view_expenses`, `review.approve_expenses` |
| **Expenses (3)** | `expenses.submit`, `expenses.edit`, `expenses.delete` |
| **Installments & Payments (12)** | `installments.collect`, `installments.view`, `installments.reconcile`, `installments.assign`, `external_collections.collect`, `collection_accounts.manage`, `collection_accounts.view`, `collection_accounts.add`, `collection_accounts.edit`, `collection_accounts.delete`, `payments.view`, `payments.refund` |
| **Contract Cases (2)** | `contract_cases.manage`, `contract_cases.disburse` |
| **Admin, Trash, Audit & Help (10)** | `trash.view`, `trash.restore`, `trash.force_delete`, `faq.manage`, `feedback.view`, `users.manage`, `roles.manage`, `audit.view`, `settings.manage`, `reports.financial` |
| **CRM (25)** | `crm.access_all_leads`, `crm.access_own_leads`, `crm.access_all_schedule`, `crm.access_own_schedule`, `crm.access_all_campaigns`, `crm.access_own_campaigns`, `crm.access_contact_login`, `crm.access_sources`, `crm.access_life_stage`, `crm.access_proposal`, `crm.view_all_call_log`, `crm.view_own_call_log`, `crm.access_b2b_marketplace`, `crm.leads.manage`, `crm.activities.manage`, `crm.referrals.pipeline`, `crm.referrals.list`, `crm.tasks.view`, `crm.activities.view`, `crm.reports.referrals`, `crm.reports.owner_detail`, `crm.reports.leaderboard`, `crm.referrals.network`, `crm.reports.pipeline`, `crm.ceo.view` |
| **HRM (10)** | `hrm.leave.manage`, `hrm.leave.approve`, `hrm.attendance.manage`, `hrm.payroll.manage`, `hrm.shift.manage`, `hrm.holiday.manage`, `hrm.allowance.manage`, `hrm.sales_target.manage`, `hr.employees.manage`, `hr.attendance.manage` |
| **Accounting (13)** | `accounting.access_accounting_module`, `accounting.manage_accounts`, `accounting.view_journal`, `accounting.add_journal`, `accounting.edit_journal`, `accounting.delete_journal`, `accounting.map_transactions`, `accounting.view_transfer`, `accounting.add_transfer`, `accounting.edit_transfer`, `accounting.delete_transfer`, `accounting.manage_budget`, `accounting.view_reports` |
| **Support (4)** | `support.view_assigned_tasks`, `support.update_assigned_tasks`, `support.view_all_tasks`, `support.assign_tasks` |
| **Data Scope (4)** | `scope.organization`, `scope.administration`, `scope.branches`, `scope.branch` |

*(المفاتيح القديمة التي تم إزالتها واستبدالها في `InventoryPermissionMap`: `inventory.manage`, `inventory.branch.receive`, `inventory.branch.issue`, `stock.transfer`, `warehouses.manage`, `device_movements.manage`.)*

### 2.5 سياق ونطاق البيانات (Data Scoping Rules)
1. **عزل المنظمات (`OrganizationScope`):** Global Eloquent Scope يقيّد تلقائياً كل جدول يحتوي `organization_id` أو `business_id` بقيمة `OrganizationContext::id()` (في وضع `branch` يفرض `config('erp.branch.organization_id')`؛ في `cloud` يأخذ `user->organization_id` أولاً ولا يقبل `X-Organization-Id` إلا كـ fallback).
2. **أولوية `DataScopeResolver`:**
   - `organization` (`scope.organization`) → وصول كامل لكل الإدارات والفروع.
   - `administration` (`scope.administration` + `administration_id`) → كل فروع الإدارة.
   - `branches` (`scope.branches` + `administration_id`) → الفروع المسموحة في `user_branches` (وإن كانت فارغة فكل فروع الإدارة)، ويُحفظ الفرع النشط في `user.preferences['active_branch_id']`.
   - `branch` (`scope.branch` + `branch_id` أو `active_branch_id`، أو fallback عند وجود `branch_id` بلا scope) → فرع واحد فقط.
   - `none` → لا وصول (`whereRaw('1 = 0')`).
3. **نطاق كل فئة كيانات:**
   - **الكيانات المرتبطة بفرع (`BranchScope::apply`):** تصفية صارمة على `branch_id`.
   - **التعاقدات والفواتير (`BranchScope::applyInvoice`):** مسموح إذا كان `branch_id` **أو** `action_branch_id` (فرع التنفيذ) ضمن `branchIds`؛ وللقراءة فقط يُسمح أيضاً إذا كان المستخدم مخولاً برؤية العميل.
   - **العملاء والموزعون (`applyCustomerScope`):** نطاقها هو **كامل الإدارة (`administration_id`)** حتى لو كان المستخدم بنطاق `scope.branch`.
   - **المستخدمون (`applyUserScope`):** مقيدون بـ `administration_id`، ويُخفى ذوو `scope.organization` عن غيرهم، وتُفرض هرمية الفاعل عند الإنشاء/التعديل.
   - **المخازن (`assertWarehouseAccess`):** المركزي يُفحص بـ `administration_id`، ومخزن الفرع بـ `branch_id`.
   - **CRM والدعم الفني:** في CRM فصل بين `*_own_*` (`created_by` أو `assigned_to`) و `*_all_*`؛ في الدعم الفني بدون `support.view_all_tasks` يرى الموظف المهام المسندة لـ `employee_id` الخاص به فقط (`403` لغيرها).
   - **سجل المدفوعات لدور المبيعات (`Sales`):** في `PaymentTransactionController@index` يرى دور `Sales` المدفوعات ذات `payment_method = 'cash'` فقط.

### 2.6 الاستثناءات والقواعد الخاصة بالصلاحيات
- **إجراءات مقيدة بصلاحية صريحة حتى لـ `admin` (`STRICT_ACTION_PERMISSIONS`):** `payments.refund`, `roles.manage`، وأي مفتاح يبدأ بـ `inventory.branch.receive.` أو `inventory.branch.issue.`. كما أن `/admin/settings` محصور بـ `super_admin` فقط.
- **توافق `.manage` القديم في الواجهة (`userCanCrud`):** `customers.manage` و `distributors.manage` و `settings.manage` (للخدمات) تمنح `view/add/edit` فقط (دون `delete`)؛ بينما `collection_accounts.manage` تمنح `view/add/edit/delete`.
- **مسارات مسموحة بدون صلاحية إضافية:**
  - طباعة العقود (`/invoices/:id/contract-print`, `/invoices/:id/ownership-transfer-contract`, `/invoices/:id/service-contract/:lineId?`)، و `/profile`، و `/contracts/:id`: متاحة لأي مستخدم موظف مسجل (مع فحص الـ API).
  - `/help/faq`, `/messages`, `/feedback`, `/sync-debug`: تتطلب `dashboard.view` فقط.
- **حذف العقود الكامل (`DeleteContractAction`):** محصور بدوري `Admin` و `SuperAdmin` فعلياً (فحص الدور لا الصلاحية).
- **مهمة اليوم (`/sales/mission`):** ممنوعة على أدوار المديرين (`403`).
- **تعديل العقد بعد الاعتماد والعقود المغلقة:**
  - `review_status` = `pending` أو `rejected` ← يتطلب `sales.invoices.edit_before_review`.
  - `review_status` = `approved` ← يتطلب `review.edit_after_review`.
  - العقود المغلقة (`returned` / `cancelled`) ← يُمنع التعديل العادي؛ يُسمح فقط بـ `PATCH /sales-invoices/{id}/corrections` للحقول التاريخية فقط (`CLOSED_LINE_FIELDS` + `invoice_date`, `notes`)؛ وتغيير `action_branch_id` يتطلب `sales.invoices.change_action_branch`.
  - الاسترداد والإلغاء المالي (`refund`/`void`) ← يتطلب `payments.refund` المحجوبة عن مدير الإدارة ومدير الفرع.

---

## 3. خريطة الشاشات والمسارات (Routes & Navigation)

### 3.1 المسارات الظاهرة في الشريط الجانبي (Sidebar-Visible Routes)

| المجموعة | التسمية العربية | المسار | الأدوار (`permissions.ts`) | الصلاحية المطلوبة |
|---|---|---|---|---|
| **مستقل** | مهمة اليوم | `/sales/mission` | `sales, collector, reviewer` | `sales.daily_mission` |
| **مستقل** | لوحة التحكم | `/` | `super_admin, admin, sales, reviewer, collector` | `dashboard.view` |
| **مستقل** | العملاء | `/customers` | `super_admin, admin, sales, collector` | `customers.manage \| customers.view` |
| **مستقل** | الموزعين | `/distributors` | `super_admin, admin, sales, collector` | `customers.manage \| distributors.view` |
| **الإدارة** | الإدارات | `/departments` | `super_admin` | `branches.manage` |
| **الإدارة** | كل الفروع / فروع الإدارة | `/branches` | `super_admin, admin` | `branches.manage` |
| **الإدارة** | الأقسام | `/sections` | `super_admin, admin` | `branches.manage` |
| **الإدارة** | لوحة الإدارة | `/gps/management` | `admin` | `branches.manage` |
| **الإدارة** | البيان اليومي | `/daily-reports` | `super_admin, admin, sales, reviewer, collector` | `daily_reports.view` |
| **الإدارة** | تشخيص المزامنة | `/sync-debug` | `super_admin, admin` *(ومسموح في routeRoles لـ `sales, reviewer, collector`)* | `dashboard.view` |
| **قسم التعاقدات** | تعاقد جديد | `/pos` | `super_admin, admin, sales` | `sales.pos.new \| sales.pos` |
| **قسم التعاقدات** | تعاقد خدمات | `/pos/services` | `super_admin, admin, sales` | `sales.pos.services \| sales.pos` |
| **قسم التعاقدات** | بيع إكسسوارات | `/sales/accessories` | `super_admin, admin, sales` | `sales.pos.accessories \| sales.pos` |
| **قسم التعاقدات** | تعاقد تجريبي | `/pos/flow` | `super_admin, admin, sales` | `sales.pos.*` |
| **قسم التعاقدات** | سجل المدفوعات | `/payments` | `super_admin, admin, sales, collector, reviewer` | `payments.view` |
| **قسم التعاقدات** | دليل الأسعار | `/pricing/catalog` | `super_admin, admin, sales` | `sales.pos.catalog \| sales.pos` |
| **قسم التعاقدات** | العروض | `/pricing/promotions` | `super_admin, admin, sales` | `promotions.view` |
| **قسم التعاقدات** | تجديد الاشتراكات | `/review/subscription-renewals` | `super_admin, admin, reviewer` | `review.view_subscription_renewals` |
| **قسم التعاقدات** | طلب مصروف | `/expenses/new` | `super_admin, admin` | `expenses.submit` |
| **قسم الأقساط** | تحصيل الأقساط | `/installments` | `super_admin, admin, collector` | `installments.view` |
| **قسم الأقساط** | توزيع التحصيل | `/installments/assignments` | `super_admin, admin` | `installments.assign` |
| **قسم الأقساط** | التحصيلات الخارجية | `/call-center/collections` | `super_admin, admin, call_center` | `external_collections.collect` |
| **قسم الأقساط** | حسابات التحويل | `/admin/collection-accounts` | `super_admin, admin` | `collection_accounts.manage \| view` |
| **المبيعات (CRM)** | خط الترشيحات | `/crm/referrals` | `super_admin, admin, crm` | `crm.referrals.pipeline \| crm.access_own_leads` |
| **المبيعات (CRM)** | قائمة الترشيحات | `/crm/referrals/list` | `super_admin, admin, crm` | `crm.referrals.list \| crm.access_own_leads` |
| **المبيعات (CRM)** | المهام | `/crm/tasks` | `super_admin, admin, crm` | `crm.tasks.view \| crm.access_own_schedule \| all` |
| **المبيعات (CRM)** | سجل المكالمات | `/crm/call-logs` | `super_admin, admin, crm` | `crm.view_own_call_log \| all` |
| **المبيعات (CRM)** | الأنشطة | `/crm/activities` | `super_admin, admin, crm` | `crm.activities.view \| crm.activities.manage \| access_own_leads` |
| **المبيعات (CRM)** | تقارير الترشيحات | `/crm/reports` | `super_admin, admin, crm` | `crm.reports.referrals \| crm.access_all_leads` |
| **المبيعات (CRM)** | أداء الموظف | `/crm/reports/owner-detail` | `super_admin, admin, crm` | `crm.reports.owner_detail \| crm.access_all_leads` |
| **المبيعات (CRM)** | لوحة المتصدرين | `/crm/reports/leaderboard` | `super_admin, admin, crm` | `crm.reports.leaderboard \| crm.access_all_leads` |
| **المبيعات (CRM)** | شبكة الإحالات | `/crm/referrals/network` | `super_admin, admin, crm` | `crm.referrals.network \| crm.access_own_leads` |
| **المبيعات (CRM)** | خط الأنابيب | `/crm/reports/owner-pipeline` | `super_admin, admin, crm` | `crm.reports.pipeline \| crm.access_all_leads` |
| **المبيعات (CRM)** | لوحة المدير | `/crm/ceo` | `super_admin, admin, crm` | `crm.ceo.view \| crm.access_all_leads` |
| **المراجعة** | مراجعة التعاقدات | `/invoices/review` | `super_admin, admin, reviewer` | `review.view_queue \| view_detail` |
| **المراجعة** | مراجعة التحصيلات | `/review/collections` | `super_admin, admin, reviewer` | `review.view_collections` |
| **المراجعة** | مراجعة مخزون الفرع | `/review/branch-inventory` | `super_admin, admin, reviewer` | `review.view_branch_inventory` |
| **المراجعة** | مراجعة المصروفات | `/review/expenses` | `super_admin, admin, reviewer` | `review.view_expenses` |
| **المراجعة** | كل التعاقدات | `/invoices` | `super_admin, admin, reviewer, sales` | `review.view_contracts \| sales.invoices.view` |
| **المراجعة** | تقييم العملاء | `/review/evaluation-queue` | `super_admin, admin, reviewer` | `review.view_evaluation_queue` |
| **المراجعة** | أسئلة التقييم | `/review/evaluation-questions` | `super_admin, admin, reviewer` | `review.manage_evaluation_questions` |
| **قسم المشاكل** | قائمة المشاكل | `/problems` | `super_admin, admin, reviewer, collector` | `contract_cases.manage` |
| **الموارد البشرية** | نظرة عامة / الموظفون / الوظائف / التقارير | `/hrm`, `/hrm/employees`, `/hrm/jobs`, `/hrm/reports` | `super_admin, admin, hr_manager` | `hr.employees.manage` |
| **الموارد البشرية** | أهداف المبيعات | `/hrm/sales-targets` | `super_admin, admin, hr_manager` | `hrm.sales_target.manage` |
| **الموارد البشرية** | الحضور / أجهزة البصمة | `/hrm/attendance`, `/hrm/zk-devices` | `super_admin, admin, hr_manager` | `hrm.attendance.manage` |
| **الموارد البشرية** | الإجازات / أنواع الإجازة | `/hrm/leaves`, `/hrm/leave-types` | `super_admin, admin, hr_manager` | `hrm.leave.manage` |
| **الموارد البشرية** | الورديات / العطلات / البدلات | `/hrm/shifts`, `/hrm/holidays`, `/hrm/allowances` | `super_admin, admin, hr_manager` | `hrm.shift/holiday/allowance.manage` |
| **الموارد البشرية** | الرواتب / مسيرات الرواتب | `/hrm/payroll`, `/hrm/payroll-groups` | `super_admin, admin, hr_manager` | `hrm.payroll.manage` |
| **الموارد البشرية** | إعدادات HRM | `/hrm/settings` | `super_admin, admin, hr_manager` | `settings.manage \| hr.employees.manage` |
| **المحاسبة** | نظرة عامة / الإعدادات | `/accounting`, `/accounting/settings` | `super_admin, admin, accountant` | `accounting.access_accounting_module` |
| **المحاسبة** | دليل الحسابات / القيود / التحويلات / الربط / التقارير / الميزانيات | `/accounting/chart-of-accounts`, `/journal-entries`, `/transfers`, `/transactions`, `/reports`, `/budgets` | `super_admin, admin, accountant` | `accounting.manage_accounts / view_journal / view_transfer / map_transactions / view_reports / manage_budget` |
| **الدعم الفني** | مهامي | `/support/my-tasks` | `super_admin, admin, support` | `support.view_assigned_tasks` |
| **الدعم الفني** | إدارة المهام | `/support/tasks` | `super_admin, admin` | `support.view_all_tasks \| assign_tasks` |
| **المخزون** | مخزون GPS / مخزون الفرع / حركات الأجهزة / تسجيل / توزيع / استرجاع / المخازن / الإكسسوارات / الباكدجات / مخزون الإكسسوارات / إعدادات المنتج | `/inventory`, `/inventory/branch`, `/inventory/movements`, `/inventory/add`, `/inventory/transfers`, `/inventory/returns`, `/inventory/warehouses`, `/inventory/accessories`, `/inventory/accessory-packages`, `/inventory/accessory-stock`, `/inventory/settings` | `super_admin, admin` *(و `sales` لأول 3 مسارات)* | صلاحيات المخزون المناظرة لكل شاشة |
| **الخدمات** | الخدمات / إضافة خدمة / نماذج العقود | `/services`, `/services/add`, `/contract-templates` | `super_admin, admin` | `settings.manage \| services.*` |
| **الإعدادات** | المستخدمون / الأدوار / سجل التدقيق / سلة المهملات / إدارة الأسئلة / ملاحظات المستخدمين | `/admin/users`, `/admin/roles`, `/admin/activity-log`, `/admin/trash`, `/admin/faq`, `/admin/feedback` | `super_admin, admin` | `users.manage`, `roles.manage`, `audit.view`, `trash.view`, `faq.manage`, `feedback.view` |
| **الإعدادات** | إعدادات النظام | `/admin/settings` | `super_admin` فقط | `settings.manage` |
| **الإعدادات** | دليل الاستخدام | `/help/manual` | `super_admin, admin` | — |
| **الإعدادات** | المساعدة / الرسائل / ملاحظات | `/help/faq`, `/messages`, `/feedback` | جميع الأدوار عدا `support` | `dashboard.view` |

### 3.2 المسارات المخفية والمباشرة والطباعة والبوابة وإعادة التوجيه
- **مسارات التفاصيل والإنشاء والتعديل المباشرة:**
  - `/departments/:id` (`super_admin` فقط)، `/branches/:id`
  - `/inventory/movements/new`، `/inventory/movements/:id`
  - `/sales/maintenance`، `/services/:id/edit`، `/contract-templates/:key/preview`
  - `/distributors/add`، `/distributors/:id`
  - `/customers/add`، `/customers/:id/edit`، `/customers/:id`
  - `/invoices/mine` (تعاقداتي — تُفتح من شاشة POS)، `/invoices/:id/edit`، `/invoices/:id`، `/contracts/:id`
  - `/invoices/review/:id`، `/review/collections/:id`، `/review/expenses/:id`، `/review/evaluation-queue/:id`
  - `/profile` (حسابي من الشريط العلوي)
  - `/accounting/chart-of-accounts/:id/ledger`، `/hrm/employees/:id`، `/admin/roles/:roleId/permissions`
  - `/crm/referrals/add`، `/crm/referrals/:id`، `/crm/reports/owners/:userId`
- **مسارات الطباعة:**
  - `/payments/:id/receipt` (خارج `AppShell`, تتطلب `payments.view`)
  - `/daily-reports/:id/print` (`daily_reports.view`)
  - `/invoices/:id/contract-print`، `/invoices/:id/ownership-transfer-contract`، `/invoices/:id/service-contract/:lineId`، `/invoices/:id/service-contract` (وضع طباعة تلقائي، لأي موظف مسجل).
- **المسارات العامة والبوابة والإعداد:**
  - `/setup` (إعداد سيرفر الفرع)، `/c/:token` (ملف العميل العام بدون دخول)، `/login`
  - `/portal/login`، `/portal`، `/portal/invoices`، `/portal/ledger`، `/portal/order-requests` (غير مدرج في قائمة `PortalLayout`).
- **إعادة التوجيه التلقائي (Redirects):**
  - `/crm` → `/crm/referrals`
  - `/crm/reports/owner-summary` → `/crm/reports`
  - `/crm/reports/employees/:userId` → `/crm/reports/owners/:userId` (مع الحفاظ على query string)
  - `*` → `/`
- **خريطة الـ Backend API الرئيسية:**
  - `/api/v1/*`: المسارات العامة (`setup/*`, `auth/login`, `portal/auth/login`, `public/customer-profile/{token}` بـ `throttle:60,1`, `offline/*` بمصادقة `X-Branch-Key/Secret`)، مسارات الموظفين المحمية بـ `['auth:sanctum', 'organization.context', 'portal.block']`، ومسارات البوابة `/api/v1/portal/*` المحمية بـ `['auth:sanctum', 'portal.only']`.
  - `/iclock/*`: مسارات ZKTeco ADMS/PUSH (`GET/POST /iclock/cdata`, `GET /iclock/getrequest`, `POST /iclock/devicecmd`) بدون مصادقة مع `throttle:120,1`.
  - `/devs/*`: لوحة المطورين (معطلة افتراضياً عبر `ENABLE_DEV_DASHBOARD=false` وتُرجع `404`، وبـ Guard مستقل `developer`) + `/telegram/webhook`.

---

## 4. الكيانات والبيانات والحقول وقواعد التحقق (Entities, Fields & Validation Rules)

### 4.1 الهيكل التنظيمي والإعدادات (`Core / Admin`)
- **الإدارة (`Administration`):**
  - **إلزامي:** `name_ar` (`max:255`). **اختياري:** `address` (`max:500`), `phone` (`max:50`), `is_active` (bool).
  - **تلقائي:** `code = ADM-XXXXXX` + إنشاء مخزن مركزي (`WH-HQ-{id}`, `is_central = true`).
  - **إعدادات الإدارة (`settings`):** `reconciliation_enabled`, `overdue_grace_days` (0..90), `late_fee_mode` (`daily_fixed|percent`), `late_fee_daily_amount` (>=0), `late_fee_percent` (0..100), `waive_late_fee_on_close`, و `messaging.*` (`whatsapp_enabled`, `driver: inherit|twilio|http|log`, `follow_up_phone(30)`, `follow_up_label(255)`, `append_follow_up_link`, `twilio.*`, `http.*`).
  - **رسائل المنع عند الحذف:** `"لا يمكن حذف إدارة مرتبطة بفروع"` (بدون `delete_branches=true`) | `"لا يمكن حذف إدارة لها مخزون مركزي"` (بدون `clear_central_inventory=true`) | `"لا يمكن حذف إدارة لها مخزون مركزي مباع أو قيد النقل"`.
- **الفرع (`Branch`):**
  - **إلزامي:** `name_ar` (`max:255`). **اختياري:** `administration_id`/`department_id`, `address`, `phone`, `is_active`. **تلقائي:** `code = BR-XXXXXX` + مخزن فرع + أقسام افتراضية.
  - **رسائل المنع عند الحذف:** `"لا يمكن حذف فرع له مخزون أو حركات"` | `"لا يمكن حذف فرع مرتبط بفواتير"`.
- **القسم (`Section/Department`):**
  - **إلزامي:** `branch_id`, `name_ar` (`max:255`). **تلقائي:** `code = SEC-XXXXXX`.
  - **رسالة المنع عند الحذف:** `"لا يمكن حذف قسم مرتبط بموظفين"`.
- **المستخدم (`User`):**
  - **إلزامي:** `name` (`max:255`), `email` (`unique:users`), `password` (`min:4` عند الإنشاء، `min:8` عند التعديل).
  - **اختياري/شرطي:** `administration_id`, `branch_id` (`required_if:create_employee,true`), `branch_ids[]`, `section_id`, `user_type` (`in:staff`), `create_employee`, `role_names[]`.
  - **رسائل التحقق الهرمي والحذف:** `"الفرع المحدد غير موجود."` | `"الفرع لا يتبع الإدارة المحددة."` | `"القسم المحدد غير موجود."` | `"القسم لا يتبع الفرع المحدد."` | `"لا يمكن حذف حسابك الحالي."`.
- **الدور (`Role`):**
  - **إلزامي:** `name_ar` (`max:255`). **اختياري:** `name` (`regex:/^[A-Za-z][A-Za-z0-9_]*$/`, `unique:roles`), `permissions[]`.
- **إعدادات المنظمة (`OrganizationSettings`):**
  - `general`: `theme_color` (`^#[0-9A-Fa-f]{6}$`), `currency`(10), `timezone`(64), `default_locale` (`ar|en`), `date_format`, `time_format` (`12h|24h`), `fiscal_year_start_month` (1..12)، والشعار `logo` (`image|max:2048`).
  - `sales`: `invoice_prefix` (`INV`), `require_invoice_review` (`true`), `review_installment_order` (`before_installments|after_installments`), `block_contract_on_review`, `allow_negative_inventory`, `default_payment_term` (`cash|credit|installment`), `max_installment_months` (1..120, افتراضي 24), `installment_interval_days` (1..365, افتراضي 30), `cash_to_installment_grace_days` (0..365, افتراضي 7), `overdue_grace_days` (0..90), `late_fee_mode`, `late_fee_daily_amount`, `late_fee_percent`, `min_down_payment_percent` (0..100), `enable_installation_fee`, `allow_disable_installation_fee_in_sale`.
  - `security`: `session_timeout_minutes` (5..1440), `password_min_length` (4..128), `force_password_change_on_first_login`, `audit_log_retention_days` (30..3650), `log_ip_addresses`.
  - `messaging`: `whatsapp_enabled`, `reminder_days_before` (0..30), مفاتيح التفعيل وقوالب الرسائل (`max:2000`).

### 4.2 العملاء والموزعون (`Customers & Distributors`)
- **العميل (`Customer`):**
  - **إلزامي:** `name` (`max:255`), `phone` (`max:50`).
  - **اختياري/شرطي:** `administration_id`, `branch_id`, `sales_user_id` (إلزامي عند تحديد `acquisition_source`), `phone_2`, `phone_3`, `extra_phones` (`*.number` إلزامي معها), `national_id`(50), `address`, `distinctive_mark`, `city`(100), `status` (`active|blocked`), `credit_score` (0..100), `email`, `dob`, `guarantors` (`*.name` و `*.phone` إلزاميان), `acquisition_source` (`customer_referral|social`), `referred_by_customer_id`, صورة `photo` (`jpeg/jpg/png/webp|max:2048`).
  - **قواعد المنع:** عند `customer_referral` يجب أن يكون المُحيل موزّعاً (`"العميل المُحيل يجب أن يكون موزّعاً."`) ويُربط العميل تلقائياً بـ `distributor_id` و `branch_id` الخاص بالمُحيل؛ عند `social` يُصفّر `referred_by_customer_id` و `distributor_id`. يمنع حذف عميل لديه فواتير مؤكدة (`"لا يمكن حذف عميل لديه تعاقدات مؤكدة."`).
  - **تسجيل جهاز للعميل (`RegisterCustomerDevice`):** إلزامي: `origin` (`legacy|external`), `serial_number` (أرقام لاتينية), `sim_number` (أرقام لاتينية), `username`. اختياري/شرطي: `physical_serial`, `product_model_id`, `renewal_type` (`annual|permanent`), `subscription_renewal_date`, `remaining_installment_count` (>=1, `required_with:installment_amount`), `installment_amount` (>=0.01), `first_due_date`. رسائل المنع: `"هذا الجهاز مسجل لعميل آخر. استخدم نقل الملكية."` | `"الجهاز موجود في المخزن ويجب بيعه بعقد جديد."`.
- **الموزع (`Distributor`):**
  - **إلزامي:** `branch_id`, `code` (`max:50`, فريد بالمنظمة), `name` (`max:255`).
  - **اختياري/شرطي:** `name_ar`, `phone` (إلزامي عند عدم تمرير `customer_id`: `"رقم الهاتف مطلوب لإنشاء العميل المرتبط بالموزع."`), `type` (`center|free`), `customer_id`, `status` (`active|inactive`), `agreed_amount` (>=0), `commission_percent` (0..100), `commission_tier_threshold` (int >=0), `commission_tier_increment` (0..100).
  - **رسائل المنع:** `"العميل يجب أن يكون في نفس إدارة الموزع."` | `"هذا العميل مرتبط بموزع آخر بالفعل."` | `"لا يمكن حذف موزّع مرتبط بعملاء."` | `"لا يمكن حذف موزّع لديه تعاقدات."`.

### 4.3 المخزون والأجهزة وحركات الأجهزة والعهد والإكسسوارات (`Inventory`)
- **المخزن (`Warehouse`):** إلزامي: `branch_id`, `name`, `code`. يُنشأ بـ `is_central = false`. تعديل المركزي ممنوع (`"لا يمكن تعديل المخزن المركزي من هنا."`).
- **منتج GPS (`ProductModel` — `GPS-PRO`):** حقول التسعير (`cash_price`, `installment_price`, `sell_price` >=0.01؛ أسعار السنوي ومدى الحياة الداخلي والخارجي؛ `annual_renewal_price`, `device_debt_price`, `monthly_interest_amount`, `installation_commission` >=0؛ `min_stock_level` >=0).
- **وحدة الجهاز (`ProductUnit`):**
  - في مخزون الفرع: إلزامي `warehouse_id` (مخزن فرع وإلا `"اختر مخزن فرع"`), `serial_number` (فريد في `serial_number` و `imei`), `inventory_bucket` (`new` أو أحد `custodyBuckets`), و `custody_customer_id` عند `custody_customer`.
  - منع تغيير المخزن من التعديل (`"استخدم حركة الأجهزة لتغيير المخزن"`), ومنع حذف وحدة مرتبطة بعقد/عهدة/حركة (`"لا يمكن حذف جهاز مرتبط بعقد أو سجل عهدة أو حركة نقل"`).
- **إضافة/توزيع/إرجاع المخزون (`DepartmentStock`):** `department_id`, `branch_id` (للتوزيع والإرجاع), `quantity` (1..500). رسائل المنع: `"الفرع غير تابع لهذه الإدارة."` | `"الكمية المعلقة المتاحة {n} قطعة فقط."` | `"المخزون المتاح في الفرع {n} قطعة فقط."` | `"مخزن المصدر والوجهة يجب أن يكونا مختلفين."`.
- **حركة الأجهزة (`DeviceMovement` — `DM-000001`):**
  - إلزامي: `from_warehouse_id`, `to_warehouse_id`, `recipient_user_id` + (`product_unit_ids[]` أو `quantity >= 1` مع `product_model_id`).
  - رسائل المنع: `"يجب أن يكون المستلم شخصاً غير المرسل."` | `"المستلم غير صالح."` | `"الحركة ليست بانتظار التأكيد."` | `"غير مصرح لك بتأكيد أو رفض هذه الحركة."` | `"غير مصرح لك بإلغاء هذه الحركة."` | `"واحدة أو أكثر من الأجهزة لم تعد في مخزن المصدر."`.
- **إذن العهدة (`CustodyVoucher` — `CV-000001`):**
  - استلام: `product_unit_id` أو `serial_code`، `employee_id`، `branch_id`، `inventory_bucket`، و `customer_id` عند `custody_customer`. إذا لم يُسجل السيريال بلا `register`: `"الجهاز غير مسجل — يرجى إدخال بياناته أولاً."`.
  - صرف: `recipient_type` (`employee` | `customer`) مع `employee_id` (`"الموظف مطلوب عند الصرف لموظف."`) أو `customer_id` (`"العميل مطلوب عند الصرف لعميل."`).
- **الإكسسوارات والباكدجات ومخزونها:**
  - الإكسسوار: إلزامي `name_ar`, `sell_price` (>=0). منع الحذف إن استُخدم في فاتورة (`"لا يمكن حذف الإكسسوار لأنه مستخدم في فواتير بيع."`) أو باكدج (`"لا يمكن حذف الإكسسوار لأنه مستخدم في باكدج."`).
  - الباكدج: إلزامي `name_ar`, `sell_price` (>=0), `items[]` (`kind = accessory` فقط: `"مكونات الباكدج يجب أن تكون إكسسوارات فقط."`).
  - مخزون الإكسسوار: `quantity` (1..10000)، وXOR بين `product_model_id` و `accessory_package_id` (`"اختر إكسسوار أو باكدج، وليس الاثنين معاً."`). نقص الرصيد: `"رصيد الإكسسوار «:name» غير كافٍ (متاح: :available، مطلوب: :required)."`.

### 4.4 التسعير والعروض والخدمات والتعاقدات ومشاكل العقود (`Pricing, Sales, Contracts & Cases`)
- **دليل الأسعار (`PriceCatalogItem`):** `item_type` (`product|service|accessory`), `reference_id`, `name_ar`, `base_price` (>=0), `cost_price` (>=0), `is_active`.
- **العرض الترويجي (`Promotion`):** إلزامي `name_ar`, `promotion_type` (`percent|fixed|bundle`), `discount_value` (>=0), `applies_to` (`all|product|service|accessory`), `start_date`, `end_date` (`>= start_date`). اختياري: `min_quantity` (>=1), `max_uses` (>=1), `items[]`.
- **الخدمة (`Service`):** إلزامي `name`. اختياري: `code` (فريد بالمنظمة), `name_ar`, `category` (13 فئة منها `maintenance, software, subscription, installation, uninstall, user_transfer, ownership_transfer...`), `default_price`, `cash_price`, `installment_price`, `contract_template_key`.
- **التعاقد / الفاتورة (`SalesInvoice`):**
  - إلزامي: `customer_id` + أحد (`branch_id`, `distributor_id`, `sales_user_id`) + `lines[]` (`min:1`)، و `warehouse_id` عند بيع جهاز أو إكسسوار/باكدج (`"المخزن مطلوب عند بيع الأجهزة."`).
  - شرط التحويلات (`wallet|instapay|bank_transfer`): `collection_payment_account_id` و `sender_transfer_number` (max:50) إلزاميان (`"اختر حساب التحصيل وأدخل رقم التحويل من العميل."`).
  - رسائل المنع الحرجة: `"أدخل السريال ورقم الشريحة واسم المستخدم لإتمام التجديد بدون تعاقد سابق."` | `"تجديد مدى الحياة لا يُضاف على عقد الخدمات المجمّع."` | `"يجب تحديد التعاقد الأصلي أو الجهاز لنقل الملكية."` | `"فرع الموزع يجب أن يطابق فرع التعاقد."` | `"يجب اختيار وحدات من المخزون أو تفعيل المخزون السالب من الإعدادات."` | `"اختر جهاز العميل وأدخل اسم المستخدم الجديد."` (لخدمة `user_transfer` مع منع `'Eleraqy'` أو التكرار).
- **مشكلة / حالة العقد (`ContractCase`):**
  - الأنواع: `support`, `return`, `exchange`, `cancel`.
  - شروط الفتح والمنع: `"لا يمكن فتح مشكلة إلا لعقد معتمد."` (عدا `exchange` يقبل `pending`) | `"حالة العقد لا تسمح بفتح مشكلة جديدة."` | `"لا يمكن إلغاء التعاقد بعد تنفيذ الفني — استخدم الاسترجاع."`.

### 4.5 الأقساط والمدفوعات والتحصيل والمراجعة والمصروفات والبيان اليومي (`Financial Ops`)
- **خطة وبنود الأقساط (`InstallmentPlan`, `InstallmentItem`, `InstallmentReconciliation`):**
  - التحصيل: إلزامي `installment_item_id`, `amount` (>=0.01). اختياري/شرطي: `payment_method` (`cash, bank_transfer, card, wallet, instapay, distributor_balance`), `distributor_balance_amount` (>=0), `collection_payment_account_id`, `sender_transfer_number` (max:50), `apply_excess_to_following`, `clear_collection_action`, `collection_reminder_at`.
  - التعليق (`suspend`): إلزامي `branch_id`, `collection_reminder_at` (`after:now`)؛ وشرطي: `suspend_mode` (`not_installed|receive_device|vehicle_impounded`), `resume_from_date` (`>= today` مع `vehicle_impounded`), `serial_code` (مع `receive_device`).
  - الترحيل (`defer`): `new_first_due_date` (`>= today`) للعقود المتأخرة فقط (`"ترحيل الأقساط متاح للعقود المتأخرة فقط."`).
  - متابعة التحصيل: `new_payment_date` يجب أن يساوي **اليوم الحالي فقط** (`"ميعاد الدفع الجديد يجب أن يكون خلال اليوم الحالي فقط."`)؛ `postponed` يجب أن يكون **بعد اليوم** (`"ميعاد التأجيل يجب أن يكون بعد اليوم (غدًا أو لاحقًا)."`).
- **المدفوعات (`PaymentTransaction` — `PAY-000001`):**
  - الاسترداد: `amount` (>=0.01 و `<= amount - refunded_amount + 0.009`)، وإلا `"مبلغ الاسترداد غير صالح. الحد الأقصى: :max ج.م"` أو `"هذه العملية غير قابلة للاسترداد."`.
  - الإلغاء (`void`): متاح فقط في نفس يوم التحصيل (`"الإلغاء متاح في نفس يوم التحصيل فقط."`).
- **حساب التحصيل (`CollectionPaymentAccount`):**
  - إلزامي: `payment_method` (`wallet|instapay|bank_transfer`), `beneficiary_name` (max:150).
  - شرطي متعاكس (`prohibitedIf`): لـ `wallet`/`instapay` ← `phone` إجباري و `account_number`/`bank_name` ممنوعان؛ لـ `bank_transfer` ← `account_number`/`bank_name` إجباريان و `phone` ممنوع. اختياري: `amount_limit` (>=0.01).
- **المصروفات (`ExpenseRequest` — `EXP-000001`) ومديونيات الموظفين (`EmployeeDebt`):**
  - إلزامي: `branch_id`, `expense_type` (`operating|petty_cash|distributor_payout|employee_payout`), `amount` (>=0.01).
  - شرطي: `petty_cash` يوجب `notes` (`"الملاحظة إلزامية للمصروف النثري."`)؛ `employee_payout` يوجب `employee_id` و `notes` (`"يجب ذكر سبب المديونية."`)؛ `operating`/`distributor_payout` يوجب `distributor_id` مع منع الصرف إن كان للموزع أقساط متأخرة كعميل (`"الموزع لديه أقساط متأخرة كعميل."`).
  - منع تكرار عمولة نفس العقد: `"تم تسجيل عمولة من نفس النوع على أحد العقود المختارة بالفعل. لا يمكن صرفها مرة أخرى."`.
- **تقييم العملاء (`ServiceEvaluationQuestion/Request`):** سؤال `question_ar` (max:500), `answer_type` (`text|rating|yes_no`)؛ تقييم `overall_rating` (1..5), `status` (`pending|completed|unreachable`).
- **البيان اليومي للفرع (`DailyBranchReport`):** فريد لكل `(organization_id, branch_id, report_date)` (يعمل بآلية Upsert).

### 4.6 المحاسبة والموارد البشرية و CRM والدعم والدردشة والرسائل (`ERP, CRM & Support`)
- **الحساب المحاسبي (`AccountingAccount`):** `name`, `gl_code`, `account_primary_type` (`asset|liability|equity|income|expense`), `account_sub_type_id` (11 نوعاً), `detail_type_id` (19 نوعاً), `parent_account_id`, `branch_id`, `collection_payment_account_id`, `status` (`active|inactive`).
- **قيد اليومية (`AccountingAccTransMapping` — `JE-0001`) والتحويل (`TR-0001`):**
  - القيد: سطران على الأقل (`min:2`)، كل مبلغ `>= 0.0001`، النوع `debit|credit`، توازن `abs(debits - credits) <= 0.0001`، وكل الحسابات `active`.
  - التحويل: `amount >= 0.01`، `to_account_id != from_account_id`، وكلا الحسابين `active`.
  - الميزانية (`AccountingBudget`): `accounting_account_id`, `financial_year` (`2000..2100`), الأشهر الـ 12 (`>= 0`).
- **الموظف والوردية والإجازة والراتب (`HRM`):**
  - الموظف: `branch_id`, `department_id`, `hrm_job_id`, `user_id` (فريد), `user_account_mode` (`none|auto|link`), `employee_code`, `zk_pin`, `name`, `phone`, `national_id`, `salary`, `hire_date`, `status` (`active|inactive`), `payout_method`, `payout_detail`.
  - الوردية: `name`, `type` (`fixed_shift|flexible_shift`), `start_time`, `end_time`, `holidays[]`, `is_allowed_auto_clockout`, `auto_clockout_time`.
  - نوع الإجازة: `leave_type`, `max_leave_count`, `leave_count_interval` (`year|month`).
  - البدل/الخصم: `description`, `type` (`allowance|deduction|bonus`), `amount`, `amount_type` (`fixed|percent`), `applicable_date`.
  - هدف المبيعات: `employee_id`, `target_start`, `target_end`, `target_count`, `achieved_count`, `commission_percent`.
- **الترشيح ومهام ومكالمات CRM (`ReferralLead`, `CrmTask`, `CrmCallLog`):**
  - الترشيح: مصدر إحالة واحد فقط (عميل أو ترشيح سابق بحالة `not_interested` فقط) — رسائل المنع: `"يجب تحديد مصدر ترشيح واحد فقط (عميل أو ترشيح سابق)"` | `"يمكن الإحالة فقط من ترشيح بحالة غير مهتم"` | `"يجب تحديد موعد إعادة الاتصال"` (لـ `no_answer`) | `"يجب تحديد تاريخ ووقت موعد التركيب"` (لـ `installation_scheduled`). لا يوجد منع تكرار رقم الهاتف عند إنشاء الترشيح نفسه. مدة المكالمة بالثواني وتسجيلها اختياريان في نموذج الإضافة؛ وجود أحدهما ينشئ مكالمة مربوطة بالترشيح (الرقم والاسم والملاحظات والمدة والملف).
  - المكالمة: كل حقول نموذج التسجيل اختيارية (جهة الاتصال، الوقت، المدة، الإفادة، الربط، الملف الصوتي). الملف الصوتي `mp3/mp4/wav/ogg/webm` بحد أقصى `20480` KB. `CallStatementForm` (`outcome`, `next_action`, `priority`, `follow_up_date`, `notes`) اختياري. إنشاء مهمة من الإفادة يطلب المطلوب التالي وموظفاً. نافذة التسجيل تتقيد بارتفاع الشاشة ويُمرَّر محتواها.
- **مهمة الدعم الفني (`SupportTask`):** `executed_at` إلزامي عند `completed` (`"تاريخ التنفيذ مطلوب عند إتمام المهمة."`).
- **الدردشة الداخلية (`Chat`):** `recipient_user_id` (`different:current_user_id`), `body` (`max:5000`).
- **الملاحظات (`Feedback`):** `message` (`required|max:2000`), `rating` (`1..5|nullable`), `page_context` (`max:255`).


---

## 5. دورات الحياة وحالات التحوّل (Lifecycles & State Transitions)

### 5.1 دورة حياة العقد والفاتورة والمراجعة (`SalesInvoice`, `ContractStatus`, `Review`)
- **حالة الفاتورة (`sales_invoices.status`):**
  - `pending_review` ← `confirmed` (تأكيد التعاقد) ← `cancelled` (عند الحذف الكامل `DeleteContractAction`).
  - لطلبات البوابة (`is_order_request = true`): تبدأ بـ `draft` وبادئة `ORD-000001`.
- **حالة المراجعة (`sales_invoices.review_status`):**
  - `pending` ← `approved` (اعتماد) أو `rejected` (رفض مع `rejection_reason`).
  - **انتقال عكسي:** تعديل عقد بحالة `rejected` عبر `UpdateGpsContractAction` يعيده تلقائياً إلى `pending` ويصفّر `rejection_reason`, `reviewed_by`, `reviewed_at`.
  - **شرط الحارس (Guard):** يجب `status === 'confirmed'` و `isReadyForReview() === true` (إتمام الفني لجميع مهام التعاقد)، وإلا يُمنع الاعتماد والرفض.
- **حالة العقد التشغيلية (`ContractStatus`):**
  - `active` (ساري) ← `in_problem` (في مشكلة عند فتح `ContractCase`) ← `returned` (مسترجع) | `exchanged` (مستبدل) | `cancelled` (ملغى).
  - عند التراجع عن كل حالات المشاكل المفتوحة (`RevertContractCaseAction`) يعود العقد إلى `active`.
  - **الإجراءات المسموحة والممنوعة:**
    - `active` / `in_problem` / `exchanged`: مسموح التعديل الكامل (`UpdateGpsContractAction`) حسب صلاحية قبل/بعد المراجعة.
    - `returned` / `cancelled`: ممنوع التعديل الكامل؛ مسموح فقط بتصحيح البيانات التاريخية (`correctClosedContract`).
    - بعد نقل الملكية (`ownership_transferred_at != null`): ممنوع تغيير `customer_id` أو `contract_kind` أو `source_sales_invoice_id` أو التحويل من كاش لتقسيط.

### 5.2 دورة حياة مشاكل العقود ونقل الملكية (`ContractCase`, `OwnershipTransfer`)
- **`ContractCaseStatus`:** `open` ← `in_progress` ← `completed` | `cancelled` (عند الإرجاع `RevertContractCaseAction`).
  - **ممنوع الإرجاع:** إذا كانت `cancelled` بالفعل أو صدر أمر دفع/استرداد (`disbursement_amount > 0` أو وجود `PaymentTransaction`).
- **`OwnershipTransferStatus`:** `pending_installation`, `completed` (التنفيذ الحالي يُكمل النقل فورياً بحالة `completed` عند `completeImmediately`).

### 5.3 دورة حياة وحدات المخزون وحركات الأجهزة (`ProductUnit`, `DeviceMovement`, `StockTransfer`)
- **`ProductUnitState`:** `available`, `sold`, `maintenance`, `in_transfer`, `pending`, `returned`, `exchanged`.
  - **شرط قابلية البيع (`scopeSellableForSale`):** `state = available` + `origin in (null, company_stock)` + `warehouse_id != null` + `owner_customer_id = null` + `inventory_bucket in (null, new)` + `custody_employee_id = null`.
  - **أثر التغيير اليدوي لحالة وحدة مرتبطة بعقد:** `sold` ← `pending` يعلّق الأقساط تلقائياً؛ `pending` ← `sold` يستأنفها تلقائياً.
- **`InventoryBucket`:** `new` (جديد قابل للبيع)، `custody_customer` (عهدة عميل)، `custody_software` (عهدة سوفت)، `custody_maintenance` (عهدة صيانة).
- **`ProductUnitOrigin`:** `company_stock` (مخزن الشركة)، `legacy` (قديم من الشركة)، `external` (خارج الشركة).
- **`DeviceMovementStatus`:** `pending` ← `confirmed` (بواسطة المستلم فقط) | `rejected` (بواسطة المستلم فقط مع `rejection_reason`) | `cancelled` (بواسطة المرسل فقط).
  - أثناء `pending` تكون الوحدات في حالة `in_transfer`؛ عند `confirmed` تنتقل للمخزن الوجهة وتعود لـ `previous_state`؛ عند `rejected`/`cancelled` تبقى بمخزن المصدر وتعود لـ `previous_state`.
- **`StockTransferKind`:** `manual`, `distribution`, `return` (تتحول `in_transit` ← `completed` فورياً داخل معاملة DB).

### 5.4 دورة حياة الأقساط والتصالح والمدفوعات ومراجعة التحصيل (`Installments`, `Payments`, `Review`)
- **`InstallmentItem.status`:**
  - `pending` / `overdue` ← `partial` (عند سداد جزئي) ← `paid` (عند `remaining <= 0`).
  - التعليق (`suspended_at !== null`): يجمّد تحديث الحالة ويمنع التحصيل حتى الاستئناف (`Resume`).
  - **شرائح العرض (`displayTier`) مرتبة بالأولوية:** `overdue` (0) → `grace` (1) → `upcoming` (2) → `paid` (3) → `suspended` (4).
- **`CollectionStatus` (متابعة التحصيل):** `responded` (تم الرد)، `postponed` (تأجيلات)، `new_payment_date` (مواعيد جديدة للدفع)، `no_answer` (لم يتم الرد). تنتهي صلاحية التذكيرات و `no_answer` تلقائياً بانتهاء اليوم عبر `ExpireCollectionRemindersService`.
- **`InstallmentReconciliation.status`:** `open` ← `closed`. أثناء `open` يُمنع التحصيل والاسترداد على القسط.
- **`CollectionReviewStatus` (`sales_invoices.collection_review_status`):** أي تحصيل أو تسجيل دفعة يعيدها إلى `pending` ← تأكيد المراجع ينقلها إلى `reviewed`.
- **`PaymentTransactionStatus`:** `active` ← `refunded` (عند استرداد كامل المبلغ) أو `voided` (عند حذف العقد الكامل). الاسترداد الجزئي يبقي الحالة `active` مع زيادة `refunded_amount`.
- **`PaymentSource`:** `installment`, `external`, `down_payment`, `pos_cash`, `transportation_fee`, `distributor_balance`, `contract_disbursement`, `verification`.
- **`CustomerCollectionActionType`:** `device_disable_note`, `whatsapp_warning`, `portal_login_disabled` وإلغاؤها: `device_disable_note_cancelled`, `whatsapp_warning_cancelled`, `portal_login_enabled`.

### 5.5 دورة حياة المصروفات ومديونيات الموظفين والتقييمات (`Expenses`, `EmployeeDebt`, `Evaluations`)
- **`ExpenseRequestStatus`:** `draft` / `pending` ← `paid` (عند الاعتماد عبر `ApproveExpenseRequestAction`) أو `rejected` (عند الرفض).
  - *حالة خاصة فعلية:* عند التقديم (`Submit`) يُعيّن `paid_at = now()` ويُنفذ الأثر المالي/المديونية فوراً مع بقاء `status = pending`؛ وعند التعديل (`Update`) تعود الحالة إلى `pending`.
- **`EmployeeDebtStatus`:** `active` ← `settled` (عند وصول `remaining_balance <= 0.009` بعد صرف الراتب).
- **`ServiceEvaluationRequest.status`:** `pending` ← `completed` | `unreachable` (نهائية — يُمنع إعادة التسجيل بعد الخروج من `pending`).

### 5.6 دورة حياة CRM و HRM والمحاسبة والدعم والرسائل والمزامنة
- **`ReferralLeadStatus`:** `no_answer` (افتراضي) ↔ `not_interested` ↔ `installation_scheduled` ↔ `installed`.
  - الإحالة الفرعية مسموحة **فقط** من ترشيح حالته `not_interested`.
- **`CrmTask.status`:** `todo` ← `in_progress` (يسجّل `started_at`) ← `done` (يسجّل `finished_at` و `total_time_minutes`؛ وإعادة الفتح تصفّرهما).
- **طلبات الإجازة (`HRM Leaves`):** `pending` ← `approved` (مع فحص الرصيد) | `rejected`.
- **مسيرات الرواتب (`HrmPayrollGroup`):** `status`: `draft` ← `finalized`؛ `payment_status`: `due` ← `paid`.
- **قيود اليومية (`Accounting`):** لا توجد حالات `draft`/`posted`/`reversed`؛ أي قيد يُحفظ يُرحّل ويؤثر على الأرصدة فوراً.
- **`SupportTask.status`:**
  - `pending` → `[assigned, cancelled]`
  - `assigned` → `[in_progress, cancelled]`
  - `in_progress` → `[completed, cancelled]`
  - `completed` → `[]` (نهائية؛ وأي انتقال خارج `completed` يصفّر `completed_at` و `executed_at`)
  - `cancelled` → `[pending]` (إعادة فتح)
- **`CustomerMessageStatus`:** `queued`, `sent`, `failed`, `skipped`.
- **`sync_outbox.status` (الأوفلاين):** `pending` ← `synced` (عند `acked`) | `conflict` (مع فتح `sync_failures.status = 'open'`).

---

## 6. العمليات والـ Workflows التفصيلية خطوة بخطوة

### 6.1 إنشاء وتأكيد وتعديل وحذف التعاقدات (`POS & Contracts`)
1. **إنشاء عقد GPS (`PosCheckoutAction` + `ConfirmContractAction`):**
   - **الخطوات:** اختيار العميل وفرع/موزع/مندوب ← إضافة البنود (أجهزة من المخزن أو تجديد أو خارجي أو خدمة أو نقل ملكية) ← تطبيق العرض الترويجي الأفضل (`PromotionResolverService`) ← تحديد طريقة الدفع (كاش/تقسيط، مقدم، رصيد موزع، حساب تحويل ورقم محوّل) ← التأكيد.
   - **التأثيرات الجانبية:** تحويل الوحدات إلى `sold` وتعيين `owner_customer_id` و `sales_invoice_id` ← خصم مخزون الإكسسوارات ← ضبط `status = confirmed` و `review_status = pending` (إن كان `require_invoice_review = true`) ← إنشاء `InstallmentPlan` (ملاحظة: لبنود الأجهزة بدون `custom_schedule` لا تُولّد `InstallmentItem` إلا عند تنفيذ مهمة التركيب) ← تسجيل عمولة الموزع وإشعار الترقية إن وصل للعتبة ← تخصيص هدف المبيعات (`achieved_count + 1`) ← تسجيل `PaymentTransaction` ← إطلاق `SalesInvoiceCreated` (ينشئ `SupportTask` للتركيب/الفك ويرحّل قيد المبيعات محاسبياً في السحابة) ← إطلاق `PaymentStatusUpdated` (يرحّل قيد الدفع) ← إرسال واتساب الترحيب (`contract_welcome`) ← تنفيذ نقل الملكية فوراً إن كان العقد نقل ملكية وبدون مراجعة.
2. **بيع الخدمات (`ServiceSaleCheckoutAction`) وبيع الإكسسوارات (`AccessorySaleCheckoutAction`):**
   - تؤكد الفاتورة فوراً دون انتظار مراجعة، وتولّد الأقساط وتخصم الإكسسوارات وتسجل الدفعات وعمولة الموزع مباشرة.
3. **تعديل العقد (`UpdateGpsContractAction`):**
   - حفظ لقطة الأقساط المحصّلة ومهام الدعم وحالات المشاكل وحالة التعليق ← هدم (`teardown`: إرجاع الإكسسوارات والوحدات، عكس دفعات الـ checkout، حذف المهام غير المنفذة والأقساط) ← إعادة البناء (`runRebuild`) ← إعادة ربط المهام والمشاكل وإضافة المحصّل السابق كـ `down_payment` وإعادة التعليق إن وُجد.
4. **تحويل الكاش إلى تقسيط (`ConvertCashToInstallmentAction`):**
   - فحص الأهلية (`confirmed`, `cash`, غير منقول الملكية, `financed_amount > 0`) ← إعادة تسعير البنود بسعر التقسيط ← حذف الخطط القديمة وتحديث الفاتورة والبنود إلى `installment` ← توليد جدول أقساط جديد (`monthly` أو `weekly`).
5. **نقل الملكية (`OwnershipTransferService`):**
   - البحث عن العقد المصدر (`serial_number`/`customer_id`/`invoice_number`) ← التحقق من عدم النقل سابقاً وتطابق السيريال واختلاف المالك ← حفظ `rollback_snapshot` و `paid_installments_snapshot` ← إعادة جدولة الأقساط غير المدفوعة من `transferred_at + interval` ← نقل `sourceInvoice.customer_id` و `ProductUnit.owner_customer_id` وبيانات الجهاز للعميل الجديد ← ترقية الاشتراك لـ `permanent` إن تضمنها عقد النقل.
6. **حذف العقد الكامل (`DeleteContractAction` — `Admin`/`SuperAdmin` فقط):**
   - فحص الموانع (عدم وجود مصروف عمولة نشط، أو عقود مرتبطة، أو `ContractCase` مكتمل) ← التراجع عن نقل الملكية ← عكس حسابات التحصيل والقيود المحاسبية ووسم المدفوعات `voided` ← عكس عمولة الموزع وأهداف المبيعات وعمولات CRM ← استعادة الإكسسوارات وإرجاع أجهزة `new_contract` إلى `available` + `bucket = new` ← إغلاق التصالحات وحذف الأقساط والمهام والتقييمات ← تحويل الفاتورة إلى `cancelled` وحذفها ناعماً.

### 6.2 مسار مشاكل العقود (`ContractCases`)
1. **الفتح (`OpenContractCaseAction`):** تحويل العقد إلى `in_problem` ← تحويل الوحدة `sold` إلى `pending` ← تعليق الأقساط ← إنشاء `ContractCase` بحالة `open`.
2. **إكمال الدعم (`CompleteSupportCaseAction`):** إنشاء `SupportTask` نوع `support` وإغلاق الحالة `completed`.
3. **إكمال الإلغاء (`ProcessCancelCaseAction`):** حساب المقدمات القابلة للرد ← التحقق من `customer_received_refund = true` وطريقة الرد ← استرداد كل دفعة عبر `RefundPaymentAction` ← إرجاع الجهاز للمخزن `available` + `new` ← إلغاء مهام الدعم المفتوحة ← تحويل العقد إلى `cancelled`.
4. **إكمال الاسترجاع (`ProcessReturnCaseAction`):** حساب مديونية الجهاز والمدفوع ← حساب `disbursement_amount = max(0, totalPaid - deviceDebt)` وإنشاء `PaymentTransaction` سالب (`contract_disbursement`) عند `> 0` ← إرجاع الجهاز بحالة `returned` ← تحويل العقد إلى `returned`.
5. **إكمال الاستبدال (`ProcessExchangeCaseAction`):** التحقق من توفر البديل ← إرجاع القديم إلى `available`/`new` (`good`) أو `maintenance`/`custody_maintenance` (`faulty`) ← ربط الجديد بحالة `sold` على سطر الفاتورة ← إنشاء `ContractDeviceExchange` ← تحويل العقد إلى `exchanged`.
6. **الإرجاع (`RevertContractCaseAction`):** التحقق من عدم وجود أمر دفع/استرداد ← عكس حركة الأجهزة أو إلغاء مهام الدعم ← إعادة الوحدة إلى `sold` والعقد إلى `active` واستئناف الأقساط إن لم توجد حالات مفتوحة أخرى.

### 6.3 مسار المخزون وحركات الأجهزة والعهد والصيانة
1. **إضافة وتوزيع وإرجاع المخزون المركزي:** `add` ينشئ `StockReceipt` ويولّد وحدات بـ IMEI يبدأ بـ `356` (17 رقماً) ← `distribute`/`returnStock` ينشئ `TRF-000001` وينقل الوحدات بين المركزي ومخزن الفرع.
2. **حركة الأجهزة (`DeviceMovements`):** `Initiate` ينشئ `DM-000001` بحالة `pending` ويحوّل الوحدات إلى `in_transfer` ويرسل إشعاراً للمستلم ← `Confirm` (المستلم) ينقلها للوجهة ويعيد حالتها الأصلية | `Reject`/`Cancel` يعيدها لحالتها الأصلية بمخزن المصدر.
3. **العهدة والصيانة:** `ReceiveCustomerDevice` ينشئ إذن استلام `CV-XXXXXX` ويضبط الـ bucket والموظف ← `IssueCustody` يصرف لموظف أو يعيد للعميل (ويصفّر العهدة ويعيد الحالة `sold`/`available`) ← `ProcessUninstallCustody` يسجّل استلام الفك (وصرف فوري للعميل إن كان `customer_received = true`) ← `RecordMaintenanceVisit` يسجّل دخول وخروج الصيانة على وحدات `custody_maintenance`.

### 6.4 مسار التحصيل والأقساط والمدفوعات والمراجعة والمصروفات
1. **التحصيل (`CollectInstallmentAction` / `CollectExternalInstallmentAction`):**
   - قفل السجلات (`lockForUpdate`) ← فحص التعليق والتصالح وإجراءات التحصيل النشطة (إن وُجدت بلا `clear_collection_action = true` يُرفض بـ HTTP `409`؛ ومعه تُحذف الإجراءات وتُفعل البوابة) ← توزيع المبلغ على القسط المختار ثم الأقساط التالية (عند تفعيل `apply_excess_to_following`) ← اقتطاع رصيد الموزع أولاً ثم النقدي/التحويل ← تطبيق الأصل ثم غرامة التأخير ← تحديث حساب التحصيل والفاتورة ← إلزام `collection_reminder_at` (`> today`) إن بقيت أقساط متأخرة ← إطلاق `PaymentStatusUpdated` (ترحيل محاسبي) + سجل تدقيق + واتساب `installment_paid` + وضع `collection_review_status = pending`.
2. **الاسترداد (`RefundPaymentAction`) والإلغاء (`Void`):** إنشاء سند سالب (`refund_of_id`) ← تحديث `refunded_amount` وحالة السند ← عكس القسط وحساب التحصيل ورصيد الموزع والفاتورة ← ترحيل قيد محاسبي عكسي (`sell_payment_refund`) + سجل تدقيق.
3. **إتمام مهمة الدعم الفني (`SupportTaskService`):** إلزام `executed_at` ← تفعيل/إعادة جدولة أقساط العقد من `executed_at + interval` (يُمنع إذا كان أي قسط مدفوعاً) ← إنشاء طلب تقييم خدمة (`ServiceEvaluationRequest`) ← لمهام التركيب: صرف الأجهزة المعلّمة `customer_received` بـ `CustodyVoucher`، تطبيق عمولة التركيب للفني/الموزع (تُخصم أولاً من أقدم قسط غير مدفوع له والمتبقي لرصيد عمولته)، وتحويل `ReferralLead` من `installation_scheduled` إلى `installed`.
4. **المصروفات (`Expenses`):** عند التقديم (`Submit`) يُعيّن `paid_at` ويُنفّذ ربط عقود الموزع أو إنشاء `EmployeeDebt` فوراً مع بقاء `status = pending` ← عند الاعتماد يتحول لـ `paid` ← عند صرف راتب الموظف (`paid`) يُخصم القسط المحدد من `EmployeeDebt.remaining_balance` حتى يتحول إلى `settled`.

### 6.5 مسار المحاسبة و HRM و CRM والبوابة
- **المحاسبة:** تهيئة الـ 20 حساباً افتراضياً ← توليد 4 حسابات لكل فرع وضبط `accounting_default_map` ← الترحيل التلقائي عند إنشاء/تعديل فاتورة (`sell`)، الدفع (`sell_payment` مع توجيه ذكي لحساب التحصيل المربوط)، والاسترداد (`sell_payment_refund`).
- **HRM & ZKTeco:** سحب UDP كل 10 دقائق أو دفع فوري عبر ADMS (`/iclock/cdata`) ← منع التكرار بـ `crc32(pin|punchedAt)` ← دمج بصمات اليوم (أقدم = حضور، أحدث = انصراف) ← الانصراف التلقائي كل 30 دقيقة (`AutoClockOutJob`) ← توليد مسير الرواتب (`draft`/`due`) ← تعليم المسير كمدفوع (`finalized`/`paid`) وتسوية مديونيات الموظفين.
- **CRM & بوابة العميل:** إنشاء ترشيح (`no_answer`) ← عند التحويل لـ `installation_scheduled` أو `installed` يُنشأ/يُربط سجل `Customer` تلقائياً (فحص تكرار الهاتف في العملاء) ← ربط المكالمات بـ `CallStatementForm` وإمكانية تحويلها لمهمة `CrmTask` ← بوابة العميل (`/portal`) تعرض لوحة التحكم والفواتير وكشف الحساب وطلبات الشراء (`ORD-XXXXXX`) ← الملف العام (`/c/:token`) يعرض التقدم والأقساط والأجهزة وآخر 50 دفعة وبيانات الدفع مع إخفاء الرقم القومي عدا آخر 4 أرقام.

---

## 7. قواعد الحسابات والمنطق المالي والتجاري (Business & Calculation Rules)

### 7.1 التسعير والعروض الترويجية
- **العرض الترويجي (`PromotionResolverService`):**
  - الشروط: `is_active = true`، اليوم ضمن `[start_date, end_date]`، و(`max_uses IS NULL || uses_count < max_uses`).
  - `eligibleQty < min_quantity` أو `eligibleTotal <= 0` ← الخصم `0`.
  - نوع `percent`: `discount = eligibleTotal * (discount_value / 100)`.
  - نوع `fixed`: `discount = min(discount_value, eligibleTotal)`.
  - اختيار العرض الأفضل: أكبر `discount_total`، وزيادة `uses_count + 1` عند التطبيق في عقد جديد.
- **تحويل الكاش لتقسيط:**
  - `price_diff = max(0, installmentPrice - cashPrice)`
  - `new_total = current_total + price_diff`
  - `financed_amount = max(0, new_total - paid_amount)`
  - `count = max(1, ceil((financed_amount - 0.001) / installment_amount))` (بشرط `count <= max_installment_months`)
  - فترة السماح للتحويل: `cash_to_installment_grace_days` (افتراضي 7 أيام).

### 7.2 الأقساط، الغرامات، أولويات التوزيع، والتسويات
- **توليد الأقساط (`InstallmentScheduleService`):**
  - `financed = max(0, round(total - down_payment, 2))`.
  - بدون مبلغ ثابت: `baseAmount = floor((financed / count) * 100) / 100`، ويُضاف باقي التقريب `remainder` لآخر قسط.
  - تواريخ الاستحقاق: `weekly` ← `firstDue + (max(1, interval_days) * index)`؛ `monthly` ← `firstDue.addMonthsNoOverflow(index)`.
- **أولوية توزيع التحصيل:**
  1. بين المصادر: **رصيد عمولة الموزع أولاً** (`distributor_balance`) ثم النقدي/التحويل.
  2. داخل القسط الواحد: **الأصل (`principal`) أولاً** حتى `amount - paid_amount`، ثم **غرامة التأخير (`late_fee_accrued`)**.
  3. عند زيادة المبلغ وتفعيل `apply_excess_to_following`: سداد القسط المختار كاملاً ثم الأقساط التالية غير المسددة بترتيب `sequence` التصاعدي.
- **غرامة التأخير اليومية (`AccrueInstallmentLateFeesJob` — الساعة `00:05` يومياً):**
  - الإعدادات الافتراضية للإدارة: `overdue_grace_days = 3`، `late_fee_mode = daily_fixed`، `late_fee_daily_amount = 10`، `late_fee_percent = 0`، `waive_late_fee_on_close = true`.
  - `percent`: `dailyFee = round(item.amount * (late_fee_percent / 100), 2)`.
  - `daily_fixed`: `dailyFee = round(late_fee_daily_amount, 2)`.
  - **أيام التأخير:** `cutoff = due_date + grace_days + 1 day`؛ إذا `today < cutoff` تكون `0` وإلا `diffInDays(cutoff, today)`.
  - **حد التأخير في التقارير:** `overdueBefore = today - (max(1, overdue_grace_days) - 1) days` (`overdue` أصغر منه، `due_soon` بينه وبين `today`، `upcoming` أكبر من `today`).
- **الاسترجاع (`Return Case`):** `disbursement_amount = max(0, totalPaid - deviceDebt)`.
- **حسابات التحصيل:** عند وصول `collected_amount >= amount_limit` يُعطّل الحساب تلقائياً (`is_active = false`)، وتعيد مهمة `ResetCollectionPaymentAccountsJob` (يوم 1 من كل شهر الساعة `00:10`) تفعيله وتصفير `collected_amount = 0`.
- **عمولات الموزعين:** تُضاف `agreed_amount` لـ `commission_balance` عند تأكيد الفاتورة (ما لم يُصرف لها مصروف عمولة مدفوع) ويزداد `confirmed_transactions_count + 1`؛ وعند مضاعفات `commission_tier_threshold` يُرسل إشعار ترقية.

### 7.3 البيان اليومي للفرع (`DailyBranchReportInferenceService`)
- **المدفوعات المشمولة:** `status = active`، `DATE(paid_at) = report_date`، للفرع المحدد، مع **استبعاد** `distributor_balance`.
- **الفصل:** `wallet` و `instapay` تذهب إلى `vodafone_transfers_count` و `vodafone_transfers_total`؛ باقي الطرق (بما فيها المرتجعات السالبة) تذهب إلى `transactions`.
- **المعادلات (الأولوية للاستنتاج التلقائي على الإدخال اليدوي عند الحفظ):**
  - `total_amount = round(sum(transactions.amount), 2)`
  - `expenses_total = round(sum(expense_lines.amount), 2)` (المصروفات ذات `paid_at != null` و `status != rejected` في نفس اليوم)
  - `net_amount = round(total_amount - expenses_total, 2)`

### 7.4 المحاسبة (`Accounting`)
- **إشارة الرصيد:** `asset` و `expense` ← `debit (+)` / `credit (-)`؛ `liability`, `equity`, `income` ← `credit (+)` / `debit (-)`.
- **توازن القيد:** `abs(debits - credits) <= 0.0001`.
- **توازن الميزانية ومطابقة الذمم المدينة:** متطابقان عندما `abs(difference) < 0.01`.
- **فئات تقادم الذمم المدينة (`AR Ageing`):** `<1` (`current`)، `1_30`، `31_60`، `61_90`، `>90`.
- **انحراف الميزانية:** `variance = budget - actual`.

### 7.5 الموارد البشرية والرواتب (`HRM PayrollCalculator`)
- **دورة الرواتب الافتراضية في الملخص الشهري:** من **يوم 21 الشهر السابق إلى يوم 20 الشهر الحالي** (أو من 21 الحالي إلى 20 التالي إذا كان اليوم ≥ 21).
- **الراتب الأساسي المستحق (`gross_total`):**
  - *وضع الفترة (المسيرات والملخص الشهري):* `daily_rate = round(rate / 30, 2)`، `duration = working_days (present + late) + approved_leave_days`، `gross_total = round(duration * daily_rate, 2)`. (الغياب يُخصم بعدم احتسابه؛ التأخير يُحتسب ضمن أيام العمل ويُخصم يدوياً عبر `daily_deduction`).
  - *الوضع المباشر:* `gross_total = round(duration * rate, 2)` (يُرفض إذا `rate <= 0`).
- **البدلات والمكافآت:** الثابت `round(amount, 2)`، والنسبة المئوية من `gross_total`: `round(gross_total * (amount / 100), 2)` + مجموع `Attendance.daily_bonus`. ← `subtotal = round(gross_total + allowanceTotal, 2)`.
- **الخصومات والمديونيات:** خصم المديونيات النشطة تلقائياً بمقدار `min(remaining_balance, payroll_deduction_amount ?? remaining_balance)` + الخصومات الثابتة أو النسبية من `subtotal` (`round(subtotal * (amount / 100), 2)`) + مجموع `Attendance.daily_loan` و `Attendance.daily_deduction`.
- **صافي الراتب:** `final_total = round(subtotal - deductionTotal, 2)`.
- **رصيد الإجازات:** `days = start_date->diffInDays(end_date) + 1`؛ `remaining = max(0, max_leave_count - used_approved_in_interval)`.
- **نوافذ البصمة (`fixed_shift`):** `clock_in` ضمن `[shiftStart - grace_before_checkin, shiftStart + grace_after_checkin]`؛ `clock_out` ضمن `[shiftEnd - grace_before_checkout, shiftEnd + grace_after_checkout]` (القيمة الافتراضية للـ 4 سماحيات: `15` دقيقة).
- **مؤشرات CRM:** نسبة تحويل الترشيحات `installed / total * 100`؛ نسبة إنجاز الأنشطة `done_activities / (calls + meetings + tasks) * 100`؛ صافي مبيعات CEO `total - COALESCE(transportation_fee, 0)`.

---

## 8. الحالات الحدية والأخطاء والأمان والتزامن (Edge Cases, Errors & Sync)

### 8.1 القيم الحدية وتطبيع المدخلات وتعارض الحالات
- **تطبيع الأرقام:** كل الأرقام العربية/الفارسية في الطلبات تُحوّل لاتينياً تلقائياً قبل التحقق.
- **القيم الصفرية والسالبة والمكررة:**
  - مبالغ الدفع والاسترداد والمصروفات والمديونيات والتحويلات: ترفض `<= 0` (`min:0.01`؛ وفي سطور القيود المحاسبية `min:0.0001`).
  - فروق التقريب العائمة (Floating-point tolerance): يعتمد النظام هامش `0.009` في فحص سداد الأقساط والاسترداد والمديونيات ورصيد الموزع، و `0.0001` في توازن القيود، و `0.01` في تقارير المحاسبة.
  - منع التكرار: فواتير البيان اليومي (Upsert لكل فرع+تاريخ)، بصمات ZKTeco (`crc32(pin|punchedAt)`), تخصيص هدف المبيعات (`sales_invoice_id`), تقييم الخدمة (`support_task_id`), عمولة المصروفات (`ContractCommissionAvailability`), رسائل واتساب (`isDuplicate`: منع نهائي لكل دفعة/قسط/عقد ومنع لمدة **24 ساعة** لـ `collection_warning`), والمزامنة الأوفلاين (`sync_inbox` على `(branch_id, operation_uuid)`).
  - **ثغرة/قيد معروف:** الورديات الليلية العابرة لمنتصف الليل في ZKTeco تنقسم إلى سجلين لأن التجميع حسب اليوم الميلادي؛ كما لا يوجد منع تكرار رقم هاتف عند إنشاء `ReferralLead` (يُفحص التكرار فقط عند تحويله لـ `Customer`).
- **تعارض الحالات وترتيب العمليات:**
  - محاولة مراجعة عقد قبل تنفيذ الفني ← `422`.
  - محاولة إلغاء عقد بعد تنفيذ التركيب ← `422` (يجب استخدام الاسترجاع).
  - محاولة إعادة جدولة أقساط عند إتمام مهمة تركيب مع وجود قسط مدفوع ← `422`.
  - محاولة تحصيل قسط مع وجود إجراء تحصيل نشط دون `clear_collection_action = true` ← HTTP `409` (`collection_action_active`).
  - محاولة تعديل/حذف مصروف مديونية موظف بعد خصم جزء منه في الراتب ← `422`.
  - محاولة التراجع عن نقل ملكية أقدم بعد حدوث نقل ملكية أحدث على نفس الجهاز ← `422`.
  - محاولة إرسال رسالة دردشة لنفسك أو حركة جهاز لنفسك ← `422`.

### 8.2 وضع الفروع الأوفلاين والمزامنة (`Offline Branch Mode & Sync`)
- **التهيئة (`POST /api/v1/setup`):**
  - على السحابة يُرفض بـ `404`؛ وإذا أُعد الفرع مسبقاً يُرفض بـ `409`.
  - قبل اكتمال الإعداد على خادم الفرع: `POST /auth/login` يرفض بـ **HTTP `423`** (`"أكمل إعداد الفرع أولاً."`, `needs_setup: true`).
  - اختبار الاتصال بالسحابة (`/api/v1/offline/health`): `401` → `422` (`"المفتاح أو السر غير صحيح."`)، `404` → `422` (رابط السحابة خاطئ)، فشل تنزيل اللقطة → `502`.
- **ما يعمل أوفلاين (`SyncRegistry`):** موديول `contracts` (`pos_checkout`, `service_checkout`, `accessory_checkout`, `expense_request`) وموديول `installments` (`collect`, `external_collect`, `defer`, `suspend`, `resume`, `due_dates`, `collection_metadata`, `assignment`). أرقام الفواتير المحلية تصدر بصيغة `INV-B{branchId}-000001` ويُتخطى الترحيل المحاسبي محلياً ليتم عند التطبيق على السحابة.
- **ما يُحظر أوفلاين (سحابي فقط):** المراجعة، CRM، HRM، المشتريات، دفتر الأستاذ، تجديد الاشتراكات؛ ولا يُسمح بخادمي فرع لنفس الفرع. الصلاحية المحذوفة سحابياً تبقى فعالة محلياً حتى مزامنة المستخدمين التالية.
- **آلية المزامنة والتعافي (`SyncWorker` — كل دقيقة `offline:sync`):**
  - قفل `Cache::lock('offline-sync-{branch_id}', 120s)` + قاطع دائرة (`Circuit Breaker`) لمدة `30s` عند انقطاع السحابة.
  - دفعات رفع بحجم `50` عملية مع `schema_version = 1` (عدم التطابق يرجع HTTP **`409`**).
  - إعادة المحاولة عند الفشل بـ Exponential Backoff + Jitter: `min(3600, 2 ** min(attempts, 10)) + random_int(0, 5)` ثانية.
  - تعارضات التطبيق (`conflict` مثل غياب العقد/القسط عن السحابة) لا تحذف البيانات المحلية بل تفتح سجل مصالحة في `sync_failures` وتُعرض في `/sync-debug` مع زر **مزامنة الآن** وزر **إعادة** لكل عملية.

### 8.3 الحذف الناعم، سلة المهملات، وسجل التدقيق (`Trash & Audit Log`)
- **حارس الحذف (`DeletionGuardService`):** يمنع حذف العميل ذي العقود المؤكدة، والموزع المرتبط بعملاء/تعاقدات، والقسم المرتبط بموظفين، والفرع ذي المخزون/الفواتير، والإدارة ذات الفروع أو المخزون المركزي المقفل.
- **سلة المهملات (`config/trash.php` — 23 نوعاً مسجلاً):** تعرض أحدث **50 عنصراً لكل نوع** (`trash.view`).
  - **قيد الاستعادة (`trash.restore`):** يُمنع استعادة `SalesInvoice` (أو خطط/بنود أقساطها) إذا كانت بحالة `cancelled`: `"تم إلغاء معاملات هذا التعاقد وإرجاع مخزونه؛ لا يمكن استعادته من سلة المهملات."`.
  - **الحذف النهائي (`trash.force_delete`):** `forceDelete()` دائم لا يمكن التراجع عنه (يعيد `204`).
  - *ملاحظة:* 4 نماذج تستخدم `RecordsDeleter` وغير مدرجة في `config/trash.php` (`ReferralLead`, `ExpenseRequest`, `ServiceEvaluationQuestion`, `SupportTask`).
- **سجل التدقيق (`Activity Log` — `audit.view`):** يسجّل صراحةً في 5 قنوات (`admin`, `crm`, `sales`, `payments`, `installments`) مع عزل صارم حسب `organization_id` (السجلات من منظمة أخرى تُرجع `404`). لا توجد مهمة آلية لمسح السجلات القديمة رغم وجود إعداد `audit_log_retention_days` في الإعدادات (`[معلومة غير محددة في المصدر / تحتاج تحقق: هل سيتم تفعيل جدولة التنظيف التلقائي لاحقاً أم الاحتفاظ الدائم مقصود]`).

### 8.4 الأمان، عزل التوكنات، التزامن، وأخطاء الشبكة والـ API
- **عزل التوكنات (Sanctum):**
  - انتهاء التوكن في `config/sanctum.php` هو `null` (يبقى صالحاً حتى تسجيل الخروج؛ إعداد `session_timeout_minutes` محفوظ في الإعدادات دون إنفاذ على انتهاء توكن Sanctum `[معلومة غير محددة في المصدر / تحتاج تحقق]`).
  - توكن الموظف ممنوع على `/api/v1/portal/*` (`portal.only` → `403`)، وتوكن العميل ممنوع على مسارات الموظفين (`portal.block` → `403`).
  - تعطيل دخول العميل (`customer.status = blocked`) يحذف فوراً جميع توكنات البوابة ويرفض الدخول بـ `422` (`"تم إيقاف دخول التطبيق لهذا العميل."`).
- **معالجة أخطاء الشبكة والـ API في الواجهة (`client.ts` & `portalClient.ts`):**
  - `401`: تسجيل خروج فوري وإعادة توجيه إلى `/login` (أو `/portal/login` للبوابة) مع رسالة `"انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى."`.
  - `422`: عرض أول رسالة من `data.errors`، وإلا `data.message`، وإلا `"بيانات غير صالحة."`.
  - `403`, `409`, `423`, `500`: عرض `data.message` وإلا `` `خطأ في الخادم (${status})` ``.
  - انقطاع الشبكة: `"تعذر الاتصال بالخادم."`.
- **حدود المعدل (`Rate Limits`):** `GET /public/customer-profile/{token}` بـ `60` طلب/دقيقة؛ `/iclock/*` بـ `120` طلب/دقيقة؛ `[معلومة غير محددة في المصدر / تحتاج تحقق: لا يوجد throttle صريح على مسار auth/login أو portal/auth/login في routes/api.php]`.
- **أقفال التزامن (`lockForUpdate` & `DB::transaction`):** 94 معاملة في 66 ملفاً تغطي ترقيم الفواتير (`Organization`), مبيعات المخزون والعهد (`ProductUnit`), التحصيل (`CollectInstallmentAction` بـ 7 أقفال), حذف العقود (`DeleteContractAction` بـ 9 أقفال), المصروفات والمديونيات, وتسلسل الـ Outbox/Inbox في المزامنة الأوفلاين.
- **لوحة المطورين (`/devs/*`):** معطّلة افتراضياً (`404`)، محمية بـ Guard `developer` و `is_active` و `is_admin`، تراقب الطلبات البطيئة (`> 30,000ms`) وإحصائيات الخادم كل دقيقة، وتبلّغ الاستثناءات لـ Telegram/Discord مع Webhook محمي بـ `X-Telegram-Bot-Api-Secret-Token` (`403` عند عدم التطابق).
