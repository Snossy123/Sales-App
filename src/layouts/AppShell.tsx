import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Icon } from '../components/Icon'
import { BranchSwitcher } from '../components/BranchSwitcher'
import { MobileBottomNav } from '../components/MobileBottomNav'
import { SidebarNav } from '../components/SidebarNav'
import { TourProvider } from '../components/tour/TourProvider'
import { useAuthStore } from '../stores/authStore'
import { useContextStore } from '../stores/contextStore'
import { useContextData } from '../hooks/useContextData'
import { useOrgSettingsBootstrap } from '../hooks/useOrgSettings'
import { useSessionTimeout } from '../hooks/useSessionTimeout'
import { useOrgSettingsStore } from '../stores/orgSettingsStore'
import { api } from '../api/client'
import type { AppNotification } from '../api/types'
import { useAuthRefresh } from '../hooks/useAuthRefresh'
import { getNavEntriesForUser, getRoleLabel, getUserRole } from '../lib/permissions'
import { getDataScopeLabel } from '../lib/dataScope'
import { resolvePublicStorageUrl } from '../lib/storageUrl'
import { ChatWidget } from '../modules/chat/components/ChatWidget'
import { ChatbotWidget } from '../components/help/ChatbotWidget'
import { BranchStockTickerBar } from '../components/BranchStockTickerBar'
import { SyncStatusIndicator } from '../components/SyncStatusIndicator'
import { ContentLoader } from '../components/ContentLoader'
import { FontSizeControl } from '../components/FontSizeControl'
import { IncompleteProceduresBanner } from '../components/IncompleteProceduresBanner'
import {
  PROCEDURE_DRAFT_IDS,
  selectUserDrafts,
  useProcedureDraftStore,
} from '../stores/procedureDraftStore'

function isContractPrintPath(pathname: string): boolean {
  return (
    /\/(contract-print|ownership-transfer-contract|service-contract)(\/|$)/.test(pathname) ||
    /^\/daily-reports\/[^/]+\/print\/?$/.test(pathname)
  )
}

function shouldShowStockTicker(pathname: string): boolean {
  return (
    pathname === '/pos' ||
    pathname.startsWith('/pos/') ||
    pathname === '/sales/accessories' ||
    pathname.startsWith('/sales/accessories/') ||
    pathname === '/invoices' ||
    pathname.startsWith('/invoices/')
  )
}

export function AppShell() {
  useContextData()
  useOrgSettingsBootstrap()
  useSessionTimeout()
  useAuthRefresh()
  const user = useAuthStore((s) => s.user)
  const departmentId = useAuthStore((s) => s.departmentId)
  const departments = useContextStore((s) => s.departments)
  const organization = useOrgSettingsStore((s) => s.organization)
  const general = useOrgSettingsStore((s) => s.general)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const showStockTicker = shouldShowStockTicker(location.pathname)
  const navEntries = getNavEntriesForUser(user, { departmentId, departments })
  const role = getUserRole(user)
  const dataScopeLabel = getDataScopeLabel(user)
  const showPosShortcut = role === 'super_admin' || role === 'admin' || role === 'sales'
  const procedureDrafts = useProcedureDraftStore((s) => s.drafts)
  const posDraftIds = new Set<string>([
    PROCEDURE_DRAFT_IDS.posDevice,
    PROCEDURE_DRAFT_IDS.posService,
    PROCEDURE_DRAFT_IDS.posFlow,
    PROCEDURE_DRAFT_IDS.accessories,
  ])
  const hasPosDraft = selectUserDrafts(procedureDrafts, user?.id ?? null).some((draft) =>
    posDraftIds.has(draft.id),
  )
  const queryClient = useQueryClient()
  const [showNotifications, setShowNotifications] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sidebarPinned, setSidebarPinned] = useState(false)
  const [sidebarHover, setSidebarHover] = useState(false)
  const printLayout = isContractPrintPath(location.pathname)
  const desktopSidebarOpen = sidebarPinned || sidebarHover
  const sidebarVisible = mobileNavOpen || desktopSidebarOpen
  const sidebarHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearSidebarHoverTimer = () => {
    if (sidebarHoverTimer.current) {
      clearTimeout(sidebarHoverTimer.current)
      sidebarHoverTimer.current = null
    }
  }

  const openSidebarHover = () => {
    clearSidebarHoverTimer()
    setSidebarHover(true)
  }

  const scheduleSidebarHoverClose = () => {
    clearSidebarHoverTimer()
    sidebarHoverTimer.current = setTimeout(() => setSidebarHover(false), 160)
  }

  useEffect(() => () => clearSidebarHoverTimer(), [])

  useEffect(() => {
    clearSidebarHoverTimer()
    setMobileNavOpen(false)
    setSidebarPinned(false)
    setSidebarHover(false)
  }, [location.pathname])

  const closeSidebar = () => {
    clearSidebarHoverTimer()
    setMobileNavOpen(false)
    setSidebarPinned(false)
    setSidebarHover(false)
  }

  const leaveSidebarHover = (event: { relatedTarget: EventTarget | null; currentTarget: EventTarget | null }) => {
    const next = event.relatedTarget
    const root = event.currentTarget instanceof HTMLElement ? event.currentTarget.parentElement : null
    if (next instanceof Node && root?.contains(next)) return
    scheduleSidebarHoverClose()
  }

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get<{ data: AppNotification[]; unread_count: number }>(
        '/notifications',
        { skipGlobalLoader: true },
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

  const notificationHref = (notification: AppNotification): string | null => {
    const type = notification.data?.type ?? notification.type
    const movementId = notification.data?.device_movement_id
    if (
      (type === 'device_movement_pending' ||
        type === 'device_movement_confirmed' ||
        type === 'device_movement_rejected') &&
      movementId
    ) {
      return `/inventory/movements/${movementId}`
    }
    return null
  }

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
    <div className="app-shell flex h-screen overflow-hidden bg-background print:h-auto print:overflow-visible">
      {sidebarVisible && !printLayout ? (
        <button
          type="button"
          aria-label="إغلاق القائمة"
          className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-md"
          onClick={closeSidebar}
        />
      ) : null}
      <div
        className={`fixed top-0 right-0 z-[70] h-full w-64 print:hidden max-lg:transition-transform max-lg:duration-300 ${
          printLayout ? 'hidden' : ''
        } ${mobileNavOpen ? 'max-lg:translate-x-0' : 'max-lg:translate-x-full'} ${
          desktopSidebarOpen ? 'lg:pointer-events-auto' : 'lg:pointer-events-none'
        }`}
      >
        <div
          className="pointer-events-auto absolute top-14 right-0 bottom-0 z-10 hidden w-3 lg:block"
          onMouseEnter={openSidebarHover}
          onMouseLeave={leaveSidebarHover}
        />
        <aside
          aria-hidden={!sidebarVisible}
          className={`flex h-full w-64 flex-col border-l border-outline-variant/80 bg-surface-container-lowest shadow-lg transition-transform duration-300 ${
            desktopSidebarOpen ? 'lg:pointer-events-auto lg:translate-x-0' : 'lg:pointer-events-none lg:translate-x-full'
          }`}
          onMouseEnter={openSidebarHover}
          onMouseLeave={leaveSidebarHover}
        >
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

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              <SidebarNav entries={navEntries} user={user} />
            </div>

            {showPosShortcut && (
              <NavLink
                to="/pos"
                className="relative mt-md flex items-center justify-center gap-xs rounded-xl bg-primary py-sm font-bold text-on-primary transition-opacity hover:opacity-90"
              >
                <Icon name="edit_document" className="no-flip" />
                <span className="text-sm">تعاقد جديد</span>
                {hasPosDraft && (
                  <span className="absolute top-1 left-1 h-2 w-2 rounded-full bg-on-primary" title="مسودة غير مكتملة" />
                )}
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
      </div>

      <main className="flex h-full flex-grow flex-col overflow-y-auto scroll-pt-24 bg-background print:h-auto print:overflow-visible">
        <div className={`sticky top-0 z-40 bg-surface print:hidden ${printLayout ? 'hidden' : ''}`}>
        <header className="flex w-full items-center justify-between gap-sm border-b border-outline-variant bg-surface px-margin py-base">
          <button
            type="button"
            onClick={() => {
              if (window.matchMedia('(max-width: 1023px)').matches) {
                setMobileNavOpen((open) => !open)
                return
              }
              setSidebarPinned((value) => !value)
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface-container"
            title={sidebarPinned || mobileNavOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-label={sidebarPinned || mobileNavOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={sidebarVisible}
          >
            <Icon name={sidebarVisible ? 'menu_open' : 'menu'} className="text-primary no-flip" />
          </button>

          <div className="flex flex-row-reverse items-center gap-md">
            <BranchSwitcher />
            <SyncStatusIndicator />
            <div className="flex flex-row-reverse gap-sm">
              <ChatWidget />
              <IncompleteProceduresBanner />
              <FontSizeControl />
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
                        notificationsQuery.data?.data.map((n) => {
                          const href = notificationHref(n)
                          const content = (
                            <>
                              <p className="text-xs font-bold">{n.title}</p>
                              <p className="text-xs text-on-surface-variant">{n.message}</p>
                            </>
                          )
                          return href ? (
                            <Link
                              key={n.id}
                              to={href}
                              onClick={() => setShowNotifications(false)}
                              className={`block border-b border-outline-variant/50 px-sm py-xs text-right last:border-0 hover:bg-surface-container-low ${
                                n.read_at ? 'opacity-60' : 'bg-primary/5'
                              }`}
                            >
                              {content}
                            </Link>
                          ) : (
                            <div
                              key={n.id}
                              className={`border-b border-outline-variant/50 px-sm py-xs text-right last:border-0 ${
                                n.read_at ? 'opacity-60' : 'bg-primary/5'
                              }`}
                            >
                              {content}
                            </div>
                          )
                        })
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
        {showStockTicker ? <BranchStockTickerBar /> : null}
        </div>

        <div className={`relative flex-grow p-margin pb-36 md:pb-24 print:p-0 ${printLayout ? 'p-0' : ''}`}>
          <Outlet />
          <ContentLoader />
        </div>
        <div className={printLayout ? 'hidden' : 'print:hidden'}>
          <ChatbotWidget />
          <MobileBottomNav user={user} />
        </div>
      </main>
    </div>
    </TourProvider>
  )
}
