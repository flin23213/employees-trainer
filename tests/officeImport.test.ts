import test from 'node:test'
import assert from 'node:assert/strict'
import { parseEmployeeMatrix, revalidate } from '../src/lib/parseEmployees.ts'

test('office directory finds row seven headers and ignores contact columns', () => {
  const matrix = [[], ['', 'ООО Пример', '', 'Адрес', 'Москва'], [], ['', '', '', 'Телефон офиса', '+7 000 000'], [], [],
    ['Фамилия Имя Отчество', 'Должность', 'Внутренний', 'Номер телефона', 'E-MAIL'], [],
    ['Руководство'], ['Иванов Иван Иванович', 'Директор', '101', '+7 000 001', 'test@example.test'],
    ['Операционный отдел'], ['Смирнова Анна', 'Операционный директор', '102'],
    ['Информационные технологии'], ['Петров Петр', 'IT - специалист'],
    ['E-commerce'], ['Соколова Мария', 'Customer Service Manager'],
    ['Marketing'], ['Орлова Ольга', 'Контент-менеджер'],
    ['Юридический отдел'], ['Белов Иван', 'Юрист'],
    ['Финансовый отдел'], ['Лебедева Анна', 'Финансовый контролер'],
    ['Администрация БЦ'], ['Reception 1 этаж', '', '', '+7 000 002'],
  ]
  const result = parseEmployeeMatrix(matrix)
  const rows = revalidate(result.rows, [])
  assert.equal(rows.length, 7)
  assert.equal(rows[0].line, 10)
  assert.equal(rows[0].full_name, 'Иванов Иван Иванович')
  assert.equal(rows[0].job_title, 'Директор')
  assert.equal(rows[0].department, 'Руководство')
  assert.equal(rows[1].department, 'Операционный отдел')
  assert.equal(rows[3].department, 'E-commerce')
  assert.equal(rows[6].department, 'Финансовый отдел')
  assert.ok(rows.every(row => !row.blocking && !row.problems.length && !row.description && !row.notes))
})
test('keeps incomplete employees for review, skips repeated headers', () => {
  const rows = parseEmployeeMatrix([['Должность', 'ФИО'], ['Аналитик', 'Иванов Иван'], ['Должность', 'ФИО'], ['', 'Петров Петр']]).rows
  assert.equal(rows.length, 2)
  assert.equal(rows[0].full_name, 'Иванов Иван')
  assert.equal(revalidate(rows, [])[1].blocking, true)
})
