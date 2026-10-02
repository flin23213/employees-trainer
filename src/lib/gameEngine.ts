export type GameMode = 'match' | 'quiz' | 'truth' | 'memory'
export type GameEmployee = { id: string; full_name: string; job_title: string }
export type MatchTile = { key: string; kind: 'name' | 'role'; employee: GameEmployee }
export type GameStatement = { person: GameEmployee; role: string; correct: boolean }
export const GAME_META: Record<GameMode, { title: string; description: string; eyebrow: string; pairMode: boolean }> = {
  match: {
    title: 'Найди пару',
    description: 'Сопоставьте имена и должности. Все карточки перед вами — осталось найти пары.',
    eyebrow: 'Внимание и связи', pairMode: true,
  },
  quiz: {
    title: 'Быстрый ответ',
    description: 'Один сотрудник, несколько должностей. Выберите верную и пройдите весь раунд.',
    eyebrow: 'Скорость вспоминания', pairMode: false,
  },
  truth: {
    title: 'Верно или нет',
    description: 'Проверьте, соответствует ли должность сотруднику. Решите, верно утверждение или нет.',
    eyebrow: 'Проверка знаний', pairMode: false,
  },
  memory: {
    title: 'Память',
    description: 'Открывайте по две карточки. Запоминайте их расположение и находите пары «имя — должность».',
    eyebrow: 'Память и внимание', pairMode: true,
  },
}
export const PENALTY_MS = 3000
export const normalizeRole = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru').replace(/ё/g, 'е')
export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
export function makeRound(employees: readonly GameEmployee[], count: number): GameEmployee[] {
  return shuffle(employees.filter(employee => employee.full_name.trim() && employee.job_title.trim())).slice(0, count)
}
export function makeMatchTiles(people: readonly GameEmployee[], random = Math.random): MatchTile[] {
  return shuffle(people.flatMap(employee => [
    { key: `name-${employee.id}`, kind: 'name' as const, employee },
    { key: `role-${employee.id}`, kind: 'role' as const, employee },
  ]), random)
}
export function rolesMatch(person: GameEmployee, role: GameEmployee) {
  // Identical job titles are interchangeable: never penalize an ambiguous valid pair.
  return normalizeRole(person.job_title) === normalizeRole(role.job_title)
}
export function quizOptions(person: GameEmployee, employees: readonly GameEmployee[], random = Math.random): string[] {
  const unique = new Map(employees.map(employee => [normalizeRole(employee.job_title), employee.job_title]))
  unique.delete(normalizeRole(person.job_title))
  return shuffle([person.job_title, ...shuffle([...unique.values()], random).slice(0, 3)], random)
}
export function makeStatements(
  people: readonly GameEmployee[],
  available: readonly GameEmployee[],
  random = Math.random,
): GameStatement[] {
  const participants = people.filter(person => person.full_name.trim() && person.job_title.trim())
  const uniqueRoles = new Map<string, string>()
  for (const person of [...available, ...participants]) {
    if (person.full_name.trim() && person.job_title.trim()) uniqueRoles.set(normalizeRole(person.job_title), person.job_title)
  }
  // Guarantee both types without relying on chance, even for a two-question round.
  const types = participants.map((_, index) => index === 0 ? true : index === 1 ? false : random() < 0.5)
  const shuffledTypes = shuffle(types, random)
  return participants.map((person, index) => {
    const wrongRoles = [...uniqueRoles.entries()].filter(([role]) => role !== normalizeRole(person.job_title))
      .map(([, label]) => label)
    if (shuffledTypes[index] || wrongRoles.length === 0) return { person, role: person.job_title, correct: true }
    return { person, role: wrongRoles[Math.floor(random() * wrongRoles.length)], correct: false }
  })
}
export function scoreTime(elapsed: number, mistakes: number) { return Math.max(0, Math.round(elapsed)) + mistakes * PENALTY_MS }
export function formatTime(ms: number) { return (ms / 1000).toFixed(1).replace('.', ',') + ' с' }
