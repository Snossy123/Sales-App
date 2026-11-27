import chromeCss from '../styles/contract-print-chrome.css?raw'
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

async function waitForFont(
  doc: Document,
  font: string,
  sample: string,
  timeoutMs: number,
): Promise<void> {
  const fonts = doc.fonts
  if (!fonts) return

  await fonts.load(font, sample).catch(() => undefined)

  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      if (fonts.check(font, sample)) return
    } catch {
      return
    }
    await new Promise<void>((resolve) => window.setTimeout(resolve, 50))
  }
}

async function waitForAlMateen(doc: Document, timeoutMs = 1000): Promise<void> {
  const fonts = doc.fonts
  if (!fonts) return
  await fonts.ready.catch(() => undefined)
  await waitForFont(doc, "700 12px 'AL Mateen'", 'عقد', timeoutMs)
}

async function waitForMaterialSymbols(doc: Document, timeoutMs = 1500): Promise<void> {
  await waitForFont(doc, "500 22px 'Material Symbols Outlined'", 'description', timeoutMs)
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
  await waitForMaterialSymbols(doc)

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
  const css = absolutizeCssUrls(chromeCss + installmentContractCss.replace("@import './contract-print-chrome.css';", ''), origin)
  return `<!DOCTYPE html>
<html dir="ltr" lang="ar">
<head>
  <meta charset="UTF-8" />
  <base href="${origin}/" />
  <title>عقد تقسيط</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,500,0,0" />
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
    /* OT mid blocks flex-grow to fill A4; only chrome must not shrink. */
    .ownership-transfer-contract .ic-header,
    .ownership-transfer-contract .ic-footer {
      flex-shrink: 0 !important;
    }
    .ownership-transfer-contract .ic-footer {
      margin-top: 0 !important;
    }
    .ic-head-en-main {
      font-size: 23pt !important;
      white-space: nowrap !important;
    }
    .ic-head-ar-main {
      font-size: 31.62pt !important;
      white-space: nowrap !important;
    }
    /* The contract face is bold and inherits onto icon ligatures. Without the
       symbol font, names such as "description" print as text and spill off the sheet. */
    .material-symbols-outlined {
      font-family: 'Material Symbols Outlined' !important;
      font-weight: 500 !important;
      font-style: normal !important;
      line-height: 1 !important;
      letter-spacing: normal !important;
      text-transform: none !important;
      white-space: nowrap !important;
      direction: ltr !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 1em !important;
      height: 1em !important;
      overflow: hidden !important;
      font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 24 !important;
    }
    .ic-ot-row-icon,
    .ic-ot-card-badge,
    .ic-ot-terms-icon {
      overflow: hidden !important;
      min-width: 0 !important;
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
