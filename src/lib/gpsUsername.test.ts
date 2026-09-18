import { describe, expect, it } from 'vitest'
import {
  GPS_USERNAME_PREFIX,
  formatGpsUsername,
  isGpsUsernameComplete,
  parseGpsUsername,
} from './gpsUsername'

describe('gpsUsername', () => {
  it('treats empty values as a prefixed username with no suffix', () => {
    expect(parseGpsUsername('')).toEqual({ prefixed: true, suffix: '' })
    expect(parseGpsUsername('   ')).toEqual({ prefixed: true, suffix: '' })
    expect(formatGpsUsername('')).toBe('')
    expect(isGpsUsernameComplete('')).toBe(false)
  })

  it('strips the Eleraqy prefix and rebuilds without doubling it', () => {
    expect(parseGpsUsername('Eleraqy123')).toEqual({ prefixed: true, suffix: '123' })
    expect(formatGpsUsername('123')).toBe('Eleraqy123')
    expect(formatGpsUsername('Eleraqy123')).toBe('Eleraqy123')
    expect(isGpsUsernameComplete('Eleraqy123')).toBe(true)
    expect(isGpsUsernameComplete(GPS_USERNAME_PREFIX)).toBe(false)
  })

  it('keeps legacy usernames unchanged', () => {
    expect(parseGpsUsername('ahmed_gps')).toEqual({ prefixed: false, suffix: 'ahmed_gps' })
    expect(formatGpsUsername('ahmed_gps', false)).toBe('ahmed_gps')
    expect(isGpsUsernameComplete('ahmed_gps')).toBe(true)
  })
})
