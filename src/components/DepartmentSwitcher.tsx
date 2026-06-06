import { useContextStore } from '../stores/contextStore'
import { useAuthStore } from '../stores/authStore'

export function DepartmentSwitcher() {
  const { departments, departmentsLoading } = useContextStore()
  const departmentId = useAuthStore((s) => s.departmentId)
  const selectDepartment = useContextStore((s) => s.selectDepartment)

  return (
    <label className="flex items-center gap-xs text-sm">
      <span className="text-on-surface-variant">الإدارة</span>
      <select
        value={departmentId ?? ''}
        onChange={(e) => selectDepartment(Number(e.target.value))}
        disabled={departmentsLoading || departments.length === 0}
        className="min-w-[140px] rounded border border-outline-variant bg-surface-container-lowest px-sm py-1.5 text-on-surface focus:border-primary focus:outline-none"
      >
        <option value="" disabled>
          اختر الإدارة
        </option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name_ar || d.name}
          </option>
        ))}
      </select>
    </label>
  )
}
