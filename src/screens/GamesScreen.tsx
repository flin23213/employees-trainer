import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import Icon from '../components/Icon'
import { useLists } from '../lib/lists'
export default function GamesScreen() {
  const { active, loading, error } = useLists()
  return <div className="container library-page"><AppHeader title="Учитесь играя" />
    <p className="muted">Короткие игры по вашей библиотеке. Соревнуйтесь с собственным прошлым результатом.</p>
    {error && <p className="card answer-wrong" role="alert">{error}</p>}
    <div className="current-module"><Icon name="library" /><span>{loading ? 'Загружаю список…' : active?.name ?? 'Список не выбран'}</span><Link to="/library">Сменить</Link></div>
    <div className="library-grid game-catalog">
      <Link to="/games/match" className="game-tile"><div className="game-art game-art--match" aria-hidden="true"><i /><i>✓</i><i /><i /><i /><i>✓</i></div>
        <span className="eyebrow">ВНИМАНИЕ И ПАМЯТЬ</span><h2>Найди пару</h2><p>Сопоставьте фамилии и должности. Все карточки перед вами — осталось найти пары.</p><span className="game-tile__cta">Играть <Icon name="arrow" /></span></Link>
      <Link to="/games/quiz" className="game-tile"><div className="game-art game-art--quiz" aria-hidden="true"><span>Кто это?</span><i>А</i><i>Б</i><i>В</i></div>
        <span className="eyebrow">СКОРОСТЬ ВСПОМИНАНИЯ</span><h2>Быстрый ответ</h2><p>Один сотрудник, несколько должностей. Выберите верную и пройдите весь раунд.</p><span className="game-tile__cta">Играть <Icon name="arrow" /></span></Link>
    </div>
    <p className="muted small">Для игры нужны хотя бы два сотрудника. В «Быстром ответе» — ещё и разные должности. Рекорды видны только вам, отдельно для каждого списка и размера раунда.</p>
  </div>
}
