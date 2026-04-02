import type { Badge, UserProgressState } from '@/lib/types'

export const BADGES: Badge[] = [
  { id: 'first_steps', name: 'First Steps', description: 'Complete your first lesson', icon: '👶',
    condition: (p) => p.completedLessons.length >= 1 },
  { id: 'html_master', name: 'HTML Master', description: 'Complete HTML Fundamentals', icon: '🌐',
    condition: (p) => p.completedModules.includes('1') },
  { id: 'css_wizard', name: 'CSS Wizard', description: 'Complete CSS Fundamentals', icon: '🎨',
    condition: (p) => p.completedModules.includes('2') },
  { id: 'js_ninja', name: 'JS Ninja', description: 'Complete JavaScript Essentials', icon: '⚡',
    condition: (p) => p.completedModules.includes('3') },
  { id: 'git_pro', name: 'Git Pro', description: 'Complete Git & Version Control', icon: '🔀',
    condition: (p) => p.completedModules.includes('4') },
  { id: 'ts_dev', name: 'TypeScript Dev', description: 'Complete TypeScript Basics', icon: '🔷',
    condition: (p) => p.completedModules.includes('5') },
  { id: 'web_fundamentals', name: 'Web Wizard', description: 'Complete Web Fundamentals', icon: '🌍',
    condition: (p) => p.completedModules.includes('6') },
  { id: 'api_master', name: 'API Master', description: 'Complete JSON & APIs', icon: '🔌',
    condition: (p) => p.completedModules.includes('7') },
  { id: 'react_rookie', name: 'React Rookie', description: 'Complete React Fundamentals', icon: '⚛️',
    condition: (p) => p.completedModules.includes('8') },
  { id: 'hooks_master', name: 'Hooks Master', description: 'Complete React Hooks & State', icon: '🎣',
    condition: (p) => p.completedModules.includes('9') },
  { id: 'react_pro', name: 'React Pro', description: 'Complete Advanced React Patterns', icon: '🧩',
    condition: (p) => p.completedModules.includes('10') },
  { id: 'style_master', name: 'Style Master', description: 'Complete CSS Frameworks & Tailwind', icon: '💅',
    condition: (p) => p.completedModules.includes('11') },
  { id: 'db_architect', name: 'DB Architect', description: 'Complete Databases & SQL', icon: '🗄️',
    condition: (p) => p.completedModules.includes('12') },
  { id: 'node_dev', name: 'Node Dev', description: 'Complete Node.js & Backend', icon: '🟢',
    condition: (p) => p.completedModules.includes('13') },
  { id: 'supabase_dev', name: 'Supabase Dev', description: 'Complete Supabase Integration', icon: '⚡',
    condition: (p) => p.completedModules.includes('14') },
  { id: 'security_expert', name: 'Security Expert', description: 'Complete Auth & Security', icon: '🔒',
    condition: (p) => p.completedModules.includes('15') },
  { id: 'test_master', name: 'Test Master', description: 'Complete Testing Fundamentals', icon: '✅',
    condition: (p) => p.completedModules.includes('16') },
  { id: 'devops_engineer', name: 'DevOps Engineer', description: 'Complete Deployment & DevOps', icon: '🚀',
    condition: (p) => p.completedModules.includes('17') },
  { id: 'architect', name: 'Architect', description: 'Complete Full Stack Architecture', icon: '🏗️',
    condition: (p) => p.completedModules.includes('18') },
  { id: 'full_stack_dev', name: 'Full Stack Dev', description: 'Complete all 19 modules', icon: '🏆',
    condition: (p) => ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19']
      .every(m => p.completedModules.includes(m)) },
  { id: 'on_fire', name: 'On Fire', description: '3-day streak', icon: '🔥',
    condition: (p) => p.streak >= 3 },
  { id: 'dedicated', name: 'Dedicated', description: '7-day streak', icon: '💎',
    condition: (p) => p.streak >= 7 },
  { id: 'unstoppable', name: 'Unstoppable', description: '30-day streak', icon: '⚡',
    condition: (p) => p.streak >= 30 },
  { id: 'quiz_ace', name: 'Quiz Ace', description: '5 perfect quiz scores', icon: '🎯',
    condition: (p) => Object.values(p.quizScores).filter(s => s === 100).length >= 5 },
  { id: 'quiz_legend', name: 'Quiz Legend', description: '10 perfect quiz scores', icon: '🌟',
    condition: (p) => Object.values(p.quizScores).filter(s => s === 100).length >= 10 },
  { id: 'century', name: 'Century', description: 'Earn 1,000 XP', icon: '💯',
    condition: (p) => p.xp >= 1000 },
  { id: 'xp_5000', name: 'High Achiever', description: 'Earn 5,000 XP', icon: '🥇',
    condition: (p) => p.xp >= 5000 },
  { id: 'xp_10000', name: 'Elite', description: 'Earn 10,000 XP', icon: '👑',
    condition: (p) => p.xp >= 10000 },
  { id: 'speed_learner', name: 'Speed Learner', description: '5 lessons in one day', icon: '⚡',
    condition: (p) => (p.lessonsToday ?? 0) >= 5 },
]

export const LEVEL_TITLES = [
  'Apprentice', 'Learner', 'Student', 'Developer', 'Coder',
  'Engineer', 'Architect', 'Expert', 'Master', 'Grandmaster',
]

export function getLevelTitle(level: number): string {
  const index = Math.min(level - 1, LEVEL_TITLES.length - 1)
  return LEVEL_TITLES[index] ?? 'Legend'
}

export function getLevel(xp: number): number {
  return Math.floor(xp / 500) + 1
}

export function getXPForNextLevel(xp: number): number {
  return getLevel(xp) * 500
}

export function getXPProgress(xp: number): number {
  const currentLevel = getLevel(xp)
  const levelStart = (currentLevel - 1) * 500
  const levelEnd = currentLevel * 500
  return ((xp - levelStart) / (levelEnd - levelStart)) * 100
}

export function evaluateBadges(progress: UserProgressState): Badge[] {
  return BADGES.filter(badge => badge.condition(progress))
}
