import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import Icon from '../components/Icon'
import { setActiveList, useLists, lastStudiedText, type ListInfo } from '../lib/lists'

export default function LibraryScreen() {
  const { lists, loading, error } = useLists()
  const [params] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState<string | null>(null)
  const [problem, setProblem] = useState('')
  const navigate = useNavigate()
  const visible = useMemo(() => lists.filter(list => list.name.toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru')))
    .filter(list => filter === 'all' || (filter === 'learning' ? list.percent < 100 && list.answers > 0 : list.employee_count > 0 && list.percent === 100))
    .sort((a, b) => (b.last_studied ?? b.created_at).localeCompare(a.last_studied ?? a.created_at)), [lists, query, filter])
  async function open(list: ListInfo, destination: string) {
    setBusy(list.id); setProblem('')
    try { if (!list.is_active) await setActiveList(list.id); navigate(destination) }
    catch (e) { setProblem(e instanceof Error ? e.message : 'Не удалось открыть список') }
    finally { setBusy(null) }
  }
  return <div className="container library-page">
    <AppHeader title="Ваша библиотека" />
    <div className="page-heading"><p className="muted">Все ваши списки и занятия — в одном месте.</p>
      <Link to="/create" className="circle-button" aria-label="Создать список"><Icon name="plus" /></Link></div>
    <label className="library-search"><Icon name="search" /><input aria-label="Поиск по библиотеке" placeholder="Найти список" value={query} onChange={e => setQuery(e.target.value)} /></label>
    <div className="library-tabs" role="group" aria-label="Фильтр списков">
      {[['all', 'Все списки'], ['learning', 'В процессе'], ['known', 'Изучено']].map(([value, label]) =>
        <button key={value} className={filter === value ? 'is-active' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}
    </div>
    {(error || problem) && <p className="card answer-wrong" role="alert">{error || problem}</p>}
    {loading ? <p className="muted" role="status">Загружаю библиотеку…</p> : <>
      <div className="section-heading"><h2>Списки · {visible.length}</h2><Link to="/lists">Управление</Link></div>
      <div className="library-grid">{visible.map(list => <article className="module-card" key={list.id}>
        <div className="module-card__top"><span className="module-icon" aria-hidden="true">{list.emoji}</span>
          {list.is_active && <span className="pill pill--soft">Текущий</span>}</div>
        <h2>{list.name}</h2><p className="muted small">{list.employee_count} сотрудников · {lastStudiedText(list.last_studied)}</p>
        <div className="progress"><div className="progress__bar progress__bar--success" style={{ width: `${list.percent}%` }} /></div>
        <p className="module-card__progress">{list.percent}% изучено</p>
        <div className="module-card__actions"><button className="btn btn--primary" disabled={busy !== null || !list.employee_count} onClick={() => open(list, '/learn')}>{busy === list.id ? 'Открываю…' : 'Заниматься'}</button>
          <button className="btn btn--ghost" disabled={busy !== null} onClick={() => open(list, list.employee_count ? '/employees' : '/import')}>{list.employee_count ? 'Сотрудники' : 'Добавить людей'}</button></div>
      </article>)}</div>
      {!visible.length && <div className="empty-library"><Icon name="library" /><h2>{lists.length ? 'Ничего не найдено' : 'Библиотека начинается с первого списка'}</h2>
        <p className="muted">{lists.length ? 'Попробуйте другое название или фильтр.' : 'Создайте список и добавьте сотрудников из файла, фотографии или вручную.'}</p>
        {!lists.length && <Link to="/create" className="btn btn--primary">Создать список</Link>}</div>}
    </>}
  </div>
}
