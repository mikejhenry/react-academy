import { describe, it, expect } from 'vitest'
import { scoreQuiz } from './scoreQuiz'
import type { QuizQuestion } from '@/lib/types'

const mcQuestions: QuizQuestion[] = [
  { question: 'Q1', options: ['a', 'b', 'c', 'd'], correct: 0 },
  { question: 'Q2', options: ['a', 'b', 'c', 'd'], correct: 2 },
  { question: 'Q3', options: ['a', 'b', 'c', 'd'], correct: 1 },
]

describe('scoreQuiz — multiple choice', () => {
  it('returns 100 when all answers correct', () => {
    const result = scoreQuiz(mcQuestions, ['0', '2', '1'])
    expect(result.score).toBe(100)
    expect(result.correctCount).toBe(3)
    expect(result.total).toBe(3)
    expect(result.isPerfect).toBe(true)
  })

  it('returns 0 when all answers wrong', () => {
    const result = scoreQuiz(mcQuestions, ['1', '0', '0'])
    expect(result.score).toBe(0)
    expect(result.correctCount).toBe(0)
    expect(result.isPerfect).toBe(false)
  })

  it('returns 67 when 2 of 3 correct (rounds)', () => {
    const result = scoreQuiz(mcQuestions, ['0', '2', '0'])
    expect(result.score).toBe(67)
    expect(result.correctCount).toBe(2)
  })

  it('treats missing answer as wrong', () => {
    const result = scoreQuiz(mcQuestions, ['0'])
    expect(result.correctCount).toBe(1)
    expect(result.score).toBe(33)
  })
})

describe('scoreQuiz — true/false', () => {
  const tfQuestions: QuizQuestion[] = [
    { question: 'Is this true?', options: ['True', 'False'], correct: 0, type: 'true-false' },
    { question: 'Is that false?', options: ['True', 'False'], correct: 1, type: 'true-false' },
  ]

  it('scores true/false by index like multiple choice', () => {
    const result = scoreQuiz(tfQuestions, ['0', '1'])
    expect(result.score).toBe(100)
  })

  it('marks wrong answer for true/false', () => {
    const result = scoreQuiz(tfQuestions, ['1', '0'])
    expect(result.score).toBe(0)
  })
})

describe('scoreQuiz — fill-blank', () => {
  const fillQ: QuizQuestion = {
    question: 'Fill: git ___ to check status',
    options: ['status', 'commit', 'add', 'push'],
    correct: 0,
    type: 'fill-blank',
  }

  it('matches correct answer case-insensitively', () => {
    const result = scoreQuiz([fillQ], ['STATUS'])
    expect(result.score).toBe(100)
  })

  it('matches exact correct answer', () => {
    const result = scoreQuiz([fillQ], ['status'])
    expect(result.score).toBe(100)
  })

  it('rejects wrong answer', () => {
    const result = scoreQuiz([fillQ], ['commit'])
    expect(result.score).toBe(0)
  })

  it('uses regex pattern when provided', () => {
    const regexQ: QuizQuestion = {
      question: 'Type any hex color',
      options: [],
      correct: 0,
      type: 'fill-blank',
      pattern: '^#[0-9a-fA-F]{6}$',
    }
    expect(scoreQuiz([regexQ], ['#ff0000']).score).toBe(100)
    expect(scoreQuiz([regexQ], ['red']).score).toBe(0)
  })

  it('returns 0 for invalid regex pattern', () => {
    const badRegexQ: QuizQuestion = {
      question: 'Bad pattern',
      options: [],
      correct: 0,
      type: 'fill-blank',
      pattern: '[',
    }
    expect(scoreQuiz([badRegexQ], ['anything']).score).toBe(0)
  })
})
