export type GameMode = 'match' | 'quiz'
export type GameEmployee = { id: string; full_name: string; job_title: string }
export const PENALTY_MS = 3000
export const normalizeRole = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru')
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
export function rolesMatch(person: GameEmployee, role: GameEmployee) {
  // Identical job titles are interchangeable: never penalize an ambiguous valid pair.
  return normalizeRole(person.job_title) === normalizeRole(role.job_title)
}
export function quizOptions(person: GameEmployee, employees: readonly GameEmployee[], random = Math.random): string[] {
  const unique = new Map(employees.map(employee => [normalizeRole(employee.job_title), employee.job_title]))
  unique.delete(normalizeRole(person.job_title))
  return shuffle([person.job_title, ...shuffle([...unique.values()], random).slice(0, 3)], random)
}
export function scoreTime(elapsed: number, mistakes: number) { return Math.max(0, Math.round(elapsed)) + mistakes * PENALTY_MS }
export function formatTime(ms: number) { return (ms / 1000).toFixed(1).replace('.', ',') + ' с' }
