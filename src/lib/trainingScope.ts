export type TrainingEmployee = { id: string; department: string | null; attempts: number }
export type TrainingScopeValue = { department: string | null; onlyNew: boolean; employeeIds: string[] | null }
export type ListTrainingScope = { listId: string; value: TrainingScopeValue }

export const ALL_TRAINING_EMPLOYEES: TrainingScopeValue = { department: null, onlyNew: false, employeeIds: null }

export function departmentKey(value: string | null): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru-RU').replace(/ё/g, 'е')
}

export function scopeForList(selection: ListTrainingScope | null, listId: string | undefined): TrainingScopeValue {
  return listId && selection?.listId === listId ? selection.value : ALL_TRAINING_EMPLOYEES
}

export function hasTrainingFilter(scope: TrainingScopeValue): boolean {
  return scope.department !== null || scope.onlyNew || scope.employeeIds !== null
}

/** Intersect every restriction with the current list. Empty/stale IDs never widen it. */
export function filterTrainingEmployees<T extends TrainingEmployee>(employees: readonly T[], scope: TrainingScopeValue): T[] {
  const chosen = scope.employeeIds === null ? null : new Set(scope.employeeIds)
  return employees.filter(person =>
    (scope.department === null || departmentKey(person.department) === scope.department) &&
    (!scope.onlyNew || person.attempts === 0) &&
    (chosen === null || chosen.has(person.id)))
}

export function trainingDepartments(employees: readonly TrainingEmployee[]): { key: string; label: string; count: number }[] {
  const departments = new Map<string, { key: string; label: string; count: number }>()
  for (const person of employees) {
    const key = departmentKey(person.department)
    const existing = departments.get(key)
    if (existing) existing.count++
    else departments.set(key, { key, label: person.department?.trim().replace(/\s+/g, ' ') || 'Без отдела', count: 1 })
  }
  return [...departments.values()].sort((a, b) => a.label.localeCompare(b.label, 'ru-RU'))
}

function sortedIds(employees: readonly { id: string }[]): string[] {
  return [...new Set(employees.map(person => person.id))].sort()
}

/** Includes the full eligible pool, rather than the random sample in one round. */
export function trainingPoolSignature(employees: readonly { id: string }[]): string {
  return JSON.stringify(sortedIds(employees))
}

export async function gameTrainingScopeKey(fullPool: readonly { id: string }[], selectedPool: readonly { id: string }[]): Promise<string> {
  const full = sortedIds(fullPool)
  const selected = sortedIds(selectedPool)
  const allowed = new Set(full)
  if (selected.some(id => !allowed.has(id))) throw new Error('Выбранный состав не относится к текущему списку.')
  const payload = JSON.stringify(selected)
  if (payload === JSON.stringify(full)) return 'all'
  // Never downgrade a failed fingerprint to the general leaderboard.
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}
