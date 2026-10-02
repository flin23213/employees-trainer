// Путь: src/screens/ImportScreen.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import ListContext from '../components/ListContext'
import Icon from '../components/Icon'
import { insertEmployees, useEmployees, type ImportResult } from '../lib/employees'
import { downloadTemplate, parseFile, parseEmployeeMatrix, parseMappedEmployeeMatrix, readImportWorkbook, suggestImportMapping, revalidate, type ParsedRow, type ImportMapping, type ImportSheet, type ImportField } from '../lib/parseEmployees'
import type { EmployeeInput } from '../lib/employees'
import { parsePhotoText } from '../lib/parsePhotoText'
import '../styles/import.css'

const orNull = (s: string): string | null => (s.trim() === '' ? null : s.trim())
const FIELDS: { field: ImportField; label: string; required?: boolean }[] = [
  { field: 'full_name', label: 'ФИО', required: true }, { field: 'job_title', label: 'Должность', required: true },
  { field: 'department', label: 'Отдел' }, { field: 'description', label: 'Чем занимается' }, { field: 'notes', label: 'Заметка' },
]
function columnName(index: number): string {
  let name = ''; let number = index + 1
  while (number > 0) { number--; name = String.fromCharCode(65 + number % 26) + name; number = Math.floor(number / 26) }
  return name
}

export default function ImportScreen() {
  const { list, reload } = useEmployees()
  const fileInput = useRef<HTMLInputElement>(null)
  const operation = useRef<AbortController | null>(null)
  const importLock = useRef(false)

  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [notes, setNotes] = useState<string[]>([])
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [progress, setProgress] = useState('')
  const [photoText, setPhotoText] = useState<string | null>(null)
  const [sheets, setSheets] = useState<ImportSheet[]>([])
  const [sheetIndex, setSheetIndex] = useState(0)
  const [mapping, setMapping] = useState<ImportMapping>({ columns: {}, startRow: 0, headerRow: null })
  const [mappingPending, setMappingPending] = useState(false)
  const [filter, setFilter] = useState<'all' | 'problems'>('all')
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => () => operation.current?.abort(), [])

  const existingNames = useMemo(() => list.map((e) => e.full_name), [list])
  const checkedRows = useMemo(() => revalidate(rows, existingNames), [rows, existingNames])
  const sheet = sheets[sheetIndex]
  const columns = Array.from({ length: Math.max(0, ...(sheet?.matrix.map(row => row.length) ?? [])) }, (_, index) => {
    const heading = mapping.headerRow === null ? '' : sheet?.matrix[mapping.headerRow]?.[index] ?? ''
    const sample = sheet?.matrix.slice(mapping.startRow).map(row => row[index] ?? '').find(value => value.trim()) ?? ''
    return { index, label: `${columnName(index)}${heading ? ` · ${heading}` : ''}${sample ? ` — ${sample.slice(0, 55)}` : ''}` }
  })

  function selectSheet(index: number) {
    const next = sheets[index]
    if (!next) return
    const parsed = parseEmployeeMatrix(next.matrix)
    setSheetIndex(index); setMapping(suggestImportMapping(next.matrix)); setMappingPending(false)
    setRows(revalidate(parsed.rows, existingNames)); setNotes(parsed.notes); setExpanded(null); setFilter('all'); setError(null)
  }

  function applyMapping() {
    if (!sheet || importing) return
    try {
      const parsed = parseMappedEmployeeMatrix(sheet.matrix, mapping)
      setRows(revalidate(parsed.rows, existingNames)); setNotes(parsed.notes); setMappingPending(false); setExpanded(null); setError(null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось применить столбцы.') }
  }

  function changeColumn(field: ImportField, value: string) {
    const next = { ...mapping.columns }
    if (value === '') delete next[field]
    else next[field] = Number(value)
    setMapping({ ...mapping, columns: next }); setMappingPending(true)
  }

  async function handleFile(file: File) {
    if (importing) return
    operation.current?.abort()
    const controller = new AbortController()
    operation.current = controller
    setError(null)
    setResult(null)
    setRows([])
    setNotes([])
    setPhotoText(null)
    setSheets([]); setMappingPending(false); setFilter('all'); setExpanded(null)
    setProgress('Читаю файл…')
    setParsing(true)
    setFileName(file.name)
    try {
      const photo = /\.(png|jpe?g|webp|bmp)$/i.test(file.name) || /^image\/(png|jpeg|webp|bmp)$/.test(file.type)
      let parsed
      if (photo) {
        const { recognizePhoto } = await import('../lib/recognizePhoto')
        controller.signal.throwIfAborted()
        const text = await recognizePhoto(file, controller.signal, setProgress)
        controller.signal.throwIfAborted()
        setPhotoText(text)
        parsed = parsePhotoText(text)
        parsed.notes.unshift('Проверьте ФИО и должности: распознавание фотографии может ошибаться.')
      } else {
        if (!/\.(xlsx|xls|xlsm|csv|txt)$/i.test(file.name)) throw new Error('Выберите таблицу, текст или фото JPG, PNG, WebP, BMP.')
        if (/\.(xlsx|xls|xlsm|csv)$/i.test(file.name)) {
          const workbook = await readImportWorkbook(file)
          controller.signal.throwIfAborted()
          const suggestedIndex = workbook.findIndex(item => {
            const config = suggestImportMapping(item.matrix)
            return config.columns.full_name !== undefined && config.columns.job_title !== undefined
          })
          const index = Math.max(0, suggestedIndex)
          setSheets(workbook); setSheetIndex(index); setMapping(suggestImportMapping(workbook[index].matrix))
          parsed = parseEmployeeMatrix(workbook[index].matrix)
        } else parsed = await parseFile(file)
      }
      controller.signal.throwIfAborted()
      setRows(revalidate(parsed.rows, existingNames))
      setNotes(parsed.notes)
    } catch (e) {
      if (controller.signal.aborted) return
      setError('Не удалось прочитать файл: ' + (e instanceof Error ? e.message : String(e)))
      setRows([])
      setNotes([])
    } finally {
      if (operation.current === controller) {
        setParsing(false)
        setProgress('')
      }
    }
  }

  /** Правка ячейки в предпросмотре */
  function editRow(index: number, field: keyof ParsedRow, value: string) {
    setRows((prev) => {
      const next = prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
      return revalidate(next, existingNames)
    })
  }

  function toggleRow(index: number) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, include: !r.include } : r)))
  }

  function setAll(include: boolean) {
    setRows(checkedRows.map((r) => ({ ...r, include: include && !r.blocking })))
  }

  const ready = checkedRows.filter((r) => r.include && !r.blocking)
  const skipped = rows.length - ready.length
  const problems = checkedRows.filter(row => row.problems.length > 0).length
  const visible = checkedRows.map((row, index) => ({ row, index })).filter(({ row, index }) => filter === 'all' || row.problems.length > 0 || expanded === index)

  async function handleImport() {
    if (importLock.current || parsing || mappingPending || !ready.length) return
    importLock.current = true
    setImporting(true)
    setError(null)
    try {
      const payload: EmployeeInput[] = ready.map((r) => ({
        full_name: r.full_name.trim(),
        job_title: r.job_title.trim(),
        department: orNull(r.department),
        description: orNull(r.description),
        notes: orNull(r.notes),
      }))
      const res = await insertEmployees(payload)
      setResult(res)
      setRows([])
      setNotes([])
      setFileName('')
      setPhotoText(null)
      setSheets([]); setMappingPending(false); setExpanded(null)
      reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      importLock.current = false
      setImporting(false)
    }
  }

  return (
    <div className="container container--wide fade-in import-page">
      <AppHeader title="Импорт сотрудников" back />
      <ListContext />

      {/* --- Результат прошедшего импорта --- */}
      {result && (
        <div className="card answer-correct" style={{ marginBottom: 16 }}>
          <h3>Импорт завершён</h3>
          <p>Добавлено сотрудников: <strong>{result.inserted}</strong></p>
          {result.failures.length > 0 && (
            <>
              <p className="small">Не удалось добавить {result.failures.length}:</p>
              <ul className="small">
                {result.failures.map((f, i) => <li key={i}>{f.name}: {f.reason}</li>)}
              </ul>
            </>
          )}
          <div className="row">
            <Link to="/learn" className="btn btn--primary btn--sm">Начать занятие</Link>
            <Link to="/employees" className="btn btn--ghost btn--sm">Проверить список</Link>
          </div>
        </div>
      )}

      {/* --- Шаг 1: выбор файла --- */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3>1. Выберите файл</h3>
        <p className="small muted">
          Поддерживаются Excel, CSV, TXT и фотографии списков: JPG, PNG, WebP, BMP (до 15 МБ).
          Обязательны только ФИО и должность, остальное по желанию.
        </p>
        <p className="small muted">Фото обрабатывается на вашем устройстве. При первом запуске потребуется интернет для загрузки распознавания. Снимайте печатный список ровно, при хорошем освещении. Перед сохранением можно исправить результат.</p>

        <input
          ref={fileInput}
          type="file"
          accept=".xlsx,.xls,.xlsm,.csv,.txt,.jpg,.jpeg,.png,.webp,.bmp"
          style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
        />

        <div className="row">
          <button className="btn btn--primary" onClick={() => fileInput.current?.click()} disabled={parsing || importing}>
            {parsing ? 'Читаю файл...' : 'Выбрать файл'}
          </button>
          <button className="btn btn--ghost" onClick={() => { downloadTemplate().catch(() => setError('Не удалось скачать шаблон. Проверьте интернет.')) }}>
            <Icon name="upload" />Скачать шаблон Excel
          </button>
        </div>
        {parsing && <div className="row" role="status" style={{ marginTop: 12 }}>
          <span className="small">{progress}</span>
          <button className="btn btn--ghost btn--sm" onClick={() => {
            operation.current?.abort()
            operation.current = null
            setParsing(false)
            setProgress('')
            setFileName('')
          }}>Отменить</button>
        </div>}

        {fileName && <p className="small muted" style={{ marginTop: 10 }}>Файл: {fileName}</p>}
        {error && <div className="card answer-wrong small" role="alert" style={{ marginTop: 12 }}>{error}</div>}
      </div>

      {sheet && !parsing && <details className="card import-mapping" open={!/\.csv$/i.test(fileName)}>
        <summary>Лист и столбцы файла<Icon name="chevron" /></summary>
        <p className="small muted">Мы предложили соответствие автоматически. Можно изменить его сразу для всего файла; повторное применение заменит правки строк данными файла.</p>
        <div className="import-mapping__source">
          <label className="label">Лист<select className="input" value={sheetIndex} disabled={importing} onChange={event => selectSheet(Number(event.target.value))}>{sheets.map((item, index) => <option key={index} value={index}>{item.name}</option>)}</select></label>
          <label className="label">Первая строка с данными<input className="input" type="number" inputMode="numeric" min={1} max={sheet.matrix.length} step={1} value={Number.isNaN(mapping.startRow) ? '' : mapping.startRow + 1} disabled={importing} onChange={event => { const startRow = event.target.value ? Number(event.target.value) - 1 : NaN; setMapping({ ...mapping, startRow, headerRow: mapping.headerRow ?? (startRow > 0 ? startRow - 1 : null) }); setMappingPending(true) }} /></label>
        </div>
        <div className="import-mapping__columns">{FIELDS.slice(0, 3).map(({ field, label, required }) => <label className="label" key={field}>{label}{required ? ' *' : ''}<select className="input" value={mapping.columns[field] ?? ''} disabled={importing} onChange={event => changeColumn(field, event.target.value)}><option value="">{required ? 'Выберите столбец' : 'Не использовать'}</option>{columns.map(column => <option value={column.index} key={column.index}>{column.label}</option>)}</select></label>)}</div>
        <details className="import-extra-fields"><summary>Описание и заметки</summary><div className="import-mapping__columns">{FIELDS.slice(3).map(({ field, label }) => <label className="label" key={field}>{label}<select className="input" value={mapping.columns[field] ?? ''} disabled={importing} onChange={event => changeColumn(field, event.target.value)}><option value="">Не использовать</option>{columns.map(column => <option value={column.index} key={column.index}>{column.label}</option>)}</select></label>)}</div></details>
        <button className="btn btn--ghost" disabled={importing || !sheet.matrix.length} onClick={applyMapping}>Применить к файлу</button>
        {mappingPending && <p className="small import-mapping__pending" role="status">Примените новые столбцы перед импортом.</p>}
      </details>}

      {photoText !== null && !parsing && <details className="card" style={{ marginBottom: 16 }}>
        <summary>Распознанный текст — исправить разбиение строк</summary>
        <label className="label" htmlFor="photo-text">Один сотрудник в строке: ФИО | Должность | Отдел</label>
        <textarea id="photo-text" className="input" rows={8} value={photoText} disabled={importing}
          onChange={event => setPhotoText(event.target.value)} />
        <button className="btn btn--ghost" disabled={importing} onClick={() => {
          const parsed = parsePhotoText(photoText)
          setRows(revalidate(parsed.rows, existingNames))
          setNotes(parsed.notes)
        }}>Обновить предпросмотр</button>
      </details>}

      {/* --- Шаг 2: что распознали --- */}
      {rows.length > 0 && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3>2. Проверьте сотрудников</h3>
            <p className="small">
              Готово к импорту: <strong style={{ color: 'var(--success)' }}>{ready.length}</strong>
              {skipped > 0 && <> · будет пропущено: <strong style={{ color: 'var(--danger)' }}>{skipped}</strong></>}
            </p>
            {photoText !== null && <p className="small muted">Проверьте ФИО и должности: распознавание фотографии может ошибаться.</p>}

            {notes.length > 0 && (
              <details className="import-notes"><summary>Замечания к файлу · {notes.length}</summary><ul className="small muted">{notes.map((n, i) => <li key={i}>{n}</li>)}</ul></details>
            )}

            <div className="row">
              <button className="btn btn--sm btn--ghost" disabled={importing} onClick={() => setAll(true)}>Выбрать все</button>
              <button className="btn btn--sm btn--ghost" disabled={importing} onClick={() => setAll(false)}>Снять все</button>
            </div>
            <div className="library-tabs import-filters" role="group" aria-label="Какие строки показать"><button disabled={importing} aria-pressed={filter === 'all'} className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>Все · {rows.length}</button><button disabled={importing} aria-pressed={filter === 'problems'} className={filter === 'problems' ? 'is-active' : ''} onClick={() => setFilter('problems')}>Нужно проверить · {problems}</button></div>
            <p className="small muted import-filter-hint">Фильтр меняет только отображение. Импортируются все выбранные строки без блокирующих ошибок.</p>
          </div>

          <div className="import-rows">
            {visible.map(({ row, index }) => <article className={`import-row${row.blocking ? ' import-row--blocked' : row.problems.length ? ' import-row--warning' : ''}`} key={index}>
              <input type="checkbox" checked={row.include} disabled={row.blocking || importing} onChange={() => toggleRow(index)} aria-label={`Включить строку ${row.line}: ${row.full_name || 'нет ФИО'}`} />
              <details open={expanded === index} onToggle={event => { const open = event.currentTarget.open; setExpanded(previous => open ? index : previous === index ? null : previous) }}>
                <summary><span><strong>{row.full_name || `Строка ${row.line}: нет ФИО`}</strong><span className="import-row__role">{row.job_title || 'Нет должности'}{row.department ? ` · ${row.department}` : ''}</span><span className="import-row__number">Строка {row.line} · Изменить</span>{row.problems.length > 0 && <span className="import-row__problems">{row.problems.join(' · ')}</span>}</span><Icon name="chevron" /></summary>
                <div className="import-row__fields">{FIELDS.map(({ field, label, required }) => <label className="label" key={field}>{label}{required ? ' *' : ''}{field === 'full_name' || field === 'department' ? <input className="input" value={row[field]} disabled={importing} onChange={event => editRow(index, field, event.target.value)} /> : <textarea className="input" rows={2} value={row[field]} disabled={importing} onChange={event => editRow(index, field, event.target.value)} />}</label>)}</div>
              </details>
            </article>)}
            {!visible.length && <p className="card center muted" role="status">Строк с замечаниями нет. Можно проверить все строки или импортировать выбранных сотрудников.</p>}
          </div>

          {/* --- Шаг 3: импорт --- */}
          <div className="card import-submit">
            <button
              className="btn btn--primary btn--block btn--lg"
              onClick={handleImport}
              disabled={importing || parsing || mappingPending || ready.length === 0}
            >
              {importing ? 'Импортирую...' : `Импортировать ${ready.length} сотрудников`}
            </button>
            <p className="small muted center" style={{ marginTop: 8, marginBottom: 0 }}>
              Проверьте данные выше: после импорта их можно будет править по одному.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
