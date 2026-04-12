# Lesson Picker / Module Expansion — Design Spec

**Date:** 2026-04-12  
**Status:** Approved

---

## Overview

When a user clicks a module card on the Module Map, the card expands inline to reveal a list of all lessons in that module with their lock/unlock state. Clicking the card header again collapses it. Multiple modules can be expanded simultaneously.

No new routes are needed. This is a purely presentational change to the Module Map screen.

---

## Architecture

### State management

`expandedIds: Set<string>` is lifted to `ModuleMap`. This keeps `ModuleCard` presentational and makes multi-card expansion trivial.

```ts
const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

function handleToggle(moduleId: string) {
  setExpandedIds(prev => {
    const next = new Set(prev)
    next.has(moduleId) ? next.delete(moduleId) : next.add(moduleId)
    return next
  })
}
```

### Component changes

**`ModuleMap.tsx`** — passes three new props to each `ModuleCard`:
- `isExpanded: boolean`
- `onToggle: (moduleId: string) => void`
- `completedLessons: string[]`

**`ModuleCard.tsx`** — modified for unlocked cards:
- Outer `<Link>` becomes `<div>`
- Card header (`<button>`) calls `onToggle(module.id)` on click; chevron rotates ▾/▴
- When `isExpanded`:  progress bar is replaced by a `<LessonRow>` list
- Border switches to primary colour when expanded
- Locked card variant is unchanged (no toggle, no expand)

**`LessonRow.tsx`** — new component:

```ts
interface LessonRowProps {
  lesson: Lesson
  moduleId: string
  status: 'completed' | 'current' | 'locked'
}
```

- `completed` / `current` → `<Link to="/module/:moduleId/lesson/:lessonId">`
- `locked` → `<div>` with `cursor-not-allowed` and 40 % opacity

---

## Lesson Unlock Logic

A pure function derives the status of each lesson:

```ts
function getLessonStatuses(
  lessons: Lesson[],
  completedLessons: string[]
): Array<{ lesson: Lesson; status: 'completed' | 'current' | 'locked' }>
```

Rules (in order):
1. If `lesson.id` is in `completedLessons` → `'completed'`
2. The first lesson whose ID is **not** in `completedLessons` → `'current'`
3. All remaining lessons → `'locked'`

Edge cases:
- `completedLessons` empty or undefined → first lesson is `'current'`, rest `'locked'`
- All lessons completed → all are `'completed'`, no `'current'` row; card remains expandable for review
- `nextLessonId` undefined (all done) → card header toggle still works normally

---

## UI Design

### Collapsed card
- Unchanged from today: icon, title, description, progress bar, lesson count
- Subtle "Click to see lessons ▾" hint at the bottom

### Expanded card
- Primary-coloured border (`border-primary`) signals active state
- Card header (icon + title + lesson count) remains visible as the click target; chevron flips to ▴
- Progress bar is hidden; replaced by the lesson list

### LessonRow states

| State | Icon | Background | Border | Interaction |
|-------|------|------------|--------|-------------|
| Completed | ✓ green | `rgba(74,222,128,0.08)` | `rgba(74,222,128,0.25)` | `<Link>`, cursor pointer |
| Current | ▶ purple | `rgba(99,102,241,0.15)` | `rgba(99,102,241,0.55)` 1.5 px | `<Link>`, bold title |
| Locked | 🔒 | transparent | `rgba(255,255,255,0.06)` | `<div>`, 40 % opacity, `cursor-not-allowed` |

Each row shows: status icon · lesson title · duration + XP badge.

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| `completedLessons` empty / undefined | Treated as zero progress; no throw |
| All lessons completed (`nextLessonId` undefined) | All rows `'completed'`; card still expands |
| Single-lesson module | One row, status `'completed'` or `'current'` |
| Locked module card | No toggle rendered; `onToggle` never called |

---

## Testing Plan

### `getLessonStatuses()` — unit tests
- All completed → every entry is `'completed'`
- None completed → first `'current'`, rest `'locked'`
- Partial (e.g. 2 of 5) → 2 completed, 1 current, 2 locked
- Single lesson → array of length 1
- Empty / undefined `completedLessons` → first lesson becomes current, no error

### `ModuleCard` — component tests
- Collapsed: renders progress bar + hint text
- Expanded (`isExpanded=true`): renders `LessonRow` list, no progress bar
- Toggle button click calls `onToggle(moduleId)`
- Locked card: no toggle button, header is non-interactive
- Primary border only when expanded

### `LessonRow` — component tests
- Completed → `<Link>`, green ✓, correct `href`
- Current → `<Link>`, purple ▶, bold title, correct `href`
- Locked → `<div>` (not `<Link>`), 🔒, reduced opacity
- Duration + XP badge visible on all states

### `ModuleMap` — integration tests
- Click header → card expands, lesson list visible
- Click header again → card collapses, progress bar returns
- Click two headers → both stay expanded simultaneously
- Locked card click → no expansion, `expandedIds` unchanged

---

## Files Changed

| File | Change |
|------|--------|
| `src/features/curriculum/components/ModuleMap.tsx` | Add `expandedIds` state + `handleToggle`; pass new props to `ModuleCard` |
| `src/features/curriculum/components/ModuleCard.tsx` | Add `isExpanded`, `onToggle`, `completedLessons` props; replace Link with div; add toggle button; conditional lesson list |
| `src/features/curriculum/components/LessonRow.tsx` | **New file** — lesson row with completed / current / locked states |
| `src/features/curriculum/components/LessonRow.test.tsx` | **New file** — component tests |
| `src/features/curriculum/components/ModuleCard.test.tsx` | Update / extend for new props |
| `src/features/curriculum/utils/getLessonStatuses.ts` | **New file** — pure status-derivation function |
| `src/features/curriculum/utils/getLessonStatuses.test.ts` | **New file** — unit tests |
