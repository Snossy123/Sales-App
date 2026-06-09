import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { useAuthStore } from '../stores/authStore'
import { useContextData } from '../hooks/useContextData'
import { api, isDemoMode } from '../api/client'
import { getNavForUser, getRoleLabel, getUserRole, type NavItem } from '../lib/permissions'

function isNavItemActive(item: NavItem, pathname: string) {
  const normalized = pathname.replace(/\/$/, '') || '/'
  if (item.to === '/branches') {
    return normalized === '/branches' || /^\/branches\/\d+$/.test(normalized)
  }
  if (item.end) return normalized === item.to
  return normalized === item.to || normalized.startsWith(`${item.to}/`)
}

export function AppShell() {
  useContextData()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const navItems = getNavForUser(user)
  const role = getUserRole(user)
  const showPosShortcut = role === 'admin' || role === 'sales'

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
              <Icon name="gps_fixed" filled size={22} className="no-flip" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black text-primary">نظام GPS</span>
              <span className="text-xs text-on-surface-variant">بيع وتقسيط الأجهزة</span>
            </div>
          </div>

          {isDemoMode && (
            <div className="mb-sm rounded-lg bg-primary/5 px-sm py-xs text-xs text-on-surface-variant">
              بيع → مراجعة → أقساط
            </div>
          )}

          <nav className="flex flex-grow flex-col gap-base">
            {navItems.map((item) => {
              const isActive = isNavItemActive(item, location.pathname)
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={`flex items-center gap-base rounded-lg p-sm transition-all ${
                    isActive
                      ? 'scale-[0.98] border-r-4 border-primary bg-secondary-container font-bold text-on-secondary-container'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  <Icon name={item.icon} filled={isActive} className="no-flip" />
                  <span className="text-sm font-medium">{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          {showPosShortcut && (
            <NavLink
              to="/pos"
              className="mt-md flex items-center justify-center gap-xs rounded-xl bg-primary py-sm font-bold text-on-primary transition-opacity hover:opacity-90"
            >
              <Icon name="add_shopping_cart" className="no-flip" />
              <span className="text-sm">عملية بيع جديدة</span>
            </NavLink>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-base border-t border-outline-variant p-md">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-base rounded-lg p-sm text-on-surface-variant transition-all hover:bg-surface-container-high"
          >
            <Icon name="logout" className="no-flip" />
            <span className="text-sm">تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      <main className="mr-64 flex h-full flex-grow flex-col overflow-y-auto bg-background">
        <header className="sticky top-0 z-40 flex w-full items-center justify-end border-b border-outline-variant bg-surface px-margin py-base">
          <div className="flex flex-row-reverse items-center gap-md">
            <div className="flex flex-row-reverse gap-sm">
              <button
                type="button"
                className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface-container"
              >
                <Icon name="notifications" className="text-primary no-flip" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-error" />
              </button>
            </div>
            <div className="mx-sm h-8 w-px bg-outline-variant" />
            <div className="flex items-center gap-sm">
              <div className="text-left leading-none">
                <p className="text-sm font-bold text-on-surface">{user?.name}</p>
                <p className="text-xs text-on-surface-variant">{getRoleLabel(user)}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">
                {user?.name?.charAt(0) ?? '؟'}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-grow p-margin">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
