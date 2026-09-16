import type { EmployeeWithProgress } from '../types'

export type LearningEmployee = EmployeeWithProgress & { list_id: string; list_name: string; review_step: number; review_due_at: string | null }
export const DAILY_GOAL = 10

export function makeDailyPlan(rows: LearningEmployee[], answered: string[], now = Date.now()) {
  const completed = new Set(answered)
  const available = rows.filter(row => !completed.has(row.id))
  const due = available.filter(row => row.attempts > 0 && (!row.review_due_at || Date.parse(row.review_due_at) <= now))
    .sort((a, b) => Date.parse(a.review_due_at ?? '1970-01-01') - Date.parse(b.review_due_at ?? '1970-01-01') || b.priority - a.priority)
  const fresh = available.filter(row => row.attempts === 0).sort((a, b) => a.id.localeCompare(b.id))
  const remaining = Math.max(0, DAILY_GOAL - completed.size)
  const reviewCount = Math.min(due.length, Math.max(0, remaining - Math.min(2, fresh.length)))
  const cards = [...due.slice(0, reviewCount), ...fresh.slice(0, remaining - reviewCount)]
  if (cards.length < remaining) cards.push(...due.slice(reviewCount, reviewCount + remaining - cards.length))
  return { cards, completed: Math.min(completed.size, DAILY_GOAL), due: due.length, fresh: fresh.length }
}

export function nextReviewText(iso: string | null) {
  if (!iso) return 'Ещё не изучен'
  if (Date.parse(iso) <= Date.now()) return 'Пора повторить'
  return 'Повторить ' + new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
