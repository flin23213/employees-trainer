import test from 'node:test'
import assert from 'node:assert/strict'
import { ALL_TRAINING_EMPLOYEES, departmentKey, filterTrainingEmployees, gameTrainingScopeKey, hasTrainingFilter, scopeForList, trainingDepartments } from '../src/lib/trainingScope.ts'
import { buildQuiz } from '../src/lib/quiz.ts'
import { makeRound, makeStatements, quizOptions } from '../src/lib/gameEngine.ts'

const people = [
  { id: 'a', full_name: 'Анна', job_title: 'Инженер', department: '  Отдел   продаж ', attempts: 0, priority: 4, status: 'new', accuracy: 0, last_result: null, description: null },
  { id: 'b', full_name: 'Борис', job_title: 'Директор', department: 'отдел продаж', attempts: 2, priority: 3, status: 'known', accuracy: 100, last_result: true, description: null },
  { id: 'c', full_name: 'Вера', job_title: 'Дизайнер', department: 'Склад', attempts: 0, priority: 2, status: 'new', accuracy: 0, last_result: null, description: null },
  { id: 'd', full_name: 'Глеб', job_title: 'Бухгалтер', department: null, attempts: 1, priority: 1, status: 'learning', accuracy: 100, last_result: true, description: null },
]

test('default scope keeps the complete source list in source order without mutation', () => {
  const before = structuredClone(people)
  const result = filterTrainingEmployees(people, ALL_TRAINING_EMPLOYEES)
  assert.deepEqual(result, people)
  assert.equal(result[0], people[0])
  assert.notEqual(result, people)
  assert.deepEqual(people, before)
  assert.equal(hasTrainingFilter(ALL_TRAINING_EMPLOYEES), false)
})

test('department, unseen progress and individual IDs intersect rather than widen each other', () => {
  const result = filterTrainingEmployees(people, { department: departmentKey('ОТДЕЛ продаж'), onlyNew: true, employeeIds: ['b', 'a', 'c', 'foreign'] })
  assert.deepEqual(result.map(person => person.id), ['a'])
  assert.deepEqual(filterTrainingEmployees(people, { ...ALL_TRAINING_EMPLOYEES, onlyNew: true }).map(person => person.id), ['a', 'c'])
})

test('empty, stale or unrelated individual selections stay empty', () => {
  for (const employeeIds of [[], ['removed'], ['foreign-list-person']]) {
    const scope = { ...ALL_TRAINING_EMPLOYEES, employeeIds }
    assert.equal(filterTrainingEmployees(people, scope).length, 0)
    assert.equal(hasTrainingFilter(scope), true)
  }
})

test('department keys normalize whitespace and ё, while empty department remains selectable', () => {
  assert.equal(departmentKey(' Отдёл  ПРОДАЖ '), departmentKey('отдел продаж'))
  assert.equal(departmentKey(null), '')
  assert.deepEqual(filterTrainingEmployees(people, { ...ALL_TRAINING_EMPLOYEES, department: '' }).map(person => person.id), ['d'])
  assert.deepEqual(trainingDepartments(people).find(department => department.key === 'отдел продаж'), { key: 'отдел продаж', label: 'Отдел продаж', count: 2 })
})

test('a stored in-memory selection cannot carry IDs into another active list', () => {
  const value = { ...ALL_TRAINING_EMPLOYEES, employeeIds: ['a'] }
  const selection = { listId: 'list-a', value }
  assert.equal(scopeForList(selection, 'list-a'), value)
  assert.equal(scopeForList(selection, 'list-b'), ALL_TRAINING_EMPLOYEES)
  assert.equal(scopeForList(selection, undefined), ALL_TRAINING_EMPLOYEES)
})

test('scope fingerprint ignores order/duplicate IDs and actual full selection shares all records', async () => {
  assert.equal(await gameTrainingScopeKey(people, [...people].reverse()), 'all')
  assert.equal(await gameTrainingScopeKey(people, [...people, people[0]]), 'all')
  const key = await gameTrainingScopeKey(people, [people[0], people[2]])
  assert.match(key, /^[0-9a-f]{64}$/)
  assert.equal(await gameTrainingScopeKey(people, [people[2], people[0], people[0]]), key)
  assert.notEqual(await gameTrainingScopeKey(people, [people[0], people[1]]), key)
  assert.notEqual(await gameTrainingScopeKey(people, []), 'all')
  await assert.rejects(gameTrainingScopeKey(people, [{ id: 'foreign' }]), /текущему списку/)
})

test('questions, game distractors and statements only draw from the selected pool', () => {
  const selected = filterTrainingEmployees(people, { ...ALL_TRAINING_EMPLOYEES, employeeIds: ['a', 'c'] })
  const allowedNames = new Set(selected.map(person => person.full_name))
  const allowedRoles = new Set(selected.map(person => person.job_title))
  const questions = buildQuiz(selected, 'input', 10, 'roles')
  assert.ok(questions.length)
  assert.ok(questions.every(question => selected.some(person => person.id === question.employee.id)))
  assert.ok(questions.every(question => question.acceptable.every(value => allowedNames.has(value) || allowedRoles.has(value))))
  const round = makeRound(selected, 8)
  assert.equal(round.length, 2)
  for (const person of round) assert.ok(quizOptions(person, selected).every(role => allowedRoles.has(role)))
  for (const statement of makeStatements(round, selected)) {
    assert.ok(allowedNames.has(statement.person.full_name))
    assert.ok(allowedRoles.has(statement.role))
  }
})
