import { ServiceSalesPage } from './ServiceSalesPage'

export function MaintenanceServicesPage() {
  return (
    <ServiceSalesPage
      title="خدمات الصيانة والسوفت وير"
      subtitle="تسجيل خدمات الصيانة وتحديثات البرمجيات للأجهزة"
      saleCategory="maintenance"
      defaultLines={[
        { description: 'صيانة دورية', quantity: 1, unit_price: 300 },
        { description: 'تحديث سوفت وير', quantity: 1, unit_price: 200 },
      ]}
      notesPlaceholder="مثال: نوع الجهاز، IMEI، ملاحظات فنية..."
    />
  )
}
