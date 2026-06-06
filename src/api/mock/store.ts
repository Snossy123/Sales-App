import { createSeedState, type DemoState } from './seed'

const STORAGE_KEY = 'stitch-demo-state'

export function loadState(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw) as DemoState
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
