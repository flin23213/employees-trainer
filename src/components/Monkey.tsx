// Путь: src/components/Monkey.tsx
// Обезьянка у поля пароля.
//
// Что важно в этой версии:
//  * два кадра (peek = смотрит, hide = закрыла глаза) лежат ОДИН НА ДРУГОМ
//    в общей рамке и перетекают друг в друга прозрачностью, поэтому картинка
//    больше не «прыгает» при смене кадра;
//  * появление — плавный подъём с лёгкой пружинкой, а не мгновенный сдвиг;
//  * в покое она чуть дышит и покачивается, иногда моргает;
//  * когда пароль показывают или отправляют форму — целиком уезжает под поле;
//  * положение и размер настраиваются переменными в ui2.css (раздел 1),
//    в коде подкручивать ничего не нужно.

import { useEffect, useRef, useState } from 'react'

type Props = {
  /** true = выглянуть из-за поля */
  visible: boolean
  /** true = закрыть глаза (печатают пароль или щёлкнули по ней) */
  eyesClosed: boolean
  /** щёлкнули по обезьянке */
  onPoke: () => void
}

const OPEN_FRAME = '/monkey/peek.webp'
const SHUT_FRAME = '/monkey/hide.webp'

export default function Monkey({ visible, eyesClosed, onPoke }: Props) {
  // Показываем только после того, как оба кадра скачались: иначе первый
  // выезд получается «рваным», а второй кадр мигает белым.
  const [ready, setReady] = useState(false)
  const [blink, setBlink] = useState(false)

  const waitTimer = useRef<number | null>(null)
  const blinkTimer = useRef<number | null>(null)

  useEffect(() => {
    let left = 2
    const done = () => {
      left -= 1
      if (left === 0) setReady(true)
    }
    for (const src of [OPEN_FRAME, SHUT_FRAME]) {
      const img = new Image()
      img.onload = done
      img.onerror = done          // картинки нет? всё равно не блокируем экран
      img.src = src
    }
  }, [])

  // Моргание: раз в 3-6 секунд на 170 мс. Пока печатают, глаза и так закрыты,
  // поэтому таймер в это время не работает.
  useEffect(() => {
    if (!visible || !ready || eyesClosed) return

    let alive = true

    const schedule = () => {
      waitTimer.current = window.setTimeout(() => {
        if (!alive) return
        setBlink(true)
        blinkTimer.current = window.setTimeout(() => {
          if (!alive) return
          setBlink(false)
          schedule()
        }, 170)
      }, 3000 + Math.random() * 3000)
    }

    schedule()

    return () => {
      alive = false
      if (waitTimer.current !== null) window.clearTimeout(waitTimer.current)
      if (blinkTimer.current !== null) window.clearTimeout(blinkTimer.current)
      setBlink(false)
    }
  }, [visible, ready, eyesClosed])

  const shut = eyesClosed || blink

  return (
    <span
      className={'mk' + (visible && ready ? ' is-in' : '') + (shut ? ' is-shy' : '')}
      onClick={onPoke}
      role="presentation"
    >
      {/* слой 1: выезд из-за поля */}
      <span className="mk__slide">
        {/* слой 2: дыхание и покачивание в покое */}
        <span className="mk__idle">
          {/* нижний кадр задаёт размер рамки, верхний просто лежит поверх */}
          <img className="mk__frame" src={OPEN_FRAME} alt="" draggable={false} />
          <img
            className={'mk__frame mk__frame--shut' + (shut ? ' is-on' : '')}
            src={SHUT_FRAME}
            alt=""
            draggable={false}
          />
        </span>
      </span>
    </span>
  )
}
