// Путь: src/lib/supabase.ts
// Единая точка подключения к Supabase. Во всём приложении используем
// только этот объект `supabase`, второй раз подключаться не нужно.

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_KEY as string

// Понятная ошибка вместо загадочной, если .env.local не заполнен
if (!url || !key) {
  throw new Error(
    'Не заданы VITE_SUPABASE_URL и/или VITE_SUPABASE_KEY. ' +
      'Проверьте файл .env.local в корне проекта и перезапустите npm run dev.'
  )
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,      // помнить вход после закрытия браузера
    autoRefreshToken: true,    // сам продлевать сессию, чтобы не выкидывало
  },
})