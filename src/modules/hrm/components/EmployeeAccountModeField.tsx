import { useState } from 'react'
import { SearchableSelect } from '../../../components/SearchableSelect'
import type { AdminUser } from '../../../api/types'

export type EmployeeAccountMode = 'none' | 'auto' | 'link'

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
  const [userSearch, setUserSearch] = useState('')
  const search = userSearch.trim().toLocaleLowerCase()
  const filteredUsers = users.filter((user) =>
    `${user.name} ${user.email}`.toLocaleLowerCase().includes(search),
  )

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
        <SearchableSelect
          options={filteredUsers}
          value={users.find((user) => user.id === linkedUserId) ?? null}
          onChange={(user) => {
            onLinkedUserChange(user?.id ?? '', user ?? undefined)
            setUserSearch('')
          }}
          onSearchChange={setUserSearch}
          getOptionValue={(user) => user.id}
          getOptionLabel={(user) => user.email}
          placeholder={isLoading ? 'جاري التحميل...' : 'ابحث بالاسم أو البريد الإلكتروني'}
          loading={isLoading}
          disabled={isLoading}
          required
          aria-label="المستخدم المرتبط"
        />
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
