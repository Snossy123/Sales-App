// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ContractActionsMenu } from './ContractActionsMenu'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function openMenu() {
  act(() => document.querySelector<HTMLButtonElement>('button[aria-expanded]')!.click())
  expect(document.querySelector('button[aria-expanded]')?.getAttribute('aria-expanded')).toBe('true')
}

describe('ContractActionsMenu interactions', () => {
  it('runs an action when the browser blurs the first item before clicking a button', () => {
    const action = vi.fn()
    act(() => root.render(createElement(ContractActionsMenu, {
      contractNumber: 'INV-1',
      children: [
        createElement('a', { key: 'details', href: '#details' }, 'تفاصيل'),
        createElement('button', { key: 'action', onClick: action }, 'استبدال'),
      ],
    })))
    openMenu()
    const item = document.querySelector<HTMLButtonElement>('div[dir="rtl"] button')!
    // Safari can blur the focused link with relatedTarget=null before click.
    act(() => (document.activeElement as HTMLElement).blur())
    act(() => item.click())
    expect(action).toHaveBeenCalledOnce()
    expect(document.querySelector('button[aria-expanded]')?.getAttribute('aria-expanded')).toBe('false')
  })

  it('navigates a menu link after a blur with no related target', () => {
    act(() => root.render(createElement(MemoryRouter, {},
      createElement(Routes, {},
        createElement(Route, { path: '/', element: createElement(ContractActionsMenu, {
          contractNumber: 'INV-2', children: createElement(Link, { to: '/details' }, 'تفاصيل'),
        }) }),
        createElement(Route, { path: '/details', element: createElement('p', {}, 'صفحة التعاقد') }),
      ),
    )))
    openMenu()
    const link = document.querySelector<HTMLAnchorElement>('a')!
    act(() => link.blur())
    act(() => link.click())
    expect(container.textContent).toBe('صفحة التعاقد')
  })

  it('closes on Escape and restores focus to the trigger', () => {
    act(() => root.render(createElement(ContractActionsMenu, {
      contractNumber: 'INV-3', children: createElement('button', {}, 'حذف'),
    })))
    openMenu()
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    const trigger = document.querySelector('button[aria-expanded]')!
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger)
  })

  it('closes when tabbing to a control outside the menu', () => {
    act(() => root.render(createElement('div', {},
      createElement(ContractActionsMenu, {
        contractNumber: 'INV-4', children: createElement('button', {}, 'حذف'),
      }),
      createElement('button', { id: 'outside' }, 'خارج القائمة'),
    )))
    openMenu()
    act(() => document.querySelector<HTMLButtonElement>('#outside')!.focus())
    expect(document.querySelector('button[aria-expanded]')?.getAttribute('aria-expanded')).toBe('false')
  })
})
