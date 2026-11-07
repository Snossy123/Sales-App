import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Branch, PaginatedResponse } from '../api/types'
import { canAccessBranch } from '../lib/access'
import { useAuthStore } from '../stores/authStore'

export function useBranchFilterOptions() {
  const user = useAuthStore((state) => state.user)
  const contextBranchId = useAuthStore((state) => state.branchId)
  const query = useQuery({
    queryKey: ['branches', 'review-filter', user?.id, user?.data_scope, user?.allowed_branch_ids, contextBranchId],
    enabled: Boolean(user),
    queryFn: async () => {
      const branches: Branch[] = []
      let page = 1
      let lastPage: number
      do {
        const { data } = await api.get<PaginatedResponse<Branch>>('/branches', {
          params: { per_page: 100, page },
        })
        branches.push(...data.data)
        lastPage = data.last_page ?? 1
        page += 1
      } while (page <= lastPage)
      return branches
    },
  })

  return [
    { value: '', label: query.isLoading ? 'جاري تحميل الفروع…' : query.isError ? 'تعذر تحميل الفروع' : 'كل الفروع' },
    ...(query.data ?? []).filter((branch) => canAccessBranch(user, branch)).map((branch) => ({
      value: String(branch.id), label: branch.name_ar || branch.name,
    })),
  ]
}
