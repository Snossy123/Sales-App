export type PermissionCategory = 'view' | 'add' | 'edit' | 'delete' | 'other'

export interface PermissionDefinition {
  key: string
  module: string
  category: PermissionCategory
  label: string
  description: string
}

export const CATEGORY_LABELS: Record<PermissionCategory, string> = {
  view: 'عرض',
  add: 'إضافة',
  edit: 'تعديل',
  delete: 'حذف',
  other: 'أخرى',
}

export const MODULE_LABELS: Record<string, string> = {
  dashboard: 'لوحة التحكم',
  branches: 'الفروع',
  warehouses: 'المخازن',
  inventory: 'مخزون GPS',
  stock: 'تحويلات المخزون',
  customers: 'العملاء',
  distributors: 'الموزعين',
  promotions: 'العروض الترويجية',
  services: 'الخدمات',
  accessories: 'الإكسسوارات',
  accessory_packages: 'باكدجات الإكسسوارات',
  sales: 'البيع والتعاقدات',
  installments: 'الأقساط والتحصيل',
  payments: 'المدفوعات',
  users: 'المستخدمون',
  roles: 'الأدوار',
  audit: 'سجل التدقيق',
  settings: 'إعدادات النظام',
  trash: 'سلة المهملات',
  faq: 'المساعدة',
  feedback: 'الملاحظات',
  reports: 'التقارير المالية',
  crm: 'المبيعات',
  hrm: 'الموارد البشرية',
  accounting: 'المحاسبة',
  review: 'المراجعة',
  support: 'الدعم الفني',
  contracts: 'مشاكل العقود',
  scope: 'نطاق البيانات',
}

export interface PermissionSectionDef {
  id: string
  label: string
  icon: string
  modules: string[]
}

/** ترتيب الوحدات مطابق لمجموعات القائمة الجانبية */
export const PERMISSION_SECTIONS: PermissionSectionDef[] = [
  {
    id: 'scope',
    label: 'نطاق البيانات',
    icon: 'visibility',
    modules: ['scope'],
  },
  {
    id: 'general',
    label: 'عام',
    icon: 'dashboard',
    modules: ['dashboard'],
  },
  {
    id: 'management',
    label: 'الإدارة',
    icon: 'corporate_fare',
    modules: ['branches'],
  },
  {
    id: 'contracts',
    label: 'قسم التعاقدات',
    icon: 'edit_document',
    modules: ['sales', 'promotions'],
  },
  {
    id: 'collection',
    label: 'قسم الاقساط',
    icon: 'payments',
    modules: ['installments', 'payments'],
  },
  {
    id: 'crm',
    label: 'المبيعات',
    icon: 'hub',
    modules: ['crm'],
  },
  {
    id: 'customers',
    label: 'العملاء',
    icon: 'group',
    modules: ['customers'],
  },
  {
    id: 'distributors',
    label: 'الموزعين',
    icon: 'local_shipping',
    modules: ['distributors'],
  },
  {
    id: 'review',
    label: 'المراجعة',
    icon: 'fact_check',
    modules: ['review'],
  },
  {
    id: 'problems',
    label: 'قسم المشاكل',
    icon: 'report_problem',
    modules: ['contracts'],
  },
  {
    id: 'hrm',
    label: 'الموارد البشرية',
    icon: 'groups',
    modules: ['hrm'],
  },
  {
    id: 'accounting',
    label: 'المحاسبة',
    icon: 'account_balance',
    modules: ['accounting', 'reports'],
  },
  {
    id: 'support',
    label: 'الدعم الفني',
    icon: 'support_agent',
    modules: ['support'],
  },
  {
    id: 'inventory',
    label: 'المخزون',
    icon: 'inventory_2',
    modules: ['inventory', 'stock', 'warehouses', 'accessories', 'accessory_packages'],
  },
  {
    id: 'system',
    label: 'الآعدادات',
    icon: 'admin_panel_settings',
    modules: ['users', 'roles', 'audit', 'settings', 'services', 'trash', 'faq', 'feedback'],
  },
]

const PERMISSIONS: PermissionDefinition[] = [
  { key: 'scope.organization', module: 'scope', category: 'other', label: 'رؤية بيانات الشركة كاملة', description: 'عرض بيانات جميع الإدارات والفروع في الشركة' },
  { key: 'scope.administration', module: 'scope', category: 'other', label: 'رؤية بيانات الإدارة', description: 'عرض بيانات إدارة المستخدم وفروعها فقط' },
  { key: 'scope.branches', module: 'scope', category: 'other', label: 'فروع متعددة', description: 'العمل بين فروع محددة داخل الإدارة مع اختيار فرع اليوم' },
  { key: 'scope.branch', module: 'scope', category: 'other', label: 'رؤية بيانات الفرع', description: 'عرض بيانات فرع المستخدم فقط' },
  { key: 'dashboard.view', module: 'dashboard', category: 'view', label: 'عرض لوحة التحكم', description: 'الوصول إلى لوحة التحكم الرئيسية وملخص المؤشرات' },
  { key: 'branches.manage', module: 'branches', category: 'other', label: 'إدارة الفروع', description: 'إنشاء وتعديل وإدارة فروع الإدارات' },
  { key: 'warehouses.manage', module: 'warehouses', category: 'other', label: 'إدارة المخازن', description: 'إنشاء وتعديل مخازن الفروع' },
  { key: 'inventory.manage', module: 'inventory', category: 'other', label: 'إدارة المخزون', description: 'عرض وإدارة مخزون أجهزة GPS' },
  { key: 'device_movements.manage', module: 'inventory', category: 'other', label: 'حركات الأجهزة', description: 'إرسال واستلام وتأكيد حركات الأجهزة بين المخازن' },
  { key: 'device_movements.transfer_quantity', module: 'inventory', category: 'other', label: 'نقل كمية من مخزون الفرع', description: 'إنشاء حركة بعدد أجهزة من المخزون دون تحديد السيريال' },
  { key: 'stock.transfer', module: 'stock', category: 'other', label: 'تحويل المخزون', description: 'إنشاء واعتماد تحويلات المخزون بين الفروع' },
  { key: 'customers.manage', module: 'customers', category: 'other', label: 'إدارة العملاء', description: 'إنشاء وتعديل بيانات العملاء والضامنين' },
  { key: 'customers.view', module: 'customers', category: 'view', label: 'عرض العملاء', description: 'استعراض قائمة العملاء وملفاتهم' },
  { key: 'customers.add', module: 'customers', category: 'add', label: 'إضافة عميل', description: 'إنشاء عميل جديد' },
  { key: 'customers.edit', module: 'customers', category: 'edit', label: 'تعديل عميل', description: 'تعديل بيانات العميل والضامنين' },
  { key: 'customers.delete', module: 'customers', category: 'delete', label: 'حذف عميل', description: 'حذف سجل العميل' },
  { key: 'distributors.view', module: 'distributors', category: 'view', label: 'عرض الموزعين', description: 'استعراض قائمة الموزعين' },
  { key: 'distributors.add', module: 'distributors', category: 'add', label: 'إضافة موزع', description: 'إنشاء موزع جديد' },
  { key: 'distributors.edit', module: 'distributors', category: 'edit', label: 'تعديل موزع', description: 'تعديل بيانات الموزع' },
  { key: 'distributors.delete', module: 'distributors', category: 'delete', label: 'حذف موزع', description: 'حذف سجل الموزع' },
  { key: 'promotions.view', module: 'promotions', category: 'view', label: 'عرض العروض', description: 'استعراض العروض الترويجية' },
  { key: 'promotions.add', module: 'promotions', category: 'add', label: 'إضافة عرض', description: 'إنشاء عرض ترويجي جديد' },
  { key: 'promotions.edit', module: 'promotions', category: 'edit', label: 'تعديل عرض', description: 'تعديل العرض الترويجي' },
  { key: 'promotions.delete', module: 'promotions', category: 'delete', label: 'حذف عرض', description: 'حذف العرض الترويجي' },
  { key: 'services.view', module: 'services', category: 'view', label: 'عرض الخدمات', description: 'استعراض قائمة الخدمات' },
  { key: 'services.add', module: 'services', category: 'add', label: 'إضافة خدمة', description: 'إنشاء خدمة جديدة' },
  { key: 'services.edit', module: 'services', category: 'edit', label: 'تعديل خدمة', description: 'تعديل بيانات الخدمة' },
  { key: 'services.delete', module: 'services', category: 'delete', label: 'حذف خدمة', description: 'حذف الخدمة' },
  { key: 'accessories.view', module: 'accessories', category: 'view', label: 'عرض الإكسسوارات', description: 'استعراض كتالوج الإكسسوارات' },
  { key: 'accessories.add', module: 'accessories', category: 'add', label: 'إضافة إكسسوار', description: 'إضافة منتج إكسسوار' },
  { key: 'accessories.edit', module: 'accessories', category: 'edit', label: 'تعديل إكسسوار', description: 'تعديل بيانات الإكسسوار' },
  { key: 'accessories.delete', module: 'accessories', category: 'delete', label: 'حذف إكسسوار', description: 'حذف الإكسسوار' },
  { key: 'accessory_packages.view', module: 'accessory_packages', category: 'view', label: 'عرض الباكدجات', description: 'استعراض باكدجات الإكسسوارات' },
  { key: 'accessory_packages.add', module: 'accessory_packages', category: 'add', label: 'إضافة باكدج', description: 'إنشاء باكدج إكسسوارات' },
  { key: 'accessory_packages.edit', module: 'accessory_packages', category: 'edit', label: 'تعديل باكدج', description: 'تعديل باكدج الإكسسوارات' },
  { key: 'accessory_packages.delete', module: 'accessory_packages', category: 'delete', label: 'حذف باكدج', description: 'حذف باكدج الإكسسوارات' },
  { key: 'sales.pos.new', module: 'sales', category: 'add', label: 'تعاقد جديد', description: 'تنفيذ تعاقد GPS جديد من نقطة البيع' },
  { key: 'sales.pos.services', module: 'sales', category: 'add', label: 'تعاقد خدمات', description: 'تنفيذ تعاقد خدمات من نقطة البيع' },
  { key: 'sales.pos.accessories', module: 'sales', category: 'add', label: 'بيع إكسسوارات', description: 'بيع الإكسسوارات من قسم التعاقدات' },
  { key: 'sales.pos.catalog', module: 'sales', category: 'view', label: 'دليل الأسعار', description: 'استعراض دليل أسعار التعاقدات' },
  { key: 'sales.invoices.view', module: 'sales', category: 'view', label: 'عرض الفواتير', description: 'استعراض فواتير المبيعات وتفاصيلها' },
  { key: 'sales.invoices.edit_before_review', module: 'sales', category: 'edit', label: 'تعديل العقد قبل المراجعة', description: 'تعديل بيانات التعاقد والأجهزة والأقساط قبل اعتماد المراجعة' },
  { key: 'sales.daily_mission', module: 'sales', category: 'view', label: 'مهمة اليوم', description: 'عرض بطاقات مهمة اليوم لموظف المبيعات' },
  { key: 'review.view_subscription_renewals', module: 'sales', category: 'view', label: 'تجديد الاشتراكات', description: 'استعراض العملاء الذين يحتاجون تجديد اشتراكهم السنوي' },
  { key: 'expenses.submit', module: 'sales', category: 'add', label: 'طلب مصروف', description: 'إنشاء طلبات مصروفات تشغيل أو نثرية أو مديونية موظف' },
  { key: 'review.view_queue', module: 'review', category: 'view', label: 'عرض قائمة المراجعة', description: 'استعراض التعاقدات بانتظار المراجعة' },
  { key: 'review.view_contracts', module: 'review', category: 'view', label: 'عرض كل التعاقدات', description: 'استعراض جميع التعاقدات وحالاتها' },
  { key: 'review.view_detail', module: 'review', category: 'view', label: 'عرض تفاصيل المراجعة', description: 'فتح تفاصيل التعاقد لمراجعته' },
  { key: 'review.edit_after_review', module: 'review', category: 'edit', label: 'تعديل العقد بعد المراجعة', description: 'تعديل بيانات التعاقد المعتمد والأجهزة والأقساط بعد المراجعة' },
  { key: 'review.approve', module: 'review', category: 'other', label: 'اعتماد التعاقدات', description: 'الموافقة على التعاقدات بعد المراجعة' },
  { key: 'review.reject', module: 'review', category: 'other', label: 'رفض التعاقدات', description: 'رفض التعاقدات مع تسجيل سبب الرفض' },
  { key: 'review.print', module: 'review', category: 'other', label: 'طباعة العقد', description: 'طباعة نسخة العقد المعتمد' },
  { key: 'review.manage_evaluation_questions', module: 'review', category: 'edit', label: 'إدارة أسئلة التقييم', description: 'إضافة وتعديل أسئلة تقييم العملاء بعد الخدمة' },
  { key: 'review.view_evaluation_queue', module: 'review', category: 'view', label: 'عرض قائمة تقييم العملاء', description: 'استعراض العملاء الذين يحتاجون تقييم بعد التركيب' },
  { key: 'review.record_evaluation', module: 'review', category: 'other', label: 'تسجيل تقييم العميل', description: 'تسجيل إجابات العميل بعد الاتصال به' },
  { key: 'review.view_collections', module: 'review', category: 'view', label: 'عرض مراجعة التحصيلات', description: 'استعراض العقود التي تم تحصيل أقساط عليها' },
  { key: 'review.confirm_collections', module: 'review', category: 'other', label: 'تأكيد مراجعة التحصيل', description: 'تأكيد صحة التحصيل دون صلاحية التحصيل نفسها' },
  { key: 'review.view_expenses', module: 'review', category: 'view', label: 'عرض مراجعة المصروفات', description: 'استعراض طلبات المصروفات بانتظار الاعتماد' },
  { key: 'review.approve_expenses', module: 'review', category: 'other', label: 'اعتماد المصروفات', description: 'الموافقة على أو رفض طلبات المصروفات' },
  { key: 'installments.collect', module: 'installments', category: 'other', label: 'تحصيل الأقساط', description: 'تسجيل تحصيل الأقساط من العملاء' },
  { key: 'installments.view', module: 'installments', category: 'view', label: 'عرض الأقساط', description: 'استعراض جداول الأقساط والمتأخرات' },
  { key: 'installments.reconcile', module: 'installments', category: 'other', label: 'تصالح الأقساط', description: 'فتح وإغلاق تصالح الأقساط المتأخرة' },
  { key: 'external_collections.collect', module: 'installments', category: 'other', label: 'التحصيلات الخارجية', description: 'تحصيل الأقساط عبر التحويل لمركز الاتصال' },
  { key: 'collection_accounts.manage', module: 'installments', category: 'other', label: 'حسابات التحويل', description: 'إدارة حسابات التحصيل الخارجي لكل رقم' },
  { key: 'collection_accounts.view', module: 'installments', category: 'view', label: 'عرض حسابات التحويل', description: 'استعراض حسابات التحصيل الخارجي' },
  { key: 'collection_accounts.add', module: 'installments', category: 'add', label: 'إضافة حساب تحويل', description: 'إنشاء حساب تحصيل خارجي' },
  { key: 'collection_accounts.edit', module: 'installments', category: 'edit', label: 'تعديل حساب تحويل', description: 'تعديل حساب التحصيل الخارجي' },
  { key: 'collection_accounts.delete', module: 'installments', category: 'delete', label: 'حذف حساب تحويل', description: 'حذف حساب التحصيل الخارجي' },
  { key: 'payments.view', module: 'payments', category: 'view', label: 'عرض المدفوعات', description: 'استعراض سجل مدفوعات العملاء' },
  { key: 'payments.refund', module: 'payments', category: 'other', label: 'استرداد المدفوعات (طوارئ)', description: 'استرداد مباشر — للمسؤول فقط' },
  { key: 'contract_cases.manage', module: 'contracts', category: 'other', label: 'إدارة مشاكل العقد', description: 'تحويل العقد للمشاكل: دعم فني، استرجاع، استبدال' },
  { key: 'contract_cases.disburse', module: 'contracts', category: 'other', label: 'أوامر دفع الاسترجاع', description: 'إنشاء أمر دفع للعميل ضمن مسار استرجاع العقد' },
  { key: 'support.view_assigned_tasks', module: 'support', category: 'view', label: 'عرض مهامي', description: 'استعراض مهام التركيب والدعم المسندة للموظف' },
  { key: 'support.update_assigned_tasks', module: 'support', category: 'edit', label: 'تحديث مهامي', description: 'تغيير حالة المهام المسندة (قيد التنفيذ، مكتمل، …)' },
  { key: 'support.view_all_tasks', module: 'support', category: 'view', label: 'عرض كل المهام', description: 'استعراض جميع مهام الدعم الفني في النظام' },
  { key: 'support.assign_tasks', module: 'support', category: 'other', label: 'إسناد وإنشاء المهام', description: 'إنشاء مهام جديدة وإسنادها لفنيي الدعم' },
  { key: 'users.manage', module: 'users', category: 'other', label: 'إدارة المستخدمين', description: 'إنشاء وتعديل حسابات الموظفين وربطهم بالفروع' },
  { key: 'roles.manage', module: 'roles', category: 'other', label: 'إدارة الأدوار', description: 'تعريف الأدوار وربط الصلاحيات بها' },
  { key: 'audit.view', module: 'audit', category: 'view', label: 'عرض سجل التدقيق', description: 'استعراض سجل العمليات والتغييرات الإدارية' },
  { key: 'settings.manage', module: 'settings', category: 'other', label: 'إدارة الإعدادات', description: 'تعديل إعدادات النظام والمؤسسة والخدمات ونماذج العقود' },
  { key: 'trash.view', module: 'trash', category: 'view', label: 'عرض سلة المهملات', description: 'استعراض السجلات المحذوفة' },
  { key: 'trash.restore', module: 'trash', category: 'other', label: 'استعادة من المهملات', description: 'استرجاع السجلات المحذوفة' },
  { key: 'trash.force_delete', module: 'trash', category: 'delete', label: 'حذف نهائي', description: 'حذف السجلات نهائياً من المهملات' },
  { key: 'faq.manage', module: 'faq', category: 'other', label: 'إدارة الأسئلة الشائعة', description: 'إنشاء وتعديل أسئلة المساعدة' },
  { key: 'feedback.view', module: 'feedback', category: 'view', label: 'عرض الملاحظات', description: 'استعراض ملاحظات المستخدمين' },
  { key: 'reports.financial', module: 'reports', category: 'view', label: 'التقارير المالية', description: 'عرض التقارير المالية والتحليلات' },
  { key: 'crm.access_all_leads', module: 'crm', category: 'view', label: 'عرض كل العملاء المحتملين', description: 'الوصول إلى جميع العملاء المحتملين في النظام' },
  { key: 'crm.access_own_leads', module: 'crm', category: 'view', label: 'عرض عملائي المحتملين', description: 'الوصول إلى العملاء المحتملين المسندين للمستخدم فقط' },
  { key: 'crm.access_all_schedule', module: 'crm', category: 'view', label: 'عرض كل المتابعات', description: 'استعراض جدول المتابعات لجميع المستخدمين' },
  { key: 'crm.access_own_schedule', module: 'crm', category: 'view', label: 'عرض متابعاتي', description: 'استعراض المتابعات المسندة للمستخدم فقط' },
  { key: 'crm.access_all_campaigns', module: 'crm', category: 'view', label: 'عرض كل الحملات', description: 'استعراض حملات التسويق لجميع المستخدمين' },
  { key: 'crm.access_own_campaigns', module: 'crm', category: 'view', label: 'عرض حملاتي', description: 'استعراض الحملات المسندة للمستخدم فقط' },
  { key: 'crm.access_contact_login', module: 'crm', category: 'other', label: 'بوابة العملاء', description: 'إدارة دخول العملاء إلى بوابة CRM' },
  { key: 'crm.access_sources', module: 'crm', category: 'other', label: 'مصادر العملاء', description: 'إدارة مصادر العملاء المحتملين' },
  { key: 'crm.access_life_stage', module: 'crm', category: 'other', label: 'مراحل العميل', description: 'إدارة مراحل دورة حياة العميل' },
  { key: 'crm.access_proposal', module: 'crm', category: 'other', label: 'العروض', description: 'إنشاء وإدارة عروض الأسعار للعملاء' },
  { key: 'crm.view_all_call_log', module: 'crm', category: 'view', label: 'عرض كل سجل المكالمات', description: 'استعراض سجل المكالمات لجميع المستخدمين' },
  { key: 'crm.view_own_call_log', module: 'crm', category: 'view', label: 'عرض مكالماتي', description: 'استعراض سجل المكالمات الخاص بالمستخدم' },
  { key: 'crm.access_b2b_marketplace', module: 'crm', category: 'other', label: 'التكاملات', description: 'الوصول إلى تكاملات B2B والسوق' },
  { key: 'crm.leads.manage', module: 'crm', category: 'other', label: 'إدارة العملاء المحتملين', description: 'إنشاء وتعديل العملاء المحتملين ومراحلهم' },
  { key: 'crm.activities.manage', module: 'crm', category: 'other', label: 'إدارة الأنشطة', description: 'تسجيل ومتابعة أنشطة CRM' },
  { key: 'hrm.leave.manage', module: 'hrm', category: 'other', label: 'إدارة الإجازات', description: 'تقديم وإدارة طلبات الإجازة' },
  { key: 'hrm.leave.approve', module: 'hrm', category: 'other', label: 'اعتماد الإجازات', description: 'الموافقة على طلبات الإجازة أو رفضها' },
  { key: 'hrm.attendance.manage', module: 'hrm', category: 'other', label: 'إدارة الحضور', description: 'تسجيل ومتابعة حضور وانصراف الموظفين' },
  { key: 'hrm.payroll.manage', module: 'hrm', category: 'other', label: 'إدارة الرواتب', description: 'إعداد وصرف مسيرات الرواتب' },
  { key: 'hrm.shift.manage', module: 'hrm', category: 'other', label: 'إدارة الورديات', description: 'تعريف الورديات وربطها بالموظفين' },
  { key: 'hrm.holiday.manage', module: 'hrm', category: 'other', label: 'إدارة العطلات', description: 'تعريف العطلات الرسمية في التقويم' },
  { key: 'hrm.allowance.manage', module: 'hrm', category: 'other', label: 'إدارة البدلات', description: 'تعريف وإدارة بدلات الموظفين' },
  { key: 'hrm.sales_target.manage', module: 'hrm', category: 'other', label: 'أهداف المبيعات', description: 'تحديد ومتابعة أهداف مبيعات الموظفين' },
  { key: 'hr.employees.manage', module: 'hrm', category: 'other', label: 'إدارة الموظفين', description: 'إنشاء وتعديل بيانات الموظفين وربطهم بالفروع' },
  { key: 'hr.attendance.manage', module: 'hrm', category: 'other', label: 'سجلات الحضور', description: 'تسجيل ومتابعة حضور وانصراف الموظفين على مستوى HR' },
  { key: 'accounting.access_accounting_module', module: 'accounting', category: 'view', label: 'الوصول للمحاسبة', description: 'الدخول إلى وحدة المحاسبة' },
  { key: 'accounting.manage_accounts', module: 'accounting', category: 'other', label: 'دليل الحسابات', description: 'إنشاء وتعديل حسابات دليل الحسابات' },
  { key: 'accounting.view_journal', module: 'accounting', category: 'view', label: 'عرض قيود اليومية', description: 'استعراض قيود اليومية المحاسبية' },
  { key: 'accounting.add_journal', module: 'accounting', category: 'add', label: 'إضافة قيد يومية', description: 'إنشاء قيود يومية جديدة' },
  { key: 'accounting.edit_journal', module: 'accounting', category: 'edit', label: 'تعديل قيد يومية', description: 'تعديل قيود اليومية المسجلة' },
  { key: 'accounting.delete_journal', module: 'accounting', category: 'delete', label: 'حذف قيد يومية', description: 'حذف قيود اليومية' },
  { key: 'accounting.map_transactions', module: 'accounting', category: 'other', label: 'ربط المبيعات', description: 'ربط فواتير المبيعات بالحسابات المحاسبية' },
  { key: 'accounting.view_transfer', module: 'accounting', category: 'view', label: 'عرض التحويلات', description: 'استعراض التحويلات بين الحسابات' },
  { key: 'accounting.add_transfer', module: 'accounting', category: 'add', label: 'إضافة تحويل', description: 'إنشاء تحويلات بين الحسابات' },
  { key: 'accounting.edit_transfer', module: 'accounting', category: 'edit', label: 'تعديل تحويل', description: 'تعديل التحويلات المحاسبية' },
  { key: 'accounting.delete_transfer', module: 'accounting', category: 'delete', label: 'حذف تحويل', description: 'حذف التحويلات المحاسبية' },
  { key: 'accounting.manage_budget', module: 'accounting', category: 'other', label: 'إدارة الميزانيات', description: 'تعريف ومتابعة الميزانيات' },
  { key: 'accounting.view_reports', module: 'accounting', category: 'view', label: 'تقارير المحاسبة', description: 'عرض ميزان المراجعة والقوائم المالية' },
]

/** Legacy umbrella key: kept in the API/DB as an alias, hidden from the admin UI. */
const HIDDEN_PERMISSION_KEYS = new Set(['sales.pos'])

const catalogByKey = new Map(PERMISSIONS.map((p) => [p.key, p]))

export function inferCategory(key: string): PermissionCategory {
  const suffix = key.split('.').slice(1).join('.')
  if (suffix.startsWith('view') || suffix === 'view') return 'view'
  if (suffix.startsWith('add')) return 'add'
  if (suffix.startsWith('edit')) return 'edit'
  if (suffix.startsWith('delete')) return 'delete'
  return 'other'
}

export function inferModule(key: string): string {
  const prefix = key.split('.')[0]
  if (prefix === 'hr') return 'hrm'
  return prefix
}

export function getPermissionDefinition(key: string): PermissionDefinition {
  const existing = catalogByKey.get(key)
  if (existing) return existing

  const module = inferModule(key)
  return {
    key,
    module,
    category: inferCategory(key),
    label: key.replace(/\./g, ' · '),
    description: key,
  }
}

export function getAllPermissions(apiKeys?: string[]): PermissionDefinition[] {
  const keys = apiKeys?.length
    ? [...new Set([...PERMISSIONS.map((p) => p.key), ...apiKeys])]
    : PERMISSIONS.map((p) => p.key)

  return keys.filter((key) => !HIDDEN_PERMISSION_KEYS.has(key)).map(getPermissionDefinition)
}

export interface ModuleGroup {
  module: string
  label: string
  permissions: PermissionDefinition[]
  selectedCount: number
  totalCount: number
}

export interface PermissionSection {
  id: string
  label: string
  icon: string
  modules: ModuleGroup[]
  selectedCount: number
  totalCount: number
}

function buildModuleGroups(
  permissions: PermissionDefinition[],
  selected: string[],
): ModuleGroup[] {
  const byModule = new Map<string, PermissionDefinition[]>()

  for (const perm of permissions) {
    const list = byModule.get(perm.module) ?? []
    list.push(perm)
    byModule.set(perm.module, list)
  }

  const moduleOrder = PERMISSION_SECTIONS.flatMap((section) => section.modules)
  const groups: ModuleGroup[] = []

  for (const module of moduleOrder) {
    const perms = byModule.get(module)
    if (!perms?.length) continue
    groups.push({
      module,
      label: MODULE_LABELS[module] ?? module,
      permissions: perms,
      selectedCount: perms.filter((p) => selected.includes(p.key)).length,
      totalCount: perms.length,
    })
    byModule.delete(module)
  }

  for (const [module, perms] of byModule) {
    groups.push({
      module,
      label: MODULE_LABELS[module] ?? module,
      permissions: perms,
      selectedCount: perms.filter((p) => selected.includes(p.key)).length,
      totalCount: perms.length,
    })
  }

  return groups
}

export function groupPermissionsByModule(
  permissions: PermissionDefinition[],
  selected: string[],
): ModuleGroup[] {
  return buildModuleGroups(permissions, selected)
}

export function groupPermissionsBySection(
  permissions: PermissionDefinition[],
  selected: string[],
): PermissionSection[] {
  const moduleGroups = buildModuleGroups(permissions, selected)
  const byModule = new Map(moduleGroups.map((group) => [group.module, group]))
  const sections: PermissionSection[] = []

  for (const section of PERMISSION_SECTIONS) {
    const modules = section.modules
      .map((module) => byModule.get(module))
      .filter((group): group is ModuleGroup => Boolean(group))

    if (modules.length === 0) continue

    sections.push({
      id: section.id,
      label: section.label,
      icon: section.icon,
      modules,
      selectedCount: modules.reduce((sum, mod) => sum + mod.selectedCount, 0),
      totalCount: modules.reduce((sum, mod) => sum + mod.totalCount, 0),
    })

    for (const mod of modules) {
      byModule.delete(mod.module)
    }
  }

  if (byModule.size > 0) {
    const orphanModules = [...byModule.values()]
    sections.push({
      id: 'other',
      label: 'أخرى',
      icon: 'extension',
      modules: orphanModules,
      selectedCount: orphanModules.reduce((sum, mod) => sum + mod.selectedCount, 0),
      totalCount: orphanModules.reduce((sum, mod) => sum + mod.totalCount, 0),
    })
  }

  return sections
}

export function groupPermissionsByCategory(
  permissions: PermissionDefinition[],
): Record<PermissionCategory, PermissionDefinition[]> {
  const groups: Record<PermissionCategory, PermissionDefinition[]> = {
    view: [],
    add: [],
    edit: [],
    delete: [],
    other: [],
  }

  for (const perm of permissions) {
    groups[perm.category].push(perm)
  }

  return groups
}

export function searchPermissions(
  permissions: PermissionDefinition[],
  query: string,
): PermissionDefinition[] {
  const q = query.trim().toLowerCase()
  if (!q) return permissions

  return permissions.filter(
    (p) =>
      p.label.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.key.toLowerCase().includes(q),
  )
}

export const CATEGORY_ORDER: PermissionCategory[] = ['view', 'add', 'edit', 'delete', 'other']
