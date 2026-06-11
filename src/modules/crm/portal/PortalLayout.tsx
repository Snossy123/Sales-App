import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Icon } from '../../../components/Icon'
import { portalApi } from '../../../api/portalClient'
import { usePortalAuthStore } from '../../../stores/portalAuthStore'

const navItems = [
  { to: '/portal', label: 'لوحة التحكم', icon: 'dashboard', end: true },
  { to: '/portal/invoices', label: 'الفواتير', icon: 'receipt_long' },
  { to: '/portal/ledger', label: 'كشف الحساب', icon: 'account_balance' },
]

export function PortalLayout() {
  const user = usePortalAuthStore((s) => s.user)
  const logout = usePortalAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await portalApi.post('/portal/auth/logout')
    } catch {
      /* ignore */
    }
    logout()
    navigate('/portal/login')
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="fixed right-0 z-50 flex h-full w-56 flex-col border-l border-outline-variant bg-surface-container-lowest">
        <div className="border-b border-outline-variant p-md">
          <div className="flex items-center gap-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-on-secondary">
              <Icon name="person" size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface">{user?.name}</p>
              <p className="text-xs text-on-surface-variant">بوابة العميل</p>
            </div>
          </div>
        </div>

        <nav className="flex flex-col gap-xs p-sm">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-sm rounded-lg px-sm py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-secondary-container font-bold text-on-secondary-container'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`
              }
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-outline-variant p-sm">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-sm rounded-lg px-sm py-2 text-sm text-on-surface-variant hover:bg-surface-container-high"
          >
            <Icon name="logout" size={18} />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      <main className="mr-56 flex-1 p-margin">
        <Outlet />
      </main>
    </div>
  )
}
