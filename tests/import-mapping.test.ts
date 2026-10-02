import test from 'node:test'
import assert from 'node:assert/strict'
import * as XLSX from 'xlsx'
import { readImportWorkbook, suggestImportMapping, parseMappedEmployeeMatrix, parseEmployeeMatrix, revalidate } from '../src/lib/parseEmployees.ts'

test('Excel keeps both sheets and explicit unusual columns retain every employee field', async () => {
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['Описание файла'], ['Выберите лист сотрудников']]), 'Инструкция')
  const matrix = [[], ['Экспорт команды'], ['Телефон', 'Человек', 'Функция', 'Подразделение', 'Обязанности', 'Комментарий'],
    ['101', 'Иванов Иван', 'Инженер', 'Разработка', 'Поддерживает сервис', 'Кабинет 42'],
    ['102', 'Петрова Анна', 'Аналитик', 'Аналитика', 'Анализирует заявки', 'Работает удалённо']]
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(matrix), 'Команда')
  const file = new File([XLSX.write(book, { type: 'buffer', bookType: 'xlsx' })], 'synthetic.xlsx')
  const sheets = await readImportWorkbook(file)
  assert.deepEqual(sheets.map(sheet => sheet.name), ['Инструкция', 'Команда'])
  assert.deepEqual(sheets[1].matrix[2], matrix[2])
  const suggestion = suggestImportMapping(sheets[1].matrix)
  assert.equal(suggestion.columns.full_name, 1)
  assert.equal(suggestion.columns.job_title, 2)
  const rows = parseMappedEmployeeMatrix(sheets[1].matrix, { columns: { full_name: 1, job_title: 2, department: 3, description: 4, notes: 5 }, startRow: 3, headerRow: 2 }).rows
  assert.equal(rows.length, 2)
  assert.deepEqual(rows[0], { line: 4, full_name: 'Иванов Иван', job_title: 'Инженер', department: 'Разработка', description: 'Поддерживает сервис', notes: 'Кабинет 42', include: true, problems: [], blocking: false })
  assert.equal(rows[1].notes, 'Работает удалённо')
  assert.ok(revalidate(rows, []).every(row => !row.blocking))
})

test('automatic header suggestions agree with legacy parsing and handle late headers and repeated rows', () => {
  const matrix = [[], ['Служебная информация'], ['Должность', 'Заметки', 'ФИО', 'Отдел', 'Описание'],
    ['Инженер', 'Удалённо', 'Иванов Иван', 'Разработка', 'Обслуживает серверы'],
    ['Должность', 'Заметки', 'ФИО', 'Отдел', 'Описание'],
    ['Бухгалтер', '', 'Петрова Анна', 'Финансы', 'Готовит отчёты']]
  const suggestion = suggestImportMapping(matrix)
  assert.equal(suggestion.startRow, 3)
  assert.equal(suggestion.headerRow, 2)
  assert.deepEqual(parseMappedEmployeeMatrix(matrix, suggestion).rows, parseEmployeeMatrix(matrix).rows)
  assert.equal(parseMappedEmployeeMatrix(matrix, suggestion).rows.length, 2)
})

test('worksheet coordinates preserve empty rows and columns before the actual table', async () => {
  const book = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet([['ФИО', 'Должность'], ['Иванов Иван', 'Инженер']])
  const shifted: XLSX.WorkSheet = { '!ref': 'C4:D5' }
  for (const [cell, value] of Object.entries(sheet)) {
    if (cell.startsWith('!')) continue
    const coordinate = XLSX.utils.decode_cell(cell)
    shifted[XLSX.utils.encode_cell({ r: coordinate.r + 3, c: coordinate.c + 2 })] = value
  }
  XLSX.utils.book_append_sheet(book, shifted, 'Смещённая таблица')
  const [loaded] = await readImportWorkbook(new File([XLSX.write(book, { type: 'buffer', bookType: 'xlsx' })], 'shifted.xlsx'))
  const mapping = suggestImportMapping(loaded.matrix)
  assert.deepEqual(mapping.columns, { full_name: 2, job_title: 3 })
  assert.equal(mapping.startRow, 4)
  assert.equal(parseMappedEmployeeMatrix(loaded.matrix, mapping).rows[0].line, 5)
})

test('CSV can be mapped manually and unused optional columns remain optional', async () => {
  const sheets = await readImportWorkbook(new File(['№;Роль;Имя\n1;Инженер;Иванов Иван'], 'synthetic.csv'))
  const rows = parseMappedEmployeeMatrix(sheets[0].matrix, { columns: { full_name: 2, job_title: 1, department: undefined, notes: undefined }, startRow: 1, headerRow: 0 }).rows
  assert.equal(rows[0].full_name, 'Иванов Иван')
  assert.equal(rows[0].job_title, 'Инженер')
  assert.equal(rows[0].department, '')
})

test('missing, reused, out-of-range columns and invalid row starts are rejected', () => {
  const matrix = [['Иванов Иван', 'Инженер']]
  assert.throws(() => parseMappedEmployeeMatrix(matrix, { columns: { full_name: 0 }, startRow: 0, headerRow: null }), /ФИО и должности/)
  assert.throws(() => parseMappedEmployeeMatrix(matrix, { columns: { full_name: 0, job_title: 0 }, startRow: 0, headerRow: null }), /отдельный столбец/)
  assert.throws(() => parseMappedEmployeeMatrix(matrix, { columns: { full_name: 0, job_title: 9 }, startRow: 0, headerRow: null }), /столбца нет/)
  for (const startRow of [-1, 1, 0.5, NaN]) assert.throws(() => parseMappedEmployeeMatrix(matrix, { columns: { full_name: 0, job_title: 1 }, startRow, headerRow: null }), /первую строку/)
})

test('mapped duplicates and incomplete employees still use the original blocking validation', () => {
  const matrix = [['Человек', 'Роль'], ['Иванов Иван', 'Инженер'], ['Иванов Иван', 'Инженер'], ['Петров Пётр', '']]
  const snapshot = structuredClone(matrix)
  const rows = parseMappedEmployeeMatrix(matrix, { columns: { full_name: 0, job_title: 1 }, startRow: 1, headerRow: 0 }).rows
  assert.equal(revalidate(rows, []).filter(row => !row.blocking).length, 1)
  assert.equal(revalidate(rows, ['Иванов Иван']).filter(row => !row.blocking).length, 0)
  assert.deepEqual(matrix, snapshot)
})
