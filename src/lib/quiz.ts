// Путь: src/lib/quiz.ts
import type { EmployeeWithProgress } from '../types'
import type { AnswerField } from './answerCheck'

export type QuizMode = 'mixed' | 'input' | 'choice'

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
  | 'choice-title' | 'choice-name'

const INPUT_TYPES: QType[] = ['title-by-name', 'name-by-title', 'dept-by-name', 'name-by-description']
const CHOICE_TYPES: QType[] = ['choice-title', 'choice-name']

function shuffle<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}



/** Уникальные непустые значения */
function uniq(values: (string | null)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v && v.trim() !== '')))
}

/** Собираем 4 варианта: правильный + 3 неправильных */
function makeOptions(correct: string, wrongPool: string[]): string[] | null {
  const wrong = shuffle(uniq(wrongPool).filter((v) => v !== correct)).slice(0, 3)
  if (wrong.length < 3) return null            // мало данных для выбора из четырёх
  return shuffle([correct, ...wrong])
}

function makeQuestion(
  employee: EmployeeWithProgress,
  type: QType,
  all: EmployeeWithProgress[]
): Question | null {
  const others = all.filter((e) => e.id !== employee.id)

  switch (type) {
    case 'title-by-name':
      return {
        employee, kind: 'input', field: 'title',
        promptLabel: 'Сотрудник', promptValue: employee.full_name,
        question: 'Какая у него должность?',
        answer: employee.job_title,
        acceptable: [employee.job_title],
      }

    case 'name-by-title': {
      // Верным считаем любого сотрудника с такой же должностью
      const sameTitle = all.filter((e) => e.job_title === employee.job_title)
      return {
        employee, kind: 'input', field: 'name',
        promptLabel: 'Должность', promptValue: employee.job_title,
        question: 'Кто занимает эту должность?',
        answer: sameTitle.map((e) => e.full_name).join(' / '),
        acceptable: sameTitle.map((e) => e.full_name),
      }
    }

    case 'dept-by-name':
      if (!employee.department) return null
      return {
        employee, kind: 'input', field: 'dept',
        promptLabel: 'Сотрудник', promptValue: employee.full_name,
        question: 'В каком отделе он работает?',
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
      const options = makeOptions(employee.job_title, others.map((e) => e.job_title))
      if (!options) return null
      return {
        employee, kind: 'choice', field: 'title',
        promptLabel: 'Сотрудник', promptValue: employee.full_name,
        question: 'Выберите его должность',
        answer: employee.job_title,
        acceptable: [employee.job_title],
        options,
      }
    }

    case 'choice-name': {
      // Неправильные варианты берём только среди людей с ДРУГОЙ должностью,
      // иначе вариант тоже оказался бы верным
      const pool = others.filter((e) => e.job_title !== employee.job_title).map((e) => e.full_name)
      const options = makeOptions(employee.full_name, pool)
      if (!options) return null
      return {
        employee, kind: 'choice', field: 'name',
        promptLabel: 'Должность', promptValue: employee.job_title,
        question: 'Кто занимает эту должность?',
        answer: employee.full_name,
        acceptable: [employee.full_name],
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
  size = 10
): Question[] {
  if (list.length === 0) return []

  const allowed =
    mode === 'input' ? INPUT_TYPES : mode === 'choice' ? CHOICE_TYPES : [...INPUT_TYPES, ...CHOICE_TYPES]

  const pool = shuffle([...list].sort((a, b) => b.priority - a.priority).slice(0, Math.max(size * 2, 20)))

  const questions: Question[] = []
  for (const employee of pool) {
    if (questions.length >= size) break
    for (const type of shuffle(allowed)) {
      const q = makeQuestion(employee, type, list)
      if (q) { questions.push(q); break }
    }
  }
  return questions
}