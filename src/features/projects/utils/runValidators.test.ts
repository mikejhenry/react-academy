import { describe, it, expect } from 'vitest'
import { runValidators } from './runValidators'
import type { Validator } from '@/lib/types'

describe('runValidators — contains', () => {
  const v: Validator = {
    id: 'v1', description: 'Uses display flex', type: 'contains',
    value: 'display: flex', required: true, bonusXP: 0,
  }

  it('passes when code contains value', () => {
    const r = runValidators('body { display: flex; }', [v])
    expect(r.results[0].passed).toBe(true)
    expect(r.allRequiredPassed).toBe(true)
  })

  it('fails when code does not contain value', () => {
    const r = runValidators('body { color: red; }', [v])
    expect(r.results[0].passed).toBe(false)
    expect(r.allRequiredPassed).toBe(false)
  })
})

describe('runValidators — regex', () => {
  const v: Validator = {
    id: 'v2', description: 'Has media query', type: 'regex',
    value: '@media\\s*\\(', required: false, bonusXP: 50,
  }

  it('passes and earns bonus XP when regex matches', () => {
    const r = runValidators('@media (max-width: 768px) {}', [v])
    expect(r.results[0].passed).toBe(true)
    expect(r.bonusXPEarned).toBe(50)
  })

  it('earns 0 bonus when optional validator fails', () => {
    const r = runValidators('div { color: red; }', [v])
    expect(r.results[0].passed).toBe(false)
    expect(r.bonusXPEarned).toBe(0)
  })
})

describe('runValidators — element', () => {
  const v: Validator = {
    id: 'v3', description: 'Includes <nav>', type: 'element',
    value: 'nav', required: true, bonusXP: 0,
  }

  it('passes for self-closing <nav />', () => {
    expect(runValidators('<nav />', [v]).results[0].passed).toBe(true)
  })

  it('passes for <nav> with content', () => {
    expect(runValidators('<nav><a href="/">Home</a></nav>', [v]).results[0].passed).toBe(true)
  })

  it('fails when element missing', () => {
    expect(runValidators('<header>No nav here</header>', [v]).results[0].passed).toBe(false)
  })
})

describe('runValidators — property', () => {
  const v: Validator = {
    id: 'v4', description: 'Uses display property', type: 'property',
    value: 'display', required: true, bonusXP: 0,
  }

  it('passes when CSS property present', () => {
    expect(runValidators('div { display: grid; }', [v]).results[0].passed).toBe(true)
  })

  it('fails when property absent', () => {
    expect(runValidators('div { color: red; }', [v]).results[0].passed).toBe(false)
  })
})

describe('runValidators — summary', () => {
  it('allRequiredPassed is false when any required validator fails', () => {
    const validators: Validator[] = [
      { id: 'r1', description: 'Required', type: 'contains', value: 'must-have', required: true, bonusXP: 0 },
      { id: 'b1', description: 'Bonus', type: 'contains', value: 'bonus-thing', required: false, bonusXP: 25 },
    ]
    const r = runValidators('bonus-thing here', validators)
    expect(r.allRequiredPassed).toBe(false)
    expect(r.bonusXPEarned).toBe(25)
  })

  it('allRequiredPassed is true when all required validators pass', () => {
    const validators: Validator[] = [
      { id: 'r1', description: 'A', type: 'contains', value: 'hello', required: true, bonusXP: 0 },
      { id: 'r2', description: 'B', type: 'contains', value: 'world', required: true, bonusXP: 0 },
    ]
    expect(runValidators('hello world', validators).allRequiredPassed).toBe(true)
  })

  it('bonusXPEarned sums multiple passing bonus validators', () => {
    const validators: Validator[] = [
      { id: 'b1', description: 'B1', type: 'contains', value: 'alpha', required: false, bonusXP: 30 },
      { id: 'b2', description: 'B2', type: 'contains', value: 'beta', required: false, bonusXP: 50 },
    ]
    const r = runValidators('alpha beta', validators)
    expect(r.bonusXPEarned).toBe(80)
  })
})
