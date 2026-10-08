import { useState } from 'react'
import Icon from './Icon'
import { rolesMatch, type MatchTile } from '../lib/gameEngine'

const alex = { id: 'example-alex', full_name: 'Алексей', job_title: 'Дизайнер' }
const marina = { id: 'example-marina', full_name: 'Марина', job_title: 'Бухгалтер' }
const tiles: MatchTile[] = [
  { key: 'name-alex', kind: 'name', employee: alex },
  { key: 'role-marina', kind: 'role', employee: marina },
  { key: 'role-alex', kind: 'role', employee: alex },
  { key: 'name-marina', kind: 'name', employee: marina },
]

/** A separate, untimed example never touches the current round or account. */
export default function MemoryGuide() {
  const [opened, setOpened] = useState<MatchTile[]>([])
  const [found, setFound] = useState<string[]>([])
  const [wrong, setWrong] = useState(false)
  const first = opened[0]
  const message = wrong ? 'Алексей — дизайнер, Марина — бухгалтер. Эта пара не совпала: закройте её и попробуйте снова.'
    : found.length === tiles.length ? 'Получилось! В игре находите такие же пары и запоминайте их места.'
      : first ? `Теперь откройте ${first.kind === 'name' ? 'должность' : 'имя'} для пары.`
        : found.length ? 'Пара найдена. Найдите оставшуюся.' : 'Откройте карточку «Имя» или «Должность».'

  function open(tile: MatchTile) {
    if (wrong || found.includes(tile.key)) return
    if (first?.key === tile.key) { setOpened([]); return }
    if (!first) { setOpened([tile]); return }
    if (first.kind === tile.kind) return
    const name = first.kind === 'name' ? first.employee : tile.employee
    const role = first.kind === 'role' ? first.employee : tile.employee
    if (rolesMatch(name, role)) { setFound(previous => [...previous, first.key, tile.key]); setOpened([]) }
    else { setOpened([first, tile]); setWrong(true) }
  }

  return <details className="memory-guide">
    <summary><Icon name="cards" /><span>Как играть · попробовать на примере</span><Icon name="chevron" /></summary>
    <div className="memory-guide__body">
      <ol><li>Откройте имя или должность.</li><li>Найдите вторую часть пары: имя + должность этого человека.</li><li>Верная пара останется открытой. Неверная закроется — запомните её расположение.</li></ol>
      <p className="small muted">Пример: Алексей — дизайнер, Марина — бухгалтер. Здесь нет таймера и записей в результаты.</p>
      <div className="match-board memory-board memory-example" aria-label="Учебный пример памяти">{tiles.map(tile => {
        const matched = found.includes(tile.key)
        const visible = matched || opened.some(value => value.key === tile.key)
        const label = tile.kind === 'name' ? 'Имя' : 'Должность'
        return <button type="button" key={tile.key} data-kind={tile.kind} data-example-key={tile.key} className={`match-cell memory-cell${visible ? ' is-flipped' : ''}${matched ? ' is-matched' : ''}${wrong && visible ? ' is-wrong' : ''}`} disabled={matched || wrong || (!!first && first.kind === tile.kind && first.key !== tile.key)} aria-pressed={visible} aria-label={visible ? `${label}: ${tile.kind === 'name' ? tile.employee.full_name : tile.employee.job_title}` : `Открыть ${label.toLocaleLowerCase('ru')} в примере`} onClick={() => open(tile)}>
          <span className="memory-cell__type"><Icon name={tile.kind === 'name' ? 'user' : 'briefcase'} />{label}</span>
          <span className="memory-cell__content"><span className="match-cell__text" aria-hidden={!visible}>{tile.kind === 'name' ? tile.employee.full_name : tile.employee.job_title}</span>{!visible && <span className="memory-cell__back">Открыть</span>}</span>
          {matched && <span className="memory-cell__found"><Icon name="check" />Найдено</span>}
        </button>
      })}</div>
      <p className="memory-example__status" role="status">{message}</p>
      {wrong ? <button type="button" className="btn btn--ghost btn--block" onClick={() => { setWrong(false); setOpened([]) }}>Закрыть и попробовать снова</button>
        : first ? <button type="button" className="btn btn--ghost btn--block" onClick={() => setOpened([])}>Отменить выбор в примере</button>
          : found.length === tiles.length && <button type="button" className="btn btn--ghost btn--block" onClick={() => { setOpened([]); setFound([]) }}>Повторить пример</button>}
    </div>
  </details>
}
