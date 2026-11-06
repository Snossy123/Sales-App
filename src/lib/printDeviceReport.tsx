import { renderToStaticMarkup } from 'react-dom/server'
import type { CustodyVoucher, ProductUnit } from '../api/types'
import { DeviceReport } from '../components/inventory/DeviceReport'
import { useOrgSettingsStore } from '../stores/orgSettingsStore'
import chromeCss from '../styles/contract-print-chrome.css?raw'
import reportCss from '../styles/device-report.css?raw'

export function openDeviceReport(unit: ProductUnit, vouchers: CustodyVoucher[]): boolean {
  const preview = window.open('', '_blank')
  if (!preview) return false
  preview.opener = null
  const { organization, general } = useOrgSettingsStore.getState()
  const logoUrl = new URL(general?.logo_url || '/contract/logo.png', window.location.href).href
  const html = renderToStaticMarkup(<DeviceReport unit={unit} vouchers={vouchers}
    companyName={organization?.name_ar || organization?.name} logoUrl={logoUrl} borderUrl={new URL('/contract-frame.svg', window.location.href).href}
    generatedAt={new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short', timeZone: general?.timezone || 'Africa/Cairo' }).format(new Date())} />)
  preview.document.open()
  preview.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>تقرير بيانات وسجل حركة الجهاز</title><style>${(chromeCss + reportCss).replaceAll("url('/fonts/", `url('${window.location.origin}/fonts/`)}</style></head><body><div class="preview-toolbar"><button type="button" id="print-report" disabled>جارٍ تجهيز الطباعة...</button></div>${html}</body></html>`)
  preview.document.close()
  const button = preview.document.getElementById('print-report') as HTMLButtonElement
  button.onclick = () => { preview.focus(); preview.print() }
  const images = [...preview.document.images].map((img) => img.complete ? Promise.resolve() : new Promise<void>((resolve) => {
    img.onload = () => resolve(); img.onerror = () => resolve()
  }))
  void Promise.all([
    preview.document.fonts.load("700 11pt 'AL Mateen'", 'تقرير بيانات الجهاز').catch(() => []),
    preview.document.fonts.ready,
    ...images,
  ]).then(() => {
    button.disabled = false
    button.textContent = 'طباعة التقرير / حفظ PDF'
  })
  return true
}
