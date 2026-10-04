import { useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import Icon from '../components/Icon'
import SessionOutcome from '../components/SessionOutcome'
import LearningArtwork from '../components/LearningArtwork'
import '../styles/demo.css'

const TEAM = [
  { name: 'Анна Светлова', role: 'Дизайнер', note: 'Отвечает за оформление и визуальные материалы.', initials: 'АС' },
  { name: 'Михаил Лесной', role: 'Финансовый аналитик', note: 'Помогает команде разобраться в бюджетах и цифрах.', initials: 'МЛ' },
  { name: 'Ольга Зорина', role: 'Менеджер проектов', note: 'Координирует задачи, сроки и участников проекта.', initials: 'ОЗ' },
]
const QUESTIONS = [TEAM[0], TEAM[2]]
type Phase = 'intro' | 'cards' | 'quiz' | 'done'

/** A self-contained example: it never writes employees, answers or results. */
export default function DemoScreen() {
  const { session } = useAuth()
  const [phase, setPhase] = useState<Phase>('intro')
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [choice, setChoice] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const answerLock = useRef(false)
  const current = TEAM[index]
  const question = QUESTIONS[index]
  const back = session ? 'На главную' : 'К входу'
  function restart() {
    setPhase('intro'); setIndex(0); setRevealed(false); setChoice(null); setScore(0); answerLock.current = false
  }
  function nextCard() {
    if (!revealed) return
    setRevealed(false)
    if (index === TEAM.length - 1) { setIndex(0); setPhase('quiz') }
    else setIndex(index + 1)
  }
  function answer(role: string) {
    if (answerLock.current) return
    answerLock.current = true; setChoice(role)
    if (role === question.role) setScore(value => value + 1)
  }
  function nextQuestion() {
    if (!answerLock.current) return
    answerLock.current = false; setChoice(null)
    if (index === QUESTIONS.length - 1) setPhase('done')
    else setIndex(index + 1)
  }
  return <main className="container demo-page">
    <header className="demo-header"><a className="btn btn--ghost btn--sm" href="/">{back}</a><span className="pill pill--soft">Пробное занятие</span></header>
    <p className="demo-context small muted">Вымышленная команда · ответы не сохраняются</p>
    {phase === 'intro' && <section className="demo-intro">
      <LearningArtwork variant="team" className="demo-intro-artwork" />
      <span className="eyebrow">ОДНА МИНУТА, ЧТОБЫ РАЗОБРАТЬСЯ</span><h1>Знакомимся с командой</h1>
      <p className="muted">Посмотрите три карточки, затем попробуйте вспомнить должности. Так же будут устроены занятия с вашими коллегами.</p>
      <button className="btn btn--primary btn--block btn--lg" onClick={() => setPhase('cards')}>Попробовать карточки<Icon name="arrow" /></button>
      <p className="small muted">Для примера не нужны регистрация и загрузка файла.</p>
    </section>}
    {phase === 'cards' && <section className="demo-lesson" aria-label="Знакомство с карточками">
      <p className="eyebrow">КАРТОЧКА {index + 1} ИЗ {TEAM.length}</p><h1>Имя — сначала. Должность — за ним.</h1>
      <button className="daily-flashcard demo-flashcard" aria-expanded={revealed} onClick={() => setRevealed(true)}>
        <span className="demo-person" aria-hidden="true">{current.initials}</span><h2>{current.name}</h2>
        {revealed ? <><strong>{current.role}</strong><p className="muted">{current.note}</p></> : <p className="muted">Нажмите на карточку, чтобы открыть должность.</p>}
      </button>
      {revealed && <><p className="small muted">В обычном занятии ваша оценка определяет, когда показать карточку снова.</p><div className="demo-actions"><button className="btn btn--ghost" onClick={nextCard}>Ещё запомню</button><button className="btn btn--primary" onClick={nextCard}>Знаю<Icon name="check" /></button></div></>}
    </section>}
    {phase === 'quiz' && <section className="demo-lesson" aria-label="Проверка памяти">
      <p className="eyebrow">ПРОВЕРКА {index + 1} ИЗ {QUESTIONS.length}</p><h1>Какая должность у сотрудника?</h1>
      <div className="demo-question"><span className="demo-person" aria-hidden="true">{question.initials}</span><h2>{question.name}</h2></div>
      <div className="demo-options">{TEAM.map(person => <button key={person.role} disabled={choice !== null} onClick={() => answer(person.role)} className={`btn${choice === null ? '' : person.role === question.role ? ' answer-correct' : person.role === choice ? ' answer-wrong shake' : ''}`}>{person.role}{choice !== null && person.role === question.role && <Icon name="check" />}</button>)}</div>
      {choice !== null && <div role="status" className="demo-feedback"><p>{choice === question.role ? 'Верно, вы запомнили!' : `Правильный ответ: ${question.role}. В обычном занятии тренажёр вернётся к этому сотруднику.`}</p><button className="btn btn--primary btn--block" onClick={nextQuestion}>{index === QUESTIONS.length - 1 ? 'Посмотреть итог' : 'Следующий вопрос'}<Icon name="arrow" /></button></div>}
    </section>}
    {phase === 'done' && <SessionOutcome className="demo-result" tone={score === QUESTIONS.length ? 'complete' : 'practice'} eyebrow="ПРОБНОЕ ЗАНЯТИЕ" title={score ? `${score} из ${QUESTIONS.length} — правильно` : 'Теперь вы знаете, как это работает'} description="Это был пример на вымышленной команде. Результат не записывается в аккаунт." metrics={[
      { label: 'Верно', value: score },
      { label: 'Повторить', value: QUESTIONS.length - score },
      { label: 'Вопросов', value: QUESTIONS.length },
    ]}>
      <p className="session-outcome__note">Добавьте свою команду — имена попадут в карточки, тесты и игры. В обычном занятии тренажёр запомнит ответы и подберёт повторения.</p>
      <a className="btn btn--primary btn--block btn--lg" href={session ? '/create' : '/'}>{session ? 'Создать свой список' : 'Войти и добавить команду'}<Icon name="plus" /></a>
      <button className="btn btn--ghost btn--block" onClick={restart}>Пройти пример ещё раз</button>
    </SessionOutcome>}
  </main>
}
