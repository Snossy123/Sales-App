import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AccessoriesDraft,
  DeviceContractDraft,
  ServiceContractDraft,
} from './salesDraftStore'

export const PROCEDURE_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000
export const PROCEDURE_DRAFT_STORAGE_KEY = 'procedure-drafts'
const LEGACY_SALES_DRAFT_KEY = 'sales-form-drafts'

export const PROCEDURE_DRAFT_IDS = {
  posDevice: 'pos.device',
  posService: 'pos.service',
  accessories: 'sales.accessories',
  customerCreate: 'customers.create',
  customerEdit: (id: string | number) => `customers.edit:${id}`,
  deviceMovement: 'inventory.movement',
  expense: 'expenses.new',
  installments: 'installments.collect',
  contractProblem: (id: string | number) => `contracts.problem:${id}`,
} as const

export type ProcedureDraft<T = unknown> = {
  id: string
  userId: number
  titleAr: string
  resumePath: string
  updatedAt: number
  payload: T
}

interface ProcedureDraftState {
  drafts: ProcedureDraft[]
  upsertDraft: (draft: Omit<ProcedureDraft, 'updatedAt'> & { updatedAt?: number }) => void
  clearDraft: (id: string, userId?: number | null) => void
  clearUserDrafts: (userId: number) => void
}

function isFresh(draft: ProcedureDraft, now = Date.now()): boolean {
  return now - draft.updatedAt < PROCEDURE_DRAFT_TTL_MS
}

function pruneDrafts(drafts: ProcedureDraft[], now = Date.now()): ProcedureDraft[] {
  return drafts.filter((draft) => isFresh(draft, now))
}

export function selectUserDrafts(
  drafts: ProcedureDraft[],
  userId: number | null,
): ProcedureDraft[] {
  if (userId == null) return []
  return pruneDrafts(drafts)
    .filter((draft) => draft.userId === userId)
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

function readPersistedDrafts(): ProcedureDraft[] {
  try {
    const raw = localStorage.getItem(PROCEDURE_DRAFT_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { state?: { drafts?: ProcedureDraft[] } }
    return pruneDrafts(parsed.state?.drafts ?? [])
  } catch {
    return []
  }
}

function draftKey(draft: Pick<ProcedureDraft, 'id' | 'userId'>): string {
  return `${draft.userId}:${draft.id}`
}

function mergeDraftLists(...lists: ProcedureDraft[][]): ProcedureDraft[] {
  const byKey = new Map<string, ProcedureDraft>()
  for (const list of lists) {
    for (const draft of pruneDrafts(list)) {
      const key = draftKey(draft)
      const prev = byKey.get(key)
      if (!prev || draft.updatedAt >= prev.updatedAt) byKey.set(key, draft)
    }
  }
  return [...byKey.values()]
}

export function readProcedureDraft<T>(id: string, userId: number | null): T | null {
  if (userId == null) return null
  const drafts = mergeDraftLists(useProcedureDraftStore.getState().drafts, readPersistedDrafts())
  const draft = selectUserDrafts(drafts, userId).find((item) => item.id === id)
  return (draft?.payload as T | undefined) ?? null
}

function upsertInto(drafts: ProcedureDraft[], next: ProcedureDraft): ProcedureDraft[] {
  const pruned = pruneDrafts(drafts, next.updatedAt)
  const index = pruned.findIndex((draft) => draft.id === next.id && draft.userId === next.userId)
  if (index === -1) return [...pruned, next]
  const copy = [...pruned]
  copy[index] = next
  return copy
}

function migrateLegacySalesDrafts(): ProcedureDraft[] {
  try {
    const raw = sessionStorage.getItem(LEGACY_SALES_DRAFT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as {
      state?: {
        userId?: number | null
        deviceContract?: DeviceContractDraft | null
        serviceContract?: ServiceContractDraft | null
        accessories?: AccessoriesDraft | null
      }
    }
    sessionStorage.removeItem(LEGACY_SALES_DRAFT_KEY)
    const state = parsed.state
    if (!state || state.userId == null) return []
    const userId = state.userId

    const now = Date.now()
    const migrated: ProcedureDraft[] = []
    if (state.deviceContract) {
      migrated.push({
        id: PROCEDURE_DRAFT_IDS.posDevice,
        userId,
        titleAr: 'تعاقد أجهزة',
        resumePath: '/pos',
        updatedAt: now,
        payload: state.deviceContract,
      })
    }
    if (state.serviceContract) {
      migrated.push({
        id: PROCEDURE_DRAFT_IDS.posService,
        userId,
        titleAr: 'تعاقد خدمات',
        resumePath: '/pos/services',
        updatedAt: now,
        payload: state.serviceContract,
      })
    }
    if (state.accessories) {
      migrated.push({
        id: PROCEDURE_DRAFT_IDS.accessories,
        userId,
        titleAr: 'بيع إكسسوار',
        resumePath: '/sales/accessories',
        updatedAt: now,
        payload: state.accessories,
      })
    }
    return migrated
  } catch {
    try {
      sessionStorage.removeItem(LEGACY_SALES_DRAFT_KEY)
    } catch {
      /* ignore */
    }
    return []
  }
}

function loadDraftsSync(): ProcedureDraft[] {
  return mergeDraftLists(readPersistedDrafts(), migrateLegacySalesDrafts())
}

export const useProcedureDraftStore = create<ProcedureDraftState>()(
  persist(
    (set) => ({
      drafts: loadDraftsSync(),

      upsertDraft: (draft) =>
        set((state) => ({
          drafts: upsertInto(state.drafts, {
            ...draft,
            updatedAt: draft.updatedAt ?? Date.now(),
          }),
        })),

      clearDraft: (id, userId) =>
        set((state) => ({
          drafts: state.drafts.filter((draft) =>
            userId == null ? draft.id !== id : !(draft.id === id && draft.userId === userId),
          ),
        })),

      clearUserDrafts: (userId) =>
        set((state) => ({
          drafts: state.drafts.filter((draft) => draft.userId !== userId),
        })),
    }),
    {
      name: PROCEDURE_DRAFT_STORAGE_KEY,
      partialize: (state) => ({ drafts: pruneDrafts(state.drafts) }),
      merge: (persisted, current) => {
        const persistedDrafts =
          persisted && typeof persisted === 'object' && 'drafts' in persisted
            ? ((persisted as { drafts?: ProcedureDraft[] }).drafts ?? [])
            : []
        return {
          ...current,
          drafts: mergeDraftLists(current.drafts, persistedDrafts, migrateLegacySalesDrafts()),
        }
      },
    },
  ),
)
