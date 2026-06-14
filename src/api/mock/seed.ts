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
  SalesSettings,
  SecuritySettings,
  HrmSettings,
  Customer,
  DailyBranchReport,
  DemoRole,
  Department,
  Distributor,
  Section,
  Employee,
  HrmAllowance,
  HrmAttendance,
  HrmHoliday,
  HrmLeave,
  HrmLeaveType,
  HrmPayrollGroup,
  HrmPayrollRecord,
  HrmShift,
  HrmUserShift,
  DepartmentStock,
  GpsProduct,
  GpsStock,
  InstallmentItem,
  InstallmentPlan,
  Lead,
  PortalUser,
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
  hrmLeaves: HrmLeave[]
  hrmShifts: HrmShift[]
  hrmUserShifts: HrmUserShift[]
  hrmAttendance: HrmAttendance[]
  hrmHolidays: HrmHoliday[]
  hrmAllowances: (HrmAllowance & { employee_ids: number[] })[]
  hrmPayrollRecords: HrmPayrollRecord[]
  hrmPayrollGroups: (HrmPayrollGroup & { payroll_record_ids: number[] })[]
  adminRoles: AdminRole[]
  adminActivityLogs: ActivityLogEntry[]
  organizationProfile: OrganizationProfile
  generalSettings: GeneralSettings
  salesSettings: SalesSettings
  securitySettings: SecuritySettings
  departments: Department[]
  sections: Section[]
  branches: Branch[]
  warehouses: Warehouse[]
  gpsProduct: GpsProduct
  departmentStocks: DepartmentStock[]
  stocks: GpsStock[]
  distributors: Distributor[]
  customers: Customer[]
  accountingAccounts: AccountingAccount[]
  journalEntries: AccountingAccTransMapping[]
  transfers: AccountingAccTransMapping[]
  budgets: AccountingBudget[]
  mappedInvoiceIds: number[]
  accountingSettings: { journal_entry_prefix: string; transfer_prefix: string }
  branchAccountingMaps: Record<number, BranchAccountingMap>
  invoices: SalesInvoice[]
  dailyBranchReports: DailyBranchReport[]
  counters: {
    department: number
    section?: number
    branch: number
    warehouse: number
    invoice: number
    customer: number
    distributor: number
    dailyBranchReport: number
    installmentItem: number
    payment: number
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
    hrmLeave?: number
    hrmShift?: number
    hrmUserShift?: number
    hrmAttendance?: number
    hrmHoliday?: number
    hrmAllowance?: number
    hrmPayroll?: number
    hrmPayrollGroup?: number
  }
}

function addDays(date: string, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
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
    const isPast = new Date(dueDate) < new Date()
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
    { id: 1, name: 'Cairo Region', name_ar: 'إدارة القاهرة', code: 'CAI', is_active: true },
    { id: 2, name: 'Delta Region', name_ar: 'إدارة الدلتا', code: 'DLT', is_active: true },
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
    { id: 1, branch_id: 1, name: 'Main Store', name_ar: 'مخزن مدينة نصر', code: 'NSR-W1', is_active: true },
    { id: 2, branch_id: 2, name: 'Maadi Store', name_ar: 'مخزن المعادي', code: 'MAD-W1', is_active: true },
    { id: 3, branch_id: 3, name: 'Tanta Store', name_ar: 'مخزن طنطا', code: 'TNT-W1', is_active: true },
  ]

  const gpsProduct: GpsProduct = {
    id: 1,
    name: 'GPS Tracker',
    name_ar: 'جهاز تتبع GPS',
    brand: 'TrackPro',
    model_code: 'GPS-TP-01',
    sell_price: 3500,
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
      status: 'active',
    },
    {
      id: 2,
      branch_id: 1,
      code: 'DIST-002',
      name: 'Maadi Distribution',
      name_ar: 'موزع المعادي',
      phone: '01033334455',
      status: 'active',
    },
    {
      id: 3,
      branch_id: 3,
      code: 'DIST-003',
      name: 'Tanta Distribution',
      name_ar: 'موزع طنطا',
      phone: '01055556666',
      status: 'active',
    },
  ]

  const customers: Customer[] = [
    {
      id: 1,
      branch_id: 1,
      distributor_id: 1,
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
      name: 'خالد عبد الرحمن',
      phone: '01234567890',
      national_id: '28808081234567',
      address: 'طنطا، الغربية',
      city: 'طنطا',
      status: 'active',
      credit_score: 90,
    },
  ]

  const plan1Items = buildInstallmentItems(2, 1, 12000, 6, '2026-01-15', 30, 1, 2)
  const plan1Paid = plan1Items.reduce((s, i) => s + Number(i.paid_amount), 0)

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
        interval_days: 30,
        first_due_date: '2026-01-15',
        status: 'active',
        items: plan1Items,
      },
      confirmed_at: '2026-04-11T09:30:00',
      reviewed_by: 3,
      reviewed_at: '2026-04-11T09:30:00',
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
      organization: { id: 1, name: 'GPS Track Egypt', name_ar: 'شركة تتبع GPS' },
      branch: null,
      roles: [{ id: 1, name: 'Super Admin' }],
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
      organization: { id: 1, name: 'GPS Track Egypt', name_ar: 'شركة تتبع GPS' },
      administration: departments[1],
      branch: branches.find((b) => b.id === 3) ?? branches[2],
      section: sections[5],
      roles: [{ id: 5, name: 'AdministrationManager' }],
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
      organization: { id: 1, name: 'GPS Track Egypt', name_ar: 'شركة تتبع GPS' },
      administration: departments[0],
      branch: branches[0],
      section: sections[0],
      roles: [{ id: 2, name: 'Sales' }],
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
      organization: { id: 1, name: 'GPS Track Egypt', name_ar: 'شركة تتبع GPS' },
      administration: departments[0],
      branch: branches[0],
      section: sections[0],
      roles: [{ id: 3, name: 'Reviewer' }],
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
      organization: { id: 1, name: 'GPS Track Egypt', name_ar: 'شركة تتبع GPS' },
      administration: departments[0],
      branch: branches[0],
      section: sections[2],
      roles: [{ id: 4, name: 'Collector' }],
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
      organization: { id: 1, name: 'GPS Track Egypt', name_ar: 'شركة تتبع GPS' },
      administration: departments[0],
      branch: branches[0],
      section: sections[3],
      roles: [{ id: 6, name: 'Accountant' }],
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
      organization: { id: 1, name: 'GPS Track Egypt', name_ar: 'شركة تتبع GPS' },
      administration: departments[0],
      branch: branches[0],
      section: sections[4],
      roles: [{ id: 7, name: 'CrmSpecialist' }],
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
      organization: { id: 1, name: 'GPS Track Egypt', name_ar: 'شركة تتبع GPS' },
      administration: departments[0],
      branch: branches[0],
      section: sections[1],
      roles: [{ id: 8, name: 'HrManager' }],
    },
  ]

  const today = new Date().toISOString().split('T')[0]
  const clockInTime = new Date()
  clockInTime.setHours(9, 5, 0, 0)

  const employees: Employee[] = [
    {
      id: 1,
      employee_code: 'EMP-001',
      name: 'محمد — مبيعات',
      phone: '01099998888',
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
      branch: branches[2],
    },
    {
      id: 4,
      name: 'منى سعيد',
      phone: '01022233445',
      source: 'اتصال',
      status: 'qualified',
      expected_value: 3500,
      branch: branches[1],
    },
    {
      id: 5,
      name: 'عمر رشاد',
      phone: '01511122334',
      source: 'إعلان',
      status: 'won',
      expected_value: 7000,
      converted_on: '2026-05-01',
      converted_customer_id: 1,
      branch: branches[0],
    },
  ]

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
    name: 'GPS Track Egypt',
    name_ar: 'شركة تتبع GPS',
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
    overdue_grace_days: 3,
    late_fee_mode: 'daily_fixed',
    late_fee_daily_amount: 10,
    late_fee_percent: 0,
    min_down_payment_percent: 10,
  }

  const securitySettings: SecuritySettings = {
    session_timeout_minutes: 480,
    password_min_length: 8,
    force_password_change_on_first_login: false,
    audit_log_retention_days: 365,
    log_ip_addresses: true,
  }

  const adminRoles: AdminRole[] = [
    {
      id: 1,
      name: 'Admin',
      permissions_count: 12,
      permissions: [
        { id: 1, name: 'users.manage' },
        { id: 2, name: 'roles.manage' },
        { id: 3, name: 'settings.manage' },
        { id: 4, name: 'audit.view' },
      ],
    },
    {
      id: 2,
      name: 'Sales',
      permissions_count: 6,
      permissions: [
        { id: 5, name: 'dashboard.view' },
        { id: 6, name: 'sales.pos' },
        { id: 7, name: 'crm.access_own_leads' },
      ],
    },
    {
      id: 4,
      name: 'AdministrationManager',
      permissions_count: 40,
      permissions: [
        { id: 1, name: 'users.manage' },
        { id: 4, name: 'audit.view' },
        { id: 5, name: 'dashboard.view' },
        { id: 8, name: 'crm.leads.manage' },
        { id: 9, name: 'hr.employees.manage' },
        { id: 10, name: 'accounting.access_accounting_module' },
      ],
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
    hrmLeaves,
    hrmShifts,
    hrmUserShifts,
    hrmAttendance,
    hrmHolidays,
    hrmAllowances,
    hrmPayrollRecords,
    hrmPayrollGroups,
    adminRoles,
    adminActivityLogs,
    organizationProfile,
    generalSettings,
    salesSettings,
    securitySettings,
    departments,
    sections,
    branches,
    warehouses,
    gpsProduct,
    departmentStocks,
    stocks,
    distributors,
    customers,
    invoices,
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
      warehouse: 4,
      invoice: 5,
      customer: 4,
      distributor: 4,
      dailyBranchReport: 2,
      installmentItem: 10,
      payment: 1,
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
      employee: 3,
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
