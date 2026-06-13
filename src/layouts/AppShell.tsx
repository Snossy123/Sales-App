import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { SidebarNav } from '../components/SidebarNav'
import { useAuthStore } from '../stores/authStore'
import { useContextData } from '../hooks/useContextData'
import { api, isDemoMode } from '../api/client'
import { getNavEntriesForUser, getRoleLabel, getUserRole } from '../lib/permissions'

export function AppShell() {
  useContextData()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const navEntries = getNavEntriesForUser(user)
  const role = getUserRole(user)
  const showPosShortcut = role === 'super_admin' || role === 'admin' || role === 'sales'

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
      <aside className="fixed right-0 z-50 flex h-full w-64 flex-col border-l border-outline-variant/80 bg-surface-container-lowest shadow-sm">
        <div className="flex min-h-0 flex-1 flex-col gap-xs p-md">
          <div className="mb-md flex items-center gap-base rounded-xl bg-primary/5 p-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-on-primary shadow-sm">
              <Icon name="gps_fixed" filled size={22} className="no-flip" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black text-primary">نظام GPS</span>
              <span className="text-xs text-on-surface-variant">بيع وتقسيط الأجهزة</span>
            </div>
          </div>

          {isDemoMode && (
            <div className="mb-sm rounded-lg bg-primary/5 px-sm py-xs text-xs text-on-surface-variant">
              بيع → مراجعة → أقساط
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            <SidebarNav entries={navEntries} user={user} />
          </div>

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
