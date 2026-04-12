import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LessonRow } from './LessonRow'
import type { Lesson } from '@/lib/types'

const lesson: Lesson = {
  id: '1.1',
  title: 'What is HTML?',
  duration: 10,
  xpReward: 100,
  content: [],
  quiz: [],
}

describe('LessonRow', () => {
  it('completed row renders as a link', () => {
    render(
      <MemoryRouter>
        <LessonRow lesson={lesson} moduleId="1" status="completed" />
      </MemoryRouter>
    )
    expect(screen.getByRole('link')).toBeInTheDocument()
  })

  it('completed row links to the correct lesson URL', () => {
    render(
      <MemoryRouter>
        <LessonRow lesson={lesson} moduleId="1" status="completed" />
      </MemoryRouter>
    )
    expect(screen.getByRole('link')).toHaveAttribute('href', '/module/1/lesson/1.1')
  })

  it('completed row shows checkmark icon', () => {
    render(
      <MemoryRouter>
        <LessonRow lesson={lesson} moduleId="1" status="completed" />
      </MemoryRouter>
    )
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('current row renders as a link', () => {
    render(
      <MemoryRouter>
        <LessonRow lesson={lesson} moduleId="1" status="current" />
      </MemoryRouter>
    )
    expect(screen.getByRole('link')).toBeInTheDocument()
  })

  it('current row shows play icon', () => {
    render(
      <MemoryRouter>
        <LessonRow lesson={lesson} moduleId="1" status="current" />
      </MemoryRouter>
    )
    expect(screen.getByText('▶')).toBeInTheDocument()
  })

  it('locked row renders as a div (not a link)', () => {
    render(
      <MemoryRouter>
        <LessonRow lesson={lesson} moduleId="1" status="locked" />
      </MemoryRouter>
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('locked row shows lock icon', () => {
    render(
      <MemoryRouter>
        <LessonRow lesson={lesson} moduleId="1" status="locked" />
      </MemoryRouter>
    )
    expect(screen.getByText('🔒')).toBeInTheDocument()
  })

  it('shows duration and XP on all rows', () => {
    render(
      <MemoryRouter>
        <LessonRow lesson={lesson} moduleId="1" status="locked" />
      </MemoryRouter>
    )
    expect(screen.getByText('10m · 100xp')).toBeInTheDocument()
  })

  it('shows the lesson title', () => {
    render(
      <MemoryRouter>
        <LessonRow lesson={lesson} moduleId="1" status="current" />
      </MemoryRouter>
    )
    expect(screen.getByText('What is HTML?')).toBeInTheDocument()
  })

  it('locked row has aria-disabled attribute', () => {
    render(
      <MemoryRouter>
        <LessonRow lesson={lesson} moduleId="1" status="locked" />
      </MemoryRouter>
    )
    // The locked row is a div — get it by its content
    const lockedRow = screen.getByText('What is HTML?').closest('div')
    expect(lockedRow).toHaveAttribute('aria-disabled', 'true')
  })
})
