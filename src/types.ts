// Путь: src/types.ts

/** Статус изучения, его считает база в представлении employee_queue */
export type EmployeeStatus = 'new' | 'weak' | 'learning' | 'known'

/** Сотрудник: то, что хранится в таблице employees */
export type Employee = {
  id: string
  full_name: string
  job_title: string
  department: string | null
  description: string | null
  notes: string | null
}

/** Сотрудник вместе с прогрессом: то, что отдаёт employee_queue */
export type EmployeeWithProgress = Employee & {
  attempts: number
  correct_count: number
  incorrect_count: number
  streak: number
  last_result: boolean | null
  last_reviewed_at: string | null
  accuracy: number
  status: EmployeeStatus
  priority: number
}

/** Сводка для главного экрана */
export type Stats = {
  total: number
  known: number
  learning: number
  weak: number
  fresh: number          // ещё не изучались
  avgAccuracy: number
  progressPercent: number
}