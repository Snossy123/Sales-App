import { ServiceSalesPage } from './ServiceSalesPage'

export function PosServicesPage() {
  return (
    <ServiceSalesPage
      title="تعاقد خدمات"
      subtitle="تسجيل خدمات فقط بدون أجهزة"
      saleCategory="maintenance"
      useCatalog
      showContractTypeTabs
    />
  )
}
