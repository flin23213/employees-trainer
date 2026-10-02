// Путь: src/lib/quiz.ts
import type { EmployeeWithProgress } from '../types'
import type { AnswerField } from './answerCheck'

export type QuizMode = 'mixed' | 'input' | 'choice'
export type QuizTopic = 'roles' | 'departments' | 'all'

export type Question = {
  employee: EmployeeWithProgress
  kind: 'input' | 'choice'
  field: AnswerField
  promptLabel: string     // подпись над вопросом: «Сотрудник», «Должность», «Описание»
  promptValue: string     // то, что показываем
  question: string        // сам вопрос
  answer: string          // правильный ответ для показа
  acceptable: string[]    // все варианты, которые считаем верными
  options?: string[]      // варианты для выбора
}

type QType =
  | 'title-by-name' | 'name-by-title' | 'dept-by-name' | 'name-by-description'
  | 'choice-title' | 'choice-name' | 'choice-dept'

const TOPICS: Record<QuizTopic, { input: QType[]; choice: QType[] }> = {
  roles: { input: ['title-by-name', 'name-by-title'], choice: ['choice-title', 'choice-name'] },
  departments: { input: ['dept-by-name'], choice: ['choice-dept'] },
  all: {
    input: ['title-by-name', 'name-by-title', 'dept-by-name', 'name-by-description'],
    choice: ['choice-title', 'choice-name', 'choice-dept'],
  },
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
function normalize(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru').replace(/ё/g, 'е')
}

/** Уникальные непустые значения */
function uniq(values: (string | null)[]): string[] {
  const found = new Map<string, string>()
  for (const value of values) {
    if (value?.trim() && !found.has(normalize(value))) found.set(normalize(value), value.trim())
  }
  return [...found.values()]
}

/** Собираем 4 варианта: правильный + 3 неправильных */
function makeOptions(correct: string, wrongPool: string[], random: () => number): string[] | null {
  const wrong = shuffle(uniq(wrongPool).filter((v) => normalize(v) !== normalize(correct)), random).slice(0, 3)
  if (wrong.length < 3) return null            // мало данных для выбора из четырёх
  return shuffle([correct, ...wrong], random)
}

function makeQuestion(
  employee: EmployeeWithProgress,
  type: QType,
  all: EmployeeWithProgress[],
  random: () => number
): Question | null {
  const others = all.filter((e) => e.id !== employee.id)

  switch (type) {
    case 'title-by-name':
      if (!employee.job_title.trim()) return null
      return {
        employee, kind: 'input', field: 'title',
        promptLabel: 'Сотрудник', promptValue: employee.full_name,
        question: 'Какую должность занимает этот сотрудник?',
        answer: employee.job_title,
        acceptable: [employee.job_title],
      }

    case 'name-by-title': {
      // Верным считаем любого сотрудника с такой же должностью
      if (!employee.job_title.trim()) return null
      const sameTitle = all.filter((e) => normalize(e.job_title) === normalize(employee.job_title))
      return {
        employee, kind: 'input', field: 'name',
        promptLabel: 'Должность', promptValue: employee.job_title,
        question: 'Кто занимает эту должность?',
        answer: sameTitle.map((e) => e.full_name).join(' / '),
        acceptable: sameTitle.map((e) => e.full_name),
      }
    }

    case 'dept-by-name':
      if (!employee.department?.trim()) return null
      return {
        employee, kind: 'input', field: 'dept',
        promptLabel: 'Сотрудник', promptValue: employee.full_name,
        question: 'В каком отделе работает этот сотрудник?',
        answer: employee.department,
        acceptable: [employee.department],
      }

    case 'name-by-description':
      if (!employee.description || employee.description.trim().length < 12) return null
      return {
        employee, kind: 'input', field: 'name',
        promptLabel: 'Чем занимается', promptValue: employee.description,
        question: 'О каком сотруднике идёт речь?',
        answer: employee.full_name,
        acceptable: [employee.full_name],
      }

    case 'choice-title': {
      if (!employee.job_title.trim()) return null
      const options = makeOptions(employee.job_title, others.map((e) => e.job_title), random)
      if (!options) return null
      return {
        employee, kind: 'choice', field: 'title',
        promptLabel: 'Сотрудник', promptValue: employee.full_name,
        question: 'Выберите должность этого сотрудника',
        answer: employee.job_title,
        acceptable: [employee.job_title],
        options,
      }
    }

    case 'choice-name': {
      // Неправильные варианты берём только среди людей с ДРУГОЙ должностью,
      // иначе вариант тоже оказался бы верным
      if (!employee.job_title.trim()) return null
      const sameTitle = all.filter((e) => normalize(e.job_title) === normalize(employee.job_title))
      const pool = others.filter((e) => normalize(e.job_title) !== normalize(employee.job_title)).map((e) => e.full_name)
      const options = makeOptions(employee.full_name, pool, random)
      if (!options) return null
      return {
        employee, kind: 'choice', field: 'name',
        promptLabel: 'Должность', promptValue: employee.job_title,
        question: 'Кто занимает эту должность?',
        answer: employee.full_name,
        acceptable: sameTitle.map((e) => e.full_name),
        options,
      }
    }

    case 'choice-dept': {
      if (!employee.department?.trim()) return null
      const options = makeOptions(employee.department, others.map((e) => e.department ?? ''), random)
      if (!options) return null
      return {
        employee, kind: 'choice', field: 'dept',
        promptLabel: 'Сотрудник', promptValue: employee.full_name,
        question: 'Выберите отдел этого сотрудника',
        answer: employee.department,
        acceptable: [employee.department],
        options,
      }
    }
  }
}

/**
 * Собираем тест. Сотрудников берём по приоритету (сначала слабые и забытые),
 * тип вопроса выбираем случайно из доступных для этого сотрудника.
 */
export function buildQuiz(
  list: EmployeeWithProgress[],
  mode: QuizMode,
  size = 10,
  topic: QuizTopic = 'roles',
  random: () => number = Math.random
): Question[] {
  if (list.length === 0) return []

  const types = TOPICS[topic]
  const allowed = mode === 'input' ? types.input : mode === 'choice' ? types.choice : [...types.input, ...types.choice]

  const pool = shuffle([...list].filter((e) => e.full_name.trim()).sort((a, b) => b.priority - a.priority)
    .slice(0, Math.max(size * 2, 20)), random)

  const questions: Question[] = []
  for (const employee of pool) {
    if (questions.length >= size) break
    for (const type of shuffle(allowed, random)) {
      const q = makeQuestion(employee, type, list, random)
      if (q) { questions.push(q); break }
    }
  }
  return questions
}
