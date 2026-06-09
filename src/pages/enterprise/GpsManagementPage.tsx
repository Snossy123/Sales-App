import { Icon } from '../../components/Icon'
import { SalesTrendChart } from '../../components/enterprise/SalesTrendChart'
import { GpsKpiRow } from '../../components/enterprise/GpsKpiRow'
import { DeviceHealthCards } from '../../components/enterprise/DeviceHealthCards'
import { GpsDeviceTable } from '../../components/enterprise/GpsDeviceTable'

export function GpsManagementPage() {
  return (
    <div className="space-y-xl">
      <div className="flex flex-wrap items-center justify-between gap-md">
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
        <button
          type="button"
          className="flex items-center gap-sm rounded-lg bg-primary px-lg py-md font-label-md text-on-primary shadow-sm transition-all hover:opacity-90 active:scale-95"
        >
          <Icon name="add" size={20} className="no-flip" />
          جهاز جديد
        </button>
      </div>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-md">
          <div>
            <h2 className="font-headline-md text-on-surface">نظام إدارة أجهزة GPS المركزية</h2>
            <div className="mt-sm flex flex-wrap items-center gap-md">
              <span className="rounded border border-outline-variant bg-surface-container-high px-sm py-1 font-label-md text-primary">
                GPS-SYSTEM-V2
              </span>
              <span className="flex items-center gap-xs font-body-sm text-on-surface-variant">
                <Icon name="history" size={16} className="no-flip" />
                تحديث تلقائي: منذ دقيقتين
              </span>
            </div>
          </div>
          <div className="flex gap-sm">
            <button
              type="button"
              className="flex items-center gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-md font-label-md text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              <Icon name="file_download" size={20} className="no-flip" />
              تقرير المخزون
            </button>
            <button
              type="button"
              className="flex items-center gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-md font-label-md text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              <Icon name="share" size={20} className="no-flip" />
              مشاركة البيانات
            </button>
          </div>
        </div>
      </section>

      <SalesTrendChart />
      <GpsKpiRow />
      <DeviceHealthCards />
      <GpsDeviceTable />
    </div>
  )
}
