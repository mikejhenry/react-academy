// src/features/admin/components/AdminContentBrowser.tsx
import { useState } from 'react'
import { MODULES } from '@/data/curriculum'
import { ContentRenderer } from '@/features/curriculum/components/ContentRenderer'
import { useTheme } from '@/theme/ThemeContext'
import type { Theme, Lesson, Module } from '@/lib/types'

const THEMES: Theme[] = ['fun', 'pro', 'dev']

export function AdminContentBrowser() {
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(MODULES[0]?.id ?? null)
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const { theme, setTheme } = useTheme()

  const selectedLesson: Lesson | undefined = MODULES.flatMap(m => m.lessons).find(l => l.id === selectedLessonId)
  const selectedModule: Module | undefined = MODULES.find(m => m.lessons.some(l => l.id === selectedLessonId))

  return (
    <div className="flex gap-4">
      {/* Sidebar: module/lesson tree */}
      <div className="w-56 shrink-0 border border-border rounded-theme overflow-y-auto max-h-[70vh]">
        {MODULES.map(mod => (
          <div key={mod.id} className="border-b border-border last:border-b-0">
            <button
              type="button"
              onClick={() => setExpandedModuleId(expandedModuleId === mod.id ? null : mod.id)}
              className={`w-full text-left px-3 py-2.5 text-xs font-semibold flex items-center justify-between hover:bg-bg-secondary transition-colors ${
                expandedModuleId === mod.id ? 'text-primary' : 'text-text-base'
              }`}
            >
              <span className="truncate">{mod.icon} {mod.title}</span>
              <span className="text-text-muted ml-1 shrink-0">{expandedModuleId === mod.id ? '▲' : '▼'}</span>
            </button>
            {expandedModuleId === mod.id && (
              <div>
                {mod.lessons.map(lesson => (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => setSelectedLessonId(lesson.id)}
                    className={`w-full text-left px-4 py-2 text-xs border-t border-border hover:bg-bg-secondary transition-colors ${
                      selectedLessonId === lesson.id
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-text-muted'
                    }`}
                  >
                    {lesson.id} — {lesson.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Preview panel */}
      <div className="flex-1 min-w-0">
        {!selectedLesson ? (
          <p className="text-text-muted text-sm">Select a lesson from the sidebar to preview its content.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Theme toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Preview theme:</span>
              {THEMES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`px-3 py-1 text-xs rounded-theme border transition-colors ${
                    theme === t ? 'border-primary text-primary' : 'border-border text-text-muted hover:border-primary'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Lesson header */}
            <div>
              <p className="text-xs text-text-muted">
                {selectedModule?.title} · Lesson {selectedLesson.id}
              </p>
              <h2 className="text-xl font-bold text-text-base mt-1">{selectedLesson.title}</h2>
              <p className="text-xs text-text-muted mt-1">
                {selectedLesson.duration} min · {selectedLesson.xpReward} XP reward
              </p>
            </div>

            {/* Content blocks */}
            <div className="border border-border rounded-theme p-4 bg-bg-secondary">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
                Content ({selectedLesson.content.length} blocks)
              </p>
              <ContentRenderer blocks={selectedLesson.content} />
            </div>

            {/* Quiz */}
            <div className="border border-border rounded-theme p-4 bg-bg-secondary">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
                Quiz ({selectedLesson.quiz.length} questions)
              </p>
              {selectedLesson.quiz.map((q, i) => (
                <div key={`${selectedLesson.id}-q${i}`} className="mb-4 last:mb-0">
                  <p className="text-sm font-semibold text-text-base mb-2">Q{i + 1}: {q.question}</p>
                  <ul className="flex flex-col gap-1">
                    {q.options.map((opt, j) => (
                      <li
                        key={`${selectedLesson.id}-q${i}-opt${j}`}
                        className={`text-xs px-3 py-1.5 rounded-theme border ${
                          j === q.correct
                            ? 'border-success bg-success/5 text-success font-semibold'
                            : 'border-border text-text-muted'
                        }`}
                      >
                        {opt}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Practice project */}
            {selectedLesson.project && (
              <div className="border border-border rounded-theme p-4 bg-bg-secondary">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
                  Practice Project
                </p>
                <p className="text-sm font-semibold text-text-base">{selectedLesson.project.title}</p>
                <p className="text-sm text-text-muted mt-1 mb-3">{selectedLesson.project.description}</p>
                <ul className="flex flex-col gap-1.5">
                  {selectedLesson.project.validators.map(v => (
                    <li key={v.id} className="flex items-start gap-2 text-xs">
                      <span className={`shrink-0 ${v.required ? 'text-text-base' : 'text-success'}`}>
                        {v.required ? '●' : '◆'}
                      </span>
                      <span className="text-text-base">{v.description}</span>
                      {!v.required && (
                        <span className="ml-auto text-success shrink-0">+{v.bonusXP} XP</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
