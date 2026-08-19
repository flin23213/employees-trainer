// Путь: src/screens/ShareScreen.tsx
// Обмен списками: создать код-приглашение или ввести код коллеги.

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { Segmented } from '../components/Briefing'
import { useEmployees } from '../lib/employees'
import {
  codeState, createShareCode, deleteShareCode, formatCode, listShareCodes,
  redeemShareCode, revokeShareCode, type RedeemResult, type ShareCode,
} from '../lib/share'

type Tab = 'give' | 'take'

export default function ShareScreen() {
  const { list, reload } = useEmployees()

  const [tab, setTab] = useState<Tab>('give')

  /* --- создание кода --- */
  const [days, setDays] = useState<number>(30)
  const [maxUses, setMaxUses] = useState<number>(0)      // 0 = без ограничений
  const [fresh, setFresh] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [codes, setCodes] = useState<ShareCode[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* --- активация кода --- */
  const [input, setInput] = useState('')
  const [taking, setTaking] = useState(false)
  const [takeError, setTakeError] = useState<string | null>(null)
  const [result, setResult] = useState<RedeemResult | null>(null)

  const loadCodes = useCallback(async () => {
    try {
      setCodes(await listShareCodes())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => { void loadCodes() }, [loadCodes])

  async function handleCreate() {
    setBusy(true)
    setError(null)
    setCopied(false)
    try {
      const code = await createShareCode({
        days: days === 0 ? null : days,
        maxUses: maxUses === 0 ? null : maxUses,
      })
      setFresh(code)
      await loadCodes()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function copy(code: string) {
    const text = formatCode(code)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Не удалось скопировать автоматически. Выделите код и скопируйте вручную.')
    }
  }

  /** Кнопка «Поделиться» телефона: письмо, мессенджер и т.п. */
  async function share(code: string) {
    const text = `Мой список сотрудников для тренажёра. Код приглашения: ${formatCode(code)}`
    if (navigator.share) {
      try { await navigator.share({ title: 'Код приглашения', text }) } catch { /* закрыли окно */ }
    } else {
      await copy(code)
    }
  }

  async function handleRedeem() {
    setTaking(true)
    setTakeError(null)
    setResult(null)
    try {
      const res = await redeemShareCode(input)
      setResult(res)
      setInput('')
      reload()
    } catch (e) {
      setTakeError(e instanceof Error ? e.message : String(e))
    } finally {
      setTaking(false)
    }
  }

  return (
    <div className="container">
      <AppHeader title="Обмен списками" back />

      {/* Вкладки */}
      <div className="tabs" role="tablist" style={{ marginBottom: 18 }}>
        <span className={'tabs__slider' + (tab === 'take' ? ' is-right' : '')} aria-hidden="true" />
        <button type="button" role="tab" aria-selected={tab === 'give'}
                className={'tabs__btn' + (tab === 'give' ? ' is-on' : '')}
                onClick={() => setTab('give')}>
          Поделиться
        </button>
        <button type="button" role="tab" aria-selected={tab === 'take'}
                className={'tabs__btn' + (tab === 'take' ? ' is-on' : '')}
                onClick={() => setTab('take')}>
          Ввести код
        </button>
      </div>

      {/* ==================== ПОДЕЛИТЬСЯ ==================== */}
      {tab === 'give' && (
        <div className="stagger">
          <div className="card card--pad-lg brief__head">
            <span className="brief__emoji" aria-hidden="true">🤝</span>
            <h2 className="brief__title">Отдать свой список коллеге</h2>
            <p className="brief__what">
              Создаёте короткий код, коллега вводит его у себя — и ваши {list.length} сотрудников
              появляются в его аккаунте. Ваш личный прогресс не передаётся: у каждого он свой.
            </p>
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <div className="section" style={{ margin: '0 0 14px' }}>
              <h3 className="section__title">Настройки кода</h3>
            </div>

            <div className="setting">
              <div className="setting__title">Сколько дней действует</div>
              <p className="setting__hint">Просроченный код перестаёт работать сам.</p>
              <Segmented
                value={days}
                options={[
                  { value: 1, label: '1 день' },
                  { value: 7, label: '7 дней' },
                  { value: 30, label: '30 дней' },
                  { value: 0, label: 'Без срока' },
                ]}
                onChange={setDays}
              />
            </div>

            <div className="setting">
              <div className="setting__title">Сколько раз можно использовать</div>
              <p className="setting__hint">
                Один раз — для конкретного человека. Без ограничений — можно кинуть в общий чат.
              </p>
              <Segmented
                value={maxUses}
                options={[
                  { value: 1, label: '1 раз' },
                  { value: 5, label: '5 раз' },
                  { value: 20, label: '20 раз' },
                  { value: 0, label: 'Без лимита' },
                ]}
                onChange={setMaxUses}
              />
            </div>

            {error && <div className="card answer-wrong small" style={{ marginBottom: 12 }}>{error}</div>}

            <button className="btn btn--primary btn--block btn--lg" onClick={() => void handleCreate()}
                    disabled={busy || list.length === 0}>
              {busy ? 'Создаю…' : '🎟 Создать код'}
            </button>

            {list.length === 0 && (
              <p className="muted small center" style={{ marginTop: 10, marginBottom: 0 }}>
                Список пуст: сначала <Link to="/import">загрузите сотрудников</Link>.
              </p>
            )}
          </div>

          {/* Свежий код крупно */}
          {fresh && (
            <div className="card card--pad-lg center code-box" style={{ marginTop: 14 }}>
              <p className="muted small" style={{ marginBottom: 6 }}>Код готов, передайте его коллеге</p>
              <div className="code-box__value">{formatCode(fresh)}</div>
              <div className="grid grid-2" style={{ marginTop: 16 }}>
                <button className="btn btn--block" onClick={() => void copy(fresh)}>
                  {copied ? '✅ Скопировано' : '📋 Скопировать'}
                </button>
                <button className="btn btn--primary btn--block" onClick={() => void share(fresh)}>
                  📨 Отправить
                </button>
              </div>
              <p className="muted small" style={{ marginTop: 12, marginBottom: 0 }}>
                Коллеге нужно открыть тренажёр → меню ☰ → «Обмен списками» → «Ввести код».
              </p>
            </div>
          )}

          {/* Мои коды */}
          {codes.length > 0 && (
            <>
              <div className="section">
                <h3 className="section__title">Мои коды · {codes.length}</h3>
              </div>
              <div className="stack" style={{ gap: 8 }}>
                {codes.map((c) => {
                  const st = codeState(c)
                  return (
                    <div key={c.code} className="card" style={{ opacity: st.alive ? 1 : .6 }}>
                      <div className="row">
                        <span className="code-chip">{formatCode(c.code)}</span>
                        <div className="spacer" />
                        <span className={'badge ' + (st.tone === 'ok' ? 'badge--known' : st.tone === 'warn' ? 'badge--learning' : 'badge--weak')}>
                          {st.label}
                        </span>
                      </div>
                      <p className="muted small" style={{ margin: '8px 0 10px' }}>
                        {c.employee_count} чел. в списке · использован {c.uses}
                        {c.max_uses === null ? ' раз' : ` из ${c.max_uses}`}
                      </p>
                      <div className="row" style={{ gap: 8 }}>
                        <button className="btn btn--sm" onClick={() => void copy(c.code)}>📋 Копировать</button>
                        {st.alive && (
                          <button className="btn btn--sm" onClick={() => void revokeShareCode(c.code).then(loadCodes)}>
                            ⛔ Отключить
                          </button>
                        )}
                        <div className="spacer" />
                        <button className="btn btn--sm btn--ghost"
                                onClick={() => void deleteShareCode(c.code).then(loadCodes)}>
                          🗑
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ==================== ВВЕСТИ КОД ==================== */}
      {tab === 'take' && (
        <div className="stagger">
          <div className="card card--pad-lg brief__head">
            <span className="brief__emoji" aria-hidden="true">🎟</span>
            <h2 className="brief__title">Получить готовый список</h2>
            <p className="brief__what">
              Введите код, который дал коллега. Сотрудники добавятся к вашему списку;
              те, кто у вас уже есть, повторно не появятся.
            </p>
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <label className="label" htmlFor="code">Код приглашения</label>
            <input
              id="code"
              className="input code-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ABCD-1234"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={12}
            />

            {takeError && <div className="card answer-wrong small shake" style={{ margin: '12px 0' }}>{takeError}</div>}

            <button className="btn btn--primary btn--block btn--lg" style={{ marginTop: 12 }}
                    onClick={() => void handleRedeem()}
                    disabled={taking || input.trim().length < 4}>
              {taking ? 'Проверяю…' : '✅ Применить код'}
            </button>
          </div>

          {result && (
            <div className="card card--pad-lg center celebrate" style={{ marginTop: 14 }}>
              <p className="big-emoji">{result.added > 0 ? '🎉' : '🤔'}</p>
              <h3 style={{ margin: '4px 0' }}>
                {result.added > 0 ? `Добавлено ${result.added} чел.` : 'Новых сотрудников нет'}
              </h3>
              <p className="muted small">
                В списке по коду было {result.total_in_code} чел.
                {result.skipped > 0 && ` Пропущено ${result.skipped}: они у вас уже есть.`}
              </p>
              <div className="stack">
                <Link to="/learn" className="btn btn--primary">🚀 Начать обучение</Link>
                <Link to="/employees" className="btn">👥 Посмотреть список</Link>
              </div>
            </div>
          )}

          <p className="muted small center" style={{ marginTop: 18 }}>
            Код не подходит? Он мог просрочиться, быть исчерпан или отключён владельцем — попросите новый.
          </p>
        </div>
      )}
    </div>
  )
}
