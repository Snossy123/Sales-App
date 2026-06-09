import { NavLink, Outlet } from 'react-router-dom'
import { Icon } from '../components/Icon'

const mainNav = [
  { to: '/gps/management', icon: 'dashboard', label: 'لوحة التحكم', end: true },
  { to: '#', icon: 'router', label: 'إدارة الأجهزة' },
  { to: '#', icon: 'shopping_cart', label: 'مبيعات GPS' },
  { to: '#', icon: 'insights', label: 'تحليلات الأداء' },
]

const settingsNav = [
  { to: '#', icon: 'settings', label: 'التهيئة' },
  { to: '#', icon: 'verified_user', label: 'التراخيص' },
]

export function EnterpriseGpsLayout() {
  return (
    <div className="enterprise-clarity flex min-h-screen bg-surface-bright text-on-surface" dir="rtl">
      <aside className="sticky-aside flex w-64 shrink-0 flex-col border-l border-outline-variant bg-surface-container">
        <div className="flex h-16 items-center gap-md border-b border-outline-variant px-lg">
          <Icon name="location_on" className="text-primary" />
          <span className="font-headline-sm font-bold text-primary">إنتربرايز</span>
        </div>
        <div className="flex flex-1 flex-col gap-xs overflow-y-auto p-md">
          <div className="mb-md flex items-center gap-md rounded-xl bg-surface-container-low px-md py-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
              <Icon name="person" filled size={22} />
            </div>
            <div className="overflow-hidden">
              <p className="truncate font-label-md text-on-surface">مستخدم مسؤول</p>
              <p className="truncate font-label-sm text-on-surface-variant">مدير GPS</p>
            </div>
          </div>

          <p className="mb-sm px-md font-label-sm uppercase tracking-wider text-outline">الرئيسية</p>
          {mainNav.map((item) =>
            item.to.startsWith('/') ? (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-md rounded-lg p-md transition-all ${
                    isActive
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`
                }
              >
                <Icon name={item.icon} />
                <span className="font-label-md">{item.label}</span>
              </NavLink>
            ) : (
              <a
                key={item.label}
                href={item.to}
                className="flex items-center gap-md rounded-lg p-md text-on-surface-variant transition-all hover:bg-surface-container-high"
              >
                <Icon name={item.icon} />
                <span className="font-label-md">{item.label}</span>
              </a>
            ),
          )}

          <p className="mb-sm mt-xl px-md font-label-sm uppercase tracking-wider text-outline">الإعدادات</p>
          {settingsNav.map((item) => (
            <a
              key={item.label}
              href={item.to}
              className="flex items-center gap-md rounded-lg p-md text-on-surface-variant transition-all hover:bg-surface-container-high"
            >
              <Icon name={item.icon} />
              <span className="font-label-md">{item.label}</span>
            </a>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-outline-variant bg-surface-bright px-xl">
          <div className="flex items-center gap-xl">
            <nav className="flex items-center gap-xs text-on-surface-variant">
              <a className="font-body-sm text-body-sm transition-colors hover:text-primary" href="#">
                الرئيسية
              </a>
              <Icon name="chevron_right" size={14} className="rotate-180" />
              <a className="font-body-sm text-body-sm transition-colors hover:text-primary" href="#">
                أجهزة GPS
              </a>
              <Icon name="chevron_right" size={14} className="rotate-180" />
              <span className="font-body-sm text-body-sm font-bold text-on-surface">إدارة المبيعات والمخزون</span>
            </nav>
          </div>
          <div className="flex items-center gap-lg">
            <div className="relative">
              <Icon
                name="notifications"
                className="cursor-pointer rounded-full p-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
              />
              <span className="absolute top-1 left-1 h-2 w-2 rounded-full bg-error ring-2 ring-surface-bright" />
            </div>
            <button
              type="button"
              className="flex items-center gap-sm rounded-lg bg-primary px-lg py-md font-label-md text-on-primary shadow-sm transition-all hover:opacity-90 active:scale-95"
            >
              <Icon name="add" size={20} />
              جهاز جديد
            </button>
          </div>
        </header>

        <Outlet />
      </div>
    </div>
  )
}
