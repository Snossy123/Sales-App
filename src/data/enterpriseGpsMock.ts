export interface GpsDeviceRow {
  code: string
  model: string
  client: string
}

export const gpsKpis = [
  {
    label: 'إجمالي أجهزة GPS المباعة',
    value: '850',
    trendIcon: 'trending_up',
    trendText: '+42 وحدة مؤخراً',
    trendColor: 'text-[#34A853]',
  },
  {
    label: 'إجمالي مبيعات GPS',
    value: '425.8 ألف دولار',
    trendIcon: 'trending_up',
    trendText: '+12.4% نمو',
    trendColor: 'text-[#34A853]',
  },
  {
    label: 'أجهزة GPS المتاحة للبيع',
    value: '450',
    trendIcon: 'storefront',
    trendText: 'جاهز للتوزيع',
    trendColor: 'text-on-surface-variant',
  },
  {
    label: 'إجمالي مخزون GPS',
    value: '1,300',
    trendIcon: 'inventory',
    trendText: 'المخزون الكلي',
    trendColor: 'text-primary',
  },
] as const

export const deviceHealthCards = [
  {
    label: 'تم البيع والربط',
    value: '850',
    bg: 'bg-[#EAF6ED]',
    border: 'border-[#34A85320]',
    labelColor: 'text-[#34A853]',
    valueColor: 'text-[#155724]',
    icon: 'check_circle',
    iconColor: 'text-[#34A853]',
  },
  {
    label: 'قيد الانتظار',
    value: '45',
    bg: 'bg-[#FFF4E5]',
    border: 'border-[#FF980020]',
    labelColor: 'text-[#FF9800]',
    valueColor: 'text-[#663C00]',
    icon: 'pending_actions',
    iconColor: 'text-[#FF9800]',
  },
  {
    label: 'تحت الصيانة',
    value: '12',
    bg: 'bg-[#FDECEA]',
    border: 'border-[#D32F2F20]',
    labelColor: 'text-[#D32F2F]',
    valueColor: 'text-[#5F1919]',
    icon: 'build',
    iconColor: 'text-[#D32F2F]',
  },
  {
    label: 'تحديث البرنامج',
    value: '28',
    bg: 'bg-[#E3F2FD]',
    border: 'border-[#1976D220]',
    labelColor: 'text-[#1976D2]',
    valueColor: 'text-[#0D47A1]',
    icon: 'system_update',
    iconColor: 'text-[#1976D2]',
  },
] as const

export const gpsDeviceRows: GpsDeviceRow[] = [
  { code: 'GPS-SN-9981', model: 'GT-300 High Speed', client: 'شركة أرامكو النقل البري' },
  { code: 'GPS-SN-9982', model: 'Pro-Track V2', client: 'الخدمات اللوجستية المتحدة' },
  { code: 'GPS-SN-9983', model: 'Compact Solo', client: 'مخزن الرياض الرئيسي' },
  { code: 'GPS-SN-9984', model: 'Enterprise Max', client: 'أسطول الأمان الذهبي' },
]

export const chartLegend = [
  { color: 'bg-primary', label: 'سنترال سكوير' },
  { color: 'bg-tertiary', label: 'ريفرسايد مول' },
  { color: 'bg-secondary', label: 'أولد تاون هب' },
] as const

export const chartMonths = ['مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر'] as const
