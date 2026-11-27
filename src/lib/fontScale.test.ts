import { describe, expect, it } from 'vitest'
import { DEFAULT_FONT_SCALE, stepFontScale } from './fontScale'

describe('stepFontScale', () => {
  it('moves one step and stops at the ends', () => {
    expect(stepFontScale(1, 1)).toBe(1.1)
    expect(stepFontScale(1, -1)).toBe(0.9)
    expect(stepFontScale(0.9, -1)).toBe(0.9)
    expect(stepFontScale(1.3, 1)).toBe(1.3)
  })

  it('returns to the default from either side', () => {
    expect(stepFontScale(stepFontScale(1.2, -1), -1)).toBe(DEFAULT_FONT_SCALE)
    expect(stepFontScale(stepFontScale(0.9, 1), 1)).toBe(1.1)
  })
})
