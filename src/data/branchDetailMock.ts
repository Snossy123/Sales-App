import type { Branch } from '../api/types'

export interface BranchKpi {
  label: string
  value: string
  trendIcon: string
  trendText: string
  trendColor: string
  iconFilled?: boolean
}

export interface BranchProduct {
  sku: string
  name: string
  category: string
  price: string
  stock: number
  sold: number
  status: 'available' | 'low' | 'unavailable'
  statusLabel: string
}

export interface BranchDetail {
  id: number
  code: string
  name: string
  status: string
  statusColor: string
  address: string
  mapImage: string
  mapLabel: string
  manager: string
  phone: string
  email: string
  kpis: BranchKpi[]
  products: BranchProduct[]
}

const PROFILE_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCvCeg3UA1pPCfBFnhuKOnnb-9uxzXDnSP1-s68vs9NoB-ZbX6rPrQt1e6Ro2gCCW2wEEYoFtqgZwmTUtIBG8vfQIJ7W_IngEk7vGrKcZuR7u17BMefTeKWLvgaLfPfhiBAxMxt4FARSV82XRTJJQHwp_1dRRmx16aSDg_tRXzmg7xA9WQi8vO3-JB4N9TuwcqhUgkf65J402EZTETnU_3Pf_G9eplqf_KfrplexFRMnQSMm--Qu3squ73b_EN4D1ZRxKVe0QBCyyI'

const MAP_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB05NbnFybtVyfXdQyLgWD7iWYSeGHcpU51bHPPl_aPP4UXtDPSC9X0CtJ9ROb02E7lLaL5fl7f7yUMtplcTYzUHB133Qq-O9vBQ_9Oeg0zfM1Zh_FlisWtja7gxhgjCvrJ130mwXPIhJOKDiY4yZMJgIE8E1pQZBqHRRVv_2l92j7NC4_EcmP9B69ucBS7e-BDY2FFAgvcvK9zth62OI2jbD7ucgiQPmsnNt3xGFnTa64FJcrU8mtL-kA_maxeW6qsfgUVHknFId4'

const defaultKpis: BranchKpi[] = [
  { label: 'إجمالي قيمة المخزون (كاش)', value: '$45,280', trendIcon: 'trending_up', trendText: '+12% مقارنة بالشهر الماضي', trendColor: 'text-[#34A853]' },
  { label: 'إجمالي قيمة المخزون (قسط)', value: '$45,280', trendIcon: 'trending_up', trendText: '+12% مقارنة بالشهر الماضي', trendColor: 'text-[#34A853]' },
  { label: 'الوحدات المباعة شهرياً', value: '1,542', trendIcon: 'trending_up', trendText: '+8.4% مقارنة بالشهر الماضي', trendColor: 'text-[#34A853]' },
  { label: 'قيمه المباع شهريا', value: '3,892$', trendIcon: 'check_circle', trendText: '+12% مقارنة بالشهر الماضي', trendColor: 'text-[#34A853]', iconFilled: true },
  { label: 'متاح للبيع', value: '842', trendIcon: 'check_circle', trendText: 'جاهز للتسليم', trendColor: 'text-[#34A853]' },
  { label: 'منتظر تركيب', value: '124', trendIcon: 'schedule', trendText: 'قيد الانتظار', trendColor: 'text-[#B76E00]' },
  { label: 'صيانه', value: '45', trendIcon: 'build', trendText: 'تحت الإصلاح', trendColor: 'text-error' },
  { label: 'سوفت وير', value: '18', trendIcon: 'terminal', trendText: 'تحديثات نشطة', trendColor: 'text-primary' },
]

const defaultProducts: BranchProduct[] = [
  { sku: 'GPS-PRO-X100', name: 'جهاز تتبع GPS Pro X100', category: 'أجهزة', price: '$120', stock: 250, sold: 620, status: 'available', statusLabel: 'متوفر' },
  { sku: 'ACC-SIM-4G', name: 'شريحة 4G IoT', category: 'إكسسوارات', price: '$8', stock: 600, sold: 1200, status: 'available', statusLabel: 'متوفر' },
  { sku: 'ACC-ANT-01', name: 'هوائي GPS خارجي', category: 'إكسسوارات', price: '$15', stock: 180, sold: 420, status: 'available', statusLabel: 'متوفر' },
  { sku: 'ACC-PWR-12V', name: 'كابل طاقة للمركبة', category: 'إكسسوارات', price: '$10', stock: 320, sold: 780, status: 'available', statusLabel: 'متوفر' },
  { sku: 'ACC-RELAY-02', name: 'ريلاي فصل المحرك', category: 'إكسسوارات', price: '$18', stock: 145, sold: 360, status: 'low', statusLabel: 'منخفض' },
  { sku: 'ACC-MNT-01', name: 'قاعدة تثبيت مغناطيسية', category: 'إكسسوارات', price: '$12', stock: 210, sold: 510, status: 'available', statusLabel: 'متوفر' },
  { sku: 'GPS-LITE-V2', name: 'جهاز تتبع Lite V2', category: 'أجهزة تتبع', price: '$85', stock: 150, sold: 400, status: 'available', statusLabel: 'متوفر' },
  { sku: 'GPS-IND-H1', name: 'جهاز تتبع صناعي H1', category: 'أجهزة تتبع', price: '$210', stock: 45, sold: 120, status: 'low', statusLabel: 'منخفض' },
  { sku: 'GPS-OBD-CAN', name: 'جهاز OBD الذكي', category: 'أجهزة تتبع', price: '$95', stock: 300, sold: 850, status: 'available', statusLabel: 'متوفر' },
  { sku: 'GPS-PERS-MINI', name: 'متتبع شخصي ميني', category: 'أجهزة تتبع', price: '$65', stock: 0, sold: 230, status: 'unavailable', statusLabel: 'غير متوفر' },
]

export const branchProfileImage = PROFILE_IMAGE

export const defaultBranchDetail: BranchDetail = {
  id: 1,
  code: 'B-001',
  name: 'سكوير سنترال',
  status: 'قيد التشغيل',
  statusColor: 'bg-[#EAF6ED] text-[#34A853]',
  address: 'شارع المنطقة الرئيسية، بلوك 4، المنطقة الصناعية',
  mapImage: MAP_IMAGE,
  mapLabel: 'سكوير سنترال هاب',
  manager: 'روبرت تشن',
  phone: '+1 (555) 892-0441',
  email: 'r.chen@enterprise-central.com',
  kpis: defaultKpis,
  products: defaultProducts,
}

export function getBranchDetail(id: string | undefined, apiBranch?: Branch | null): BranchDetail {
  const numericId = Number(id) || defaultBranchDetail.id
  if (!apiBranch) {
    return { ...defaultBranchDetail, id: numericId }
  }
  return {
    ...defaultBranchDetail,
    id: numericId,
    code: apiBranch.code ?? defaultBranchDetail.code,
    name: apiBranch.name_ar || apiBranch.name || defaultBranchDetail.name,
    address: apiBranch.address ?? defaultBranchDetail.address,
  }
}

export function getStatusBadgeClass(status: BranchProduct['status']): string {
  if (status === 'low') return 'bg-[#FFF4E5] text-[#B76E00]'
  if (status === 'unavailable') return 'bg-error-container text-error'
  return 'bg-[#EAF6ED] text-[#34A853]'
}
