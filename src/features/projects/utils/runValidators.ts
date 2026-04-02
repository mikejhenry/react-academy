import type { Validator } from '@/lib/types'

export interface ValidatorResult {
  id: string
  description: string
  passed: boolean
  required: boolean
  bonusXP: number
}

export interface ValidationSummary {
  results: ValidatorResult[]
  allRequiredPassed: boolean
  bonusXPEarned: number
}

export function runValidators(code: string, validators: Validator[]): ValidationSummary {
  const results: ValidatorResult[] = validators.map(v => ({
    id: v.id,
    description: v.description,
    passed: check(code, v),
    required: v.required,
    bonusXP: v.bonusXP,
  }))

  const allRequiredPassed = results.every(r => !r.required || r.passed)
  const bonusXPEarned = results
    .filter(r => !r.required && r.passed)
    .reduce((sum, r) => sum + r.bonusXP, 0)

  return { results, allRequiredPassed, bonusXPEarned }
}

function check(code: string, v: Validator): boolean {
  switch (v.type) {
    case 'contains':
      return code.includes(v.value)
    case 'regex':
      try {
        return new RegExp(v.value, 'i').test(code)
      } catch {
        return false
      }
    case 'element':
      // matches <tagname>, <tagname >, or <tagname/>
      return new RegExp(`<${v.value}[\\s/>]`, 'i').test(code)
    case 'property':
      // matches  propertyName:  or  propertyName :
      return new RegExp(`${v.value}\\s*:`, 'i').test(code)
    default:
      return false
  }
}
