import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parsePhotoText } from '../src/lib/parsePhotoText.ts'
import { parseFile, revalidate } from '../src/lib/parseEmployees.ts'

test('photo table headers and columns survive OCR spacing', () => {
  const parsed = parsePhotoText('ФИО  Должность  Отдел\nИванов Иван Иванович  Инженер  Разработка\nПетрова Анна Сергеевна  Бухгалтер  Финансы')
  assert.equal(parsed.rows.length, 2)
  assert.equal(parsed.rows[0].full_name, 'Иванов Иван Иванович')
  assert.equal(parsed.rows[1].job_title, 'Бухгалтер')
  assert.equal(parsed.rows[1].department, 'Финансы')
  assert.equal(revalidate(parsed.rows, []).filter(r => r.include).length, 2)
})

test('plain printed list splits name from title without table separators', () => {
  const parsed = parsePhotoText('1. Иванов Иван Иванович Инженер\n2. Петрова Анна Сергеевна Главный бухгалтер')
  assert.equal(parsed.rows[0].full_name, 'Иванов Иван Иванович')
  assert.equal(parsed.rows[1].job_title, 'Главный бухгалтер')
})

test('missing titles and duplicates cannot be imported', () => {
  const rows = parsePhotoText('Иванов Иван Иванович | Инженер\nИванов Иван Иванович | Инженер\nПетров Пётр').rows
  assert.equal(revalidate(rows, []).filter(r => r.include).length, 1)
  assert.equal(revalidate(rows, ['Иванов Иван Иванович']).filter(r => r.include).length, 0)
  assert.equal(parsePhotoText('').rows.length, 0)
})

test('CSV import is preserved', async () => {
  const file = new File(['ФИО;Должность;Отдел\nИванов Иван Иванович;Инженер;Разработка'], 'staff.csv')
  const parsed = await parseFile(file)
  assert.equal(parsed.rows[0].job_title, 'Инженер')
})
