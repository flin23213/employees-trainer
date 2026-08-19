// Путь: src/lib/answerCheck.ts
// Сравнение ответа пользователя с правильным: с нормализацией,
// вариантами написания ФИО и зоной допустимых опечаток.

export type Verdict = 'correct' | 'almost' | 'wrong'
export type AnswerField = 'name' | 'title' | 'dept'

export type CheckResult = {
  verdict: Verdict
  /** Пояснение для пользователя, почему «почти» или почему «неправильно» */
  hint?: string
}

/* ============================ НОРМАЛИЗАЦИЯ ============================ */

/**
 * Приводим текст к сравнимому виду:
 * нижний регистр, «ё» -> «е», знаки препинания -> пробелы, лишние пробелы убраны.
 */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')   // всё, что не буква и не цифра, в пробел
    .replace(/\s+/g, ' ')
    .trim()
}

const uniq = (items: string[]): string[] => Array.from(new Set(items.filter((s) => s.trim() !== '')))

/* ======================= РАССТОЯНИЕ ЛЕВЕНШТЕЙНА ======================= */

/** Сколько правок нужно, чтобы превратить строку a в строку b */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)

  for (let i = 1; i <= a.length; i++) {
    const curr = [i]
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1,                                        // удаление
        curr[j - 1] + 1,                                    // вставка
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)        // замена
      )
    }
    prev = curr
  }
  return prev[b.length]
}

/** Сколько опечаток прощаем: зависит от длины ответа и от типа поля */
function tolerance(length: number, field: AnswerField): number {
  if (field === 'title') return length <= 6 ? 1 : length <= 14 ? 2 : 3
  if (field === 'name') return length <= 14 ? 1 : 2
  return length <= 14 ? 1 : 2   // отдел
}

/* ========================== ВАРИАНТЫ ФИО ============================== */

/** Полные (равноценные) и частичные (неполные) варианты написания ФИО */
function nameVariants(fullName: string): { full: string[]; partial: string[] } {
  const words = normalizeText(fullName).split(' ').filter(Boolean)
  const [surname, first, patronymic] = words

  const full: string[] = [words.join(' ')]
  const partial: string[] = []

  if (words.length >= 2) {
    full.push(`${surname} ${first}`, `${first} ${surname}`)
    partial.push(surname, first)
  }
  if (words.length >= 3) {
    full.push(
      `${first} ${patronymic} ${surname}`,
      `${first} ${surname} ${patronymic}`,
      `${surname} ${first[0]} ${patronymic[0]}`,
      `${surname} ${first[0]}${patronymic[0]}`
    )
    partial.push(`${first} ${patronymic}`)
  }

  return { full: uniq(full), partial: uniq(partial) }
}

/* ===================== СЛОВА: ОСНОВЫ И СЛУЖЕБНЫЕ ====================== */

const STOPWORDS = new Set([
  'отдел', 'отдела', 'отделение', 'департамент', 'департамента',
  'подразделение', 'служба', 'службы', 'управление', 'управления',
  'сектор', 'сектора', 'дирекция', 'дирекции', 'группа', 'группы', 'по',
])

/** Значимые слова: без служебных */
function coreWords(value: string): string[] {
  return normalizeText(value).split(' ').filter((w) => w && !STOPWORDS.has(w))
}

/** Два слова считаем одним и тем же (разные окончания или одна опечатка) */
function wordsMatch(a: string, b: string): boolean {
  if (a === b) return true
  const min = Math.min(a.length, b.length)
  // одна основа, разные окончания: «продаж» и «продажи», «бухгалтер» и «бухгалтерия»
  if (min >= 5 && a.slice(0, min - 1) === b.slice(0, min - 1)) return true
  return levenshtein(a, b) <= (min >= 8 ? 2 : 1)
}

/** Все слова набора needle нашлись в наборе hay */
function isSubset(needle: string[], hay: string[]): boolean {
  return needle.every((n) => hay.some((h) => wordsMatch(n, h)))
}

/* ====================== ПРОВЕРКА: НЕ ЧУЖОЙ ЛИ ЭТО ==================== */

/** Совпал ли ответ точно с чем-то из «чужих» значений (другой сотрудник, другая должность) */
function matchesSomethingElse(user: string, others: string[], field: AnswerField): boolean {
  return others.some((other) => {
    if (!other) return false
    if (field === 'name') {
      const v = nameVariants(other)
      return v.full.includes(user) || v.partial.includes(user)
    }
    return normalizeText(other) === user
  })
}

/* ============================ ГЛАВНАЯ ФУНКЦИЯ ========================= */

/**
 * @param input      что написал пользователь
 * @param acceptable правильные ответы (для должности их может быть несколько)
 * @param field      что спрашиваем: ФИО, должность или отдел
 * @param others     «чужие» значения из списка: защита от засчитывания другого человека
 */
export function checkAnswer(
  input: string,
  acceptable: string[],
  field: AnswerField,
  others: string[] = []
): CheckResult {
  const user = normalizeText(input)
  if (user === '') return { verdict: 'wrong' }

  /* --- 1. Точное совпадение (с учётом всех вариантов написания) --- */
  for (const variant of acceptable) {
    if (field === 'name') {
      const { full } = nameVariants(variant)
      if (full.includes(user)) return { verdict: 'correct' }
    } else if (normalizeText(variant) === user) {
      return { verdict: 'correct' }
    }
  }

  /* --- 2. Это точно ответ про кого-то другого? Тогда сразу ошибка --- */
  if (matchesSomethingElse(user, others, field)) {
    return {
      verdict: 'wrong',
      hint: field === 'name' ? 'Это другой сотрудник из вашего списка.' : 'Это значение другого сотрудника.',
    }
  }

  /* --- 3. Неполный ответ --- */
  for (const variant of acceptable) {
    if (field === 'name') {
      const { partial } = nameVariants(variant)
      if (partial.includes(user)) {
        return { verdict: 'almost', hint: 'Ответ неполный: назовите ФИО целиком.' }
      }
    } else {
      const correctCore = coreWords(variant)
      const userCore = coreWords(user)
      if (userCore.length === 0) continue

      // Совпали все значимые слова, отличаются только окончания или служебные слова
      if (userCore.length === correctCore.length && isSubset(userCore, correctCore)) {
        return { verdict: 'correct' }
      }
      // Пользователь назвал часть: «менеджер» вместо «старший менеджер»
      if (userCore.length < correctCore.length && isSubset(userCore, correctCore)) {
        return { verdict: 'almost', hint: 'Почти: не хватает уточнения в ответе.' }
      }
      // Пользователь добавил лишнее, но всё правильное на месте
      if (userCore.length > correctCore.length && isSubset(correctCore, userCore)) {
        return { verdict: 'almost', hint: 'Почти: в ответе есть лишние слова.' }
      }
    }
  }

  /* --- 4. Опечатка в пределах допуска --- */
  let bestDistance = Infinity
  let bestLength = 0

  for (const variant of acceptable) {
    const candidates = field === 'name' ? nameVariants(variant).full : [normalizeText(variant)]
    for (const candidate of candidates) {
      const distance = levenshtein(user, candidate)
      if (distance < bestDistance) {
        bestDistance = distance
        bestLength = candidate.length
      }
    }
  }

  if (bestDistance <= tolerance(bestLength, field)) {
    return {
      verdict: 'almost',
      hint: bestDistance === 1 ? 'Похоже на опечатку в одну букву.' : `Похоже на опечатку (${bestDistance} правки).`,
    }
  }

  return { verdict: 'wrong' }
}