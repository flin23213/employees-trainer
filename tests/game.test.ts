import test from 'node:test'
import assert from 'node:assert/strict'
import { makeRound, shuffle, rolesMatch, quizOptions, scoreTime, normalizeRole } from '../src/lib/gameEngine.ts'
import { swipeDecision } from '../src/lib/cardGesture.ts'

const people = [
  { id: '1', full_name: 'Анна', job_title: 'Менеджер' },
  { id: '2', full_name: 'Борис', job_title: ' менеджер ' },
  { id: '3', full_name: 'Вера', job_title: 'Инженер' },
  { id: '4', full_name: 'Глеб', job_title: 'Дизайнер' },
  { id: '5', full_name: 'Дина', job_title: 'Директор' },
]
test('rounds preserve the source list and exclude incomplete employees', () => {
  const snapshot = structuredClone(people)
  assert.equal(makeRound([...people, { id: '6', full_name: '', job_title: 'Юрист' }], 8).length, 5)
  assert.equal(makeRound(people, 2).length, 2)
  assert.deepEqual(people, snapshot)
  assert.deepEqual(new Set(shuffle(people, () => 0)), new Set(people))
})
test('identical job titles allow either matching card', () => {
  assert.equal(rolesMatch(people[0], people[1]), true)
  assert.equal(rolesMatch(people[0], people[2]), false)
})
test('quiz options contain the right job exactly once, without duplicate choices', () => {
  const options = quizOptions(people[0], people, () => 0.5)
  assert.equal(options.length, 4)
  assert.equal(new Set(options.map(normalizeRole)).size, 4)
  assert.equal(options.filter(value => normalizeRole(value) === 'менеджер').length, 1)
})
test('results include a three-second penalty for every mistake', () => {
  assert.equal(scoreTime(12500.4, 2), 18500)
  assert.equal(scoreTime(12500.7, 0), 12501)
})
test('swipes require deliberate horizontal movement, on small and large cards', () => {
  assert.equal(swipeDecision(80, 5, 320), 'right')
  assert.equal(swipeDecision(-80, 5, 320), 'left')
  assert.equal(swipeDecision(40, 5, 320), null)
  assert.equal(swipeDecision(80, 100, 320), null)
  assert.equal(swipeDecision(101, 0, 900), 'right')
  assert.equal(swipeDecision(55, 0, 200), null)
})
