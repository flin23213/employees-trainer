import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import Icon from '../components/Icon'
import AuthorLinks from '../components/AuthorLinks'
import { setActiveList, useLists, type ListInfo } from '../lib/lists'

export default function HomeScreen() {
  const { lists, active, loading, error } = useLists()
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  const navigate = useNavigate()
  const recent = [...lists].sort((a, b) => (b.last_studied ?? b.created_at).localeCompare(a.last_studied ?? a.created_at)).slice(0, 4)
  const continuation = active?.employee_count ? active : recent.find(list => list.employee_count > 0)
  async function study(list: ListInfo) {
    if (busy) return; setBusy(true); setProblem('')
    try { if (!list.is_active) await setActiveList(list.id); navigate('/learn') }
    catch (cause) { setProblem(cause instanceof Error ? cause.message : 'Не удалось открыть список'); setBusy(false) }
  }
  return <div className="container library-page home-library">
    <AppHeader title="Тренажёр сотрудников" />
    <form className="library-search" onSubmit={e => { e.preventDefault(); navigate('/library?q=' + encodeURIComponent(query)) }}>
      <Icon name="search" /><input aria-label="Найти список в библиотеке" placeholder="Поиск по библиотеке" value={query} onChange={e => setQuery(e.target.value)} />
      <button type="submit" aria-label="Найти"><Icon name="arrow" /></button>
    </form>
    {(error || problem) && <p className="card answer-wrong" role="alert">{error || problem}</p>}
    {loading ? <div className="module-card" role="status">Загружаю ваши списки…</div> : <>
      <div className="section-heading"><h2>{continuation ? 'Продолжить учёбу' : 'Начните с вашей команды'}</h2></div>
      {continuation ? <article className="continue-card">
        <div className="module-card__top"><span className="eyebrow">ВАШ ТЕКУЩИЙ СПИСОК</span><span className="module-icon" aria-hidden="true">{continuation.emoji}</span></div>
        <h2>{continuation.name}</h2><p className="muted">{continuation.employee_count} сотрудников · {continuation.known} уже знаете</p>
        <div className="progress"><div className="progress__bar progress__bar--success" style={{ width: `${continuation.percent}%` }} /></div>
        <p className="module-card__progress">{continuation.percent}% списка изучено</p>
        <button className="btn btn--primary btn--block btn--lg" disabled={busy} onClick={() => study(continuation)}>{busy ? 'Открываю…' : 'Продолжить'}<Icon name="arrow" /></button>
      </article> : <article className="continue-card"><span className="module-icon"><Icon name="library" /></span><h2>Все коллеги — по именам</h2>
        <p className="muted">Создайте список, добавьте сотрудников и учитесь по несколько минут в день.</p>
        <Link className="btn btn--primary btn--block btn--lg" to="/create">Создать первый список<Icon name="plus" /></Link>
        <Link className="link-quiet" to="/import">Загрузить в текущий список</Link></article>}
      <div className="section-heading"><h2>Недавние</h2><Link to="/library">Вся библиотека →</Link></div>
      <div className="recent-list">{recent.map(list => <button key={list.id} className="recent-item" disabled={busy} onClick={() => list.employee_count ? study(list) : navigate('/library')}>
        <span className="module-icon" aria-hidden="true">{list.emoji}</span><span><strong>{list.name}</strong><small>{list.employee_count} сотрудников · {list.percent}% изучено</small></span><Icon name="arrow" />
      </button>)}</div>
      {!recent.length && <p className="muted small">Здесь появятся ваши списки.</p>}
      <div className="section-heading"><h2>Учиться по-разному</h2></div>
      <div className="home-modes"><Link to="/learn" className="mode-tile"><Icon name="cards" /><strong>Карточки и тесты</strong><span>Спокойно запоминайте и проверяйте себя</span></Link>
        <Link to="/games" className="mode-tile mode-tile--mint"><Icon name="games" /><strong>Игры на время</strong><span>Находите пары и улучшайте личный рекорд</span></Link></div>
    </>}
    <AuthorLinks />
  </div>
}
