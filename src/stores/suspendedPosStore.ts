import { create } from 'zustand'
import type { DeviceContractDraft } from './salesDraftStore'

export const SUSPENDED_POS_STORAGE_KEY = 'pos-suspended-contracts-v1'
export interface SuspendedPosContract {
  id: string
  userId: number
  updatedAt: number
  payload: DeviceContractDraft
}
interface UserSession { activeId: string | null; generation: number }
interface StoredState { contracts: SuspendedPosContract[]; sessions: Record<string, UserSession> }
interface DraftStorage { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void }
interface SuspendedPosState extends StoredState {
  saveActive: (userId: number, id: string, payload: DeviceContractDraft, generation: number) => boolean
  park: (userId: number, id: string, payload: DeviceContractDraft, generation: number) => void
  resume: (userId: number, targetId: string, current: (Omit<SuspendedPosContract, 'updatedAt'> & { updatedAt?: number }) | null, generation: number) => void
  finish: (userId: number, generation: number) => void
  remove: (userId: number, id: string) => void
}
const empty = (): StoredState => ({ contracts: [], sessions: {} })
export function createSuspendedPosStore(storage: DraftStorage) {
  let initial = empty()
  try {
    const raw = storage.getItem(SUSPENDED_POS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as StoredState
      if (Array.isArray(parsed.contracts) && parsed.sessions && typeof parsed.sessions === 'object') initial = parsed
    }
  } catch { /* An unavailable store is reported on the first attempted save. */ }
  return create<SuspendedPosState>()((set, get) => {
    const commit = (next: StoredState) => {
      // Persist before publishing the transition: quota errors must leave the form intact.
      const serialized = JSON.stringify(next)
      storage.setItem(SUSPENDED_POS_STORAGE_KEY, serialized)
      set(JSON.parse(serialized) as StoredState)
    }
    const generationOf = (userId: number) => get().sessions[userId]?.generation ?? 0
    const assertGeneration = (userId: number, generation: number) => {
      if (generationOf(userId) !== generation) throw new Error('تغيّرت المسودة المفتوحة. أعد فتح التعاقد قبل المحاولة.')
    }
    const upsert = (contracts: SuspendedPosContract[], contract: SuspendedPosContract) => [
      ...contracts.filter((entry) => entry.userId !== contract.userId || entry.id !== contract.id), contract,
    ]
    return {
      ...initial,
      saveActive: (userId, id, payload, generation) => {
        if (generationOf(userId) !== generation) return false
        const state = get()
        commit({ contracts: upsert(state.contracts, { id, userId, payload, updatedAt: Date.now() }), sessions: { ...state.sessions, [userId]: { activeId: id, generation } } })
        return true
      },
      park: (userId, id, payload, generation) => {
        assertGeneration(userId, generation)
        const state = get()
        commit({ contracts: upsert(state.contracts, { id, userId, payload, updatedAt: Date.now() }), sessions: { ...state.sessions, [userId]: { activeId: null, generation: generation + 1 } } })
      },
      resume: (userId, targetId, current, generation) => {
        assertGeneration(userId, generation)
        const state = get()
        if (!state.contracts.some((entry) => entry.userId === userId && entry.id === targetId)) throw new Error('التعاقد المعلق لم يعد متاحًا.')
        const contracts = current ? upsert(state.contracts, { ...current, updatedAt: Date.now() }) : state.contracts.filter((entry) => entry.userId !== userId || entry.id !== state.sessions[userId]?.activeId || entry.id === targetId)
        commit({ contracts, sessions: { ...state.sessions, [userId]: { activeId: targetId, generation: generation + 1 } } })
      },
      finish: (userId, generation) => {
        assertGeneration(userId, generation)
        const state = get()
        const activeId = state.sessions[userId]?.activeId
        commit({ contracts: state.contracts.filter((entry) => entry.userId !== userId || entry.id !== activeId), sessions: { ...state.sessions, [userId]: { activeId: null, generation: generation + 1 } } })
      },
      remove: (userId, id) => {
        const state = get()
        if (state.sessions[userId]?.activeId === id) throw new Error('لا يمكن حذف التعاقد المفتوح من قائمة المعلّقات.')
        commit({ contracts: state.contracts.filter((entry) => entry.userId !== userId || entry.id !== id), sessions: state.sessions })
      },
    }
  })
}
const browserStorage: DraftStorage = {
  getItem: (key) => typeof localStorage === 'undefined' ? null : localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
}
export const useSuspendedPosStore = createSuspendedPosStore(browserStorage)
export function readActivePosDraft(userId: number | null): DeviceContractDraft | null {
  if (userId === null) return null
  const state = useSuspendedPosStore.getState()
  return state.contracts.find((entry) => entry.userId === userId && entry.id === state.sessions[userId]?.activeId)?.payload ?? null
}
