import { normalizeDigits } from './normalizeDigits'

const SKIPPED_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'date',
  'datetime-local',
  'file',
  'hidden',
  'image',
  'month',
  'radio',
  'range',
  'reset',
  'submit',
  'time',
  'week',
])

const EASTERN_DIGITS = /[٠-٩۰-۹]/
const INSTALLED = '__eleracyDigitNormalization'

type TextControl = HTMLInputElement | HTMLTextAreaElement

export function acceptsDigitNormalization(type: string): boolean {
  return !SKIPPED_INPUT_TYPES.has(type)
}

export function hasEasternDigits(value: string): boolean {
  return EASTERN_DIGITS.test(value)
}

/** Splice typed or pasted text into a field, converting Eastern digits and keeping other characters. */
export function insertNormalizedText(
  current: string,
  inserted: string,
  start: number,
  end: number,
): { value: string; cursor: number } {
  const normalized = normalizeDigits(inserted)
  const value = current.slice(0, start) + normalized + current.slice(end)
  return { value, cursor: start + normalized.length }
}

function isTextControl(target: EventTarget | null): target is TextControl {
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return false
  if (target instanceof HTMLInputElement && !acceptsDigitNormalization(target.type)) return false
  if (target.readOnly || target.disabled) return false
  return true
}

function selectionRange(el: TextControl): [number, number] {
  try {
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? start
    return [start, end]
  } catch {
    const length = el.value.length
    return [length, length]
  }
}

function setNativeValue(el: TextControl, value: string) {
  const prototype = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(el, value)
}

function placeCursor(el: TextControl, cursor: number) {
  try {
    const pos = Math.max(0, Math.min(cursor, el.value.length))
    el.setSelectionRange(pos, pos)
  } catch {
    // type="number" does not support a text selection.
  }
}

function commitValue(el: TextControl, value: string, cursor: number, notify: boolean) {
  setNativeValue(el, value)
  placeCursor(el, cursor)
  if (notify) el.dispatchEvent(new Event('input', { bubbles: true }))
}

/** Convert Eastern digits already present in the control. Returns true when the value changed. */
export function normalizeControlValue(el: TextControl): boolean {
  const next = normalizeDigits(el.value)
  if (next === el.value) return false
  const [start] = selectionRange(el)
  commitValue(el, next, start, false)
  return true
}

export function installDigitNormalization(target: Document = document): () => void {
  const root = target as Document & { [INSTALLED]?: boolean }
  if (root[INSTALLED]) return () => {}
  root[INSTALLED] = true

  let pasteHandled = false

  const onBeforeInput = (event: Event) => {
    if (!(event instanceof InputEvent) || !event.cancelable) return
    if (pasteHandled && event.inputType === 'insertFromPaste') return
    const el = event.target
    if (!isTextControl(el)) return
    const data = event.data
    if (data == null || !hasEasternDigits(data)) return

    event.preventDefault()
    const [start, end] = selectionRange(el)
    const { value, cursor } = insertNormalizedText(el.value, data, start, end)
    commitValue(el, value, cursor, true)
  }

  const onPaste = (event: Event) => {
    if (!(event instanceof ClipboardEvent)) return
    const el = event.target
    if (!isTextControl(el)) return
    const text = event.clipboardData?.getData('text') ?? ''
    if (!hasEasternDigits(text)) return

    event.preventDefault()
    pasteHandled = true
    queueMicrotask(() => {
      pasteHandled = false
    })
    const [start, end] = selectionRange(el)
    const { value, cursor } = insertNormalizedText(el.value, text, start, end)
    commitValue(el, value, cursor, true)
  }

  const onInput = (event: Event) => {
    const el = event.target
    if (!isTextControl(el) || !hasEasternDigits(el.value)) return
    normalizeControlValue(el)
  }

  target.addEventListener('beforeinput', onBeforeInput, true)
  target.addEventListener('paste', onPaste, true)
  target.addEventListener('input', onInput, true)

  return () => {
    target.removeEventListener('beforeinput', onBeforeInput, true)
    target.removeEventListener('paste', onPaste, true)
    target.removeEventListener('input', onInput, true)
    root[INSTALLED] = false
  }
}
