import test from 'node:test'
import assert from 'node:assert/strict'
import { makeStatements, normalizeRole } from '../src/lib/gameEngine.ts'

const people = [
  { id: '1', full_name: 'Анна', job_title: 'Менеджер' },
  { id: '2', full_name: 'Борис', job_title: ' менеджер ' },
  { id: '3', full_name: 'Вера', job_title: 'Финансовый контролёр' },
  { id: '4', full_name: 'Глеб', job_title: 'ФИНАНСОВЫЙ КОНТРОЛЕР' },
]

test('statement rounds always contain true and false claims when roles differ', () => {
  for (const random of [() => 0, () => 0.5, () => 0.999]) {
    const statements = makeStatements(people, people, random)
    assert.equal(statements.length, people.length)
    assert.ok(statements.some(statement => statement.correct))
    assert.ok(statements.some(statement => !statement.correct))
    for (const statement of statements) {
      assert.equal(normalizeRole(statement.role) === normalizeRole(statement.person.job_title), statement.correct)
      assert.ok(people.some(person => normalizeRole(person.job_title) === normalizeRole(statement.role)))
    }
  }
})

test('two-question rounds stay mixed even if both participants share a title', () => {
  for (const random of [() => 0, () => 0.999]) {
    const statements = makeStatements(people.slice(0, 2), people, random)
    assert.deepEqual(statements.map(statement => statement.correct).sort(), [false, true])
    const falseClaim = statements.find(statement => !statement.correct)!
    assert.equal(normalizeRole(falseClaim.role), 'финансовый контролер')
  }
})

test('same-title spellings never generate a false claim and single-role pools safely stay true', () => {
  const sameRole = [people[2], people[3]]
  const statements = makeStatements(sameRole, sameRole, () => 0)
  assert.equal(statements.length, 2)
  assert.ok(statements.every(statement => statement.correct))
  assert.equal(normalizeRole(people[2].job_title), normalizeRole(people[3].job_title))
})

test('statements stay bounded by the round, exclude incomplete records, and preserve sources', () => {
  const round = [people[0], { id: 'missing-name', full_name: ' ', job_title: 'Юрист' },
    { id: 'missing-title', full_name: 'Дина', job_title: '' }, people[2]]
  const available = [...people, { id: 'empty', full_name: '', job_title: 'Невалидная должность' }]
  const snapshot = structuredClone({ round, available })
  const statements = makeStatements(round, available, () => 0)
  assert.equal(statements.length, 2)
  assert.deepEqual(new Set(statements.map(statement => statement.person.id)), new Set(['1', '3']))
  assert.ok(statements.every(statement => statement.role !== 'Невалидная должность'))
  assert.deepEqual({ round, available }, snapshot)
  assert.deepEqual(makeStatements([], people), [])
})
