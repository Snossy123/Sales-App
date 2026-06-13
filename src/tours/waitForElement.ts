export function waitForElement(
  selector: string,
  timeoutMs = 2000,
  intervalMs = 100,
): Promise<Element | null> {
  return new Promise((resolve) => {
    const start = Date.now()

    const check = () => {
      const el = document.querySelector(selector)
      if (el) {
        resolve(el)
        return
      }
      if (Date.now() - start >= timeoutMs) {
        resolve(null)
        return
      }
      window.setTimeout(check, intervalMs)
    }

    check()
  })
}
