// Путь: src/lib/activity.ts
// Дневник занятий: считает, сколько ответов вы дали в каждый день.
// Хранится прямо в браузере (localStorage), базу данных менять не нужно.
// Из этих чисел рисуется график активности на главном экране.

export type DayStat = {
  key: string        // '2026-08-19'
  date: Date
  answers: number
  correct: number
  isToday: boolean
}

type Log = Record<string, { a: number; c: number }>

const KEY = 'activity-log-v1'
const KEEP_DAYS = 400          // старше — выбрасываем, чтобы не разрасталось

/** Ключ дня в виде '2026-08-19' по местному времени */
function dayKey(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

function read(): Log {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Log) : {}
  } catch {
    return {}
  }
}

function write(log: Log): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(log))
  } catch {
    /* нет места в хранилище — не страшно, график просто не пополнится */
  }
}

/** Вызывается после каждого ответа в карточках и тесте */
export function logAnswer(correct: boolean): void {
  const log = read()
  const key = dayKey(new Date())
  const cur = log[key] ?? { a: 0, c: 0 }
  cur.a += 1
  if (correct) cur.c += 1
  log[key] = cur

  // Чистим старьё
  const limit = new Date()
  limit.setDate(limit.getDate() - KEEP_DAYS)
  const limitKey = dayKey(limit)
  Object.keys(log).forEach((k) => {
    if (k < limitKey) delete log[k]
  })

  write(log)
}

/** Последние `count` дней по порядку: слева самый старый, справа сегодня */
export function getLastDays(count: number): DayStat[] {
  const log = read()
  const todayKey = dayKey(new Date())
  const out: DayStat[] = []

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date()
    d.setHours(12, 0, 0, 0)      // полдень: так перевод часов не сдвигает день
    d.setDate(d.getDate() - i)
    const key = dayKey(d)
    const rec = log[key]
    out.push({
      key,
      date: d,
      answers: rec?.a ?? 0,
      correct: rec?.c ?? 0,
      isToday: key === todayKey,
    })
  }
  return out
}

/** Сколько дней подряд вы занимаетесь (сегодняшний день считается, если уже были ответы) */
export function getStreak(): number {
  const log = read()
  let streak = 0
  const d = new Date()
  d.setHours(12, 0, 0, 0)

  // Если сегодня ещё не занимались, серия считается от вчера и не обрывается
  if (!log[dayKey(d)]) d.setDate(d.getDate() - 1)

  while (log[dayKey(d)]) {
    streak += 1
    d.setDate(d.getDate() - 1)
  }
  return streak
}

/** Итоги по последним дням: всего ответов и сколько дней были заняты */
export function getSummary(days: number): { answers: number; correct: number; activeDays: number } {
  const list = getLastDays(days)
  return {
    answers: list.reduce((n, d) => n + d.answers, 0),
    correct: list.reduce((n, d) => n + d.correct, 0),
    activeDays: list.filter((d) => d.answers > 0).length,
  }
}

/** Полностью очистить дневник (нужно для кнопки сброса прогресса) */
export function clearActivity(): void {
  try { localStorage.removeItem(KEY) } catch { /* ничего */ }
}
