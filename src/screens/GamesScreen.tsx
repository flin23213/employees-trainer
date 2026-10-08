import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import Icon from '../components/Icon'
import GameArtwork from '../components/GameArtwork'
import { useLists } from '../lib/lists'
import { GAME_META, type GameMode } from '../lib/gameEngine'
const MODES: GameMode[] = ['match', 'quiz', 'truth', 'memory']
export default function GamesScreen() {
  const { active, loading, error } = useLists()
  return <div className="container library-page"><AppHeader title="Учитесь играя" />
    <p className="muted">Короткие игры по вашей библиотеке. Соревнуйтесь с собственным прошлым результатом.</p>
    {error && <p className="card answer-wrong" role="alert">{error}</p>}
    <div className="current-module"><Icon name="library" /><span>{loading ? 'Загружаю список…' : active?.name ?? 'Список не выбран'}</span><Link to="/library">Сменить</Link></div>
    <div className="library-grid game-catalog">
      {MODES.map(mode => <Link key={mode} to={`/games/${mode}`} className="game-tile"><GameArtwork mode={mode} />
        <span className="eyebrow">{GAME_META[mode].eyebrow}</span><h2>{GAME_META[mode].title}</h2>
        <p>{GAME_META[mode].description}</p><span className="game-tile__cta">Играть <Icon name="arrow" /></span></Link>)}
    </div>
    <p className="muted small">В «Быстром ответе» и «Верно или нет» — до 100 заданий по одному. В «Найди пару» и «Памяти» — до 8 пар на общем поле. Нужны хотя бы два сотрудника, для последовательных игр — разные должности. Рекорды видны только вам, отдельно для каждого списка, состава, игры и настроек раунда.</p>
  </div>
}
