import { useMutation } from '@tanstack/react-query'
import { useContextStore } from '../stores/contextStore'
import { useAuthStore } from '../stores/authStore'
import { canPickBranch } from '../lib/dataScope'
import { persistActiveBranch } from '../lib/activeBranch'

export function BranchSwitcher() {
  const user = useAuthStore((s) => s.user)
  const { branches, branchesLoading } = useContextStore()
  const branchId = useAuthStore((s) => s.branchId)
  const selectBranch = useContextStore((s) => s.selectBranch)

  const saveMutation = useMutation({
    mutationFn: async (nextBranchId: number) => {
      if (!user) return
      if (user.permissions?.includes('scope.branches') || user.data_scope === 'branches') {
        await persistActiveBranch(user, nextBranchId)
      }
    },
  })

  if (!canPickBranch(user)) {
    return null
  }

  return (
    <label className="flex items-center gap-xs text-sm">
      <span className="text-on-surface-variant">فرع اليوم</span>
      <select
        value={branchId ?? ''}
        onChange={(e) => {
          const nextBranchId = Number(e.target.value)
          selectBranch(nextBranchId)
          saveMutation.mutate(nextBranchId)
        }}
        disabled={branchesLoading || branches.length === 0 || saveMutation.isPending}
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
