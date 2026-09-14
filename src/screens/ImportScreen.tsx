// Путь: src/screens/ImportScreen.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { insertEmployees, useEmployees, type ImportResult } from '../lib/employees'
import { downloadTemplate, parseFile, revalidate, type ParsedRow } from '../lib/parseEmployees'
import type { EmployeeInput } from '../lib/employees'
import { parsePhotoText } from '../lib/parsePhotoText'

const orNull = (s: string): string | null => (s.trim() === '' ? null : s.trim())

export default function ImportScreen() {
  const { list, reload } = useEmployees()
  const fileInput = useRef<HTMLInputElement>(null)
  const operation = useRef<AbortController | null>(null)

  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [notes, setNotes] = useState<string[]>([])
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [progress, setProgress] = useState('')
  const [photoText, setPhotoText] = useState<string | null>(null)

  useEffect(() => () => operation.current?.abort(), [])

  const existingNames = useMemo(() => list.map((e) => e.full_name), [list])

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
        parsed = await parseFile(file)
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
    setRows((prev) => prev.map((r) => ({ ...r, include: include && !r.blocking })))
  }

  const ready = rows.filter((r) => r.include && !r.blocking)
  const skipped = rows.length - ready.length

  async function handleImport() {
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
      reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="container container--wide fade-in">
      <AppHeader title="Импорт сотрудников" back />

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
            <Link to="/employees" className="btn btn--primary btn--sm">К списку сотрудников</Link>
            <Link to="/" className="btn btn--ghost btn--sm">На главную</Link>
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
            📂 {parsing ? 'Читаю файл...' : 'Выбрать файл'}
          </button>
          <button className="btn btn--ghost" onClick={() => { downloadTemplate().catch(() => setError('Не удалось скачать шаблон. Проверьте интернет.')) }}>
            ⬇ Скачать шаблон Excel
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
        {error && <div className="card answer-wrong small" style={{ marginTop: 12 }}>{error}</div>}
      </div>

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
            <h3>2. Мы распознали следующие данные</h3>
            <p className="small">
              Готово к импорту: <strong style={{ color: 'var(--success)' }}>{ready.length}</strong>
              {skipped > 0 && <> · будет пропущено: <strong style={{ color: 'var(--danger)' }}>{skipped}</strong></>}
            </p>

            {notes.length > 0 && (
              <ul className="small muted" style={{ paddingLeft: 18, marginBottom: 10 }}>
                {notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            )}

            <div className="row">
              <button className="btn btn--sm btn--ghost" onClick={() => setAll(true)}>Выбрать все</button>
              <button className="btn btn--sm btn--ghost" onClick={() => setAll(false)}>Снять все</button>
            </div>
          </div>

          <div className="stack" style={{ marginBottom: 16 }}>
            {rows.map((row, index) => (
              <div
                className={`card${row.blocking ? ' answer-wrong' : row.problems.length ? ' answer-almost' : ''}`}
                key={index}
              >
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                  <label className="row small" style={{ gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={row.include}
                      disabled={row.blocking}
                      onChange={() => toggleRow(index)}
                      style={{ width: 22, height: 22 }}
                    />
                    <span className="muted">строка {row.line}</span>
                  </label>
                  {row.problems.length > 0 && (
                    <span className={row.blocking ? 'badge badge--weak' : 'badge badge--learn'}>
                      {row.problems.join(' · ')}
                    </span>
                  )}
                </div>

                <div className="grid grid-2">
                  <div>
                    <label className="label">ФИО *</label>
                    <input className="input" value={row.full_name}
                           onChange={(e) => editRow(index, 'full_name', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Должность *</label>
                    <input className="input" value={row.job_title}
                           onChange={(e) => editRow(index, 'job_title', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Отдел</label>
                    <input className="input" value={row.department}
                           onChange={(e) => editRow(index, 'department', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Чем занимается</label>
                    <input className="input" value={row.description}
                           onChange={(e) => editRow(index, 'description', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* --- Шаг 3: импорт --- */}
          <div className="card" style={{ position: 'sticky', bottom: 12 }}>
            <button
              className="btn btn--primary btn--block btn--lg"
              onClick={handleImport}
              disabled={importing || parsing || ready.length === 0}
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
