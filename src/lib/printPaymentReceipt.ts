import { PAYMENT_RECEIPT_PRINT_CSS } from './paymentReceiptPrintStyles'

const FONT_LINK =
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap'

function absolutizeImageSources(root: HTMLElement): string {
  const clone = root.cloneNode(true) as HTMLElement
  clone.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
    if (img.src) {
      img.src = new URL(img.src, window.location.href).href
    }
  })
  return clone.outerHTML
}

async function waitForIframeReady(iframe: HTMLIFrameElement): Promise<void> {
  const doc = iframe.contentDocument
  const win = iframe.contentWindow
  if (!doc || !win) return

  await new Promise<void>((resolve) => {
    if (doc.readyState === 'complete') {
      resolve()
      return
    }
    iframe.onload = () => resolve()
  })

  const fontLink = doc.querySelector<HTMLLinkElement>('link[rel="stylesheet"]')
  if (fontLink) {
    await new Promise<void>((resolve) => {
      if (fontLink.sheet) {
        resolve()
        return
      }
      fontLink.onload = () => resolve()
      fontLink.onerror = () => resolve()
    })
  }

  if (win.document.fonts?.ready) {
    await win.document.fonts.ready
  }

  const images = Array.from(doc.querySelectorAll<HTMLImageElement>('img'))
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            void img.decode().then(resolve).catch(resolve)
            return
          }
          img.onload = () => resolve()
          img.onerror = () => resolve()
        }),
    ),
  )

  await new Promise<void>((resolve) => {
    win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))
  })

  await new Promise<void>((resolve) => window.setTimeout(resolve, 150))
}

function buildPrintDocument(receiptHtml: string): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <title>إيصال تحصيل</title>
  <link rel="stylesheet" href="${FONT_LINK}" />
  <style>${PAYMENT_RECEIPT_PRINT_CSS}</style>
</head>
<body>${receiptHtml}</body>
</html>`
}

export async function printPaymentReceiptElement(receiptEl: HTMLElement): Promise<void> {
  const receiptHtml = absolutizeImageSources(receiptEl)

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.setAttribute('title', 'طباعة الإيصال')
  iframe.style.cssText =
    'position:fixed;top:0;left:0;width:80mm;height:297mm;border:0;margin:0;padding:0;opacity:0;pointer-events:none;z-index:-1;overflow:visible'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  const win = iframe.contentWindow
  if (!doc || !win) {
    iframe.remove()
    throw new Error('تعذر فتح نافذة الطباعة')
  }

  try {
    doc.open()
    doc.write(buildPrintDocument(receiptHtml))
    doc.close()

    await waitForIframeReady(iframe)
    win.focus()
    win.print()
  } finally {
    window.setTimeout(() => iframe.remove(), 2000)
  }
}
