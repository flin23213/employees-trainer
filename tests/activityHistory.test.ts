import test from 'node:test'
import assert from 'node:assert/strict'
import { createActivityHistoryStore, createHistoryWindow, fetchWeeklyHistory, summarizeHistory } from '../src/lib/activityHistory.ts'
import type { HistoryPageRequest, StudyAnswer, WeeklyHistory } from '../src/lib/activityHistory.ts'

const now = new Date(2026, 9, 3, 12, 30)
function answer(id: string, daysAgo: number, correct = true): StudyAnswer {
  const date = new Date(now)
  date.setDate(date.getDate() - daysAgo)
  date.setHours(8, 0, 0, 0)
  return { id, answered_at: date.toISOString(), correct }
}
function empty(at = now): WeeklyHistory { return summarizeHistory([], createHistoryWindow(at)) }
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

test('groups fourteen local calendar days into current and previous seven', () => {
  const window = createHistoryWindow(now)
  const rows = [answer('today-right', 0), answer('today-wrong', 0, false), answer('last-current', 6), answer('first-previous', 7, false), answer('oldest', 13), answer('too-old', 14)]
  const result = summarizeHistory(rows, window)
  assert.equal(window.days.length, 14)
  assert.equal(window.days[0].key, '2026-09-20')
  assert.equal(result.current.days[0].key, '2026-09-27')
  assert.equal(result.current.days[6].key, '2026-10-03')
  assert.equal(result.current.answers, 3)
  assert.equal(result.current.correct, 2)
  assert.equal(result.current.accuracy, 67)
  assert.equal(result.current.activeDays, 2)
  assert.equal(result.previous.answers, 2)
  assert.equal(result.previous.accuracy, 50)
  assert.deepEqual(result.comparison, { answers: 1, accuracy: 17, activeDays: 0 })
})

test('uses local midnight and a frozen exclusive upper bound, deduplicating event IDs', () => {
  const window = createHistoryWindow(now)
  const row = answer('same-event', 0)
  const result = summarizeHistory([row, row, { id: 'start', answered_at: window.from, correct: true }, { id: 'bound', answered_at: window.until, correct: true }, { id: 'future', answered_at: new Date(now.getTime() + 1000).toISOString(), correct: true }], window)
  assert.equal(result.current.answers, 1)
  assert.equal(result.previous.answers, 1)
  assert.equal(new Date(window.from).getHours(), 0)
  assert.equal(window.until, now.toISOString())
})

test('empty history has no invented accuracy and no undefined comparison percentage', () => {
  const result = empty()
  assert.equal(result.current.accuracy, null)
  assert.equal(result.previous.accuracy, null)
  assert.equal(result.comparison.accuracy, null)
  assert.equal(result.current.answers, 0)
  assert.equal(result.current.activeDays, 0)
  assert.equal(result.current.days.filter(day => day.isToday).length, 1)
  const firstAnswer = summarizeHistory([answer('first', 0)], createHistoryWindow(now))
  assert.equal(firstAnswer.current.accuracy, 100)
  assert.equal(firstAnswer.comparison.accuracy, null)
})

test('calendar window follows month/year boundaries rather than fixed UTC day arithmetic', () => {
  const window = createHistoryWindow(new Date(2027, 0, 2, 0, 15))
  assert.equal(window.days[0].key, '2026-12-20')
  assert.equal(window.days[13].key, '2027-01-02')
  assert.equal(new Set(window.days.map(day => day.key)).size, 14)
  assert.ok(window.days.every(day => day.date.getHours() === 12))
})

test('a local midnight response belongs to today; one millisecond earlier belongs to yesterday', () => {
  const midnight = new Date(now)
  midnight.setHours(0, 0, 0, 0)
  const result = summarizeHistory([
    { id: 'before', correct: true, answered_at: new Date(midnight.getTime() - 1).toISOString() },
    { id: 'at', correct: false, answered_at: midnight.toISOString() },
  ], createHistoryWindow(now))
  assert.equal(result.current.days[5].answers, 1)
  assert.equal(result.current.days[5].correct, 1)
  assert.equal(result.current.days[6].answers, 1)
  assert.equal(result.current.days[6].correct, 0)
})

test('DST transitions preserve fourteen distinct local calendar dates', () => {
  for (const date of [new Date(2026, 2, 30, 12), new Date(2026, 9, 26, 12)]) {
    const window = createHistoryWindow(date)
    assert.equal(window.days.length, 14)
    assert.equal(new Set(window.days.map(day => day.key)).size, 14)
    const rows = window.days.map((day, index) => ({ id: `dst-${index}`, correct: true, answered_at: day.date.toISOString() }))
    // Today's noon is the exclusive boundary; the other 13 days are in range.
    const result = summarizeHistory(rows, window)
    assert.equal(result.current.answers, 6)
    assert.equal(result.previous.answers, 7)
  }
})

test('malformed timestamps or results fail instead of showing a false empty history', () => {
  assert.throws(() => summarizeHistory([{ id: 'bad', answered_at: 'invalid', correct: true }], createHistoryWindow(now)))
  assert.throws(() => summarizeHistory([{ id: 'bad', answered_at: now.toISOString(), correct: null } as unknown as StudyAnswer], createHistoryWindow(now)))
  assert.throws(() => createHistoryWindow(new Date(NaN)))
})

test('loads more than the default 1000 rows with the same account/window and inclusive ranges', async () => {
  const rows = Array.from({ length: 2507 }, (_, index) => answer(`event-${index}`, index % 14, index % 3 !== 0))
  const requests: HistoryPageRequest[] = []
  const result = await fetchWeeklyHistory('account-a', { now, readPage: async request => {
    requests.push(request)
    return rows.slice(request.first, request.last + 1)
  } })
  assert.deepEqual(requests.map(request => [request.first, request.last]), [[0, 999], [1000, 1999], [2000, 2999]])
  assert.ok(requests.every(request => request.userId === 'account-a' && request.from === requests[0].from && request.until === now.toISOString()))
  assert.equal(result.current.answers + result.previous.answers, 2507)
  assert.equal(result.current.correct + result.previous.correct, rows.filter(row => row.correct).length)
})

test('an exact page multiple gets a final empty page; page errors do not publish partial results', async () => {
  let reads = 0
  const rows = Array.from({ length: 1000 }, (_, index) => answer(String(index), 0))
  const result = await fetchWeeklyHistory('account-a', { now, readPage: async request => { reads++; return request.first ? [] : rows } })
  assert.equal(reads, 2)
  assert.equal(result.current.answers, 1000)
  await assert.rejects(fetchWeeklyHistory('account-a', { now, readPage: async request => {
    if (request.first) throw new Error('network')
    return rows
  } }), /network/)
})

test('a cancellation during a page prevents further reads and discards the result', async () => {
  const controller = new AbortController()
  let reads = 0
  await assert.rejects(fetchWeeklyHistory('account-a', { now, signal: controller.signal, readPage: async () => {
    reads++; controller.abort()
    return [answer('cancelled', 0)]
  } }), { name: 'AbortError' })
  assert.equal(reads, 1)
  await assert.rejects(fetchWeeklyHistory('', { now, readPage: async () => [] }), /войти/)
})

test('shared store deduplicates simultaneous consumers and cached reads', async () => {
  const work = deferred<WeeklyHistory>()
  let reads = 0
  const store = createActivityHistoryStore(async () => { reads++; return work.promise }, () => now)
  store.setUser('a')
  const one = store.ensureLoaded()
  const two = store.ensureLoaded()
  assert.equal(one, two)
  assert.equal(reads, 1)
  work.resolve(empty())
  await one
  await store.ensureLoaded()
  assert.equal(reads, 1)
  assert.equal(store.getSnapshot().status, 'ready')
})

test('account change and signout reject an old transport even if it ignores abort', async () => {
  const a = deferred<WeeklyHistory>()
  const b = deferred<WeeklyHistory>()
  const signals: AbortSignal[] = []
  const store = createActivityHistoryStore((userId, options) => { signals.push(options.signal); return userId === 'a' ? a.promise : b.promise }, () => now)
  store.setUser('a')
  const first = store.ensureLoaded()
  store.setUser('b')
  assert.equal(signals[0].aborted, true)
  assert.equal(store.getSnapshot().data, null)
  const second = store.ensureLoaded()
  a.resolve(summarizeHistory([answer('old-account', 0)], createHistoryWindow(now)))
  await first
  assert.equal(store.getSnapshot().userId, 'b')
  assert.equal(store.getSnapshot().data, null)
  store.setUser(null)
  b.resolve(empty())
  await second
  assert.equal(signals[1].aborted, true)
  assert.deepEqual(store.getSnapshot(), { userId: null, status: 'idle', data: null, error: null })
})

test('saved answers/reset invalidate the active account without background reads on other screens', async () => {
  let reads = 0
  const store = createActivityHistoryStore(async () => { reads++; return empty() }, () => now)
  store.setUser('a')
  await store.ensureLoaded()
  store.invalidate('b')
  await store.ensureLoaded()
  assert.equal(reads, 1)
  store.invalidate('a')
  assert.equal(reads, 1)
  await store.ensureLoaded()
  assert.equal(reads, 2)
  const unsubscribe = store.subscribe(() => {})
  store.invalidate('a')
  await store.ensureLoaded()
  assert.equal(reads, 3)
  unsubscribe()
})

test('midnight rolls the fourteen-day window once, and failed reads permit explicit retry', async () => {
  let clock = now
  let reads = 0
  const store = createActivityHistoryStore(async (_, options) => {
    reads++
    if (reads === 1) throw new Error('network')
    return empty(options.now)
  }, () => clock)
  store.setUser('a')
  await store.ensureLoaded()
  assert.equal(store.getSnapshot().status, 'error')
  assert.equal(store.getSnapshot().data, null)
  await store.reload()
  assert.equal(store.getSnapshot().status, 'ready')
  clock = new Date(now)
  clock.setDate(clock.getDate() + 1)
  await store.ensureLoaded()
  assert.equal(reads, 3)
  assert.equal(store.getSnapshot().data?.todayKey, '2026-10-04')
})

test('reopening the summary fetches cross-device updates; active consumers share that refresh', async () => {
  let reads = 0
  const store = createActivityHistoryStore(async () => { reads++; return empty() }, () => now)
  store.setUser('a')
  const removeFirst = store.subscribe(() => {})
  await store.ensureLoaded()
  removeFirst()
  await Promise.resolve()
  const removeSecond = store.subscribe(() => {})
  const removeThird = store.subscribe(() => {})
  await store.ensureLoaded()
  assert.equal(reads, 2)
  removeSecond(); removeThird()
})

test('reset during an in-flight load discards the old totals and accepts only the refreshed data', async () => {
  const old = deferred<WeeklyHistory>()
  let reads = 0
  const store = createActivityHistoryStore(async () => { reads++; return reads === 1 ? old.promise : empty() }, () => now)
  store.setUser('a')
  const unsubscribe = store.subscribe(() => {})
  const first = store.ensureLoaded()
  store.invalidate('a')
  await store.ensureLoaded()
  assert.equal(store.getSnapshot().data?.current.answers, 0)
  old.resolve(summarizeHistory([answer('before-reset', 0)], createHistoryWindow(now)))
  await first
  assert.equal(store.getSnapshot().data?.current.answers, 0)
  unsubscribe()
})

test('StrictMode re-subscribe keeps the read; actual unmount aborts unused work', async () => {
  const work = deferred<WeeklyHistory>()
  let signal!: AbortSignal
  const store = createActivityHistoryStore((_, options) => { signal = options.signal; return work.promise }, () => now)
  store.setUser('a')
  const removeFirst = store.subscribe(() => {})
  const promise = store.ensureLoaded()
  removeFirst()
  const removeSecond = store.subscribe(() => {})
  await Promise.resolve()
  assert.equal(signal.aborted, false)
  removeSecond()
  await Promise.resolve()
  assert.equal(signal.aborted, true)
  work.resolve(empty())
  await promise
  assert.equal(store.getSnapshot().status, 'idle')
})
