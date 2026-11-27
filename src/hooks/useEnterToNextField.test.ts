// @vitest-environment jsdom
import type { KeyboardEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  findNextEnterNavigableField,
  handleEnterToNextField,
  listEnterNavigableFields,
} from './useEnterToNextField'

function buildForm(html: string): HTMLFormElement {
  document.body.innerHTML = `<form id="f">${html}</form>`
  return document.getElementById('f') as HTMLFormElement
}

describe('listEnterNavigableFields', () => {
  it('lists inputs and selects, skips disabled readonly hidden and display-none', () => {
    const form = buildForm(`
      <input id="a" />
      <input id="b" disabled />
      <input id="c" readonly />
      <input id="d" type="hidden" />
      <input id="e" style="display:none" />
      <select id="f"><option>1</option></select>
      <textarea id="g"></textarea>
    `)

    const ids = listEnterNavigableFields(form).map((el) => el.id)
    expect(ids).toEqual(['a', 'f', 'g'])
  })
})

describe('findNextEnterNavigableField', () => {
  it('returns the next field and null on the last', () => {
    const form = buildForm(`
      <input id="a" />
      <input id="b" />
      <textarea id="c"></textarea>
    `)
    const a = form.querySelector('#a')!
    const b = form.querySelector('#b')!
    const c = form.querySelector('#c')!

    expect(findNextEnterNavigableField(form, a)?.id).toBe('b')
    expect(findNextEnterNavigableField(form, b)?.id).toBe('c')
    expect(findNextEnterNavigableField(form, c)).toBeNull()
  })
})

describe('handleEnterToNextField', () => {
  it('moves focus on Enter for inputs and leaves textarea alone', () => {
    const form = buildForm(`
      <input id="a" />
      <textarea id="b"></textarea>
      <input id="c" />
    `)
    const a = form.querySelector('#a') as HTMLInputElement
    const b = form.querySelector('#b') as HTMLTextAreaElement
    const c = form.querySelector('#c') as HTMLInputElement
    const focusB = vi.spyOn(b, 'focus')
    const focusC = vi.spyOn(c, 'focus')

    const enterOnA = {
      key: 'Enter',
      target: a,
      currentTarget: form,
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent<HTMLFormElement>
    handleEnterToNextField(enterOnA)
    expect(enterOnA.preventDefault).toHaveBeenCalled()
    expect(focusB).toHaveBeenCalled()

    const enterOnB = {
      key: 'Enter',
      target: b,
      currentTarget: form,
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent<HTMLFormElement>
    handleEnterToNextField(enterOnB)
    expect(enterOnB.preventDefault).not.toHaveBeenCalled()
    expect(focusC).not.toHaveBeenCalled()
  })

  it('does nothing on the last field', () => {
    const form = buildForm(`<input id="a" /><input id="b" />`)
    const b = form.querySelector('#b') as HTMLInputElement
    const focusSpy = vi.spyOn(b, 'focus')

    const event = {
      key: 'Enter',
      target: b,
      currentTarget: form,
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent<HTMLFormElement>
    handleEnterToNextField(event)
    expect(event.preventDefault).toHaveBeenCalled()
    expect(focusSpy).not.toHaveBeenCalled()
  })
})
