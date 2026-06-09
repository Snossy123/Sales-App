import { Outlet } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { branchProfileImage } from '../data/branchDetailMock'

const topNav = [
  { label: 'لوحة التحكم', active: false },
  { label: 'المخزون', active: true },
  { label: 'المبيعات', active: false },
  { label: 'التقارير', active: false },
]

const sideNav = [
  { icon: 'dashboard', label: 'لوحة التحكم', active: false },
  { icon: 'inventory_2', label: 'المخزون', active: true },
  { icon: 'payments', label: 'المبيعات', active: false },
  { icon: 'assessment', label: 'التقارير', active: false },
]

const bottomNav = [
  { icon: 'dashboard', label: 'الرئيسية', active: false },
  { icon: 'inventory_2', label: 'مخزون', active: true },
  { icon: 'payments', label: 'مبيعات', active: false },
  { icon: 'assessment', label: 'تقارير', active: false },
]

export function BranchDetailLayout() {
  return (
    <div className="enterprise-clarity branch-page text-on-surface" dir="rtl">
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface px-lg font-headline-md text-headline-md text-primary">
        <div className="flex items-center gap-md">
          <Icon name="menu" className="cursor-pointer active:opacity-80" />
          <span className="font-headline-md text-headline-md font-bold text-primary">المؤسسة المركزية</span>
        </div>
        <div className="hidden h-full items-center gap-xl md:flex">
          <nav className="flex h-full gap-lg">
            {topNav.map((item) => (
              <a
                key={item.label}
                href="#"
                className={`flex h-full items-center px-2 transition-colors ${
                  item.active
                    ? 'border-b-2 border-primary font-semibold text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-md">
          <Icon name="notifications" className="cursor-pointer active:opacity-80" />
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-fixed">
            <span className="font-label-sm text-on-primary-fixed">AU</span>
          </div>
        </div>
      </header>

      <div className="flex min-h-screen">
        <aside className="fixed top-0 right-0 z-30 hidden h-screen w-64 flex-col gap-sm border-l border-outline-variant bg-surface-container-low p-md pt-20 md:flex">
          <div className="mb-md flex items-center gap-md p-md">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-secondary-container">
              <img alt="صورة الملف الشخصي" className="h-full w-full object-cover" src={branchProfileImage} />
            </div>
            <div>
              <p className="font-title-lg text-title-lg leading-tight text-on-surface">مدير النظام</p>
              <p className="font-label-md text-label-md text-on-surface-variant">مدير عام</p>
            </div>
          </div>
          <nav className="flex flex-col gap-xs">
            {sideNav.map((item) => (
              <a
                key={item.label}
                href="#"
                className={`flex items-center gap-md rounded-lg p-md transition-all duration-200 ${
                  item.active
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <Icon name={item.icon} />
                <span className={`font-label-md ${item.active ? 'font-semibold' : ''}`}>{item.label}</span>
              </a>
            ))}
          </nav>
        </aside>

        <Outlet />
      </div>

      <nav className="fixed bottom-0 right-0 z-50 flex h-16 w-full items-center justify-around border-t border-outline-variant bg-surface px-2 shadow-md md:hidden">
        {bottomNav.map((item) => (
          <div
            key={item.label}
            className={`flex scale-95 flex-col items-center justify-center transition-transform active:scale-90 ${
              item.active
                ? 'rounded-xl bg-primary-container px-3 py-1 text-on-primary-container'
                : 'text-on-surface-variant'
            }`}
          >
            <Icon name={item.icon} />
            <span className="font-label-sm">{item.label}</span>
          </div>
        ))}
      </nav>
    </div>
  )
}
