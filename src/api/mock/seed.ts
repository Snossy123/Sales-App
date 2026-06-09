import type {
  AuthUser,
  Branch,
  Customer,
  Department,
  DepartmentStock,
  GpsProduct,
  GpsStock,
  InstallmentItem,
  InstallmentPlan,
  SalesInvoice,
  SalesInvoiceLine,
  Warehouse,
} from '../types'

export interface DemoUser extends AuthUser {
  password: string
  demo_role: 'super_admin' | 'admin' | 'sales' | 'reviewer' | 'collector'
  section?: 'sales' | 'review' | 'collection'
}

export interface DemoState {
  users: DemoUser[]
  departments: Department[]
  branches: Branch[]
  warehouses: Warehouse[]
  gpsProduct: GpsProduct
  departmentStocks: DepartmentStock[]
  stocks: GpsStock[]
  customers: Customer[]
  invoices: SalesInvoice[]
  counters: {
    department: number
    branch: number
    warehouse: number
    invoice: number
    customer: number
    installmentItem: number
    payment: number
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
      department_id: 1,
      name: 'Nasr City',
      name_ar: 'فرع مدينة نصر',
      code: 'NSR',
      address: 'مدينة نصر، القاهرة',
      is_active: true,
    },
    {
      id: 2,
      department_id: 1,
      name: 'Maadi',
      name_ar: 'فرع المعادي',
      code: 'MAD',
      address: 'المعادي، القاهرة',
      is_active: true,
    },
    {
      id: 3,
      department_id: 2,
      name: 'Tanta',
      name_ar: 'فرع طنطا',
      code: 'TNT',
      address: 'طنطا، الغربية',
      is_active: true,
    },
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

  const customers: Customer[] = [
    {
      id: 1,
      branch_id: 1,
      name: 'أحمد محمود حسن',
      phone: '01012345678',
      national_id: '29001011234567',
      address: 'مدينة نصر، القاهرة',
      city: 'القاهرة',
      status: 'active',
      credit_score: 85,
    },
    {
      id: 2,
      branch_id: 1,
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
      status: 'confirmed',
      payment_term: 'installment',
      payment_status: 'partial',
      total: 17500,
      paid_amount: 5500 + plan1Paid,
      balance_due: 17500 - (5500 + plan1Paid),
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
      department_id: null,
      branch_id: null,
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
      department_id: 2,
      branch_id: 3,
      demo_role: 'admin',
      organization: { id: 1, name: 'GPS Track Egypt', name_ar: 'شركة تتبع GPS' },
      branch: branches.find((b) => b.id === 3) ?? branches[2],
      roles: [{ id: 5, name: 'Department Admin' }],
    },
    {
      id: 2,
      name: 'محمد — مبيعات',
      email: 'sales@demo.test',
      password: 'demo',
      organization_id: 1,
      department_id: 1,
      branch_id: 1,
      demo_role: 'sales',
      section: 'sales',
      organization: { id: 1, name: 'GPS Track Egypt', name_ar: 'شركة تتبع GPS' },
      branch: branches[0],
      roles: [{ id: 2, name: 'Sales' }],
    },
    {
      id: 3,
      name: 'نورهان — مراجعة',
      email: 'reviewer@demo.test',
      password: 'demo',
      organization_id: 1,
      department_id: 1,
      branch_id: 1,
      demo_role: 'reviewer',
      section: 'review',
      organization: { id: 1, name: 'GPS Track Egypt', name_ar: 'شركة تتبع GPS' },
      branch: branches[0],
      roles: [{ id: 3, name: 'Reviewer' }],
    },
    {
      id: 4,
      name: 'كريم — تحصيل',
      email: 'collector@demo.test',
      password: 'demo',
      organization_id: 1,
      department_id: 1,
      branch_id: 1,
      demo_role: 'collector',
      section: 'collection',
      organization: { id: 1, name: 'GPS Track Egypt', name_ar: 'شركة تتبع GPS' },
      branch: branches[0],
      roles: [{ id: 4, name: 'Collector' }],
    },
  ]

  return {
    users,
    departments,
    branches,
    warehouses,
    gpsProduct,
    departmentStocks,
    stocks,
    customers,
    invoices,
    counters: {
      department: 3,
      branch: 4,
      warehouse: 4,
      invoice: 5,
      customer: 4,
      installmentItem: 10,
      payment: 1,
    },
  }
}

export type { SalesInvoice, SalesInvoiceLine, InstallmentPlan, InstallmentItem }
