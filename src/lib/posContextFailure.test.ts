import { describe, expect, it } from 'vitest'
import { AxiosError, type AxiosResponse } from 'axios'
import { PosContextUnavailableError, posContextFailure } from './posContextFailure'

describe('POS context restoration failures', () => {
  it.each([undefined, 500, 503, 401])('preserves context for connection/session failure %s', (status) => {
    const error = new AxiosError('SQLSTATE secret', undefined, undefined, undefined,
      status ? { status, data: { message: 'SQLSTATE secret' } } as AxiosResponse : undefined)
    expect(posContextFailure(error).unavailable).toBe(false)
    expect(posContextFailure(error).message).not.toContain('SQLSTATE')
  })
  it.each([403, 404])('allows explicit reselection for unavailable context %s', (status) => {
    expect(posContextFailure(new AxiosError('', undefined, undefined, undefined, { status } as AxiosResponse)).unavailable).toBe(true)
  })
  it('reports validated inactive context', () => {
    expect(posContextFailure(new PosContextUnavailableError('غير متاح'))).toEqual({ unavailable: true, message: 'غير متاح' })
  })
})
