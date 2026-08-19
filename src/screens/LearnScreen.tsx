// Путь: src/screens/LearnScreen.tsx
// Развилка «Начать обучение»: сначала выбираете ВИД занятия, потом настройки.

import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { computeStats, useEmployees } from '../lib/employees'

export default function LearnScreen() {
  const { list, loading } = useEmployees()
  const s = computeStats(list)

  if (!loading && s.total === 0) {
    return (
      <div className="container">
        <AppHeader title="Начать обучение" back />
        <div className="card card--pad-lg center">
          <p className="big-emoji">📭</p>
          <p><strong>Пока некого учить</strong></p>
          <p className="muted small">Добавьте сотрудников — и здесь появятся занятия.</p>
          <div className="stack">
            <Link to="/import" className="btn btn--primary">📂 Загрузить из файла</Link>
            <Link to="/employees" className="btn">👥 Добавить вручную</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <AppHeader title="Начать обучение" back />

      <div className="stagger">
        <div className="card card--pad-lg brief__head">
          <span className="brief__emoji" aria-hidden="true">🚀</span>
          <h2 className="brief__title">Чем займёмся?</h2>
          <p className="brief__what">
            Два разных способа тренировки. Оба работают с одним и тем же списком и пополняют общую статистику.
            Дальше вы увидите правила и настройки — начать сразу ничего не получится случайно.
          </p>
        </div>

        {/* ---------- Две большие живые плитки ---------- */}
        <div className="pick" style={{ marginTop: 16 }}>
          <Link to="/cards" className="pick__card pick__card--cards">
            <span className="pick__shine" aria-hidden="true" />
            <span className="pick__icon" aria-hidden="true">🗂</span>
            <span className="pick__title">Карточки</span>
            <span className="pick__tag">узнавание · быстро</span>
            <ul className="pick__list">
              <li>Видите ФИО — вспоминаете должность</li>
              <li>Свайп вправо «знаю», влево «не знаю»</li>
              <li>Ничего не надо печатать</li>
              <li>5 минут в перерыве</li>
            </ul>
            <span className="pick__go">Выбрать →</span>
          </Link>

          <Link to="/test" className="pick__card pick__card--test">
            <span className="pick__shine" aria-hidden="true" />
            <span className="pick__icon" aria-hidden="true">✍️</span>
            <span className="pick__title">Тест</span>
            <span className="pick__tag">припоминание · надёжно</span>
            <ul className="pick__list">
              <li>Ответ нужно вписать или выбрать</li>
              <li>Опечатки прощаются</li>
              <li>Показывает реальный уровень</li>
              <li>Запоминается крепче всего</li>
            </ul>
            <span className="pick__go">Выбрать →</span>
          </Link>
        </div>

        {/* ---------- Дополнительно ---------- */}
        <div className="section">
          <h3 className="section__title">Ещё варианты</h3>
        </div>

        <div className="stack">
          <Link to="/review" className="action">
            <span className="action__icon" aria-hidden="true">🔁</span>
            <span className="action__body">
              <span className="action__title">
                Повторить ошибки {s.weak > 0 && <span className="pill">{s.weak}</span>}
              </span>
              <span className="action__desc">
                {s.weak > 0
                  ? 'Только те, кого вы путаете. Самый быстрый способ поднять процент.'
                  : 'Сейчас пусто: ошибок нет. Появятся — соберутся здесь.'}
              </span>
            </span>
            <span className="action__chev" aria-hidden="true">→</span>
          </Link>

          {s.fresh > 0 && (
            <Link to="/insight/new" className="action">
              <span className="action__icon" aria-hidden="true">🆕</span>
              <span className="action__body">
                <span className="action__title">
                  Ещё не изучены <span className="pill pill--soft">{s.fresh}</span>
                </span>
                <span className="action__desc">Посмотреть, кого вы вообще не видели.</span>
              </span>
              <span className="action__chev" aria-hidden="true">→</span>
            </Link>
          )}
        </div>

        <p className="muted small center" style={{ marginTop: 20 }}>
          Не знаете, что выбрать? Берите карточки, если только знакомитесь со списком,
          и тест, если хотите проверить себя перед встречей.
        </p>
      </div>
    </div>
  )
}
