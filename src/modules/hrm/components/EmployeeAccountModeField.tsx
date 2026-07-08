import type { AdminUser } from '../../../api/types'

export type EmployeeAccountMode = 'none' | 'auto' | 'link'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

const modeOptions: { value: EmployeeAccountMode; label: string }[] = [
  { value: 'none', label: 'بدون حساب' },
  { value: 'auto', label: 'حساب تلقائي' },
  { value: 'link', label: 'ربط موجود' },
]

interface EmployeeAccountModeFieldProps {
  mode: EmployeeAccountMode
  linkedUserId: number | ''
  onModeChange: (mode: EmployeeAccountMode) => void
  onLinkedUserChange: (userId: number | '', user?: AdminUser) => void
  users: AdminUser[]
  isLoading?: boolean
}

export function inferEmployeeAccountMode(employee: { user_id?: number | null }): EmployeeAccountMode {
  return employee.user_id ? 'link' : 'none'
}

export function EmployeeAccountModeField({
  mode,
  linkedUserId,
  onModeChange,
  onLinkedUserChange,
  users,
  isLoading,
}: EmployeeAccountModeFieldProps) {
  return (
    <div className="sm:col-span-2 space-y-sm">
      <p className="text-xs text-on-surface-variant">حساب المستخدم</p>
      <div className="flex flex-wrap gap-xs rounded-lg border border-outline-variant p-1">
        {modeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onModeChange(option.value)}
            className={`flex-1 rounded-md px-sm py-1.5 text-xs font-semibold transition-colors ${
              mode === option.value
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {mode === 'link' && (
        <select
          value={linkedUserId}
          onChange={(e) => {
            const userId = e.target.value ? Number(e.target.value) : ''
            const user = typeof userId === 'number' ? users.find((row) => row.id === userId) : undefined
            onLinkedUserChange(userId, user)
          }}
          disabled={isLoading}
          required
          aria-label="المستخدم المرتبط"
          className={inputClass}
        >
          <option value="">{isLoading ? 'جاري التحميل...' : 'اختر مستخدماً'}</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.email}
            </option>
          ))}
        </select>
      )}

      {mode === 'auto' && (
        <p className="text-[11px] leading-relaxed text-on-surface-variant">
          سيُنشأ حساب دخول تلقائياً ببريد مُولَّد وكلمة مرور افتراضية من إعدادات النظام.
        </p>
      )}

      {mode === 'none' && (
        <p className="text-[11px] leading-relaxed text-on-surface-variant">
          سجل موظف فقط بدون حساب دخول للنظام.
        </p>
      )}
    </div>
  )
}
