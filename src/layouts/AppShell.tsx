import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Icon } from '../components/Icon'
import { MobileBottomNav } from '../components/MobileBottomNav'
import { SidebarNav } from '../components/SidebarNav'
import { TourProvider } from '../components/tour/TourProvider'
import { useAuthStore } from '../stores/authStore'
import { useContextData } from '../hooks/useContextData'
import { useOrgSettingsBootstrap } from '../hooks/useOrgSettings'
import { useSessionTimeout } from '../hooks/useSessionTimeout'
import { useOrgSettingsStore } from '../stores/orgSettingsStore'
import { api, isDemoMode } from '../api/client'
import type { AppNotification } from '../api/types'
import { useAuthRefresh } from '../hooks/useAuthRefresh'
import { getNavEntriesForUser, getRoleLabel, getUserRole } from '../lib/permissions'
import { getDataScopeLabel } from '../lib/dataScope'
import { resolvePublicStorageUrl } from '../lib/storageUrl'
import { ChatWidget } from '../modules/chat/components/ChatWidget'
import { ChatbotWidget } from '../components/help/ChatbotWidget'

export function AppShell() {
  useContextData()
  useOrgSettingsBootstrap()
  useSessionTimeout()
  useAuthRefresh()
  const user = useAuthStore((s) => s.user)
  const organization = useOrgSettingsStore((s) => s.organization)
  const general = useOrgSettingsStore((s) => s.general)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const navEntries = getNavEntriesForUser(user)
  const role = getUserRole(user)
  const dataScopeLabel = getDataScopeLabel(user)
  const showPosShortcut = role === 'super_admin' || role === 'admin' || role === 'sales'
  const queryClient = useQueryClient()
  const [showNotifications, setShowNotifications] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('sidebar-collapsed') === 'true',
  )

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(sidebarCollapsed))
  }, [sidebarCollapsed])

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get<{ data: AppNotification[]; unread_count: number }>(
        '/notifications',
      )
      return data
    },
    refetchInterval: 60000,
  })

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read-all')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const unreadCount = notificationsQuery.data?.unread_count ?? 0

  const orgName = organization?.name_ar || organization?.name || 'العراقي'
  const logoUrl = resolvePublicStorageUrl(general?.logo_url)

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
    <TourProvider>
    <div className="flex h-screen overflow-hidden bg-background">
      <aside
        className={`fixed right-0 z-50 flex h-full flex-col border-l border-outline-variant/80 bg-surface-container-lowest shadow-sm transition-all duration-300 ${
          sidebarCollapsed ? 'w-[4.5rem]' : 'w-64'
        }`}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-xs p-md">
          <div
            className={`mb-md flex items-center rounded-xl bg-primary/5 p-sm ${
              sidebarCollapsed ? 'justify-center' : 'gap-base'
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary text-on-primary shadow-sm">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-full w-full object-contain" />
              ) : (
                <Icon name="gps_fixed" filled size={22} className="no-flip" />
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-base font-black text-primary">{orgName}</span>
              </div>
            )}
          </div>

          {isDemoMode && !sidebarCollapsed && (
            <div className="mb-sm rounded-lg bg-primary/5 px-sm py-xs text-xs text-on-surface-variant">
              تعاقد → أقساط → مراجعة
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <SidebarNav
              entries={navEntries}
              user={user}
              collapsed={sidebarCollapsed}
              onExpand={() => setSidebarCollapsed(false)}
            />
          </div>

          {showPosShortcut && (
            <NavLink
              to="/pos"
              title="تعاقد جديد"
              className={`mt-md flex items-center justify-center gap-xs rounded-xl bg-primary py-sm font-bold text-on-primary transition-opacity hover:opacity-90 ${
                sidebarCollapsed ? 'px-sm' : ''
              }`}
            >
              <Icon name="edit_document" className="no-flip" />
              {!sidebarCollapsed && <span className="text-sm">تعاقد جديد</span>}
            </NavLink>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-base border-t border-outline-variant p-md">
          <button
            type="button"
            onClick={handleLogout}
            title="تسجيل الخروج"
            className={`flex items-center rounded-lg p-sm text-on-surface-variant transition-all hover:bg-surface-container-high ${
              sidebarCollapsed ? 'justify-center' : 'gap-base'
            }`}
          >
            <Icon name="logout" className="no-flip" />
            {!sidebarCollapsed && <span className="text-sm">تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      <main
        className={`flex h-full flex-grow flex-col overflow-y-auto bg-background transition-all duration-300 ${
          sidebarCollapsed ? 'mr-[4.5rem]' : 'mr-64'
        }`}
      >
        <header className="sticky top-0 z-40 flex w-full items-center justify-between gap-sm border-b border-outline-variant bg-surface px-margin py-base">
          <button
            type="button"
            onClick={() => setSidebarCollapsed((value) => !value)}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface-container"
            title={sidebarCollapsed ? 'فتح القائمة' : 'إغلاق القائمة'}
            aria-label={sidebarCollapsed ? 'فتح القائمة' : 'إغلاق القائمة'}
          >
            <Icon name={sidebarCollapsed ? 'menu' : 'menu_open'} className="text-primary no-flip" />
          </button>

          <div className="flex flex-row-reverse items-center gap-md">
            <div className="flex flex-row-reverse gap-sm">
              <ChatWidget />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNotifications((v) => !v)}
                  className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface-container"
                >
                  <Icon name="notifications" className="text-primary no-flip" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg">
                    <div className="flex items-center justify-between border-b border-outline-variant px-sm py-xs">
                      <span className="text-sm font-bold">الإشعارات</span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => markAllReadMutation.mutate()}
                          className="text-xs text-primary hover:underline"
                        >
                          تعليم الكل كمقروء
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {(notificationsQuery.data?.data ?? []).length === 0 ? (
                        <p className="p-sm text-center text-xs text-on-surface-variant">
                          لا توجد إشعارات
                        </p>
                      ) : (
                        notificationsQuery.data?.data.map((n) => (
                          <div
                            key={n.id}
                            className={`border-b border-outline-variant/50 px-sm py-xs text-right last:border-0 ${
                              n.read_at ? 'opacity-60' : 'bg-primary/5'
                            }`}
                          >
                            <p className="text-xs font-bold">{n.title}</p>
                            <p className="text-xs text-on-surface-variant">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="mx-sm h-8 w-px bg-outline-variant" />
            <div className="flex items-center gap-sm">
              <Link
                to="/profile"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary hover:opacity-90"
                title="حسابي"
              >
                {user?.name?.charAt(0) ?? '؟'}
              </Link>
              <div className="text-left leading-none">
                <Link to="/profile" className="text-sm font-bold text-on-surface hover:text-primary">
                  {user?.name}
                </Link>
                <p className="text-xs text-on-surface-variant">{getRoleLabel(user)}</p>
                {dataScopeLabel && (
                  <p className="text-[11px] text-on-surface-variant/80">{dataScopeLabel}</p>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-grow p-margin pb-20 md:pb-margin">
          <Outlet />
        </div>
        <ChatbotWidget />
        <MobileBottomNav user={user} />
      </main>
    </div>
    </TourProvider>
  )
}
