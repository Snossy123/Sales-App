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
