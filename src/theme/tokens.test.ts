import { describe, it, expect } from 'vitest'
import { themes } from './tokens'
import type { Theme } from '@/lib/types'

const THEME_KEYS: Theme[] = ['fun', 'pro', 'dev']
const REQUIRED_COLOR_KEYS = ['bg', 'bgSecondary', 'text', 'textMuted', 'primary', 'primaryHover', 'success', 'warning', 'error', 'border', 'card']

describe('themes', () => {
  it('defines all three themes', () => {
    expect(Object.keys(themes)).toEqual(expect.arrayContaining(THEME_KEYS))
  })

  THEME_KEYS.forEach(key => {
    it(`theme "${key}" has all required color tokens`, () => {
      REQUIRED_COLOR_KEYS.forEach(colorKey => {
        expect(themes[key].colors).toHaveProperty(colorKey)
      })
    })

    it(`theme "${key}" has a celebration config with type`, () => {
      expect(['confetti', 'toast', 'terminal']).toContain(themes[key].celebration.type)
    })

    it(`theme "${key}" has required microcopy strings`, () => {
      expect(themes[key].celebration.successMessage).toBeTruthy()
      expect(themes[key].celebration.levelUpMessage).toBeTruthy()
      expect(themes[key].celebration.badgeMessage).toBeTruthy()
    })
  })
})
