import { useContextStore } from '../stores/contextStore'
import { useAuthStore } from '../stores/authStore'

export function BranchSwitcher() {
  const { branches, branchesLoading } = useContextStore()
  const branchId = useAuthStore((s) => s.branchId)
  const selectBranch = useContextStore((s) => s.selectBranch)

  return (
    <label className="flex items-center gap-xs text-sm">
      <span className="text-on-surface-variant">الفرع</span>
      <select
        value={branchId ?? ''}
        onChange={(e) => selectBranch(Number(e.target.value))}
        disabled={branchesLoading || branches.length === 0}
        className="min-w-[140px] rounded border border-outline-variant bg-surface-container-lowest px-sm py-1.5 text-on-surface focus:border-primary focus:outline-none"
      >
        <option value="" disabled>
          اختر الفرع
        </option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name_ar || b.name}
          </option>
        ))}
      </select>
    </label>
  )
}
