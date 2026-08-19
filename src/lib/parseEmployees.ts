// Путь: src/lib/parseEmployees.ts
import * as XLSX from 'xlsx'

/** Одна распознанная строка будущего сотрудника */
export type ParsedRow = {
  line: number            // номер строки в исходном файле
  full_name: string
  job_title: string
  department: string
  description: string
  notes: string
  include: boolean        // импортировать эту строку?
  problems: string[]      // что нас смущает в этой строке
  blocking: boolean       // true = импортировать нельзя
}

export type ParseResult = {
  rows: ParsedRow[]
  notes: string[]         // общие замечания по файлу
}

/* ============================ ЧИСТКА ТЕКСТА ============================ */

const INVISIBLE = /[\u200B-\u200D\uFEFF\u00AD]/g   // невидимые символы из Word

/** Убрать невидимое, сжать пробелы, обрезать края */
function clean(value: unknown): string {
  return String(value ?? '').replace(INVISIBLE, ' ').replace(/\s+/g, ' ').trim()
}

/** Убрать нумерацию и маркеры списка в начале строки: «1.», «2)», «-», «•» */
function stripMarkers(s: string): string {
  return s.replace(/^\s*(\d{1,3}[.)]|[-–—•*·])\s+/, '').trim()
}

/* ======================= РАСПОЗНАВАНИЕ СОДЕРЖИМОГО ===================== */

/** Слово, похожее на часть ФИО: буквы, дефис, инициалы «И.» */
const NAME_WORD = /^([А-ЯЁA-Za-zа-яё]+([-'’][А-ЯЁA-Za-zа-яё]+)*|[А-ЯЁA-Z]\.)$/

/** Похоже ли на ФИО: 2-4 слова, без цифр */
function looksLikeName(value: string): boolean {
  const t = clean(value)
  if (!t || /\d/.test(t)) return false
  const words = t.split(' ')
  if (words.length < 2 || words.length > 4) return false
  return words.every((w) => NAME_WORD.test(w))
}

/** Ключевые слова должностей */
const TITLE_WORDS = [
  'менеджер','директор','руководител','начальник','заместител','зам.','бухгалтер','инженер',
  'специалист','юрист','администратор','аналитик','разработчик','программист','дизайнер',
  'маркетолог','кадр','секретар','водител','кладовщик','продавец','консультант','техник',
  'оператор','экономист','логист','заведующ','мастер','монтажник','электрик','сварщик',
  'курьер','охранник','уборщи','повар','тестировщик','сисадмин','системн','архитектор',
  'координатор','ассистент','супервайзер','кассир','товаровед','снабжен','закупк','сборщик',
  'грузчик','рабочий','стажёр','стажер','практикант','президент','главный','старший',
  'младший','ведущий','hr','it','ceo','cto','cfo','smm','pr',
]

function looksLikeTitle(value: string): boolean {
  const t = clean(value).toLowerCase()
  return t.length > 0 && TITLE_WORDS.some((w) => t.includes(w))
}

/** Ключевые слова отделов */
const DEPT_WORDS = [
  'отдел','департамент','подразделен','служба','управлен','сектор','дирекция','цех',
  'бухгалтери','склад','логистик','снабжен','производств','администрац','финанс',
  'маркетинг','продаж','персонал','кадр','юридическ','it','ит','закупк','юрид',
]

/** Строка-заголовок отдела вида «Отдел продаж:» или «Бухгалтерия» */
function looksLikeDeptHeader(value: string): boolean {
  const t = clean(value)
  if (!t || looksLikeName(t)) return false
  if (t.split(' ').length > 5) return false
  if (t.endsWith(':')) return true
  const low = t.toLowerCase()
  return DEPT_WORDS.some((w) => low.includes(w))
}

/* ========================= КРАСИВОЕ НАПИСАНИЕ ========================= */

const ACRONYMS = new Set([
  'it','ит','hr','pr','смм','smm','ceo','cto','cfo','qa','sql','ооо','оао','зао','ао','пао',
  'ип','нии','кб','отк','гк','ук','сб','мвд','ржд','тк','сэд','эцп',
])

function fixWord(word: string): string {
  const low = word.toLowerCase()
  if (ACRONYMS.has(low)) return word.toUpperCase()
  return low
    .split('-')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join('-')
}

/** «ИВАНОВ ИВАН» и «иванов иван» -> «Иванов Иван» */
function normalizeName(value: string): string {
  const t = clean(value)
  if (!t) return ''
  const allCaps = t === t.toUpperCase()
  const allLower = t === t.toLowerCase()
  if (!allCaps && !allLower) return t          // смешанный регистр не трогаем
  return t.split(' ').map(fixWord).join(' ')
}

/** «СТАРШИЙ МЕНЕДЖЕР» -> «Старший менеджер» (заглавная только у первого слова) */
function normalizeTitle(value: string): string {
  const t = clean(value)
  if (!t) return ''
  const allCaps = t === t.toUpperCase()
  const allLower = t === t.toLowerCase()
  if (!allCaps && !allLower) return t
  return t
    .split(' ')
    .map((w, i) => {
      const low = w.toLowerCase()
      if (ACRONYMS.has(low)) return w.toUpperCase()
      return i === 0 ? low.charAt(0).toUpperCase() + low.slice(1) : low
    })
    .join(' ')
}

/* ============================ ЗАГОЛОВКИ СТОЛБЦОВ ====================== */

type Field = 'full_name' | 'job_title' | 'department' | 'description' | 'notes'

const HEADER_SYNONYMS: Record<Field, string[]> = {
  full_name:   ['фио','ф.и.о','фамилия имя отчество','фамилия','сотрудник','работник','полное имя','имя','name','fullname'],
  job_title:   ['должность','позиция','роль','профессия','position','title','job'],
  department:  ['отдел','подразделение','департамент','служба','отделение','department'],
  description: ['чем занимается','описание','обязанности','функции','деятельность','задачи','description','что делает'],
  notes:       ['дополнительная информация','доп информация','доп. информация','заметка','заметки','примечание','комментарий','notes','прочее','дополнительно'],
}

function matchHeader(cell: string): Field | null {
  const t = clean(cell).toLowerCase().replace(/[.:]/g, '').trim()
  if (!t) return null
  for (const field of Object.keys(HEADER_SYNONYMS) as Field[]) {
    if (HEADER_SYNONYMS[field].some((syn) => t === syn || t.startsWith(syn))) return field
  }
  return null
}

/* ======================= РАЗДЕЛИТЕЛИ ДЛЯ TXT ========================== */

const SEPARATORS = [' — ', ' – ', ' - ', '—', '–', '|', ';', '\t', ' : ']

/** Подбираем разделитель, который стабильнее всех делит строки на части */
function detectSeparator(lines: string[]): string | null {
  let best: string | null = null
  let bestScore = 0
  for (const sep of SEPARATORS) {
    const score = lines.filter((l) => l.split(sep).length >= 2).length
    if (score > bestScore) { bestScore = score; best = sep }
  }
  // разделитель принимаем, только если он работает хотя бы для половины строк
  return bestScore >= Math.max(1, Math.floor(lines.length / 2)) ? best : null
}

/* ============================ ЧТЕНИЕ ФАЙЛОВ =========================== */

/** Текстовые файлы бывают в UTF-8 и в windows-1251 (родное для Excel в России) */
async function decodeText(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const utf8 = new TextDecoder('utf-8').decode(buf)
  if (!utf8.includes('\uFFFD')) return utf8
  try {
    return new TextDecoder('windows-1251').decode(buf)
  } catch {
    return utf8
  }
}

function detectDelimiter(text: string): string {
  const sample = text.split(/\r?\n/).slice(0, 10).join('\n')
  const counts: Record<string, number> = { ';': 0, ',': 0, '\t': 0 }
  for (const ch of sample) if (ch in counts) counts[ch]++
  const [best, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return n > 0 ? best : ';'
}

/** Разбор CSV с учётом кавычек */
function parseCsv(text: string): string[][] {
  const delim = detectDelimiter(text)
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ } else inQuotes = false
      } else cell += ch
      continue
    }
    if (ch === '"') { inQuotes = true; continue }
    if (ch === delim) { row.push(cell); cell = ''; continue }
    if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue }
    if (ch === '\r') continue
    cell += ch
  }
  row.push(cell)
  rows.push(row)
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

/* ====================== ТАБЛИЦА -> СТРОКИ СОТРУДНИКОВ ================= */

function emptyRow(line: number): ParsedRow {
  return { line, full_name: '', job_title: '', department: '', description: '', notes: '',
           include: true, problems: [], blocking: false }
}

function matrixToRows(matrix: string[][], notes: string[]): ParsedRow[] {
  const grid = matrix
    .map((r) => r.map((c) => clean(c)))
    .filter((r) => r.some((c) => c !== ''))

  if (grid.length === 0) return []

  const width = Math.max(...grid.map((r) => r.length))

  /* --- Случай 1: всего один столбец (обычный TXT или одна колонка Excel) --- */
  if (width === 1) {
    const lines = grid.map((r) => stripMarkers(r[0]))
    const dataLines = lines.filter((l) => !looksLikeDeptHeader(l))
    const sep = detectSeparator(dataLines)
    if (sep) notes.push(`Данные в одной колонке, разделитель определён как «${sep.trim() || 'табуляция'}».`)
    else notes.push('Разделитель не найден: считаем, что в строке только ФИО. Должности придётся дописать вручную.')

    const rows: ParsedRow[] = []
    let currentDept = ''

    lines.forEach((line, i) => {
      if (looksLikeDeptHeader(line)) {
        currentDept = line.replace(/:$/, '').trim()
        notes.push(`Строка ${i + 1}: «${currentDept}» принята за название отдела.`)
        return
      }
      const parts = sep ? line.split(sep).map((p) => clean(p)).filter((p) => p !== '') : [line]
      const row = emptyRow(i + 1)
      row.full_name = normalizeName(parts[0] ?? '')
      row.job_title = normalizeTitle(parts[1] ?? '')
      row.department = parts[2] ? clean(parts[2]) : currentDept
      row.description = parts.slice(3).join(', ')
      rows.push(row)
    })
    return rows
  }

  /* --- Случай 2: несколько столбцов. Пытаемся прочитать заголовки --- */
  const mapping = new Map<number, Field>()
  const firstRow = grid[0]
  let matched = 0
  firstRow.forEach((cell, idx) => {
    const field = matchHeader(cell)
    if (field && !Array.from(mapping.values()).includes(field)) { mapping.set(idx, field); matched++ }
  })

  let startIndex = 0
  if (matched >= 2 && Array.from(mapping.values()).includes('full_name')) {
    startIndex = 1
    notes.push('Заголовки столбцов распознаны из первой строки.')
  } else {
    /* --- Заголовков нет: определяем столбцы по содержимому --- */
    mapping.clear()
    const scores = Array.from({ length: width }, (_, col) => {
      const cells = grid.map((r) => r[col] ?? '').filter((c) => c !== '')
      if (cells.length === 0) return { col, name: 0, title: 0, avgLen: 0 }
      return {
        col,
        name: cells.filter(looksLikeName).length / cells.length,
        title: cells.filter(looksLikeTitle).length / cells.length,
        avgLen: cells.reduce((s, c) => s + c.length, 0) / cells.length,
      }
    })

    const nameCol = [...scores].sort((a, b) => b.name - a.name)[0]
    if (nameCol && nameCol.name >= 0.5) mapping.set(nameCol.col, 'full_name')

    const titleCol = [...scores]
      .filter((s) => !mapping.has(s.col))
      .sort((a, b) => b.title - a.title)[0]
    if (titleCol && titleCol.title >= 0.25) mapping.set(titleCol.col, 'job_title')

    const rest = scores.filter((s) => !mapping.has(s.col) && s.avgLen > 0)
    const byLen = [...rest].sort((a, b) => a.avgLen - b.avgLen)
    if (byLen[0]) mapping.set(byLen[0].col, 'department')          // самый короткий = отдел
    if (byLen.length > 1) mapping.set(byLen[byLen.length - 1].col, 'description')

    notes.push('Заголовков в файле нет, столбцы определены по содержимому. Проверьте результат внимательно.')
  }

  const rows: ParsedRow[] = []
  let currentDept = ''

  for (let i = startIndex; i < grid.length; i++) {
    const raw = grid[i]
    const filled = raw.filter((c) => c !== '')

    // Строка-заголовок отдела: заполнена только одна ячейка
    if (filled.length === 1 && looksLikeDeptHeader(filled[0])) {
      currentDept = filled[0].replace(/:$/, '').trim()
      notes.push(`Строка ${i + 1}: «${currentDept}» принята за название отдела.`)
      continue
    }

    const row = emptyRow(i + 1)
    mapping.forEach((field, col) => {
      const value = stripMarkers(raw[col] ?? '')
      if (field === 'full_name') row.full_name = normalizeName(value)
      else if (field === 'job_title') row.job_title = normalizeTitle(value)
      else row[field] = value
    })

    // ФИО и должность слиплись в одной ячейке
    if (row.full_name && !row.job_title) {
      const sep = SEPARATORS.find((s) => row.full_name.includes(s))
      if (sep) {
        const parts = row.full_name.split(sep).map((p) => clean(p))
        row.full_name = normalizeName(parts[0])
        row.job_title = normalizeTitle(parts[1] ?? '')
        if (parts[2]) row.department = parts[2]
      }
    }

    if (!row.department) row.department = currentDept
    rows.push(row)
  }

  return rows
}

/* =========================== ГЛАВНАЯ ФУНКЦИЯ ========================== */

export async function parseFile(file: File): Promise<ParseResult> {
  const notes: string[] = []
  const name = file.name.toLowerCase()

  let matrix: string[][]

  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.xlsm')) {
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const sheetName = wb.SheetNames[0]
    if (wb.SheetNames.length > 1) {
      notes.push(`В файле ${wb.SheetNames.length} листа, взят первый: «${sheetName}».`)
    }
    matrix = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[sheetName], {
      header: 1, blankrows: false, defval: '', raw: false,
    })
  } else if (name.endsWith('.csv')) {
    matrix = parseCsv(await decodeText(file))
  } else {
    // TXT и всё остальное: построчно
    const text = await decodeText(file)
    matrix = text.split(/\r?\n/).filter((l) => l.trim() !== '').map((l) => [l])
  }

  const rows = matrixToRows(matrix, notes)
  if (rows.length === 0) notes.push('Не удалось найти ни одной строки с данными.')
  return { rows, notes }
}

/* ====================== ПРОВЕРКА И ПРЕДУПРЕЖДЕНИЯ ===================== */

const key = (s: string) => clean(s).toLowerCase()

/** Пересчитывает проблемы для всех строк. Вызывается после разбора и после правок */
export function revalidate(rows: ParsedRow[], existingNames: string[]): ParsedRow[] {
  const existing = new Set(existingNames.map(key))
  const seen = new Set<string>()

  return rows.map((row) => {
    const problems: string[] = []
    let blocking = false

    const name = clean(row.full_name)
    const title = clean(row.job_title)

    if (!name) { problems.push('Нет ФИО'); blocking = true }
    if (!title) { problems.push('Нет должности'); blocking = true }

    if (name && name.split(' ').length === 1) {
      problems.push('ФИО из одного слова, проверьте')
    }
    if (name && title && looksLikeName(title) && !looksLikeTitle(title)) {
      problems.push('Похоже, ФИО и должность перепутаны')
    }
    if (name && existing.has(key(name))) {
      problems.push('Уже есть в базе'); blocking = true
    }
    if (name) {
      if (seen.has(key(name))) { problems.push('Повтор внутри файла'); blocking = true }
      else seen.add(key(name))
    }

    return { ...row, problems, blocking, include: row.include && !blocking }
  })
}

/* ============================ ШАБЛОН EXCEL ============================ */

export function downloadTemplate(): void {
  const data = [
    ['ФИО', 'Должность', 'Отдел', 'Чем занимается', 'Дополнительная информация'],
    ['Иванов Иван Иванович', 'Старший менеджер', 'Продажи', 'Работает с ключевыми клиентами и контролирует работу менеджеров', 'Сидит в 305 кабинете'],
    ['Петрова Анна Сергеевна', 'Бухгалтер', 'Бухгалтерия', 'Первичные документы и авансовые отчёты', ''],
    ['Сидоров Алексей Иванович', 'Руководитель отдела', 'Продажи', '', 'Согласует скидки'],
  ]
  const sheet = XLSX.utils.aoa_to_sheet(data)
  sheet['!cols'] = [{ wch: 32 }, { wch: 26 }, { wch: 18 }, { wch: 46 }, { wch: 30 }]
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Сотрудники')
  XLSX.writeFile(book, 'shablon-sotrudnikov.xlsx')
}