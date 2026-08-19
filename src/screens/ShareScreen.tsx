// Путь: src/screens/ShareScreen.tsx
// Обмен списками: создать код-приглашение из выбранного профиля
// или ввести код коллеги.
//
// Новое в этой версии:
//  * перед созданием кода видно и выбирается, КАКИМ профилем делимся;
//  * в карточке каждого кода написано, из какого он профиля;
//  * получатель может «заглянуть» в код до применения и видит, в какой
//    свой профиль попадут люди.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { Segmented } from '../components/Briefing'
import { useEmployees } from '../lib/employees'
import { useLists } from '../lib/lists'
import {
  codeState, createShareCode, deleteShareCode, formatCode, listShareCodes,
  previewShareCode, redeemShareCode, revokeShareCode,
  type CodePreview, type RedeemResult, type ShareCode,
} from '../lib/share'

type Tab = 'give' | 'take'

export default function ShareScreen() {
  const { reload } = useEmployees()
  const { lists, active, reload: reloadLists } = useLists()
  const [params] = useSearchParams()

  const [tab, setTab] = useState<Tab>('give')

  /* --- создание кода --- */
  const [listId, setListId] = useState<string | null>(null)
  const [days, setDays] = useState<number>(30)
  const [maxUses, setMaxUses] = useState<number>(0)      // 0 = без ограничений
  const [fresh, setFresh] = useState<{ code: string; listName: string; count: number } | null>(null)
  const [copied, setCopied] = useState(false)
  const [codes, setCodes] = useState<ShareCode[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* --- активация кода --- */
  const [input, setInput] = useState('')
  const [checking, setChecking] = useState(false)
  const [preview, setPreview] = useState<CodePreview | null>(null)
  const [taking, setTaking] = useState(false)
  const [takeError, setTakeError] = useState<string | null>(null)
  const [result, setResult] = useState<RedeemResult | null>(null)

  /* Какой профиль выбран для передачи: из адреса (?list=…), иначе активный */
  useEffect(() => {
    if (listId !== null || lists.length === 0) return
    const wanted = params.get('list')
    const found = wanted ? lists.find((l) => l.id === wanted) : null
    setListId((found ?? active ?? lists[0]).id)
  }, [lists, active, params, listId])

  const chosen = useMemo(() => lists.find((l) => l.id === listId) ?? null, [lists, listId])

  /** Название профиля по его id: для карточек кодов */
  const nameOf = useCallback(
    (id: string | null) => (id ? lists.find((l) => l.id === id)?.name ?? null : null),
    [lists]
  )

  const loadCodes = useCallback(async () => {
    try {
      setCodes(await listShareCodes())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => { void loadCodes() }, [loadCodes])

  async function handleCreate() {
    if (!chosen) return
    setBusy(true)
    setError(null)
    setCopied(false)
    try {
      const code = await createShareCode({
        days: days === 0 ? null : days,
        maxUses: maxUses === 0 ? null : maxUses,
        title: chosen.name,
        listId: chosen.id,
      })
      setFresh({ code, listName: chosen.name, count: chosen.employee_count })
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
  async function share(code: string, listName: string) {
    const text =
      `Список сотрудников для тренажёра («${listName}»). ` +
      `Код приглашения: ${formatCode(code)}`
    if (navigator.share) {
      try { await navigator.share({ title: 'Код приглашения', text }) } catch { /* закрыли окно */ }
    } else {
      await copy(code)
    }
  }

  /** Заглянуть в код, не применяя его */
  async function handleCheck() {
    setChecking(true)
    setTakeError(null)
    setResult(null)
    setPreview(null)
    try {
      const p = await previewShareCode(input)
      setPreview(p)
      if (!p.found) setTakeError(p.reason ?? 'Код не найден.')
      else if (p.alive === false) setTakeError(p.reason ?? 'Код больше не действует.')
    } catch (e) {
      setTakeError(e instanceof Error ? e.message : String(e))
    } finally {
      setChecking(false)
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
      setPreview(null)
      reload()
      void reloadLists()
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
              Выбираете профиль, получаете короткий код, коллега вводит его у себя — и ваши
              сотрудники появляются в его аккаунте. Личный прогресс не передаётся: у каждого он свой.
            </p>
          </div>

          {/* ---------- шаг 1: какой профиль отдаём ---------- */}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="section" style={{ margin: '0 0 12px' }}>
              <h3 className="section__title">1. Каким списком делитесь</h3>
              <p className="section__sub">Код будет содержать людей только из выбранного профиля.</p>
            </div>

            <div className="pick">
              {lists.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={'pick__item' + (l.id === listId ? ' is-on' : '')}
                  disabled={l.employee_count === 0}
                  onClick={() => { setListId(l.id); setFresh(null) }}
                >
                  <span className="pick__emoji" aria-hidden="true">{l.emoji}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="pick__name truncate">{l.name}</span>
                    <span className="pick__sub">
                      {l.employee_count === 0 ? 'профиль пустой — делиться нечем' : `${l.employee_count} чел.`}
                      {l.is_active ? ' · активен' : ''}
                    </span>
                  </span>
                  {l.id === listId && <span className="pick__tick" aria-hidden="true">✓</span>}
                </button>
              ))}
            </div>

            {lists.length === 0 && (
              <p className="muted small" style={{ marginBottom: 0 }}>
                Профилей пока нет. Откройте <Link to="/lists">Профили списков</Link>.
              </p>
            )}
          </div>

          {/* ---------- шаг 2: настройки кода ---------- */}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="section" style={{ margin: '0 0 14px' }}>
              <h3 className="section__title">2. Настройки кода</h3>
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
                    disabled={busy || !chosen || chosen.employee_count === 0}>
              {busy ? 'Создаю…' : chosen ? `🎟 Создать код на «${chosen.name}»` : '🎟 Создать код'}
            </button>

            {chosen && chosen.employee_count === 0 && (
              <p className="muted small center" style={{ marginTop: 10, marginBottom: 0 }}>
                В этом профиле никого нет: сначала <Link to="/import">загрузите сотрудников</Link>.
              </p>
            )}
          </div>

          {/* Свежий код крупно */}
          {fresh && (
            <div className="card card--pad-lg center code-box" style={{ marginTop: 14 }}>
              <p className="muted small" style={{ marginBottom: 6 }}>
                Код на профиль «{fresh.listName}» · {fresh.count} чел.
              </p>
              <div className="code-box__value">{formatCode(fresh.code)}</div>
              <div className="grid grid-2" style={{ marginTop: 16 }}>
                <button className="btn btn--block" onClick={() => void copy(fresh.code)}>
                  {copied ? '✅ Скопировано' : '📋 Скопировать'}
                </button>
                <button className="btn btn--primary btn--block"
                        onClick={() => void share(fresh.code, fresh.listName)}>
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
                <p className="section__sub">Видно, из какого профиля каждый код.</p>
              </div>
              <div className="stack" style={{ gap: 8 }}>
                {codes.map((c) => {
                  const st = codeState(c)
                  const listName = nameOf(c.list_id) ?? c.title
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
                        Профиль: {listName ?? 'удалён'} · {c.employee_count} чел. · использован {c.uses}
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
              Введите код, который дал коллега. Сотрудники добавятся в ваш активный профиль;
              те, кто там уже есть, повторно не появятся.
            </p>
          </div>

          {active && (
            <div className="card" style={{ marginTop: 14 }}>
              <div className="row">
                <span style={{ fontSize: '1.4rem' }} aria-hidden="true">{active.emoji}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="muted small" style={{ display: 'block' }}>Люди попадут в профиль</span>
                  <strong className="truncate" style={{ display: 'block' }}>{active.name}</strong>
                </span>
                <Link to="/lists" className="btn btn--sm">Сменить</Link>
              </div>
            </div>
          )}

          <div className="card" style={{ marginTop: 14 }}>
            <label className="label" htmlFor="code">Код приглашения</label>
            <input
              id="code"
              className="input code-input"
              value={input}
              onChange={(e) => { setInput(e.target.value); setPreview(null); setTakeError(null) }}
              placeholder="ABCD-1234"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={12}
            />

            {takeError && <div className="card answer-wrong small shake" style={{ margin: '12px 0' }}>{takeError}</div>}

            {/* Что внутри кода */}
            {preview?.found && preview.alive && (
              <div className="card answer-correct small" style={{ margin: '12px 0' }}>
                Код рабочий: профиль «{preview.list_name ?? preview.title ?? 'без названия'}»,
                {' '}{preview.employee_count} чел.
                {preview.is_mine && ' Это ваш собственный код.'}
              </div>
            )}

            <div className="grid grid-2" style={{ marginTop: 12 }}>
              <button className="btn btn--block"
                      onClick={() => void handleCheck()}
                      disabled={checking || input.trim().length < 4}>
                {checking ? 'Смотрю…' : '🔍 Проверить'}
              </button>
              <button className="btn btn--primary btn--block"
                      onClick={() => void handleRedeem()}
                      disabled={taking || input.trim().length < 4}>
                {taking ? 'Добавляю…' : '✅ Применить'}
              </button>
            </div>
          </div>

          {result && (
            <div className="card card--pad-lg center celebrate" style={{ marginTop: 14 }}>
              <p className="big-emoji">{result.added > 0 ? '🎉' : '🤔'}</p>
              <h3 style={{ margin: '4px 0' }}>
                {result.added > 0 ? `Добавлено ${result.added} чел.` : 'Новых сотрудников нет'}
              </h3>
              <p className="muted small">
                {result.list_name && <>Профиль «{result.list_name}». </>}
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
