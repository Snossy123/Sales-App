import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { BranchSwitcher } from '../components/BranchSwitcher'
import { WarehouseSwitcher } from '../components/WarehouseSwitcher'
import { useAuthStore } from '../stores/authStore'
import { useContextData } from '../hooks/useContextData'
import { api } from '../api/client'

const navItems = [
  { to: '/', icon: 'dashboard', label: 'لوحة التحكم', end: true },
  { to: '/inventory', icon: 'inventory_2', label: 'المخزون' },
  { to: '/pos', icon: 'point_of_sale', label: 'نقطة البيع' },
  { to: '/customers', icon: 'group', label: 'العملاء' },
  { to: '/hr', icon: 'badge', label: 'الموارد البشرية' },
  { to: '/crm', icon: 'handshake', label: 'إدارة العملاء المحتملين' },
]

export function AppShell() {
  useContextData()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      /* ignore */
    }
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="fixed right-0 z-50 flex h-full w-64 flex-col border-l border-outline-variant bg-surface-container-lowest">
        <div className="flex flex-col gap-xs p-md">
          <div className="mb-lg flex items-center gap-base">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-on-primary">
              <Icon name="devices" filled size={22} />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black text-primary">ستيتش سمارت</span>
              <span className="text-xs text-on-surface-variant">نظام التقسيط الذكي</span>
            </div>
          </div>

          <nav className="flex flex-grow flex-col gap-base">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-base rounded-lg p-sm transition-all ${
                    isActive
                      ? 'scale-[0.98] border-r-4 border-primary bg-secondary-container font-bold text-on-secondary-container'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon name={item.icon} filled={isActive} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <NavLink
            to="/pos"
            className="mt-md flex items-center justify-center gap-xs rounded-xl bg-primary py-sm font-bold text-on-primary transition-opacity hover:opacity-90"
          >
            <Icon name="add_shopping_cart" />
            <span className="text-sm">عملية بيع جديدة</span>
          </NavLink>
        </div>

        <div className="mt-auto flex flex-col gap-base border-t border-outline-variant p-md">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-base rounded-lg p-sm text-on-surface-variant transition-all hover:bg-surface-container-high"
          >
            <Icon name="logout" />
            <span className="text-sm">تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      <main className="mr-64 flex h-full flex-grow flex-col overflow-y-auto bg-background">
        <header className="sticky top-0 z-40 flex w-full flex-row-reverse items-center justify-between border-b border-outline-variant bg-surface px-margin py-base">
          <div className="flex flex-row-reverse items-center gap-md">
            <div className="flex flex-row-reverse gap-sm">
              <button
                type="button"
                className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface-container"
              >
                <Icon name="notifications" className="text-primary" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-error" />
              </button>
            </div>
            <div className="mx-sm h-8 w-px bg-outline-variant" />
            <div className="flex items-center gap-sm">
              <div className="text-left leading-none">
                <p className="text-sm font-bold text-on-surface">{user?.name}</p>
                <p className="text-xs text-on-surface-variant">
                  {user?.roles?.[0]?.name ?? 'مستخدم'}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">
                {user?.name?.charAt(0) ?? '؟'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-md">
            <BranchSwitcher />
            <WarehouseSwitcher />
          </div>
        </header>

        <div className="flex-grow p-margin">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
