import installmentContractCss from '../styles/installment-contract.css?raw'

function absolutizeImageSources(root: HTMLElement): string {
  const clone = root.cloneNode(true) as HTMLElement
  clone.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
    if (img.src) {
      img.src = new URL(img.src, window.location.href).href
    }
  })
  return clone.outerHTML
}

function absolutizeCssUrls(css: string, origin: string): string {
  return css.replace(/url\(\s*(['"]?)(\/[^'")]+)\1\s*\)/g, (_match, quote: string, path: string) => {
    const q = quote || "'"
    return `url(${q}${origin}${path}${q})`
  })
}

async function waitForAlMateen(doc: Document, timeoutMs = 1000): Promise<void> {
  const fonts = doc.fonts
  if (!fonts) return

  await fonts.ready.catch(() => undefined)

  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      if (fonts.check("12px 'AL Mateen'")) return
    } catch {
      return
    }
    await new Promise<void>((resolve) => window.setTimeout(resolve, 50))
  }
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

  await waitForAlMateen(doc)

  const images = Array.from(doc.querySelectorAll<HTMLImageElement>('img'))
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            void img.decode().then(resolve).catch(() => resolve())
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

function buildPrintDocument(contractHtml: string): string {
  const origin = window.location.origin
  const css = absolutizeCssUrls(installmentContractCss, origin)
  return `<!DOCTYPE html>
<html dir="ltr" lang="ar">
<head>
  <meta charset="UTF-8" />
  <base href="${origin}/" />
  <title>عقد تقسيط</title>
  <style>
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      width: 210mm !important;
      height: 297mm !important;
      overflow: hidden !important;
      /* Root must stay LTR. RTL on html/body prints the sheet upside down on macOS. */
      direction: ltr !important;
    }
    ${css}
    .installment-contract {
      box-shadow: none !important;
      margin: 0 auto !important;
      width: 210mm !important;
      height: 297mm !important;
      min-height: 297mm !important;
      max-height: 297mm !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
      padding: 2.5mm !important;
    }
    .ic-frame {
      height: calc(297mm - 5mm) !important;
      min-height: calc(297mm - 5mm) !important;
      max-height: calc(297mm - 5mm) !important;
      box-sizing: border-box !important;
    }
    .ic-head-en-main,
    .ic-head-ar-main {
      font-size: 23pt !important;
      white-space: nowrap !important;
    }
    @page {
      size: A4 portrait;
      margin: 0;
    }
    .installment-contract,
    .installment-contract * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  </style>
</head>
<body>${contractHtml}</body>
</html>`
}

export async function printInstallmentContractElement(contractEl: HTMLElement): Promise<void> {
  const contractHtml = absolutizeImageSources(contractEl)

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.setAttribute('title', 'طباعة عقد التقسيط')
  iframe.style.cssText =
    'position:fixed;inset:0;width:210mm;height:297mm;border:0;margin:0;padding:0;opacity:0;pointer-events:none;z-index:-1;overflow:visible'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  const win = iframe.contentWindow
  if (!doc || !win) {
    iframe.remove()
    throw new Error('تعذر فتح نافذة الطباعة')
  }

  try {
    doc.open()
    doc.write(buildPrintDocument(contractHtml))
    doc.close()

    await waitForIframeReady(iframe)
    win.focus()
    win.print()
  } finally {
    window.setTimeout(() => iframe.remove(), 2000)
  }
}
