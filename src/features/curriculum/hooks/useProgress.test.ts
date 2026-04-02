import { describe, it, expect } from 'vitest'
import { isModuleUnlocked } from './useProgress'
import { MODULES } from '@/data/curriculum'

const module1LessonIds = MODULES.find(m => m.id === '1')!.lessons.map(l => l.id)

describe('isModuleUnlocked', () => {
  it('module 1 is always unlocked with no lessons complete', () => {
    expect(isModuleUnlocked('1', [])).toBe(true)
  })

  it('module 2 is locked when no lessons complete', () => {
    expect(isModuleUnlocked('2', [])).toBe(false)
  })

  it('module 2 is locked when only some module 1 lessons complete', () => {
    expect(isModuleUnlocked('2', [module1LessonIds[0]])).toBe(false)
  })

  it('module 2 unlocks when all module 1 lessons are complete', () => {
    expect(isModuleUnlocked('2', module1LessonIds)).toBe(true)
  })

  it('unknown module id returns false', () => {
    expect(isModuleUnlocked('99', module1LessonIds)).toBe(false)
  })
})
