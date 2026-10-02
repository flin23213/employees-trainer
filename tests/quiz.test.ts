import test from 'node:test'
import assert from 'node:assert/strict'
import { buildQuiz } from '../src/lib/quiz.ts'
import { checkAnswer } from '../src/lib/answerCheck.ts'
import type { EmployeeWithProgress } from '../src/types.ts'

function employee(id: string, title: string, department = 'Отдел ' + id): EmployeeWithProgress {
  return {
    id, full_name: 'Сотрудник ' + id, job_title: title, department,
    description: 'Сопровождает важные проекты компании', notes: null,
    attempts: 0, correct_count: 0, incorrect_count: 0, streak: 0,
    last_result: null, last_reviewed_at: null, accuracy: 0, status: 'new', priority: 0,
  }
}
const people = [employee('1', 'Оформитель витрин'), employee('2', 'Финансовый контролёр'),
  employee('3', 'Дизайнер'), employee('4', 'Директор')]

test('the default test asks names and roles without slipping in departments or descriptions', () => {
  for (const mode of ['input', 'choice', 'mixed'] as const) {
    const questions = buildQuiz(people, mode, 10)
    assert.equal(questions.length, people.length)
    assert.ok(questions.every(q => q.field === 'title' || q.field === 'name'))
    assert.ok(questions.every(q => q.promptLabel !== 'Чем занимается'))
  }
  const roleQuestion = buildQuiz(people, 'input', 10, 'roles', () => 0.999)[0]
  assert.equal(roleQuestion.field, 'title')
  assert.equal(checkAnswer(roleQuestion.employee.job_title, roleQuestion.acceptable, roleQuestion.field).verdict, 'correct')
  assert.equal(checkAnswer(roleQuestion.employee.department!, roleQuestion.acceptable, roleQuestion.field).verdict, 'wrong')
})

test('department questions are explicit and support typed answers and four choices', () => {
  for (const mode of ['input', 'choice', 'mixed'] as const) {
    const questions = buildQuiz(people, mode, 10, 'departments')
    assert.equal(questions.length, people.length)
    assert.ok(questions.every(q => q.field === 'dept' && q.answer === q.employee.department))
    if (mode === 'choice') {
      assert.ok(questions.every(q => q.options?.length === 4 && q.options.includes(q.answer)))
    }
  }
  const empty = people.map(p => ({ ...p, department: null }))
  assert.deepEqual(buildQuiz(empty, 'mixed', 10, 'departments'), [])
})

test('both colleagues with the same normalized role are acceptable name answers', () => {
  const list = [...people, employee('5', ' финансовый  контролер ')]
  const questions = buildQuiz(list, 'input', 10, 'roles', () => 0)
  const question = questions.find(q => q.employee.id === '2')!
  assert.equal(question.field, 'name')
  assert.deepEqual(question.acceptable, [list[1].full_name, list[4].full_name])
  assert.equal(checkAnswer(list[4].full_name, question.acceptable, 'name').verdict, 'correct')

  const choices = buildQuiz(list, 'choice', 10, 'roles', () => 0).find(q => q.employee.id === '2')!
  assert.equal(choices.field, 'name')
  assert.ok(choices.acceptable.includes(list[4].full_name))
  assert.equal(choices.options?.filter(option => choices.acceptable.includes(option)).length, 1)
})

test('duplicate role spellings cannot appear as wrong choices for the same role', () => {
  const list = [...people, employee('5', 'ФИНАНСОВЫЙ КОНТРОЛЕР')]
  const question = buildQuiz(list, 'choice', 10, 'roles', () => 0.999).find(q => q.employee.id === '2')!
  assert.equal(question.field, 'title')
  assert.equal(question.options?.length, 4)
  assert.equal(question.options?.filter(option => option.toLowerCase().replace(/ё/g, 'е') === 'финансовый контролер').length, 1)
})

test('descriptions require the all topic, while incomplete records never create empty role questions', () => {
  const described = [{ ...people[0], job_title: '', department: null }]
  assert.deepEqual(buildQuiz(described, 'input'), [])
  const questions = buildQuiz(described, 'input', 10, 'all')
  assert.equal(questions.length, 1)
  assert.equal(questions[0].promptLabel, 'Чем занимается')
  const snapshot = structuredClone(people)
  buildQuiz(people, 'mixed', 2)
  assert.deepEqual(people, snapshot)
})
