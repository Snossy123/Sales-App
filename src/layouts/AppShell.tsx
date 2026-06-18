import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Icon } from '../components/Icon'
import { SidebarNav } from '../components/SidebarNav'
import { TourProvider } from '../components/tour/TourProvider'
import { useAuthStore } from '../stores/authStore'
import { useContextData } from '../hooks/useContextData'
import { useOrgSettingsBootstrap } from '../hooks/useOrgSettings'
import { useSessionTimeout } from '../hooks/useSessionTimeout'
import { useOrgSettingsStore } from '../stores/orgSettingsStore'
import { api, isDemoMode } from '../api/client'
import type { AppNotification } from '../api/types'
import { getNavEntriesForUser, getRoleLabel, getUserRole } from '../lib/permissions'
import { resolvePublicStorageUrl } from '../lib/storageUrl'
import { ChatbotWidget } from '../components/help/ChatbotWidget'

export function AppShell() {
  useContextData()
  useOrgSettingsBootstrap()
  useSessionTimeout()
  const user = useAuthStore((s) => s.user)
  const organization = useOrgSettingsStore((s) => s.organization)
  const general = useOrgSettingsStore((s) => s.general)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const navEntries = getNavEntriesForUser(user)
  const role = getUserRole(user)
  const showPosShortcut = role === 'super_admin' || role === 'admin' || role === 'sales'
  const queryClient = useQueryClient()
  const [showNotifications, setShowNotifications] = useState(false)

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
      <aside className="fixed right-0 z-50 flex h-full w-64 flex-col border-l border-outline-variant/80 bg-surface-container-lowest shadow-sm">
        <div className="flex min-h-0 flex-1 flex-col gap-xs p-md">
          <div className="mb-md flex items-center gap-base rounded-xl bg-primary/5 p-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary text-on-primary shadow-sm">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-full w-full object-contain" />
              ) : (
                <Icon name="gps_fixed" filled size={22} className="no-flip" />
              )}
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-base font-black text-primary">{orgName}</span>
            </div>
          </div>

          {isDemoMode && (
            <div className="mb-sm rounded-lg bg-primary/5 px-sm py-xs text-xs text-on-surface-variant">
              تعاقد → أقساط → مراجعة
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
              <Icon name="edit_document" className="no-flip" />
              <span className="text-sm">تعاقد جديد</span>
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
        <ChatbotWidget />
      </main>
    </div>
    </TourProvider>
  )
}
