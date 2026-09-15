import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { createList, LIST_EMOJI } from '../lib/lists'

export default function CreateScreen() {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('📚')
  const [destination, setDestination] = useState('/import')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  return <div className="container library-page"><AppHeader title="Новый список" back />
    <p className="muted">Например, «Команда продукта» или «Наш офис». У каждого списка свой прогресс.</p>
    <form className="module-card" onSubmit={async e => {
      e.preventDefault(); if (busy || !name.trim()) return; setBusy(true); setError('')
      try { await createList(name.trim(), emoji); navigate(destination) }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось создать список'); setBusy(false) }
    }}>
      <label className="label" htmlFor="list-name">Название</label><input className="input" id="list-name" autoFocus maxLength={60} required value={name} onChange={e => setName(e.target.value)} placeholder="Моя команда" />
      <p className="label" style={{ marginTop: 20 }}>Значок</p><div className="emoji-row">{LIST_EMOJI.map(value => <button type="button" key={value} className={'emoji-btn' + (value === emoji ? ' is-on' : '')} aria-label={`Значок ${value}`} aria-pressed={value === emoji} onClick={() => setEmoji(value)}>{value}</button>)}</div>
      <label className="label" htmlFor="list-source" style={{ marginTop: 20 }}>Как добавить сотрудников</label><select className="input" id="list-source" value={destination} onChange={e => setDestination(e.target.value)}><option value="/import">Из файла или фотографии</option><option value="/employees">Вручную</option><option value="/share">По коду от коллеги</option></select>
      {error && <p className="answer-wrong card" role="alert">{error}</p>}
      <button type="submit" className="btn btn--primary btn--block" style={{ marginTop: 24 }} disabled={busy || !name.trim()}>{busy ? 'Создаю…' : 'Создать и добавить сотрудников'}</button>
    </form><p className="muted small center" style={{ marginTop: 20 }}>Список уже есть? <Link to="/library">Открыть библиотеку</Link></p>
  </div>
}
