// @vitest-environment jsdom
import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppDatePicker } from './AppDatePicker'
import { AppDateTimePicker } from './AppDateTimePicker'

let root: Root
let host: HTMLDivElement
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  document.documentElement.lang = 'en'
  document.documentElement.dir = 'ltr'
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})
async function click(element: Element) {
  await act(async () => {
    ;(element as HTMLElement).click()
  })
}
const trigger = () =>
  host.querySelector<HTMLButtonElement>('.app-date-trigger')!
const popup = () => document.querySelector<HTMLElement>('.app-date-popup')!

describe('AppDatePicker', () => {
  it('formats saved values and opens a portaled, constrained English calendar', async () => {
    const change = vi.fn()
    await act(async () =>
      root.render(
        createElement(AppDatePicker, {
          value: '2026-11-07',
          onChange: change,
          min: '2026-11-05',
          max: '2026-11-09',
        }),
      ),
    )
    expect(trigger().textContent).toContain('07/11/2026')
    await click(trigger())
    expect(popup()).not.toBeNull()
    expect(host.contains(popup())).toBe(false)
    expect(popup().dir).toBe('ltr')
    expect(popup().textContent).toContain('November')
    const fifth = popup().querySelector<HTMLButtonElement>(
      '[data-day="2026-11-05"] button',
    )!
    const fourth = popup().querySelector<HTMLButtonElement>(
      '[data-day="2026-11-04"] button',
    )!
    expect(fourth.disabled).toBe(true)
    await click(fifth)
    expect(change).toHaveBeenCalledWith('2026-11-05')
    expect(document.querySelector('.app-date-popup')).toBeNull()
    expect(document.activeElement).toBe(trigger())
  })
  it('follows active Arabic language/direction and configurable week start', async () => {
    await act(async () =>
      root.render(
        createElement(AppDatePicker, {
          value: '2026-11-07',
          onChange: vi.fn(),
          weekStartsOn: 1,
        }),
      ),
    )
    await act(async () => {
      document.documentElement.lang = 'ar'
      document.documentElement.dir = 'rtl'
    })
    await click(trigger())
    expect(popup().dir).toBe('rtl')
    expect(popup().textContent).toContain('نوفمبر')
    expect(popup().textContent).toContain('اليوم')
    expect(
      popup().querySelector('.rdp-weekday')?.getAttribute('aria-label'),
    ).toBe('الاثنين')
    expect(trigger().textContent).toContain('07/11/2026')
  })
  it('preserves native form required/min/max validation and submitted ISO values', async () => {
    await act(async () =>
      root.render(
        createElement(
          'form',
          null,
          createElement(AppDatePicker, {
            name: 'due_date',
            value: '',
            onChange: vi.fn(),
            required: true,
          }),
        ),
      ),
    )
    const form = host.querySelector('form')!
    await act(async () => {
      expect(form.checkValidity()).toBe(false)
    })
    await act(async () =>
      root.render(
        createElement(
          'form',
          null,
          createElement(AppDatePicker, {
            name: 'due_date',
            value: '2026-11-07',
            minDate: '2026-11-08',
            onChange: vi.fn(),
          }),
        ),
      ),
    )
    await act(async () => {
      expect(form.checkValidity()).toBe(false)
    })
    await act(async () =>
      root.render(
        createElement(
          'form',
          null,
          createElement(AppDatePicker, {
            name: 'due_date',
            value: '2026-11-07',
            onChange: vi.fn(),
          }),
        ),
      ),
    )
    await act(async () => {
      expect(form.checkValidity()).toBe(true)
    })
    expect(new FormData(form).get('due_date')).toBe('2026-11-07')
  })
  it('supports clear and disabled controls', async () => {
    const change = vi.fn()
    await act(async () =>
      root.render(
        createElement(AppDatePicker, { value: '2026-11-07', onChange: change }),
      ),
    )
    await click(trigger())
    await click(
      Array.from(popup().querySelectorAll('button')).find(
        (button) => button.textContent === 'Clear',
      )!,
    )
    expect(change).toHaveBeenCalledWith('')
    await act(async () =>
      root.render(
        createElement(AppDatePicker, {
          value: '',
          onChange: change,
          disabled: true,
        }),
      ),
    )
    await click(trigger())
    expect(document.querySelector('.app-date-popup')).toBeNull()
  })
  it('keeps the enclosing modal open on Escape and returns focus', async () => {
    const parentEscape = vi.fn()
    document.addEventListener('keydown', parentEscape)
    await act(async () =>
      root.render(
        createElement(AppDatePicker, {
          value: '2026-11-07',
          onChange: vi.fn(),
        }),
      ),
    )
    await click(trigger())
    const day = popup().querySelector<HTMLButtonElement>(
      '[data-day="2026-11-07"] button',
    )!
    await act(async () => {
      day.focus()
      day.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      )
    })
    expect(
      document.activeElement?.closest('[data-day]')?.getAttribute('data-day'),
    ).toBe('2026-11-08')
    await act(async () =>
      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      ),
    )
    expect(document.querySelector('.app-date-popup')).toBeNull()
    expect(parentEscape).not.toHaveBeenCalledWith(
      expect.objectContaining({ key: 'Escape' }),
    )
    document.removeEventListener('keydown', parentEscape)
  })
  it('updates date-time dates without changing the wall-clock time', async () => {
    function Form() {
      const [value, setValue] = useState('2026-11-07T14:35')
      return createElement(AppDateTimePicker, { value, onChange: setValue })
    }
    await act(async () => root.render(createElement(Form)))
    await click(trigger())
    await click(popup().querySelector('[data-day="2026-11-09"] button')!)
    expect(trigger().textContent).toContain('09/11/2026')
    expect(
      host.querySelector<HTMLInputElement>('input[type="time"]')?.value,
    ).toBe('14:35')
  })
})
