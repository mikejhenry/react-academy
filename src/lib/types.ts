export type Theme = 'fun' | 'pro' | 'dev'
export type Role = 'student' | 'moderator' | 'admin'

export interface UserProfile {
  id: string
  email: string
  display_name: string
  avatar_url: string | null
  theme: Theme
  role: Role
  created_at: string
  last_active_at: string | null
}

export interface Module {
  id: string
  title: string
  icon: string
  description: string
  lessons: Lesson[]
}

export interface Lesson {
  id: string
  title: string
  duration: number
  xpReward: number
  content: ContentBlock[]
  quiz: QuizQuestion[]
  project?: Project
}

export type ContentBlock =
  | { type: 'text'; content: string }
  | { type: 'heading'; content: string }
  | { type: 'code'; language: string; content: string }
  | { type: 'list'; items: string[] }
  | { type: 'tip'; content: string }
  | { type: 'warning'; content: string }

export interface QuizQuestion {
  question: string
  options: string[]
  correct: number
  type?: 'multiple-choice' | 'true-false' | 'fill-blank'
  pattern?: string  // regex pattern for fill-blank validation
}

export interface Validator {
  id: string
  description: string
  type: 'contains' | 'regex' | 'element' | 'property'
  value: string
  required: boolean
  bonusXP: number
}

export interface Project {
  id: string
  title: string
  description: string
  xpReward: number
  validators: Validator[]
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  condition: (progress: UserProgressState) => boolean
}

export interface UserProgressState {
  completedLessons: string[]
  completedModules: string[]
  xp: number
  streak: number
  quizScores: Record<string, number>
  lessonsToday: number
  projectsPassed: string[]
}
