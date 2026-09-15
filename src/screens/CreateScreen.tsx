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
    <p className="muted">Сначала назовите список и выберите, откуда добавить людей. После добавления можно начать занятие.</p>
    <form className="module-card" onSubmit={async e => {
      e.preventDefault(); if (busy || !name.trim()) return; setBusy(true); setError('')
      try { await createList(name.trim(), emoji); navigate(destination) }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось создать список'); setBusy(false) }
    }}>
      <label className="label" htmlFor="list-name">1. Название списка</label><input className="input" id="list-name" autoFocus maxLength={60} required value={name} onChange={e => setName(e.target.value)} placeholder="Например, Команда продукта" />
      <p className="label" style={{ marginTop: 20 }}>Значок</p><div className="emoji-row">{LIST_EMOJI.map(value => <button type="button" key={value} className={'emoji-btn' + (value === emoji ? ' is-on' : '')} aria-label={`Значок ${value}`} aria-pressed={value === emoji} onClick={() => setEmoji(value)}>{value}</button>)}</div>
      <fieldset className="source-picker"><legend className="label">2. Как добавить сотрудников</legend>
        {[
          { value: '/import', icon: '▤', title: 'Файл или фото', description: 'Загрузите готовый список. Перед импортом проверьте строки.' },
          { value: '/employees', icon: '+', title: 'Вручную', description: 'Добавляйте имена и должности по одному.' },
          { value: '/share?tab=take', icon: '#', title: 'Код от коллеги', description: 'Введите код и скопируйте список в свою библиотеку.' },
        ].map(option => <label key={option.value} className="source-option">
          <input type="radio" name="list-source" value={option.value} checked={destination === option.value} onChange={() => setDestination(option.value)} />
          <span className="source-option__icon" aria-hidden="true">{option.icon}</span>
          <span><strong>{option.title}</strong><small>{option.description}</small></span>
        </label>)}
      </fieldset>
      {error && <p className="answer-wrong card" role="alert">{error}</p>}
      <button type="submit" className="btn btn--primary btn--block" style={{ marginTop: 24 }} disabled={busy || !name.trim()}>{busy ? 'Создаю…' : destination === '/import' ? 'Создать и загрузить файл' : destination === '/employees' ? 'Создать и добавить вручную' : 'Создать и ввести код'}</button>
    </form><p className="muted small center" style={{ marginTop: 20 }}>Список уже есть? <Link to="/library">Открыть библиотеку</Link></p>
  </div>
}
