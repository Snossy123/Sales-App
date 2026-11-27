import { useCallback, type KeyboardEvent } from 'react'

type EnterNavigableField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

function isVisibleInForm(el: Element): boolean {
  let node: Element | null = el
  while (node) {
    const style = getComputedStyle(node)
    if (style.display === 'none' || style.visibility === 'hidden') return false
    node = node.parentElement
  }
  return true
}

export function isEnterNavigableField(el: Element): el is EnterNavigableField {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) {
    return false
  }
  if (el instanceof HTMLInputElement && el.type === 'hidden') return false
  if (el.disabled) return false
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el.readOnly) return false
  }
  if (!isVisibleInForm(el)) return false
  return true
}

export function listEnterNavigableFields(form: HTMLFormElement): EnterNavigableField[] {
  const nodes = form.querySelectorAll('input, select, textarea')
  return Array.from(nodes).filter(isEnterNavigableField)
}

export function findNextEnterNavigableField(
  form: HTMLFormElement,
  current: Element,
): EnterNavigableField | null {
  const fields = listEnterNavigableFields(form)
  const index = fields.indexOf(current as EnterNavigableField)
  if (index === -1) return null
  return fields[index + 1] ?? null
}

export function handleEnterToNextField(e: KeyboardEvent<HTMLFormElement>) {
  if (e.key !== 'Enter') return
  const target = e.target
  if (!(target instanceof Element)) return
  if (target instanceof HTMLTextAreaElement) return
  if (!isEnterNavigableField(target)) return

  e.preventDefault()
  const next = findNextEnterNavigableField(e.currentTarget, target)
  next?.focus()
}

export function useEnterToNextField() {
  return useCallback((e: KeyboardEvent<HTMLFormElement>) => {
    handleEnterToNextField(e)
  }, [])
}
