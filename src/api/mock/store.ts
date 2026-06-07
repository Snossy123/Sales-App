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
