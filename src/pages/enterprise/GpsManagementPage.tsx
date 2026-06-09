import { Icon } from '../../components/Icon'
import { SalesTrendChart } from '../../components/enterprise/SalesTrendChart'
import { GpsKpiRow } from '../../components/enterprise/GpsKpiRow'
import { DeviceHealthCards } from '../../components/enterprise/DeviceHealthCards'
import { GpsDeviceTable } from '../../components/enterprise/GpsDeviceTable'

export function GpsManagementPage() {
  return (
    <main className="space-y-xl p-xl">
      <section>
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-headline-md text-on-surface">نظام إدارة أجهزة GPS المركزية</h2>
            <div className="mt-sm flex items-center gap-md">
              <span className="rounded border border-outline-variant bg-surface-container-high px-sm py-1 font-label-md text-primary">
                GPS-SYSTEM-V2
              </span>
              <span className="flex items-center gap-xs font-body-sm text-on-surface-variant">
                <Icon name="history" size={16} />
                تحديث تلقائي: منذ دقيقتين
              </span>
            </div>
          </div>
          <div className="flex gap-sm">
            <button
              type="button"
              className="flex items-center gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-md font-label-md text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              <Icon name="file_download" size={20} />
              تقرير المخزون
            </button>
            <button
              type="button"
              className="flex items-center gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-md font-label-md text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              <Icon name="share" size={20} />
              مشاركة البيانات
            </button>
          </div>
        </div>
      </section>

      <SalesTrendChart />
      <GpsKpiRow />
      <DeviceHealthCards />
      <GpsDeviceTable />
    </main>
  )
}
