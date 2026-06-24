import { ServiceSalesPage } from './ServiceSalesPage'

export function MaintenanceServicesPage() {
  return (
    <ServiceSalesPage
      title="خدمات الصيانة والسوفت وير"
      subtitle="بيع الخدمات من الكتalog — كاش أو تقسيط"
      saleCategory="maintenance"
      useCatalog
      catalogCategories={['maintenance', 'software', 'subscription', 'installation', 'transfer', 'other']}
      notesPlaceholder="مثال: نوع الجهاز، IMEI، ملاحظات فنية..."
    />
  )
}
