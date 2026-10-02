import test from 'node:test'
import assert from 'node:assert/strict'
import { clearActivity, getActivityAccount, getLastDays, getStreak, getSummary, localDayKey, logAnswer, notifyActivitySaved, setActivityAccount, subscribeActivityChanges } from '../src/lib/activity.ts'
import type { ActivityChange } from '../src/lib/activity.ts'

async function withStorage(run: (storage: Map<string, string>) => void | Promise<void>) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
  } })
  setActivityAccount(null)
  try { await run(values) } finally {
    setActivityAccount(null)
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
}

test('local diary never reads unknown legacy answers or shares answers across accounts', () => withStorage(storage => {
  const key = localDayKey(new Date())
  storage.set('activity-log-v1', JSON.stringify({ [key]: { a: 999, c: 999 } }))
  logAnswer(true)
  assert.equal(getSummary(7).answers, 0)
  setActivityAccount('alice')
  assert.equal(getSummary(7).answers, 0)
  logAnswer(true); logAnswer(false)
  assert.deepEqual(getSummary(7), { answers: 2, correct: 1, activeDays: 1 })
  setActivityAccount('bob')
  assert.equal(getSummary(7).answers, 0)
  logAnswer(true)
  setActivityAccount('alice')
  assert.equal(getSummary(7).answers, 2)
  clearActivity()
  assert.equal(getSummary(7).answers, 0)
  setActivityAccount('bob')
  assert.equal(getSummary(7).answers, 1)
  setActivityAccount(null)
  assert.equal(getSummary(7).answers, 0)
  assert.equal(getActivityAccount(), null)
  assert.equal(storage.has('activity-log-v1'), true)
}))

test('malformed storage is ignored and old entries are pruned', () => withStorage(storage => {
  setActivityAccount('alice')
  storage.set('activity-log-v2:alice', 'not-json')
  assert.equal(getSummary(7).answers, 0)
  const key = localDayKey(new Date())
  storage.set('activity-log-v2:alice', JSON.stringify({ '2020-01-01': { a: 5, c: 2 }, [key]: { a: -1, c: 2 }, broken: { a: 3, c: 1 } }))
  logAnswer(true)
  assert.deepEqual(getSummary(7), { answers: 1, correct: 1, activeDays: 1 })
  assert.equal(getStreak(), 1)
  assert.equal(Object.keys(JSON.parse(storage.get('activity-log-v2:alice')!)).length, 1)
  assert.equal(getLastDays(7).length, 7)
  assert.equal(getLastDays(0).length, 0)
}))

test('only successful notifications for the current captured account invalidate history', () => withStorage(() => {
  const events: ActivityChange[] = []
  const unsubscribe = subscribeActivityChanges(event => events.push(event))
  try {
    setActivityAccount('alice')
    logAnswer(true)
    assert.equal(events.length, 1)
    notifyActivitySaved('alice')
    setActivityAccount('bob')
    notifyActivitySaved('alice')
    notifyActivitySaved(null)
    clearActivity()
    assert.deepEqual(events, [{ userId: 'alice', reason: 'account' }, { userId: 'alice', reason: 'saved' }, { userId: 'bob', reason: 'account' }, { userId: 'bob', reason: 'cleared' }])
  } finally { unsubscribe() }
}))

test('a delayed answer from account A cannot enter account B diary', () => withStorage(async storage => {
  setActivityAccount('alice')
  logAnswer(true)
  const capturedAccount = getActivityAccount()
  let completeSave!: () => void
  const save = new Promise<void>(resolve => { completeSave = resolve })
  const delayedAnswer = save.then(() => logAnswer(false, capturedAccount))
  setActivityAccount('bob')
  logAnswer(true)
  const beforeBob = storage.get('activity-log-v2:bob')
  const beforeAlice = storage.get('activity-log-v2:alice')
  completeSave()
  await delayedAnswer
  assert.equal(storage.get('activity-log-v2:bob'), beforeBob)
  assert.equal(storage.get('activity-log-v2:alice'), beforeAlice)
  assert.deepEqual(getSummary(7), { answers: 1, correct: 1, activeDays: 1 })
}))

test('a delayed reset from account A cannot erase account B diary or invalidate its history', () => withStorage(async storage => {
  setActivityAccount('alice')
  logAnswer(true)
  const capturedAccount = getActivityAccount()
  let completeReset!: () => void
  const reset = new Promise<void>(resolve => { completeReset = resolve })
  const delayedReset = reset.then(() => clearActivity(capturedAccount))
  setActivityAccount('bob')
  logAnswer(false)
  const beforeBob = storage.get('activity-log-v2:bob')
  const beforeAlice = storage.get('activity-log-v2:alice')
  const events: ActivityChange[] = []
  const unsubscribe = subscribeActivityChanges(event => events.push(event))
  try {
    completeReset()
    await delayedReset
    assert.equal(storage.get('activity-log-v2:bob'), beforeBob)
    assert.equal(storage.get('activity-log-v2:alice'), beforeAlice)
    assert.deepEqual(events, [])
    assert.deepEqual(getSummary(7), { answers: 1, correct: 0, activeDays: 1 })
    clearActivity('bob')
    assert.equal(getSummary(7).answers, 0)
    assert.deepEqual(events, [{ userId: 'bob', reason: 'cleared' }])
  } finally { unsubscribe() }
}))

test('late callbacks after signout stay inert, while captured current-account operations work', () => withStorage(() => {
  setActivityAccount('alice')
  const capturedAccount = getActivityAccount()
  logAnswer(true, capturedAccount)
  assert.equal(getSummary(7).answers, 1)
  setActivityAccount(null)
  logAnswer(false, capturedAccount)
  clearActivity(capturedAccount)
  setActivityAccount('alice')
  assert.equal(getSummary(7).answers, 1)
  clearActivity(capturedAccount)
  assert.equal(getSummary(7).answers, 0)
}))
