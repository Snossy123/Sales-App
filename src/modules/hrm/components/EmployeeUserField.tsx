import type { AdminUser } from '../../../api/types'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

interface EmployeeUserFieldProps {
  value: number | ''
  onChange: (userId: number | '', user?: AdminUser) => void
  users: AdminUser[]
  isLoading?: boolean
}

export function EmployeeUserField({ value, onChange, users, isLoading }: EmployeeUserFieldProps) {
  return (
    <select
      value={value}
      onChange={(e) => {
        const userId = e.target.value ? Number(e.target.value) : ''
        const user = typeof userId === 'number' ? users.find((row) => row.id === userId) : undefined
        onChange(userId, user)
      }}
      disabled={isLoading}
      aria-label="حساب المستخدم"
      className={inputClass}
    >
      <option value="">{isLoading ? 'جاري التحميل...' : 'إنشاء حساب تلقائياً'}</option>
      {users.map((user) => (
        <option key={user.id} value={user.id}>
          {user.email}
        </option>
      ))}
    </select>
  )
}
