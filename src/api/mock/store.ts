import { createSeedState, type DemoState } from './seed'

const STORAGE_KEY = 'stitch-demo-state'

function migrateState(state: DemoState): DemoState {
  const seed = createSeedState()
  if (!state.departmentStocks?.length) {
    state.departmentStocks = seed.departmentStocks
  }
  for (const stock of state.stocks) {
    if (stock.sold == null) stock.sold = 0
  }
  if (!state.counters.department) state.counters.department = seed.counters.department
  if (!state.counters.branch) state.counters.branch = seed.counters.branch
  if (!state.counters.warehouse) state.counters.warehouse = seed.counters.warehouse
  if (!state.accountingAccounts?.length) {
    state.accountingAccounts = seed.accountingAccounts
    state.journalEntries = seed.journalEntries
    state.transfers = seed.transfers
    state.budgets = seed.budgets
    state.mappedInvoiceIds = seed.mappedInvoiceIds
    state.accountingSettings = seed.accountingSettings
    state.branchAccountingMaps = seed.branchAccountingMaps
  }
  if (!state.leads?.length) state.leads = seed.leads
  if (!state.portalUsers?.length) state.portalUsers = seed.portalUsers
  if (!state.crmSchedules?.length) state.crmSchedules = seed.crmSchedules
  if (!state.crmCampaigns?.length) state.crmCampaigns = seed.crmCampaigns
  if (!state.crmProposals?.length) state.crmProposals = seed.crmProposals
  if (!state.crmProposalTemplates?.length) state.crmProposalTemplates = seed.crmProposalTemplates
  if (!state.crmSettings) state.crmSettings = seed.crmSettings
  if (!state.hrmSettings) state.hrmSettings = seed.hrmSettings
  if (!state.employees?.length) {
    state.employees = seed.employees
    state.hrmLeaveTypes = seed.hrmLeaveTypes
    state.hrmJobs = seed.hrmJobs
    state.hrmLeaves = seed.hrmLeaves
    state.hrmShifts = seed.hrmShifts
    state.hrmUserShifts = seed.hrmUserShifts
    state.hrmAttendance = seed.hrmAttendance
    state.hrmHolidays = seed.hrmHolidays
    state.hrmAllowances = seed.hrmAllowances
    state.hrmPayrollRecords = seed.hrmPayrollRecords
    state.hrmPayrollGroups = seed.hrmPayrollGroups
  }
  const seedTechnician = seed.employees.find((employee) => employee.job_title?.includes('فني'))
  if (seedTechnician && !state.employees.some((employee) => employee.job_title?.includes('فني'))) {
    state.employees.push(seedTechnician)
    if (!state.hrmJobs?.some((job) => job.id === seedTechnician.hrm_job_id)) {
      const job = seed.hrmJobs.find((item) => item.id === seedTechnician.hrm_job_id)
      if (job) state.hrmJobs.push(job)
    }
  }
  if (!state.hrmJobs?.length) {
    state.hrmJobs = seed.hrmJobs
    for (const emp of state.employees ?? []) {
      if (emp.hrm_job_id) continue
      const match = state.hrmJobs.find((job) => job.name === emp.job_title)
      if (match) emp.hrm_job_id = match.id
    }
  }
  if (!state.users.some((u) => u.demo_role === 'hr_manager')) {
    const hrUser = seed.users.find((u) => u.demo_role === 'hr_manager')
    if (hrUser) state.users.push(hrUser)
  }
  if (!state.adminRoles?.length) state.adminRoles = seed.adminRoles
  if (!state.adminActivityLogs?.length) state.adminActivityLogs = seed.adminActivityLogs
  if (!state.organizationProfile) state.organizationProfile = seed.organizationProfile
  if (!state.generalSettings) state.generalSettings = seed.generalSettings
  if (!state.salesSettings) state.salesSettings = seed.salesSettings
  if (!state.securitySettings) state.securitySettings = seed.securitySettings
  if (!state.messagingSettings) state.messagingSettings = seed.messagingSettings
  if (!state.customerMessageLogs?.length) state.customerMessageLogs = seed.customerMessageLogs
  if (!state.distributors?.length) {
    state.distributors = seed.distributors
    state.customers = seed.customers
    state.invoices = seed.invoices
  }
  if (!state.expenseRequests?.length) state.expenseRequests = seed.expenseRequests
  if (!state.paymentTransactions?.length && seed.paymentTransactions?.length) {
    state.paymentTransactions = seed.paymentTransactions
  }
  if (!state.dailyBranchReports?.length) {
    state.dailyBranchReports = seed.dailyBranchReports
  }
  if (!state.services?.length) {
    state.services = seed.services
    if (!state.counters.service) state.counters.service = seed.counters.service
  }
  if (!state.accessories?.length) {
    state.accessories = seed.accessories
    state.accessoryPackages = seed.accessoryPackages
    state.accessoryStocks = seed.accessoryStocks
  }
  if (!state.accessoryPackages) state.accessoryPackages = seed.accessoryPackages
  if (!state.accessoryStocks) state.accessoryStocks = seed.accessoryStocks
  if (!state.counters.distributor) state.counters.distributor = seed.counters.distributor
  if (!state.counters.dailyBranchReport) {
    state.counters.dailyBranchReport = seed.counters.dailyBranchReport
  }
  if (!state.paymentVerificationLogs) state.paymentVerificationLogs = []
  if (!state.collectionFollowUpLogs) state.collectionFollowUpLogs = []
  if (!state.counters.paymentVerification) state.counters.paymentVerification = 1
  if (!state.counters.collectionFollowUp) state.counters.collectionFollowUp = 1
  for (const extra of seed.invoices.filter((invoice) => invoice.id >= 8)) {
    if (!state.invoices.some((invoice) => invoice.invoice_number === extra.invoice_number)) {
      state.invoices.push(extra)
    }
  }
  for (const extra of seed.customers.filter((customer) => customer.id >= 4)) {
    const index = state.customers.findIndex((customer) => customer.id === extra.id || customer.phone === extra.phone)
    if (index < 0) state.customers.push(extra)
    else state.customers[index] = extra
  }
  for (const extra of seed.invoices.filter((invoice) => String(invoice.invoice_number ?? '').startsWith('INV-COL-'))) {
    const index = state.invoices.findIndex((invoice) => invoice.invoice_number === extra.invoice_number)
    if (index < 0) state.invoices.push(extra)
    else state.invoices[index] = extra
  }
  for (const log of seed.collectionFollowUpLogs ?? []) {
    if (!state.collectionFollowUpLogs.some((row) => row.id === log.id)) {
      state.collectionFollowUpLogs.push(log)
    }
  }
  if ((state.counters.invoice ?? 0) < seed.counters.invoice) state.counters.invoice = seed.counters.invoice
  if ((state.counters.customer ?? 0) < seed.counters.customer) state.counters.customer = seed.counters.customer
  if ((state.counters.installmentItem ?? 0) < seed.counters.installmentItem) {
    state.counters.installmentItem = seed.counters.installmentItem
  }
  if ((state.counters.collectionFollowUp ?? 0) < (seed.counters.collectionFollowUp ?? 0)) {
    state.counters.collectionFollowUp = seed.counters.collectionFollowUp
  }
  return state
}

export function loadState(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return migrateState(JSON.parse(raw) as DemoState)
    }
  } catch {
    /* ignore corrupt state */
  }
  return createSeedState()
}

export function saveState(state: DemoState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function resetState(): DemoState {
  const state = createSeedState()
  saveState(state)
  return state
}

export function mutateState(mutator: (state: DemoState) => void): DemoState {
  const state = loadState()
  mutator(state)
  saveState(state)
  return state
}
