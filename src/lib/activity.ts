// Legacy chart API: local answers are scoped to the authenticated account.
// Server-backed weekly totals live in activityHistory.ts.
export type DayStat = { key: string; date: Date; answers: number; correct: number; isToday: boolean }
type Log = Record<string, { a: number; c: number }>
export type ActivityChange = { userId: string | null; reason: 'account' | 'saved' | 'cleared' }
const PREFIX = 'activity-log-v2:'
const KEEP_DAYS = 400
let accountId: string | null = null
const listeners = new Set<(change: ActivityChange) => void>()

export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function notify(reason: ActivityChange['reason']): void {
  for (const listener of listeners) listener({ userId: accountId, reason })
}
/** Bind when AuthProvider receives a session, including null on sign-out. */
export function setActivityAccount(userId: string | null): void {
  const next = userId || null
  if (next === accountId) return
  accountId = next
  notify('account')
}
export function getActivityAccount(): string | null { return accountId }
export function subscribeActivityChanges(listener: (change: ActivityChange) => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
/** Call after record_answer succeeds, with the account captured before the RPC. */
export function notifyActivitySaved(userId: string | null = accountId): void {
  if (userId && userId === accountId) notify('saved')
}
function read(): Log {
  if (!accountId) return {}
  try {
    const raw = localStorage.getItem(PREFIX + accountId)
    const value: unknown = raw ? JSON.parse(raw) : {}
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    const log: Log = {}
    for (const [key, entry] of Object.entries(value)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !entry || typeof entry !== 'object') continue
      const { a, c } = entry as { a?: unknown; c?: unknown }
      if (typeof a === 'number' && Number.isSafeInteger(a) && a >= 0 && typeof c === 'number' && Number.isSafeInteger(c) && c >= 0 && c <= a) log[key] = { a, c }
    }
    return log
  } catch { return {} }
}
function write(log: Log): void {
  if (!accountId) return
  try { localStorage.setItem(PREFIX + accountId, JSON.stringify(log)) } catch { /* Server history works even when browser storage is full. */ }
}
export function logAnswer(correct: boolean, userId: string | null = accountId): void {
  if (!userId || userId !== accountId) return
  const log = read()
  const now = new Date()
  const key = localDayKey(now)
  const current = log[key] ?? { a: 0, c: 0 }
  log[key] = { a: current.a + 1, c: current.c + (correct ? 1 : 0) }
  const limit = new Date(now)
  limit.setDate(limit.getDate() - KEEP_DAYS)
  const limitKey = localDayKey(limit)
  for (const key of Object.keys(log)) if (key < limitKey) delete log[key]
  write(log)
}
export function getLastDays(count: number): DayStat[] {
  const log = read()
  const now = new Date()
  const length = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
  const todayKey = localDayKey(now)
  return Array.from({ length }, (_, index) => {
    const date = new Date(now)
    date.setHours(12, 0, 0, 0)
    date.setDate(date.getDate() - length + 1 + index)
    const key = localDayKey(date)
    return { key, date, answers: log[key]?.a ?? 0, correct: log[key]?.c ?? 0, isToday: key === todayKey }
  })
}
export function getStreak(): number {
  const log = read()
  let streak = 0
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  if (!log[localDayKey(date)]?.a) date.setDate(date.getDate() - 1)
  while (log[localDayKey(date)]?.a) { streak++; date.setDate(date.getDate() - 1) }
  return streak
}
export function getSummary(days: number): { answers: number; correct: number; activeDays: number } {
  const list = getLastDays(days)
  return {
    answers: list.reduce((total, day) => total + day.answers, 0),
    correct: list.reduce((total, day) => total + day.correct, 0),
    activeDays: list.filter(day => day.answers > 0).length,
  }
}
/** Never attribute the old unscoped activity-log-v1 key to an unknown account. */
export function clearActivity(userId: string | null = accountId): void {
  if (!userId || userId !== accountId) return
  try { localStorage.removeItem(PREFIX + accountId) } catch { /* Storage can be unavailable. */ }
  notify('cleared')
}
