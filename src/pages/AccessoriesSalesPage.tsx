import { ServiceSalesPage } from './ServiceSalesPage'

export function AccessoriesSalesPage() {
  return (
    <ServiceSalesPage
      title="بيع الاكسسورات"
      subtitle="تسجيل مبيعات الملحقات والإكسسوارات نقداً"
      saleCategory="accessories"
      defaultLines={[
        { description: 'حامل جهاز', quantity: 1, unit_price: 150 },
      ]}
      notesPlaceholder="مثال: كables، حامل، شاحن..."
    />
  )
}
