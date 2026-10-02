import { localDayKey, subscribeActivityChanges } from './activity.ts'
import type { DayStat } from './activity.ts'

export type StudyAnswer = { id: string; answered_at: string; correct: boolean }
export type HistoryWindow = { from: string; until: string; todayKey: string; days: DayStat[] }
export type WeekTotals = { days: DayStat[]; answers: number; correct: number; activeDays: number; accuracy: number | null }
export type WeeklyHistory = {
  current: WeekTotals; previous: WeekTotals; todayKey: string
  comparison: { answers: number; activeDays: number; accuracy: number | null }
}
export type HistoryPageRequest = { userId: string; from: string; until: string; first: number; last: number; signal?: AbortSignal }
export type HistoryPageReader = (request: HistoryPageRequest) => Promise<StudyAnswer[]>
const PAGE_SIZE = 1000

/** Fourteen local calendar days, with an exclusive bound frozen at request start. */
export function createHistoryWindow(now: Date = new Date()): HistoryWindow {
  if (!Number.isFinite(now.getTime())) throw new Error('Некорректная дата истории.')
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - 13)
  const todayKey = localDayKey(now)
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(start)
    date.setDate(date.getDate() + index)
    date.setHours(12, 0, 0, 0)
    const key = localDayKey(date)
    return { key, date, answers: 0, correct: 0, isToday: key === todayKey }
  })
  return { from: start.toISOString(), until: now.toISOString(), todayKey, days }
}
function totals(days: DayStat[]): WeekTotals {
  const answers = days.reduce((total, day) => total + day.answers, 0)
  const correct = days.reduce((total, day) => total + day.correct, 0)
  return { days, answers, correct, activeDays: days.filter(day => day.answers > 0).length, accuracy: answers ? Math.round(correct / answers * 100) : null }
}
export function summarizeHistory(rows: StudyAnswer[], window: HistoryWindow): WeeklyHistory {
  const days = window.days.map(day => ({ ...day }))
  const byKey = new Map(days.map(day => [day.key, day]))
  const seen = new Set<string>()
  const from = Date.parse(window.from)
  const until = Date.parse(window.until)
  for (const row of rows) {
    const timestamp = Date.parse(row.answered_at)
    if (typeof row.id !== 'string' || !row.id || typeof row.answered_at !== 'string' || typeof row.correct !== 'boolean' || !Number.isFinite(timestamp)) throw new Error('Не удалось прочитать историю ответов.')
    if (seen.has(row.id)) continue
    seen.add(row.id)
    if (timestamp < from || timestamp >= until) continue
    const day = byKey.get(localDayKey(new Date(timestamp)))
    if (day) { day.answers++; if (row.correct) day.correct++ }
  }
  const previous = totals(days.slice(0, 7))
  const current = totals(days.slice(7))
  return { current, previous, todayKey: window.todayKey, comparison: {
    answers: current.answers - previous.answers,
    activeDays: current.activeDays - previous.activeDays,
    accuracy: current.accuracy === null || previous.accuracy === null ? null : current.accuracy - previous.accuracy,
  } }
}
async function readServerPage(request: HistoryPageRequest): Promise<StudyAnswer[]> {
  // Calendar logic and injected-reader tests do not need browser environment variables.
  const { supabase } = await import('./supabase')
  let query = supabase.from('study_answers').select('id,answered_at,correct')
    .eq('user_id', request.userId).gte('answered_at', request.from).lt('answered_at', request.until)
    .order('answered_at', { ascending: true }).order('id', { ascending: true })
    .range(request.first, request.last)
  if (request.signal) query = query.abortSignal(request.signal)
  const { data, error } = await query
  if (error) throw new Error('Не удалось загрузить историю. Проверьте соединение и попробуйте снова.')
  if (!Array.isArray(data)) throw new Error('Не удалось прочитать историю ответов.')
  return data as StudyAnswer[]
}
export async function fetchWeeklyHistory(userId: string, options: { now?: Date; signal?: AbortSignal; readPage?: HistoryPageReader } = {}): Promise<WeeklyHistory> {
  if (!userId) throw new Error('Для просмотра истории нужно войти в аккаунт.')
  const window = createHistoryWindow(options.now)
  const readPage = options.readPage ?? readServerPage
  const rows: StudyAnswer[] = []
  for (let first = 0; ; first += PAGE_SIZE) {
    options.signal?.throwIfAborted()
    const page = await readPage({ userId, from: window.from, until: window.until, first, last: first + PAGE_SIZE - 1, signal: options.signal })
    options.signal?.throwIfAborted()
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  return summarizeHistory(rows, window)
}

export type HistoryState = { userId: string | null; status: 'idle' | 'loading' | 'ready' | 'error'; data: WeeklyHistory | null; error: string | null }
export type HistoryLoader = (userId: string, options: { now: Date; signal: AbortSignal }) => Promise<WeeklyHistory>
/** Deduplicates consumers; generation checks reject late results after logout/reset. */
export function createActivityHistoryStore(loader: HistoryLoader = fetchWeeklyHistory, now: () => Date = () => new Date()) {
  let state: HistoryState = { userId: null, status: 'idle', data: null, error: null }
  let generation = 0
  let dirty = true
  let controller: AbortController | null = null
  let pending: Promise<void> | null = null
  const listeners = new Set<() => void>()
  const emit = () => { for (const listener of listeners) listener() }
  function cancel() { generation++; controller?.abort(); controller = null; pending = null }
  function setUser(userId: string | null) {
    if (state.userId === userId) return
    cancel(); dirty = true
    state = { userId, status: 'idle', data: null, error: null }
    emit()
  }
  function reload(): Promise<void> {
    const userId = state.userId
    if (!userId) return Promise.resolve()
    cancel()
    const version = generation
    const request = new AbortController()
    controller = request
    dirty = false
    state = { userId, status: 'loading', data: null, error: null }
    emit()
    pending = loader(userId, { now: now(), signal: request.signal }).then(data => {
      if (generation !== version || request.signal.aborted || state.userId !== userId) return
      state = { userId, status: 'ready', data, error: null }
      emit()
    }).catch(() => {
      if (generation !== version || request.signal.aborted || state.userId !== userId) return
      dirty = true
      state = { userId, status: 'error', data: null, error: 'Не удалось загрузить историю. Попробуйте ещё раз.' }
      emit()
    }).finally(() => { if (generation === version) { pending = null; controller = null } })
    return pending
  }
  function ensureLoaded(): Promise<void> {
    if (!state.userId) return Promise.resolve()
    if (pending && !dirty) return pending
    if (!dirty && state.status === 'ready' && state.data?.todayKey === localDayKey(now())) return Promise.resolve()
    return reload()
  }
  function invalidate(userId: string | null) {
    if (!userId || userId !== state.userId) return
    dirty = true
    // An answer on a different screen invalidates the cache without adding a read.
    if (listeners.size) void ensureLoaded()
  }
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      // Opening the screen again also picks up answers saved on another device.
      if (!listeners.size && state.status === 'ready') dirty = true
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
        // StrictMode re-subscribes synchronously; actual unmount cancels unused work.
        queueMicrotask(() => {
          if (!listeners.size && pending) {
            cancel(); dirty = true
            state = { userId: state.userId, status: 'idle', data: null, error: null }
          }
        })
      }
    },
    setUser, reload, ensureLoaded, invalidate,
  }
}
export const activityHistoryStore = createActivityHistoryStore()
subscribeActivityChanges(change => {
  if (change.reason === 'account') activityHistoryStore.setUser(change.userId)
  else activityHistoryStore.invalidate(change.userId)
})
