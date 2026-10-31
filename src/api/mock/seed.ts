import {
  DEVICE_MOVEMENTS_MANAGE_REPLACEMENTS,
  getAllPermissions,
  INVENTORY_MANAGE_REPLACEMENTS,
} from '../../modules/admin/lib/permissionCatalog'
import { buildManagerPermissionKeys } from '../../lib/roleCatalog'
import type {
  AccountingAccount,
  AccountingAccTransMapping,
  AccountingBudget,
  AccountingTransactionLine,
  AuthUser,
  Branch,
  BranchAccountingMap,
  CrmCampaign,
  CrmMarketplace,
  CrmProposal,
  CrmProposalTemplate,
  CrmSchedule,
  CrmSettings,
  ActivityLogEntry,
  AdminRole,
  OrganizationProfile,
  GeneralSettings,
  MessagingSettings,
  CustomerMessageLogEntry,
  SalesSettings,
  SecuritySettings,
  HrmSettings,
  Customer,
  DailyBranchReport,
  DemoRole,
  Department,
  Distributor,
  Service,
  Section,
  Employee,
  HrmAllowance,
  HrmAttendance,
  HrmHoliday,
  HrmJob,
  HrmLeave,
  HrmLeaveType,
  HrmPayrollGroup,
  HrmPayrollRecord,
  HrmShift,
  HrmUserShift,
  HrmUserSalesTarget,
  DepartmentStock,
  AccessoryPackage,
  AccessoryWarehouseStock,
  GpsProduct,
  GpsStock,
  ProductModel,
  InstallmentItem,
  InstallmentPlan,
  Lead,
  PortalUser,
  ChatMessage,
  Promotion,
  PriceCatalogItem,
  CollectionFollowUpLog,
  SalesInvoice,
  SalesInvoiceLine,
  Warehouse,
} from '../types'

export interface DemoUser extends AuthUser {
  password: string
  demo_role: DemoRole
  workflow_section?: 'sales' | 'review' | 'collection'
}

export interface DemoPortalUser extends PortalUser {
  password: string
}

export interface MockPaymentTransaction {
  id: number
  transaction_number: string
  sales_invoice_id: number
  customer_id: number
  installment_item_id?: number | null
  amount: number
  status: string
  payment_source: string
  payment_method?: string
  paid_at: string
  user_id?: number | null
  collector_user_id?: number | null
  notes?: string | null
  refunded_amount?: number
}

export interface DemoPaymentVerificationLog {
  id: number
  sales_invoice_id: number
  action: 'link' | 'record'
  amount: number
  payment_transaction_id: number
  installment_item_id: number | null
  down_payment: boolean
  user_id: number | null
  user_name: string | null
  created_at: string
  note: string
}

export interface MockExpenseRequest {
  id: number
  reference_number: string
  expense_type: 'operating' | 'petty_cash' | 'distributor_payout' | 'employee_debt'
  amount: number
  status: 'pending' | 'approved' | 'rejected' | 'paid'
  branch_id: number
  notes?: string | null
  distributor_id?: number | null
  employee_id?: number | null
  created_by?: number
  creator?: { id: number; name: string }
  branch?: { id: number; name?: string; name_ar?: string | null }
  employee?: { id: number; name: string }
  distributor?: { id: number; name: string }
  rejection_notes?: string | null
  created_at?: string
  paid_at?: string | null
}

export interface DemoState {
  users: DemoUser[]
  portalUsers: DemoPortalUser[]
  leads: Lead[]
  crmSchedules: CrmSchedule[]
  crmCampaigns: CrmCampaign[]
  crmProposals: CrmProposal[]
  crmProposalTemplates: CrmProposalTemplate[]
  crmMarketplaces: CrmMarketplace[]
  crmSettings: CrmSettings
  hrmSettings: HrmSettings
  employees: Employee[]
  hrmLeaveTypes: HrmLeaveType[]
  hrmJobs: HrmJob[]
  hrmLeaves: HrmLeave[]
  hrmShifts: HrmShift[]
  hrmUserShifts: HrmUserShift[]
  hrmAttendance: HrmAttendance[]
  hrmHolidays: HrmHoliday[]
  hrmAllowances: (HrmAllowance & { employee_ids: number[] })[]
  hrmPayrollRecords: HrmPayrollRecord[]
  hrmPayrollGroups: (HrmPayrollGroup & { payroll_record_ids: number[] })[]
  hrmUserSalesTargets: HrmUserSalesTarget[]
  adminRoles: AdminRole[]
  adminActivityLogs: ActivityLogEntry[]
  organizationProfile: OrganizationProfile
  generalSettings: GeneralSettings
  salesSettings: SalesSettings
  securitySettings: SecuritySettings
  messagingSettings: MessagingSettings
  customerMessageLogs: CustomerMessageLogEntry[]
  departments: Department[]
  sections: Section[]
  branches: Branch[]
  warehouses: Warehouse[]
  gpsProduct: GpsProduct
  departmentStocks: DepartmentStock[]
  stocks: GpsStock[]
  accessories: ProductModel[]
  accessoryPackages: AccessoryPackage[]
  accessoryStocks: AccessoryWarehouseStock[]
  distributors: Distributor[]
  services: Service[]
  customers: Customer[]
  accountingAccounts: AccountingAccount[]
  journalEntries: AccountingAccTransMapping[]
  transfers: AccountingAccTransMapping[]
  budgets: AccountingBudget[]
  mappedInvoiceIds: number[]
  accountingSettings: { journal_entry_prefix: string; transfer_prefix: string }
  branchAccountingMaps: Record<number, BranchAccountingMap>
  invoices: SalesInvoice[]
  paymentTransactions: MockPaymentTransaction[]
  paymentVerificationLogs: DemoPaymentVerificationLog[]
  collectionFollowUpLogs: CollectionFollowUpLog[]
  expenseRequests: MockExpenseRequest[]
  distributorCommissionLedger?: Array<{
    id: number
    distributor_id: number
    type: 'credit' | 'debit'
    amount: number
    balance_after: number
    sales_invoice_id?: number
    payment_transaction_id?: number
    notes?: string
    created_at: string
  }>
  priceCatalogItems: PriceCatalogItem[]
  promotions: Promotion[]
  chatConversations: Array<{
    id: number
    type: string
    participant_ids: number[]
    last_read_at: Record<number, string | null>
  }>
  chatMessages: ChatMessage[]
  dailyBranchReports: DailyBranchReport[]
  stockReceipts?: Array<{
    id: number
    administration_id: number
    quantity: number
    received_by?: number | null
    created_at?: string
    administration?: Department
    receivedBy?: { id: number; name: string }
  }>
  stockTransfers?: Array<Record<string, unknown>>
  counters: {
    department: number
    section?: number
    branch: number
    warehouse: number
    invoice: number
    customer: number
    distributor: number
    service: number
    dailyBranchReport: number
    installmentItem: number
    payment: number
    paymentVerification?: number
    collectionFollowUp?: number
    commissionLedger?: number
    accountingMapping?: number
    accountingLine?: number
    accountingAccount?: number
    budget?: number
    journalEntry?: number
    transfer?: number
    lead?: number
    crmSchedule?: number
    crmCampaign?: number
    crmProposal?: number
    crmProposalTemplate?: number
    adminUser?: number
    adminRole?: number
    activityLog?: number
    employee?: number
    hrmLeaveType?: number
    hrmJob?: number
    hrmLeave?: number
    hrmShift?: number
    hrmUserShift?: number
    hrmAttendance?: number
    hrmHoliday?: number
    hrmAllowance?: number
    hrmPayroll?: number
    hrmPayrollGroup?: number
    user?: number
    stockReceipt?: number
    stockTransfer?: number
  }
}

function addDays(date: string, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function localDateOffset(days: number): string {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + days)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

function localDateTimeOffset(days: number, hour = 12): string {
  return `${localDateOffset(days)}T${String(hour).padStart(2, '0')}:00:00`
}

function buildInstallmentItems(
  invoiceId: number,
  planId: number,
  financed: number,
  count: number,
  firstDue: string,
  intervalDays: number,
  startItemId: number,
  paidFirst = 0,
): InstallmentItem[] {
  const base = Math.floor((financed / count) * 100) / 100
  const items: InstallmentItem[] = []
  let remainder = Math.round((financed - base * count) * 100) / 100

  for (let i = 0; i < count; i++) {
    const amount = i === count - 1 ? base + remainder : base
    const dueDate = addDays(firstDue, i * intervalDays)
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const isPast = dueDate < todayStr
    const paid = i < paidFirst ? amount : 0
    let status = 'pending'
    if (paid >= amount) status = 'paid'
    else if (paid > 0) status = 'partial'
    else if (isPast) status = 'overdue'

    items.push({
      id: startItemId + i,
      sales_invoice_id: invoiceId,
      installment_plan_id: planId,
      installment_number: i + 1,
      due_date: dueDate,
      amount,
      paid_amount: paid,
      status,
    })
  }
  return items
}

export function createSeedState(): DemoState {
  const departments: Department[] = [
    {
      id: 1,
      name: 'Cairo Region',
      name_ar: 'إدارة القاهرة',
      code: 'CAI',
      address: 'القاهرة، مصر',
      phone: '01011111111',
      is_active: true,
    },
    {
      id: 2,
      name: 'Delta Region',
      name_ar: 'إدارة الدلتا',
      code: 'DLT',
      address: 'طنطا، الغربية',
      phone: '01022222222',
      is_active: true,
    },
  ]

  const branches: Branch[] = [
    {
      id: 1,
      administration_id: 1,
      department_id: 1,
      name: 'Nasr City',
      name_ar: 'فرع مدينة نصر',
      code: 'NSR',
      address: 'مدينة نصر، القاهرة',
      phone: '01033333301',
      is_active: true,
    },
    {
      id: 2,
      administration_id: 1,
      department_id: 1,
      name: 'Maadi',
      name_ar: 'فرع المعادي',
      code: 'MAD',
      address: 'المعادي، القاهرة',
      phone: '01033333302',
      is_active: true,
    },
    {
      id: 3,
      administration_id: 2,
      department_id: 2,
      name: 'Tanta',
      name_ar: 'فرع طنطا',
      code: 'TNT',
      address: 'طنطا، الغربية',
      phone: '01033333303',
      is_active: true,
    },
  ]

  const sections: Section[] = [
    { id: 1, branch_id: 1, name: 'Sales', name_ar: 'المبيعات', code: 'SALES' },
    { id: 2, branch_id: 1, name: 'Human Resources', name_ar: 'الموارد البشرية', code: 'HR' },
    { id: 3, branch_id: 1, name: 'Collection', name_ar: 'التحصيل', code: 'COL' },
    { id: 4, branch_id: 1, name: 'Accounting', name_ar: 'المحاسبة', code: 'ACC' },
    { id: 5, branch_id: 1, name: 'CRM', name_ar: 'علاقات العملاء', code: 'CRM' },
    { id: 6, branch_id: 3, name: 'Sales', name_ar: 'المبيعات', code: 'SALES-DLT' },
  ]

  const warehouses: Warehouse[] = [
    { id: 1, branch_id: 1, name: 'Main Store', name_ar: 'مخزن مدينة نصر', code: 'NSR-W1', is_active: true, is_central: false },
    { id: 2, branch_id: 2, name: 'Maadi Store', name_ar: 'مخزن المعادي', code: 'MAD-W1', is_active: true, is_central: false },
    { id: 3, branch_id: 3, name: 'Tanta Store', name_ar: 'مخزن طنطا', code: 'TNT-W1', is_active: true, is_central: false },
    { id: 4, administration_id: 1, branch_id: null, name: 'الإدارة الرئيسية', name_ar: 'الإدارة الرئيسية', code: 'WH-HQ-1', is_active: true, is_central: true },
    { id: 5, administration_id: 2, branch_id: null, name: 'Delta Administration', name_ar: 'إدارة الدلتا', code: 'WH-HQ-2', is_active: true, is_central: true },
  ]

  const gpsProduct: GpsProduct = {
    id: 1,
    name: 'GPS',
    name_ar: 'GPS',
    brand: 'TrackPro',
    model_code: 'GPS-PRO',
    sell_price: 3500,
    cash_price: 3500,
    installment_price: 3800,
    cash_annual_price: 3500,
    cash_permanent_price: 4200,
    installment_annual_price: 3800,
    installment_permanent_price: 4500,
    annual_renewal_price: 875,
    external_cash_annual_price: 900,
    external_cash_permanent_price: 1500,
    external_installment_annual_price: 1000,
    external_installment_permanent_price: 1700,
    device_debt_price: 800,
    monthly_interest_amount: 250,
    min_stock_level: 5,
    cost_price: 2200,
  }

  const departmentStocks: DepartmentStock[] = [
    { department_id: 1, quantity: 100, pending: 15, distributed: 75 },
    { department_id: 2, quantity: 50, pending: 5, distributed: 25 },
  ]

  const stocks: GpsStock[] = [
    { id: 1, warehouse_id: 1, branch_id: 1, quantity: 45, reserved: 2, sold: 8 },
    { id: 2, warehouse_id: 2, branch_id: 2, quantity: 30, reserved: 0, sold: 5 },
    { id: 3, warehouse_id: 3, branch_id: 3, quantity: 25, reserved: 1, sold: 3 },
  ]

  const distributors: Distributor[] = [
    {
      id: 1,
      branch_id: 1,
      code: 'DIST-001',
      name: 'Nasr City Distribution',
      name_ar: 'موزع مدينة نصر',
      phone: '01011112222',
      address: 'مدينة نصر، القاهرة',
      type: 'center',
      status: 'active',
      agreed_amount: 500,
      commission_balance: 1500,
    },
    {
      id: 2,
      branch_id: 1,
      code: 'DIST-002',
      name: 'Maadi Distribution',
      name_ar: 'موزع المعادي',
      phone: '01033334455',
      address: 'المعادي، القاهرة',
      type: 'free',
      status: 'active',
      agreed_amount: 350,
      commission_balance: 0,
    },
    {
      id: 3,
      branch_id: 3,
      code: 'DIST-003',
      name: 'Tanta Distribution',
      name_ar: 'موزع طنطا',
      phone: '01055556666',
      address: 'طنطا، الغربية',
      type: 'center',
      status: 'active',
      agreed_amount: 600,
      commission_balance: 0,
    },
  ]

  const services: Service[] = [
    { id: 1, code: 'SRV-FK', name: 'رسوم فك', name_ar: 'رسوم فك', category: 'uninstall', default_price: 100, is_active: true },
    { id: 2, code: 'SRV-TRK', name: 'رسوم تركيب', name_ar: 'رسوم تركيب', category: 'installation', default_price: 500, is_active: true },
    { id: 3, code: 'SRV-SFT', name: 'رسوم سوفت وير', name_ar: 'رسوم سوفت وير', category: 'software', default_price: 200, is_active: true },
    { id: 4, code: 'SRV-SUB-Y', name: 'تجديد اشتراك سنة', name_ar: 'تجديد اشتراك سنة', category: 'subscription', default_price: 300, is_active: true },
    { id: 5, code: 'SRV-SUB-L', name: 'تجديد اشتراك مدى الحياة', name_ar: 'تجديد اشتراك مدى الحياة', category: 'subscription', default_price: 1500, is_active: true },
    { id: 6, code: 'SRV-MNT', name: 'رسوم صيانة', name_ar: 'رسوم صيانة', category: 'maintenance', default_price: 300, is_active: true },
    { id: 7, code: 'SRV-RST', name: 'رسوم رسيت', name_ar: 'رسوم رسيت', category: 'software', default_price: 150, is_active: true },
    { id: 8, code: 'SRV-USR', name: 'رسوم نقل يوزر', name_ar: 'رسوم نقل يوزر', category: 'transfer', default_price: 100, is_active: true },
    { id: 9, code: 'SRV-OWN', name: 'رسوم نقل ملكية', name_ar: 'رسوم نقل ملكية', category: 'ownership_transfer', default_price: 200, is_active: true },
    { id: 10, code: 'SRV-SIM', name: 'رسوم برمجة شريحة', name_ar: 'رسوم برمجة شريحة', category: 'programming', default_price: 150, is_active: true },
    { id: 11, code: 'SRV-SIT', name: 'رسوم نقل على الموقع', name_ar: 'رسوم نقل على الموقع', category: 'site_transfer', default_price: 250, is_active: true },
  ]

  const customers: Customer[] = [
    {
      id: 1,
      branch_id: 1,
      distributor_id: 1,
      sales_user_id: 2,
      name: 'أحمد محمود حسن',
      phone: '01012345678',
      phone_2: '01087654321',
      sim_number: '01099887766',
      username: 'ahmed_gps',
      device_serial: 'SN-2026-001',
      national_id: '29001011234567',
      address: 'مدينة نصر، القاهرة',
      city: 'القاهرة',
      status: 'active',
      credit_score: 85,
    },
    {
      id: 2,
      branch_id: 1,
      distributor_id: 2,
      sales_user_id: 2,
      name: 'سارة علي إبراهيم',
      phone: '01098765432',
      national_id: '29505051234567',
      address: 'المعادي، القاهرة',
      city: 'القاهرة',
      status: 'active',
      credit_score: 72,
      guarantors: [
        { id: 1, name: 'محمد إبراهيم', phone: '01122334455', relationship: 'زوج' },
      ],
    },
    {
      id: 3,
      branch_id: 3,
      distributor_id: 3,
      sales_user_id: 2,
      name: 'خالد عبد الرحمن',
      phone: '01234567890',
      national_id: '28808081234567',
      address: 'طنطا، الغربية',
      city: 'طنطا',
      status: 'active',
      credit_score: 90,
    },
    {
      id: 4,
      branch_id: 2,
      distributor_id: 2,
      sales_user_id: 2,
      name: 'يوسف فتحي منصور',
      phone: '01111110001',
      username: 'youssef_gps',
      device_serial: 'SN-COL-DUE-01',
      sim_number: '01111110011',
      national_id: '29101011234567',
      address: 'المعادي، القاهرة',
      city: 'القاهرة',
      status: 'active',
      credit_score: 78,
    },
    {
      id: 5,
      branch_id: 2,
      distributor_id: 2,
      sales_user_id: 2,
      name: 'ندى حسن كامل',
      phone: '01111110002',
      username: 'nada_gps',
      device_serial: 'SN-COL-UP-01',
      sim_number: '01111110012',
      national_id: '29202021234567',
      address: 'المعادي، القاهرة',
      city: 'القاهرة',
      status: 'active',
      credit_score: 81,
    },
    {
      id: 6,
      branch_id: 3,
      distributor_id: 3,
      sales_user_id: 2,
      name: 'هاني صلاح جابر',
      phone: '01111110003',
      username: 'hany_gps',
      device_serial: 'SN-COL-OV-01',
      sim_number: '01111110013',
      national_id: '28503031234567',
      address: 'طنطا، الغربية',
      city: 'طنطا',
      status: 'active',
      credit_score: 64,
    },
    {
      id: 7,
      branch_id: 1,
      distributor_id: 1,
      sales_user_id: 2,
      name: 'ليلى عادل فهمي',
      phone: '01111110004',
      username: 'layla_gps',
      device_serial: 'SN-COL-RC-01',
      sim_number: '01111110014',
      national_id: '29404041234567',
      address: 'مدينة نصر، القاهرة',
      city: 'القاهرة',
      status: 'active',
      credit_score: 70,
    },
    {
      id: 8,
      branch_id: 1,
      distributor_id: 1,
      sales_user_id: 2,
      name: 'عمر شريف نبيل',
      phone: '01111110005',
      username: 'omar_gps',
      device_serial: 'SN-COL-RSP-01',
      sim_number: '01111110015',
      national_id: '28905051234567',
      address: 'مدينة نصر، القاهرة',
      city: 'القاهرة',
      status: 'active',
      credit_score: 76,
    },
    {
      id: 9,
      branch_id: 3,
      distributor_id: 3,
      sales_user_id: 2,
      name: 'منى فؤاد سليم',
      phone: '01111110006',
      username: 'mona_gps',
      device_serial: 'SN-COL-PRT-01',
      sim_number: '01111110016',
      national_id: '29306061234567',
      address: 'طنطا، الغربية',
      city: 'طنطا',
      status: 'active',
      credit_score: 83,
    },
  ]

  const plan1Items = buildInstallmentItems(2, 1, 12000, 6, '2026-01-15', 30, 1, 2)
  const plan1Paid = plan1Items.reduce((s, i) => s + Number(i.paid_amount), 0)
  const dueToday = localDateOffset(0)
  const upcomingStart = localDateOffset(28)
  const overdueStart = localDateOffset(-40)
  const reminderTomorrow = localDateTimeOffset(1, 11)

  const planDueItems = buildInstallmentItems(11, 11, 8000, 4, dueToday, 30, 21)
  const planUpcomingItems = buildInstallmentItems(12, 12, 9000, 4, upcomingStart, 30, 25)
  const planOverdueFollowItems = buildInstallmentItems(13, 13, 10000, 4, overdueStart, 30, 29)
  planOverdueFollowItems[0].collection_status = 'postponed'
  planOverdueFollowItems[0].collection_reminder_at = reminderTomorrow
  planOverdueFollowItems[0].collection_notes = 'عميل طلب تأجيل لبعد بكرة'

  const planReconcileItems = buildInstallmentItems(14, 14, 7200, 4, localDateOffset(-25), 30, 33)
  planReconcileItems[0].collection_status = 'no_answer'

  const planRespondedItems = buildInstallmentItems(15, 15, 6400, 4, localDateOffset(-18), 30, 37)
  planRespondedItems[0].collection_status = 'responded'
  planRespondedItems[0].collection_notes = 'رد على المكالمة وهيحوّل النهاردة'

  const planPartialItems = buildInstallmentItems(16, 16, 6000, 4, localDateOffset(-10), 30, 41)
  planPartialItems[0].paid_amount = 750
  planPartialItems[0].status = 'partial'
  planPartialItems[0].collection_status = 'no_contact'

  const planNewDateItems = buildInstallmentItems(17, 17, 4800, 3, upcomingStart, 30, 45)
  planNewDateItems[0].collection_status = 'new_payment_date'
  planNewDateItems[0].collection_reminder_at = localDateTimeOffset(5, 16)
  planNewDateItems[0].collection_notes = 'ميعاد دفع جديد بعد خمسة أيام'

  const invoices: SalesInvoice[] = [
    {
      id: 1,
      invoice_number: 'INV-2026-0001',
      invoice_date: '2026-05-20',
      branch_id: 1,
      warehouse_id: 1,
      customer_id: 1,
      distributor_id: 1,
      status: 'confirmed',
      payment_term: 'cash',
      payment_status: 'paid',
      total: 7000,
      paid_amount: 7000,
      balance_due: 0,
      lines: [
        {
          id: 1,
          product_id: 1,
          quantity: 2,
          unit_price: 3500,
          product_name_ar: gpsProduct.name_ar,
        },
      ],
      confirmed_at: '2026-05-20T10:00:00',
      created_by: 2,
    },
    {
      id: 2,
      invoice_number: 'INV-2026-0002',
      invoice_date: '2026-04-10',
      branch_id: 1,
      warehouse_id: 1,
      customer_id: 2,
      distributor_id: 2,
      status: 'confirmed',
      payment_term: 'installment',
      payment_status: 'partial',
      total: 17500,
      paid_amount: 5500 + plan1Paid,
      balance_due: 17500 - (5500 + plan1Paid),
      technician_name: 'محمود الفني',
      vehicle_info: 'تويota كورولا — أ ب ج 1234',
      subscription_renewal_date: '2027-04-10',
      lines: [
        {
          id: 2,
          product_id: 1,
          quantity: 5,
          unit_price: 3500,
          product_name_ar: gpsProduct.name_ar,
        },
      ],
      installment_plan: {
        id: 1,
        down_payment: 5500,
        installment_count: 6,
        interval_type: 'monthly',
        interval_days: 30,
        first_due_date: '2026-01-15',
        status: 'active',
        items: plan1Items,
      },
      confirmed_at: '2026-04-11T09:30:00',
      reviewed_by: 3,
      reviewed_at: '2026-04-11T09:30:00',
      review_status: 'approved',
      collection_review_status: 'pending',
      created_by: 2,
    },
    {
      id: 3,
      invoice_number: 'INV-2026-0003',
      invoice_date: '2026-06-05',
      branch_id: 1,
      warehouse_id: 1,
      customer_id: 1,
      distributor_id: 1,
      sales_user_id: 2,
      status: 'pending_review',
      payment_term: 'installment',
      payment_status: 'unpaid',
      total: 10500,
      paid_amount: 0,
      balance_due: 10500,
      lines: [
        {
          id: 3,
          product_id: 1,
          quantity: 3,
          unit_price: 3500,
          product_name_ar: gpsProduct.name_ar,
        },
      ],
      installment_plan: {
        id: 2,
        down_payment: 2500,
        installment_count: 4,
        interval_type: 'monthly',
        interval_days: 30,
        first_due_date: '2026-07-01',
        status: 'draft',
        items: [],
      },
      created_by: 2,
    },
    {
      id: 4,
      invoice_number: 'INV-2026-0004',
      invoice_date: '2026-06-01',
      branch_id: 3,
      warehouse_id: 3,
      customer_id: 3,
      distributor_id: 3,
      status: 'rejected',
      payment_term: 'installment',
      payment_status: 'unpaid',
      total: 7000,
      paid_amount: 0,
      balance_due: 7000,
      lines: [
        {
          id: 4,
          product_id: 1,
          quantity: 2,
          unit_price: 3500,
          product_name_ar: gpsProduct.name_ar,
        },
      ],
      rejection_reason: 'بيانات العميل غير مكتملة',
      created_by: 2,
    },
    {
      id: 5,
      invoice_number: 'INV-2026-0005',
      invoice_date: new Date().toISOString().slice(0, 10),
      branch_id: 3,
      warehouse_id: 3,
      customer_id: 3,
      distributor_id: 3,
      sales_user_id: 5,
      status: 'confirmed',
      payment_term: 'cash',
      payment_status: 'paid',
      total: 23200,
      paid_amount: 23200,
      balance_due: 0,
      technician_name: 'يوسف دعم فني',
      lines: [
        {
          id: 5,
          product_id: 1,
          quantity: 4,
          unit_price: 5800,
          product_name_ar: gpsProduct.name_ar,
        },
      ],
      confirmed_at: new Date().toISOString(),
      created_by: 5,
    },
    {
      id: 6,
      invoice_number: 'INV-2026-0006',
      invoice_date: new Date().toISOString().slice(0, 10),
      branch_id: 3,
      warehouse_id: 3,
      customer_id: 3,
      distributor_id: 3,
      sales_user_id: 5,
      status: 'confirmed',
      payment_term: 'cash',
      payment_status: 'paid',
      total: 32900,
      paid_amount: 32900,
      balance_due: 0,
      technician_name: 'محمود الفني',
      lines: [
        {
          id: 6,
          product_id: 1,
          quantity: 5,
          unit_price: 6580,
          product_name_ar: gpsProduct.name_ar,
        },
      ],
      confirmed_at: new Date(Date.now() - 3600_000).toISOString(),
      created_by: 5,
    },
    {
      id: 7,
      invoice_number: 'INV-2026-0007',
      invoice_date: (() => {
        const d = new Date()
        d.setDate(Math.max(1, d.getDate() - 5))
        return d.toISOString().slice(0, 10)
      })(),
      branch_id: 3,
      warehouse_id: 3,
      customer_id: 3,
      distributor_id: 3,
      sales_user_id: 5,
      status: 'confirmed',
      payment_term: 'cash',
      payment_status: 'paid',
      total: 17500,
      paid_amount: 17500,
      balance_due: 0,
      technician_name: 'يوسف دعم فني',
      lines: [
        {
          id: 7,
          product_id: 1,
          quantity: 5,
          unit_price: 3500,
          product_name_ar: gpsProduct.name_ar,
        },
      ],
      confirmed_at: (() => {
        const d = new Date()
        d.setDate(Math.max(1, d.getDate() - 5))
        return d.toISOString()
      })(),
      created_by: 5,
    },
    {
      id: 8,
      invoice_number: 'QA-OT-0001',
      invoice_date: '2026-06-15',
      branch_id: 1,
      warehouse_id: 1,
      customer_id: 1,
      distributor_id: 1,
      status: 'confirmed',
      payment_term: 'cash',
      payment_status: 'paid',
      contract_kind: 'ownership_transfer',
      source_sales_invoice_id: 2,
      total: 200,
      paid_amount: 200,
      balance_due: 0,
      technician_name: 'محمود الفني',
      vehicle_info: 'تويota كورولا — أ ب ج 1234',
      lines: [
        {
          id: 8,
          product_id: 1,
          service_id: 9,
          quantity: 1,
          unit_price: 200,
          line_total: 200,
          product_name_ar: 'رسوم نقل ملكية',
          serial_number: 'SN-QA-OT-001',
          sim_number: '01011223344',
          username: 'sara_gps',
        },
      ],
      confirmed_at: '2026-06-15T11:00:00',
      reviewed_by: 3,
      reviewed_at: '2026-06-15T11:00:00',
      review_status: 'approved',
      created_by: 2,
    },
    {
      id: 9,
      invoice_number: 'QA-SVC-0001',
      invoice_date: '2026-06-18',
      branch_id: 1,
      warehouse_id: 1,
      customer_id: 1,
      distributor_id: 1,
      status: 'confirmed',
      payment_term: 'cash',
      payment_status: 'paid',
      contract_kind: 'mixed',
      total: 300,
      paid_amount: 300,
      balance_due: 0,
      technician_name: 'يوسف دعم فني',
      lines: [
        {
          id: 9,
          service_id: 6,
          quantity: 1,
          unit_price: 300,
          line_total: 300,
          product_name_ar: 'رسوم صيانة',
          description: 'رسوم صيانة',
        },
      ],
      confirmed_at: '2026-06-18T12:00:00',
      reviewed_by: 3,
      reviewed_at: '2026-06-18T12:00:00',
      review_status: 'approved',
      created_by: 2,
    },
    {
      id: 11,
      invoice_number: 'INV-COL-DUE-0001',
      invoice_date: localDateOffset(-20),
      branch_id: 2,
      warehouse_id: 2,
      customer_id: 4,
      distributor_id: 2,
      status: 'confirmed',
      payment_term: 'installment',
      payment_status: 'partial',
      total: 10500,
      paid_amount: 2500,
      balance_due: 8000,
      collector_user_id: null,
      technician_name: 'محمود الفني',
      vehicle_info: 'هيونداي إلنترا — س ص ع 4455',
      lines: [
        {
          id: 21,
          product_id: 1,
          quantity: 3,
          unit_price: 3500,
          product_name_ar: gpsProduct.name_ar,
          serial_number: 'SN-COL-DUE-01',
          username: 'youssef_gps',
          sim_number: '01111110011',
        },
      ],
      installment_plan: {
        id: 11,
        down_payment: 2500,
        installment_count: 4,
        interval_type: 'monthly',
        interval_days: 30,
        first_due_date: dueToday,
        status: 'active',
        items: planDueItems,
      },
      confirmed_at: `${localDateOffset(-19)}T10:00:00`,
      reviewed_by: 3,
      review_status: 'approved',
      created_by: 2,
    },
    {
      id: 12,
      invoice_number: 'INV-COL-UP-0001',
      invoice_date: localDateOffset(-7),
      branch_id: 2,
      warehouse_id: 2,
      customer_id: 5,
      distributor_id: 2,
      status: 'confirmed',
      payment_term: 'installment',
      payment_status: 'partial',
      total: 11500,
      paid_amount: 2500,
      balance_due: 9000,
      collector_user_id: null,
      lines: [
        {
          id: 22,
          product_id: 1,
          quantity: 3,
          unit_price: 3833,
          product_name_ar: gpsProduct.name_ar,
          serial_number: 'SN-COL-UP-01',
          username: 'nada_gps',
          sim_number: '01111110012',
        },
      ],
      installment_plan: {
        id: 12,
        down_payment: 2500,
        installment_count: 4,
        interval_type: 'monthly',
        interval_days: 30,
        first_due_date: upcomingStart,
        status: 'active',
        items: planUpcomingItems,
      },
      confirmed_at: `${localDateOffset(-6)}T11:00:00`,
      reviewed_by: 3,
      review_status: 'approved',
      created_by: 2,
    },
    {
      id: 13,
      invoice_number: 'INV-COL-OV-0001',
      invoice_date: localDateOffset(-70),
      branch_id: 3,
      warehouse_id: 3,
      customer_id: 6,
      distributor_id: 3,
      status: 'confirmed',
      payment_term: 'installment',
      payment_status: 'partial',
      total: 12500,
      paid_amount: 2500,
      balance_due: 10000,
      collector_user_id: 4,
      collection_status: 'postponed',
      collection_reminder_at: reminderTomorrow,
      collection_notes: 'عميل طلب تأجيل لبعد بكرة',
      lines: [
        {
          id: 23,
          product_id: 1,
          quantity: 3,
          unit_price: 4166,
          product_name_ar: gpsProduct.name_ar,
          serial_number: 'SN-COL-OV-01',
          username: 'hany_gps',
          sim_number: '01111110013',
        },
      ],
      installment_plan: {
        id: 13,
        down_payment: 2500,
        installment_count: 4,
        interval_type: 'monthly',
        interval_days: 30,
        first_due_date: overdueStart,
        status: 'active',
        items: planOverdueFollowItems,
      },
      confirmed_at: `${localDateOffset(-69)}T09:00:00`,
      reviewed_by: 3,
      review_status: 'approved',
      created_by: 2,
    },
    {
      id: 14,
      invoice_number: 'INV-COL-RC-0001',
      invoice_date: localDateOffset(-50),
      branch_id: 1,
      warehouse_id: 1,
      customer_id: 7,
      distributor_id: 1,
      status: 'confirmed',
      payment_term: 'installment',
      payment_status: 'partial',
      total: 9700,
      paid_amount: 2500,
      balance_due: 7200,
      collector_user_id: 4,
      collection_status: 'no_answer',
      lines: [
        {
          id: 24,
          product_id: 1,
          quantity: 2,
          unit_price: 4850,
          product_name_ar: gpsProduct.name_ar,
          serial_number: 'SN-COL-RC-01',
          username: 'layla_gps',
          sim_number: '01111110014',
        },
      ],
      installment_plan: {
        id: 14,
        down_payment: 2500,
        installment_count: 4,
        interval_type: 'monthly',
        interval_days: 30,
        first_due_date: localDateOffset(-25),
        status: 'active',
        items: planReconcileItems,
      },
      confirmed_at: `${localDateOffset(-49)}T14:00:00`,
      reviewed_by: 3,
      review_status: 'approved',
      created_by: 2,
    },
    {
      id: 15,
      invoice_number: 'INV-COL-RSP-0001',
      invoice_date: localDateOffset(-40),
      branch_id: 1,
      warehouse_id: 1,
      customer_id: 8,
      distributor_id: 1,
      status: 'confirmed',
      payment_term: 'installment',
      payment_status: 'partial',
      total: 8900,
      paid_amount: 2500,
      balance_due: 6400,
      collector_user_id: null,
      collection_status: 'responded',
      collection_notes: 'رد على المكالمة وهيحوّل النهاردة',
      lines: [
        {
          id: 25,
          product_id: 1,
          quantity: 2,
          unit_price: 4450,
          product_name_ar: gpsProduct.name_ar,
          serial_number: 'SN-COL-RSP-01',
          username: 'omar_gps',
          sim_number: '01111110015',
        },
      ],
      installment_plan: {
        id: 15,
        down_payment: 2500,
        installment_count: 4,
        interval_type: 'monthly',
        interval_days: 30,
        first_due_date: localDateOffset(-18),
        status: 'active',
        items: planRespondedItems,
      },
      confirmed_at: `${localDateOffset(-39)}T13:00:00`,
      reviewed_by: 3,
      review_status: 'approved',
      created_by: 2,
    },
    {
      id: 16,
      invoice_number: 'INV-COL-PRT-0001',
      invoice_date: localDateOffset(-35),
      branch_id: 3,
      warehouse_id: 3,
      customer_id: 9,
      distributor_id: 3,
      status: 'confirmed',
      payment_term: 'installment',
      payment_status: 'partial',
      total: 8500,
      paid_amount: 3250,
      balance_due: 5250,
      collector_user_id: 4,
      collection_status: 'no_contact',
      lines: [
        {
          id: 26,
          product_id: 1,
          quantity: 2,
          unit_price: 4250,
          product_name_ar: gpsProduct.name_ar,
          serial_number: 'SN-COL-PRT-01',
          username: 'mona_gps',
          sim_number: '01111110016',
        },
      ],
      installment_plan: {
        id: 16,
        down_payment: 2500,
        installment_count: 4,
        interval_type: 'monthly',
        interval_days: 30,
        first_due_date: localDateOffset(-10),
        status: 'active',
        items: planPartialItems,
      },
      confirmed_at: `${localDateOffset(-34)}T10:30:00`,
      reviewed_by: 3,
      review_status: 'approved',
      created_by: 2,
    },
    {
      id: 17,
      invoice_number: 'INV-COL-ND-0001',
      invoice_date: localDateOffset(-5),
      branch_id: 1,
      warehouse_id: 1,
      customer_id: 1,
      distributor_id: 1,
      status: 'confirmed',
      payment_term: 'installment',
      payment_status: 'partial',
      total: 7300,
      paid_amount: 2500,
      balance_due: 4800,
      collector_user_id: 4,
      collection_status: 'new_payment_date',
      collection_reminder_at: localDateTimeOffset(5, 16),
      collection_notes: 'ميعاد دفع جديد بعد خمسة أيام',
      lines: [
        {
          id: 27,
          product_id: 1,
          quantity: 2,
          unit_price: 3650,
          product_name_ar: gpsProduct.name_ar,
          serial_number: 'SN-2026-001',
          username: 'ahmed_gps',
          sim_number: '01099887766',
        },
      ],
      installment_plan: {
        id: 17,
        down_payment: 2500,
        installment_count: 3,
        interval_type: 'monthly',
        interval_days: 30,
        first_due_date: upcomingStart,
        status: 'active',
        items: planNewDateItems,
      },
      confirmed_at: `${localDateOffset(-4)}T16:00:00`,
      reviewed_by: 3,
      review_status: 'approved',
      created_by: 2,
    },
  ]

  stocks[0].reserved = 2

  const users: DemoUser[] = [
    {
      id: 1,
      name: 'مدير النظام الأعلى',
      email: 'superadmin@demo.test',
      password: 'demo',
      organization_id: 1,
      administration_id: null,
      department_id: null,
      branch_id: null,
      section_id: null,
      demo_role: 'super_admin',
      organization: { id: 1, name: 'Al Iraqi', name_ar: 'العراقي' },
      branch: null,
      roles: [{ id: 1, name: 'Super Admin' }],
      data_scope: 'organization',
      data_scope_label: 'الشركة',
      permissions: ['scope.organization', 'users.manage', 'roles.manage', 'settings.manage'],
    },
    {
      id: 5,
      name: 'أحمد — مدير إدارة الدلتا',
      email: 'deptadmin@demo.test',
      password: 'demo',
      organization_id: 1,
      administration_id: 2,
      department_id: 2,
      branch_id: 3,
      section_id: 6,
      demo_role: 'admin',
      organization: { id: 1, name: 'Al Iraqi', name_ar: 'العراقي' },
      administration: departments[1],
      branch: branches.find((b) => b.id === 3) ?? branches[2],
      section: sections[5],
      roles: [{ id: 5, name: 'AdministrationManager' }],
      data_scope: 'administration',
      data_scope_label: 'إدارة الدلتا',
      permissions: buildManagerPermissionKeys(
        getAllPermissions().map((p) => p.key),
        'scope.administration',
      ),
    },
    {
      id: 2,
      name: 'محمد — مبيعات',
      email: 'sales@demo.test',
      password: 'demo',
      organization_id: 1,
      administration_id: 1,
      department_id: 1,
      branch_id: 1,
      section_id: 1,
      demo_role: 'sales',
      workflow_section: 'sales',
      organization: { id: 1, name: 'Al Iraqi', name_ar: 'العراقي' },
      administration: departments[0],
      branch: branches[0],
      section: sections[0],
      roles: [{ id: 2, name: 'Sales' }],
      data_scope: 'branch',
      data_scope_label: 'فرع مدينة نصر',
      permissions: [
        'scope.branch',
        'dashboard.view',
        'customers.manage',
        'customers.view',
        'customers.add',
        'customers.edit',
        'distributors.view',
        'distributors.add',
        'distributors.edit',
        'promotions.view',
        'sales.pos',
        'sales.pos.new',
        'sales.pos.services',
        'sales.pos.accessories',
        'sales.pos.catalog',
        'sales.invoices.view',
        'sales.invoices.edit_before_review',
        'sales.daily_mission',
        ...INVENTORY_MANAGE_REPLACEMENTS,
        ...DEVICE_MOVEMENTS_MANAGE_REPLACEMENTS,
      ],
    },
    {
      id: 3,
      name: 'نورهان — مراجعة',
      email: 'reviewer@demo.test',
      password: 'demo',
      organization_id: 1,
      administration_id: 1,
      department_id: 1,
      branch_id: 1,
      section_id: 1,
      demo_role: 'reviewer',
      workflow_section: 'review',
      organization: { id: 1, name: 'Al Iraqi', name_ar: 'العراقي' },
      administration: departments[0],
      branch: branches[0],
      section: sections[0],
      roles: [{ id: 3, name: 'Reviewer' }],
      data_scope: 'branch',
      data_scope_label: 'فرع مدينة نصر',
      permissions: [
        'scope.branch',
        'review.view_queue',
        'review.edit_after_review',
        'review.approve',
        'review.reject',
        'review.print',
        'review.view_collections',
        'review.confirm_collections',
        'review.view_expenses',
        'review.approve_expenses',
        'sales.invoices.view',
        'contract_cases.manage',
      ],
    },
    {
      id: 4,
      name: 'كريم — تحصيل',
      email: 'collector@demo.test',
      password: 'demo',
      organization_id: 1,
      administration_id: 1,
      department_id: 1,
      branch_id: 1,
      section_id: 3,
      demo_role: 'collector',
      workflow_section: 'collection',
      organization: { id: 1, name: 'Al Iraqi', name_ar: 'العراقي' },
      administration: departments[0],
      branch: branches[0],
      section: sections[2],
      roles: [{ id: 4, name: 'Collector' }],
      data_scope: 'branch',
      data_scope_label: 'فرع مدينة نصر',
      permissions: [
        'scope.branch',
        'installments.collect',
        'installments.view',
        'sales.invoices.view',
      ],
    },
    {
      id: 6,
      name: 'سارة — محاسبة',
      email: 'accountant@demo.test',
      password: 'demo',
      organization_id: 1,
      administration_id: 1,
      department_id: 1,
      branch_id: 1,
      section_id: 4,
      demo_role: 'accountant',
      organization: { id: 1, name: 'Al Iraqi', name_ar: 'العراقي' },
      administration: departments[0],
      branch: branches[0],
      section: sections[3],
      roles: [{ id: 6, name: 'Accountant' }],
      data_scope: 'branch',
      data_scope_label: 'فرع مدينة نصر',
      permissions: [
        'scope.branch',
        'accounting.access_accounting_module',
        'accounting.manage_accounts',
        'accounting.view_journal',
        'accounting.add_journal',
        'accounting.edit_journal',
        'accounting.delete_journal',
        'accounting.map_transactions',
        'accounting.view_transfer',
        'accounting.add_transfer',
        'accounting.edit_transfer',
        'accounting.delete_transfer',
        'accounting.manage_budget',
        'accounting.view_reports',
      ],
    },
    {
      id: 7,
      name: 'ليلى — CRM',
      email: 'crm@demo.test',
      password: 'demo',
      organization_id: 1,
      administration_id: 1,
      department_id: 1,
      branch_id: 1,
      section_id: 5,
      demo_role: 'crm',
      organization: { id: 1, name: 'Al Iraqi', name_ar: 'العراقي' },
      administration: departments[0],
      branch: branches[0],
      section: sections[4],
      roles: [{ id: 7, name: 'CrmSpecialist' }],
      data_scope: 'branch',
      data_scope_label: 'فرع مدينة نصر',
      permissions: [
        'scope.branch',
        'crm.leads.manage',
        'crm.access_own_leads',
        'crm.access_all_leads',
        'crm.access_own_schedule',
        'crm.access_all_schedule',
        'crm.activities.manage',
        'crm.view_own_call_log',
        'crm.view_all_call_log',
      ],
    },
    {
      id: 8,
      name: 'منى — HR',
      email: 'hr@demo.test',
      password: 'demo',
      organization_id: 1,
      administration_id: 1,
      department_id: 1,
      branch_id: 1,
      section_id: 2,
      demo_role: 'hr_manager',
      organization: { id: 1, name: 'Al Iraqi', name_ar: 'العراقي' },
      administration: departments[0],
      branch: branches[0],
      section: sections[1],
      roles: [{ id: 8, name: 'HrManager' }],
      data_scope: 'branch',
      data_scope_label: 'فرع مدينة نصر',
      permissions: [
        'scope.branch',
        'hr.employees.manage',
        'hr.attendance.manage',
        'hrm.leave.manage',
        'hrm.leave.approve',
        'hrm.attendance.manage',
        'hrm.payroll.manage',
        'hrm.shift.manage',
        'hrm.holiday.manage',
        'hrm.allowance.manage',
        'hrm.sales_target.manage',
      ],
    },
  ]

  const today = new Date().toISOString().split('T')[0]
  const clockInTime = new Date()
  clockInTime.setHours(9, 5, 0, 0)

  const hrmJobs: HrmJob[] = [
    { id: 1, name: 'مندوب مبيعات', status: 'active', employees_count: 1 },
    { id: 2, name: 'محصل', status: 'active', employees_count: 1 },
    { id: 3, name: 'مدير موارد بشرية', status: 'active', employees_count: 1 },
    { id: 4, name: 'فني دعم', status: 'active', employees_count: 1 },
  ]

  const employees: Employee[] = [
    {
      id: 1,
      employee_code: 'EMP-001',
      name: 'محمد — مبيعات',
      phone: '01099998888',
      hrm_job_id: 1,
      job_title: 'مندوب مبيعات',
      salary: 8000,
      hire_date: '2025-01-15',
      status: 'active',
      branch_id: 1,
      department_id: 1,
      user_id: 2,
      branch: branches[0],
      department: { id: sections[0].id, name: sections[0].name, name_ar: sections[0].name_ar ?? undefined },
      user: { id: 2, name: 'محمد — مبيعات', email: 'sales@demo.test' },
    },
    {
      id: 2,
      employee_code: 'EMP-002',
      name: 'كريم — تحصيل',
      phone: '01088887777',
      hrm_job_id: 2,
      job_title: 'محصل',
      salary: 7000,
      hire_date: '2025-03-01',
      status: 'active',
      branch_id: 1,
      department_id: 3,
      user_id: 4,
      branch: branches[0],
      department: { id: sections[2].id, name: sections[2].name, name_ar: sections[2].name_ar ?? undefined },
      user: { id: 4, name: 'كريم — تحصيل', email: 'collector@demo.test' },
    },
    {
      id: 3,
      employee_code: 'EMP-HR',
      name: 'منى — HR',
      phone: '01011112222',
      hrm_job_id: 3,
      job_title: 'مدير موارد بشرية',
      salary: 12000,
      hire_date: '2024-06-01',
      status: 'active',
      branch_id: 1,
      department_id: 2,
      user_id: 8,
      branch: branches[0],
      department: { id: sections[2].id, name: sections[2].name, name_ar: sections[2].name_ar ?? undefined },
      user: { id: 8, name: 'منى — HR', email: 'hr@demo.test' },
    },
    {
      id: 4,
      employee_code: 'EMP-TECH',
      name: 'يوسف دعم فني',
      phone: '01077776666',
      hrm_job_id: 4,
      job_title: 'فني دعم',
      salary: 6500,
      hire_date: '2025-02-01',
      status: 'active',
      branch_id: 1,
      department_id: 2,
      branch: branches[0],
      department: { id: 2, name: 'Support', name_ar: 'الدعم الفني' },
    },
  ]

  const hrmLeaveTypes: HrmLeaveType[] = [
    { id: 1, leave_type: 'إجازة سنوية', max_leave_count: 21, leave_count_interval: 'year' },
    { id: 2, leave_type: 'إجازة مرضية', max_leave_count: 7, leave_count_interval: 'year' },
    { id: 3, leave_type: 'إجازة عارضة', max_leave_count: 2, leave_count_interval: 'month' },
  ]

  const leaveStart = new Date()
  leaveStart.setDate(leaveStart.getDate() + 14)
  const leaveEnd = new Date(leaveStart)
  leaveEnd.setDate(leaveEnd.getDate() + 2)
  const sickStart = new Date()
  sickStart.setDate(sickStart.getDate() + 3)
  const sickEnd = new Date(sickStart)
  sickEnd.setDate(sickEnd.getDate() + 1)

  const hrmLeaves: HrmLeave[] = [
    {
      id: 1,
      hrm_leave_type_id: 1,
      employee_id: 1,
      start_date: leaveStart.toISOString().split('T')[0],
      end_date: leaveEnd.toISOString().split('T')[0],
      ref_no: 'LV-000001',
      status: 'approved',
      reason: 'إجازة مخططة',
      changed_by: 8,
    },
    {
      id: 2,
      hrm_leave_type_id: 2,
      employee_id: 2,
      start_date: sickStart.toISOString().split('T')[0],
      end_date: sickEnd.toISOString().split('T')[0],
      ref_no: 'LV-000002',
      status: 'pending',
      reason: 'مراجعة طبية',
    },
  ]

  const hrmShifts: HrmShift[] = [
    {
      id: 1,
      name: 'وردية صباحية',
      type: 'fixed_shift',
      start_time: '09:00',
      end_time: '17:00',
      holidays: ['friday'],
      is_allowed_auto_clockout: true,
      auto_clockout_time: '23:00',
    },
  ]

  const shiftStart = new Date()
  shiftStart.setMonth(shiftStart.getMonth() - 2)
  const hrmUserShifts: HrmUserShift[] = employees.map((emp, idx) => ({
    id: idx + 1,
    employee_id: emp.id,
    hrm_shift_id: 1,
    start_date: shiftStart.toISOString().split('T')[0],
  }))

  const hrmAttendance: HrmAttendance[] = [
    {
      id: 1,
      employee_id: 1,
      hrm_shift_id: 1,
      date: today,
      clock_in_time: clockInTime.toISOString(),
      status: 'present',
    },
  ]

  const holidayStart = new Date()
  holidayStart.setMonth(holidayStart.getMonth() + 2)
  const holidayEnd = new Date(holidayStart)
  holidayEnd.setDate(holidayEnd.getDate() + 2)

  const hrmHolidays: HrmHoliday[] = [
    {
      id: 1,
      name: 'عيد الفطر',
      start_date: holidayStart.toISOString().split('T')[0],
      end_date: holidayEnd.toISOString().split('T')[0],
      note: 'عطلة رسمية',
    },
  ]

  const hrmAllowances: (HrmAllowance & { employee_ids: number[] })[] = [
    {
      id: 1,
      description: 'بدل مواصلات',
      type: 'allowance',
      amount: 500,
      amount_type: 'fixed',
      employee_ids: [1],
    },
  ]

  const hrmPayrollRecords: HrmPayrollRecord[] = [
    {
      id: 1,
      employee_id: 1,
      branch_id: 1,
      ref_no: 'PR-000001',
      duration: 1,
      duration_unit: 'month',
      rate: 8000,
      allowances: [{ description: 'بدل مواصلات', amount: 500 }],
      deductions: [],
      gross_total: 8500,
      final_total: 8500,
      payment_status: 'due',
      created_by: 8,
    },
  ]

  const hrmPayrollGroups: (HrmPayrollGroup & { payroll_record_ids: number[] })[] = [
    {
      id: 1,
      name: `مسير ${new Date().toISOString().slice(0, 7)}`,
      branch_id: 1,
      status: 'draft',
      payment_status: 'due',
      gross_total: 8500,
      payroll_record_ids: [1],
    },
  ]

  const leads: Lead[] = [
    {
      id: 1,
      name: 'محمود عادل',
      phone: '01055512345',
      source: 'موقع إلكتروني',
      status: 'new',
      expected_value: 7000,
      device_count: 2,
      branch: branches[0],
      assignee: { id: 7, name: 'ليلى — CRM' },
    },
    {
      id: 2,
      name: 'فاطمة حسين',
      phone: '01144455667',
      source: 'إحالة',
      status: 'contacted',
      expected_value: 10500,
      device_count: 4,
      branch: branches[0],
      assignee: { id: 7, name: 'ليلى — CRM' },
    },
    {
      id: 3,
      name: 'يوسف كمال',
      phone: '01233344556',
      source: 'معرض',
      status: 'negotiation',
      expected_value: 14000,
      device_count: 6,
      branch: branches[2],
    },
    {
      id: 4,
      name: 'منى سعيد',
      phone: '01022233445',
      source: 'اتصال',
      status: 'qualified',
      expected_value: 3500,
      device_count: 1,
      branch: branches[1],
    },
    {
      id: 5,
      name: 'عمر رشاد',
      phone: '01511122334',
      source: 'إعلان',
      status: 'won',
      expected_value: 7000,
      device_count: 3,
      converted_on: '2026-05-01',
      converted_customer_id: 1,
      branch: branches[0],
    },
    // طنطا — تغطية كاملة لتوزيع الليدز في لوحة مدير الدلتا
    {
      id: 6,
      name: 'حسن رجب',
      phone: '01010001116',
      source: 'موقع',
      status: 'qualified',
      expected_value: 52000,
      device_count: 6,
      branch: branches[2],
    },
    {
      id: 7,
      name: 'رانيا عصام',
      phone: '01043334449',
      source: 'معرض',
      status: 'contacted',
      expected_value: 28000,
      device_count: 3,
      branch: branches[2],
    },
    {
      id: 8,
      name: 'منى طنطاوي',
      phone: '01087778889',
      source: 'فيسبوك',
      status: 'negotiation',
      expected_value: 42000,
      device_count: 4,
      branch: branches[2],
    },
    {
      id: 9,
      name: 'خالد البحيري',
      phone: '01098889990',
      source: 'واتساب',
      status: 'new',
      expected_value: 18000,
      device_count: 2,
      branch: branches[2],
    },
    {
      id: 10,
      name: 'هبة الغربي',
      phone: '01009990001',
      source: 'معرض',
      status: 'won',
      expected_value: 35000,
      device_count: 5,
      converted_on: new Date().toISOString().slice(0, 10),
      converted_customer_id: 3,
      branch: branches[2],
    },
    {
      id: 11,
      name: 'طارق السمنودي',
      phone: '01011112223',
      source: 'ترشيح',
      status: 'lost',
      expected_value: 22000,
      device_count: 1,
      branch: branches[2],
    },
  ]

  const todayMorning = new Date()
  todayMorning.setHours(10, 0, 0, 0)
  const todayAfternoon = new Date()
  todayAfternoon.setHours(14, 30, 0, 0)
  const overdueDay = new Date()
  overdueDay.setDate(overdueDay.getDate() - 3)
  overdueDay.setHours(11, 0, 0, 0)

  const crmSchedules: CrmSchedule[] = [
    {
      id: 1,
      title: 'متابعة عرض سعر',
      status: 'scheduled',
      schedule_type: 'call',
      start_datetime: new Date().toISOString(),
      lead_id: 2,
      lead: leads[1],
      users: [{ id: 7, name: 'ليلى — CRM' }],
    },
    {
      id: 2,
      title: 'اجتماع تفاوض',
      status: 'open',
      schedule_type: 'meeting',
      start_datetime: new Date(Date.now() + 86400000).toISOString(),
      lead_id: 3,
      lead: leads[2],
      users: [{ id: 7, name: 'ليلى — CRM' }],
    },
    {
      id: 3,
      title: 'تذكير بالدفع',
      status: 'completed',
      schedule_type: 'sms',
      start_datetime: '2026-05-15T10:00:00',
      customer_id: 1,
      customer: customers[0],
      users: [{ id: 7, name: 'ليلى — CRM' }],
    },
    {
      id: 4,
      title: 'اتصال متابعة — أحمد',
      status: 'scheduled',
      schedule_type: 'call',
      start_datetime: todayMorning.toISOString(),
      customer_id: 1,
      customer: customers[0],
      users: [{ id: 2, name: 'محمد — مبيعات' }],
    },
    {
      id: 5,
      title: 'معاينة موقع — سارة',
      status: 'open',
      schedule_type: 'meeting',
      start_datetime: todayAfternoon.toISOString(),
      customer_id: 2,
      customer: customers[1],
      users: [{ id: 2, name: 'محمد — مبيعات' }],
    },
    {
      id: 6,
      title: 'إعادة اتصال متأخرة — خالد',
      status: 'open',
      schedule_type: 'call',
      start_datetime: overdueDay.toISOString(),
      customer_id: 3,
      customer: customers[2],
      users: [{ id: 2, name: 'محمد — مبيعات' }],
    },
    {
      id: 7,
      title: 'متابعة متأخرة — رانيا عصام',
      status: 'open',
      schedule_type: 'call',
      start_datetime: (() => {
        const d = new Date()
        d.setDate(d.getDate() - 2)
        d.setHours(12, 0, 0, 0)
        return d.toISOString()
      })(),
      lead_id: 7,
      lead: leads[6],
      users: [{ id: 5, name: 'أحمد — مدير إدارة الدلتا' }],
    },
    {
      id: 8,
      title: 'عرض متأخر — منى طنطاوي',
      status: 'open',
      schedule_type: 'meeting',
      start_datetime: (() => {
        const d = new Date()
        d.setDate(d.getDate() - 4)
        d.setHours(15, 0, 0, 0)
        return d.toISOString()
      })(),
      lead_id: 8,
      lead: leads[7],
      users: [{ id: 5, name: 'أحمد — مدير إدارة الدلتا' }],
    },
    {
      id: 9,
      title: 'متابعة متأخرة — حسن رجب',
      status: 'open',
      schedule_type: 'call',
      start_datetime: (() => {
        const d = new Date()
        d.setDate(d.getDate() - 1)
        d.setHours(10, 30, 0, 0)
        return d.toISOString()
      })(),
      lead_id: 6,
      lead: leads[5],
      users: [{ id: 5, name: 'أحمد — مدير إدارة الدلتا' }],
    },
  ]

  const crmCampaigns: CrmCampaign[] = [
    {
      id: 1,
      name: 'عرض الصيف',
      campaign_type: 'sms',
      sms_body: 'خصم 10% على أجهزة GPS — {contact_name}',
      contact_ids: [1, 2, 3],
      created_by: 7,
    },
    {
      id: 2,
      name: 'نشرة شهر يونيو',
      campaign_type: 'email',
      subject: 'أحدث عروض GPS',
      email_body: 'مرحباً {contact_name}، اكتشف عروضنا الجديدة.',
      sent_on: '2026-06-01T09:00:00',
      contact_ids: [1, 2],
      created_by: 7,
    },
  ]

  const crmProposalTemplates: CrmProposalTemplate[] = [
    {
      id: 1,
      subject: 'عرض جهاز GPS',
      body: 'نقدم لكم عرضاً لتركيب {contact_name} جهاز تتبع GPS بسعر مميز.',
      created_by: 7,
    },
  ]

  const crmProposals: CrmProposal[] = [
    {
      id: 1,
      subject: 'عرض لمحمود عادل',
      body: 'عرض تركيب 2 جهاز GPS بإجمالي 7000 ج.م',
      lead_id: 1,
      lead: leads[0],
      sent_by: 7,
      created_at: '2026-06-05T12:00:00',
    },
  ]

  const crmSettings: CrmSettings = {
    enable_order_request: true,
    order_request_prefix: 'ORD',
  }

  const hrmSettings: HrmSettings = {
    grace_before_checkin: 15,
    grace_after_checkin: 15,
    grace_before_checkout: 15,
    grace_after_checkout: 15,
    payroll_ref_no_prefix: 'PR',
  }

  const organizationProfile: OrganizationProfile = {
    id: 1,
    name: 'Al Iraqi',
    name_ar: 'العراقي',
    code: 'GPS',
    phone: '0225551234',
    email: 'info@demo.test',
    address: 'القاهرة، مصر',
    enabled_modules: ['crm', 'hrm', 'accounting'],
    is_active: true,
    updated_at: new Date().toISOString(),
  }

  const generalSettings: GeneralSettings = {
    logo_url: null,
    theme_color: '#2563eb',
    website: 'https://demo.test',
    tax_number: '123-456-789',
    commercial_register: 'CR-987654',
    currency: 'EGP',
    timezone: 'Africa/Cairo',
    default_locale: 'ar',
    date_format: 'Y/m/d',
    time_format: '12h',
    fiscal_year_start_month: 1,
  }

  const salesSettings: SalesSettings = {
    invoice_prefix: 'INV',
    require_invoice_review: true,
    review_installment_order: 'after_installments',
    block_contract_on_review: false,
    allow_negative_inventory: false,
    default_payment_term: 'installment',
    max_installment_months: 24,
    installment_interval_days: 30,
    cash_to_installment_grace_days: 7,
    overdue_grace_days: 3,
    late_fee_mode: 'daily_fixed',
    late_fee_daily_amount: 10,
    late_fee_percent: 0,
    min_down_payment_percent: 10,
    enable_installation_fee: true,
    allow_disable_installation_fee_in_sale: true,
  }

  const securitySettings: SecuritySettings = {
    session_timeout_minutes: 480,
    password_min_length: 8,
    force_password_change_on_first_login: false,
    audit_log_retention_days: 365,
    log_ip_addresses: true,
  }

  const messagingSettings: MessagingSettings = {
    whatsapp_enabled: true,
    reminder_days_before: 1,
    send_contract_welcome: true,
    send_contract_approved: true,
    send_installment_reminder: true,
    send_installment_paid: true,
    templates: {
      contract_welcome:
        'مرحباً {customer_name}،\nتم تسجيل تعاقدكم رقم {invoice_number} بإجمالي {total} ج.م.\n{review_note}\n{org_name}',
      contract_approved:
        'عزيزي {customer_name}،\nتم اعتماد تعاقدكم رقم {invoice_number}.\nالمقدم: {down_payment} ج.م\nعدد الأقساط: {installment_count}\nقيمة القسط: {installment_amount} ج.م\nأول استحقاق: {due_date}',
      installment_reminder:
        'تذكير: قسط مستحق لـ {customer_name}\nفاتورة {invoice_number}\nالمبلغ: {installment_amount} ج.م\nتاريخ الاستحقاق: {due_date}',
      installment_paid:
        'شكراً {customer_name}،\nتم استلام {paid_amount} ج.م لفاتورة {invoice_number}.\n{next_installment_note}',
    },
  }

  const customerMessageLogs: CustomerMessageLogEntry[] = [
    {
      id: 1,
      message_type: 'contract_welcome',
      phone: '201012345678',
      body: 'مرحباً أحمد، تم تسجيل تعاقدكم رقم INV-1001 بإجمالي 15000 ج.م.',
      status: 'sent',
      sent_at: new Date(Date.now() - 86400000).toISOString(),
      created_at: new Date(Date.now() - 86400000).toISOString(),
      customer: { id: 1, name: 'أحمد محمد', phone: '201012345678' },
      sales_invoice: { id: 1, invoice_number: 'INV-1001' },
    },
    {
      id: 2,
      message_type: 'installment_reminder',
      phone: '201098765432',
      body: 'تذكير: قسط مستحق لـ سارة\nفاتورة INV-1002\nالمبلغ: 1250 ج.م',
      status: 'sent',
      sent_at: new Date(Date.now() - 3600000).toISOString(),
      created_at: new Date(Date.now() - 3600000).toISOString(),
      customer: { id: 2, name: 'سارة علي', phone: '201098765432' },
      sales_invoice: { id: 2, invoice_number: 'INV-1002' },
    },
  ]

  const administrationManagerPermissionKeys = buildManagerPermissionKeys(
    getAllPermissions().map((p) => p.key),
    'scope.administration',
  )

  const adminRoles: AdminRole[] = [
    {
      id: 1,
      name: 'Admin',
      name_ar: 'مدير النظام',
      permissions_count: 12,
      permissions: [
        { id: 1, name: 'users.manage' },
        { id: 2, name: 'roles.manage' },
        { id: 3, name: 'settings.manage' },
        { id: 4, name: 'audit.view' },
        { id: 5, name: 'scope.organization' },
      ],
    },
    {
      id: 2,
      name: 'Sales',
      name_ar: 'المبيعات',
      permissions_count: 8,
      permissions: [
        { id: 5, name: 'dashboard.view' },
        { id: 6, name: 'sales.pos' },
        { id: 61, name: 'sales.pos.new' },
        { id: 62, name: 'sales.pos.services' },
        { id: 63, name: 'sales.pos.accessories' },
        { id: 64, name: 'sales.pos.catalog' },
        { id: 7, name: 'crm.access_own_leads' },
        { id: 8, name: 'scope.branch' },
        ...INVENTORY_MANAGE_REPLACEMENTS.map((name, index) => ({ id: 180 + index, name })),
        ...DEVICE_MOVEMENTS_MANAGE_REPLACEMENTS.map((name, index) => ({ id: 220 + index, name })),
        { id: 20, name: 'sales.daily_mission' },
        { id: 21, name: 'customers.manage' },
        { id: 22, name: 'sales.invoices.view' },
        { id: 23, name: 'sales.invoices.edit_before_review' },
      ],
    },
    {
      id: 3,
      name: 'Reviewer',
      name_ar: 'المراجعة',
      permissions_count: 8,
      permissions: [
        { id: 301, name: 'dashboard.view' },
        { id: 302, name: 'sales.invoices.view' },
        { id: 303, name: 'review.view_queue' },
        { id: 304, name: 'review.view_contracts' },
        { id: 305, name: 'review.view_detail' },
        { id: 314, name: 'review.edit_after_review' },
        { id: 306, name: 'review.approve' },
        { id: 307, name: 'review.reject' },
        { id: 308, name: 'review.print' },
        { id: 309, name: 'scope.branch' },
        { id: 310, name: 'review.view_collections' },
        { id: 311, name: 'review.confirm_collections' },
        { id: 312, name: 'review.view_expenses' },
        { id: 313, name: 'review.approve_expenses' },
      ],
    },
    {
      id: 4,
      name: 'AdministrationManager',
      name_ar: 'مدير الإدارة',
      permissions_count: administrationManagerPermissionKeys.length,
      permissions: administrationManagerPermissionKeys.map((name, idx) => ({
        id: 400 + idx,
        name,
      })),
    },
  ]

  const adminActivityLogs: ActivityLogEntry[] = [
    {
      id: 1,
      log_name: 'admin',
      description: 'Organization provisioned',
      event: 'created',
      created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
      causer: { id: 1, name: 'مدير النظام الأعلى', email: 'superadmin@demo.test' },
      properties: { organization_id: 1 },
    },
    {
      id: 2,
      log_name: 'admin',
      description: 'Demo data seeded',
      event: 'created',
      created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
      causer: { id: 1, name: 'مدير النظام الأعلى', email: 'superadmin@demo.test' },
    },
    {
      id: 3,
      log_name: 'admin',
      description: 'User created',
      event: 'created',
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      causer: { id: 1, name: 'مدير النظام الأعلى', email: 'superadmin@demo.test' },
      subject_type: 'App\\Models\\User',
      subject_id: 2,
    },
    {
      id: 4,
      log_name: 'admin',
      description: 'User roles synced',
      event: 'updated',
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      causer: { id: 1, name: 'مدير النظام الأعلى', email: 'superadmin@demo.test' },
      properties: { roles: ['Admin'] },
    },
    {
      id: 5,
      log_name: 'admin',
      description: 'Role updated',
      event: 'updated',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      causer: { id: 1, name: 'مدير النظام الأعلى', email: 'superadmin@demo.test' },
      subject_type: 'Spatie\\Permission\\Models\\Role',
      subject_id: 1,
    },
    {
      id: 6,
      log_name: 'admin',
      description: 'Organization settings updated',
      event: 'updated',
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      causer: { id: 1, name: 'مدير النظام الأعلى', email: 'superadmin@demo.test' },
    },
    {
      id: 7,
      log_name: 'admin',
      description: 'User updated',
      event: 'updated',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      causer: { id: 1, name: 'مدير النظام الأعلى', email: 'superadmin@demo.test' },
      subject_type: 'App\\Models\\User',
      subject_id: 3,
    },
  ]

  const portalUsers: DemoPortalUser[] = [
    {
      id: 101,
      name: 'أحمد محمود حسن',
      email: 'portal@demo.test',
      password: 'demo',
      customer_id: 1,
      customer: customers[0],
    },
  ]

  const accountingAccounts: AccountingAccount[] = [
    { id: 1, name: 'الصندوق', gl_code: '1000', account_primary_type: 'asset', status: 'active' },
    { id: 2, name: 'البنك', gl_code: '1010', account_primary_type: 'asset', status: 'active' },
    { id: 3, name: 'العملاء', gl_code: '1200', account_primary_type: 'asset', status: 'active', parent_account_id: null },
    { id: 4, name: 'إيرادات المبيعات', gl_code: '4000', account_primary_type: 'income', status: 'active' },
    { id: 5, name: 'مصروفات تشغيلية', gl_code: '5000', account_primary_type: 'expense', status: 'active' },
    { id: 6, name: 'رأس المال', gl_code: '3000', account_primary_type: 'equity', status: 'active' },
    { id: 7, name: 'الموردون', gl_code: '2000', account_primary_type: 'liability', status: 'active' },
  ]

  const journalLine = (
    id: number,
    mappingId: number,
    accountId: number,
    amount: number,
    type: 'debit' | 'credit',
    account?: AccountingAccount,
  ): AccountingTransactionLine => ({
    id,
    accounting_account_id: accountId,
    acc_trans_mapping_id: mappingId,
    amount,
    type,
    account: account ?? accountingAccounts.find((a) => a.id === accountId),
  })

  const journalEntries: AccountingAccTransMapping[] = [
    {
      id: 1,
      ref_no: 'JE-001',
      type: 'journal_entry',
      operation_date: '2026-01-15T00:00:00',
      note: 'قيد افتتاحي',
      lines: [
        journalLine(1, 1, 1, 50000, 'debit'),
        journalLine(2, 1, 6, 50000, 'credit'),
      ],
    },
    {
      id: 2,
      ref_no: 'JE-002',
      type: 'journal_entry',
      operation_date: '2026-02-01T00:00:00',
      note: 'تسجيل مصروف',
      lines: [
        journalLine(3, 2, 5, 2500, 'debit'),
        journalLine(4, 2, 1, 2500, 'credit'),
      ],
    },
  ]

  const transfers: AccountingAccTransMapping[] = [
    {
      id: 3,
      ref_no: 'TR-001',
      type: 'transfer',
      operation_date: '2026-02-10T00:00:00',
      note: 'تحويل للبنك',
      lines: [
        journalLine(5, 3, 2, 10000, 'debit'),
        journalLine(6, 3, 1, 10000, 'credit'),
      ],
    },
  ]

  const budgets: AccountingBudget[] = [
    {
      id: 1,
      accounting_account_id: 4,
      financial_year: 2026,
      jan: 50000,
      feb: 55000,
      mar: 60000,
      apr: 55000,
      may: 60000,
      jun: 65000,
      jul: 60000,
      aug: 65000,
      sep: 70000,
      oct: 65000,
      nov: 70000,
      dec: 75000,
      quarter_1: 165000,
      quarter_2: 180000,
      quarter_3: 195000,
      quarter_4: 210000,
      yearly: 750000,
      account: accountingAccounts[3],
    },
  ]

  const branchAccountingMaps: Record<number, BranchAccountingMap> = {
    1: { sale: { deposit_to: 4, payment_account: 1 }, sell_payment: { deposit_to: 1, payment_account: 3 } },
    2: { sale: { deposit_to: 4, payment_account: 2 }, sell_payment: { deposit_to: 2, payment_account: 3 } },
    3: { sale: { deposit_to: 4, payment_account: 1 }, sell_payment: { deposit_to: 1, payment_account: 3 } },
    4: { sale: { deposit_to: 4, payment_account: 2 }, sell_payment: { deposit_to: 2, payment_account: 3 } },
  }

  const dailyBranchReports: DailyBranchReport[] = [
    {
      id: 1,
      branch_id: 1,
      report_date: '2026-06-10',
      total_amount: 3245,
      expenses_total: 275,
      net_amount: 2970,
      installations_count: 3,
      devices_actual: 34,
      devices_reserved: 4,
      devices_customer: 18,
      devices_software: 37,
      accessories_tape: 12,
      accessories_cable_ties: 31,
      accessories_bulb: 20,
      percentage: '',
      devices_entering_count: null,
      notes: '',
      vodafone_transfers_count: 2,
      vodafone_transfers_total: 500,
      vodafone_other_notes: '',
      renewal_notes: '',
      reviewer_name: 'امينه طايع',
      branch_manager_name: '',
      attendance: [
        { employee_name: 'مي نصر', check_in: '1:30', check_out: '11:10' },
        { employee_name: 'امينه طايع', check_in: '1:30', check_out: '11:10' },
      ],
      transactions: [
        { customer_name: 'عميل 1', transaction_type: 'قسط', amount: 500 },
        { customer_name: 'عميل 2', transaction_type: '5 اقساط', amount: 1200 },
        { customer_name: 'عميل 3', transaction_type: 'تركيب جديد', amount: 800 },
        { customer_name: 'عميل 4', transaction_type: 'سوفت+تركيب+تجديد اشتراك', amount: 745 },
      ],
      transfers: [
        { customer_name: 'تحويل 1', amount: 300, reference: '534' },
        { customer_name: 'تحويل 2', amount: 200, reference: 'انستا' },
      ],
      expense_lines: [
        { description: '225 نسبه محمد', amount: 225 },
        { description: '50 منديل وزباله', amount: 50 },
      ],
      movements: [{ description: '' }, { description: '' }, { description: '' }, { description: '' }],
      branch: branches[0],
    },
  ]

  return {
    users,
    portalUsers,
    leads,
    crmSchedules,
    crmCampaigns,
    crmProposals,
    crmProposalTemplates,
    crmMarketplaces: [],
    crmSettings,
    hrmSettings,
    employees,
    hrmLeaveTypes,
    hrmJobs,
    hrmLeaves,
    hrmShifts,
    hrmUserShifts,
    hrmAttendance,
    hrmHolidays,
    hrmAllowances,
    hrmPayrollRecords,
    hrmPayrollGroups,
    hrmUserSalesTargets: [
      {
        id: 1,
        employee_id: 1,
        target_start: '2026-06-01',
        target_end: '2026-06-30',
        target_count: 10,
        achieved_count: 3,
        commission_percent: 5,
      },
      // 16 + 11 = 27 من 35 → ~77% في لوحة المدير
      {
        id: 2,
        employee_id: 1,
        target_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .slice(0, 10),
        target_end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
          .toISOString()
          .slice(0, 10),
        target_count: 20,
        achieved_count: 16,
        commission_percent: 2.5,
      },
      {
        id: 3,
        employee_id: 2,
        target_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .slice(0, 10),
        target_end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
          .toISOString()
          .slice(0, 10),
        target_count: 15,
        achieved_count: 11,
        commission_percent: 2.0,
      },
    ],
    adminRoles,
    adminActivityLogs,
    organizationProfile,
    generalSettings,
    salesSettings,
    securitySettings,
    messagingSettings,
    customerMessageLogs,
    departments,
    sections,
    branches,
    warehouses,
    gpsProduct,
    departmentStocks,
    stocks,
    accessories: [
      {
        id: 101,
        name: 'Power Cable',
        name_ar: 'كابل طاقة',
        model_code: 'ACC-CABLE',
        kind: 'accessory',
        sell_price: 100,
        cost_price: 40,
        is_active: true,
      },
      {
        id: 102,
        name: 'Mount Bracket',
        name_ar: 'حامل تثبيت',
        model_code: 'ACC-MOUNT',
        kind: 'accessory',
        sell_price: 80,
        cost_price: 30,
        is_active: true,
      },
      {
        id: 103,
        name: 'Remote',
        name_ar: 'ريموت',
        model_code: 'ACC-REMOTE',
        kind: 'accessory',
        sell_price: 150,
        cost_price: 60,
        is_active: true,
      },
    ],
    accessoryPackages: [
      {
        id: 1,
        name_ar: 'باكدج تركيب أساسي',
        name: 'Basic Install Kit',
        sell_price: 220,
        cost_price: 100,
        is_active: true,
        items: [
          { id: 1, product_model_id: 101, quantity: 1 },
          { id: 2, product_model_id: 102, quantity: 1 },
        ],
      },
    ],
    accessoryStocks: [
      {
        id: 1,
        warehouse_id: warehouses.find((wh) => wh.is_central && wh.administration_id === 1)?.id ?? 4,
        product_model_id: 101,
        quantity: 50,
        reserved: 0,
      },
      {
        id: 2,
        warehouse_id: warehouses.find((wh) => wh.is_central && wh.administration_id === 1)?.id ?? 4,
        product_model_id: 102,
        quantity: 40,
        reserved: 0,
      },
      {
        id: 3,
        warehouse_id: warehouses.find((wh) => wh.is_central && wh.administration_id === 1)?.id ?? 4,
        product_model_id: 103,
        quantity: 25,
        reserved: 0,
      },
    ],
    distributors,
    services,
    customers,
    invoices,
    paymentTransactions: [
      {
        id: 1,
        transaction_number: 'PT-000001',
        sales_invoice_id: 2,
        customer_id: 2,
        installment_item_id: 1,
        amount: 2000,
        status: 'active',
        payment_source: 'internal',
        payment_method: 'cash',
        paid_at: new Date().toISOString(),
        user_id: 1,
      },
    ],
    paymentVerificationLogs: [],
    collectionFollowUpLogs: [
      {
        id: 1,
        sales_invoice_id: 13,
        installment_item_id: 29,
        installment_sequence: 1,
        invoice_number: 'INV-COL-OV-0001',
        user_id: 4,
        user_name: 'كريم — تحصيل',
        collection_status: 'postponed',
        collection_status_label: 'تأجيلات',
        collection_reminder_at: reminderTomorrow,
        collection_notes: 'عميل طلب تأجيل لبعد بكرة',
        created_at: localDateTimeOffset(-1, 17),
      },
      {
        id: 2,
        sales_invoice_id: 15,
        installment_item_id: 37,
        installment_sequence: 1,
        invoice_number: 'INV-COL-RSP-0001',
        user_id: 4,
        user_name: 'كريم — تحصيل',
        collection_status: 'responded',
        collection_status_label: 'تم الرد',
        collection_notes: 'رد على المكالمة وهيحوّل النهاردة',
        created_at: localDateTimeOffset(0, 9),
      },
      {
        id: 3,
        sales_invoice_id: 17,
        installment_item_id: 45,
        installment_sequence: 1,
        invoice_number: 'INV-COL-ND-0001',
        user_id: 4,
        user_name: 'كريم — تحصيل',
        collection_status: 'new_payment_date',
        collection_status_label: 'مواعيد جديدة للدفع',
        collection_reminder_at: localDateTimeOffset(5, 16),
        collection_notes: 'ميعاد دفع جديد بعد خمسة أيام',
        created_at: localDateTimeOffset(-1, 16),
      },
      {
        id: 4,
        sales_invoice_id: 13,
        installment_item_id: 29,
        installment_sequence: 1,
        invoice_number: 'INV-COL-OV-0001',
        user_id: 4,
        user_name: 'كريم — تحصيل',
        collection_status: 'postponed',
        collection_status_label: 'تأجيلات',
        collection_reminder_at: reminderTomorrow,
        collection_notes: 'تأجيل اليوم بعد مكالمة ثانية',
        created_at: localDateTimeOffset(0, 11),
      },
      {
        id: 5,
        sales_invoice_id: 14,
        installment_item_id: 33,
        installment_sequence: 1,
        invoice_number: 'INV-COL-RC-0001',
        user_id: 4,
        user_name: 'كريم — تحصيل',
        collection_status: 'no_answer',
        collection_status_label: 'لم يتم الرد',
        collection_notes: 'اتصلت ولم يرد',
        created_at: localDateTimeOffset(0, 12),
      },
      {
        id: 6,
        sales_invoice_id: 16,
        installment_item_id: 41,
        installment_sequence: 1,
        invoice_number: 'INV-COL-PRT-0001',
        user_id: 4,
        user_name: 'كريم — تحصيل',
        collection_status: 'no_contact',
        collection_status_label: 'لم يتم التواصل',
        collection_notes: 'لم يتم التواصل اليوم',
        created_at: localDateTimeOffset(0, 13),
      },
    ],
    expenseRequests: [
      {
        id: 1,
        reference_number: 'EXP-000001',
        expense_type: 'petty_cash',
        amount: 500,
        status: 'pending',
        branch_id: 1,
        notes: 'مصروفات نثرية أسبوع التحصيل',
        created_by: 1,
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        reference_number: 'EXP-000002',
        expense_type: 'operating',
        amount: 1200,
        status: 'pending',
        branch_id: 1,
        distributor_id: 1,
        notes: 'صرف عمولة موزع — رصيد متاح',
        created_by: 1,
        created_at: new Date().toISOString(),
      },
    ],
    distributorCommissionLedger: [],
    priceCatalogItems: [
      {
        id: 1,
        item_type: 'product',
        name_ar: 'جهاز GPS',
        base_price: gpsProduct.sell_price,
        cost_price: gpsProduct.cost_price ?? 0,
        is_active: true,
      },
    ],
    promotions: [
      {
        id: 1,
        name_ar: 'خصم 5% على GPS',
        promotion_type: 'percent',
        discount_value: 5,
        applies_to: 'product',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        min_quantity: 1,
        uses_count: 0,
        is_active: true,
      },
    ],
    chatConversations: [],
    chatMessages: [],
    dailyBranchReports,
    accountingAccounts,
    journalEntries,
    transfers,
    budgets,
    mappedInvoiceIds: [1],
    accountingSettings: { journal_entry_prefix: 'JE', transfer_prefix: 'TR' },
    branchAccountingMaps,
    counters: {
      department: 3,
      section: 6,
      branch: 4,
      warehouse: 6,
      stockReceipt: 0,
      stockTransfer: 0,
      invoice: 17,
      customer: 9,
      distributor: 4,
      service: 12,
      dailyBranchReport: 2,
      installmentItem: 47,
      payment: 1,
      paymentVerification: 1,
      collectionFollowUp: 6,
      commissionLedger: 1,
      accountingMapping: 4,
      accountingLine: 7,
      accountingAccount: 8,
      budget: 2,
      journalEntry: 3,
      transfer: 2,
      lead: 6,
      crmSchedule: 4,
      crmCampaign: 3,
      crmProposal: 2,
      crmProposalTemplate: 2,
      adminUser: 8,
      adminRole: 3,
      activityLog: 3,
      employee: 4,
      hrmLeaveType: 3,
      hrmLeave: 2,
      hrmShift: 1,
      hrmUserShift: 3,
      hrmAttendance: 1,
      hrmHoliday: 1,
      hrmAllowance: 1,
      hrmPayroll: 1,
      hrmPayrollGroup: 1,
    },
  }
}

export type { SalesInvoice, SalesInvoiceLine, InstallmentPlan, InstallmentItem }
