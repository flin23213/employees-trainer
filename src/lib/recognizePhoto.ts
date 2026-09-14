import { createWorker, OEM, PSM } from 'tesseract.js'
import type { Worker } from 'tesseract.js'

export async function recognizePhoto(file: File, signal: AbortSignal, onProgress: (value: string) => void): Promise<string> {
  if (file.size > 15 * 1024 * 1024) throw new Error('Фотография слишком большая. Выберите файл до 15 МБ.')
  signal.throwIfAborted()
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  try {
    const scale = Math.min(1, 2600 / Math.max(bitmap.width, bitmap.height))
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Браузер не поддерживает обработку изображения.')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  } finally {
    bitmap.close()
  }

  let worker: Worker | undefined
  let ended = false
  let timeout: ReturnType<typeof setTimeout> | undefined
  let rejectStop: (reason: Error) => void = () => {}
  const stopped = new Promise<never>((_, reject) => { rejectStop = reject })
  const abort = () => {
    rejectStop(new DOMException('Распознавание отменено.', 'AbortError'))
    void worker?.terminate()
  }
  signal.addEventListener('abort', abort, { once: true })
  const run = async () => {
    onProgress('Загружаю модуль распознавания…')
    worker = await createWorker(['rus', 'eng'], OEM.LSTM_ONLY, {
      logger: message => {
        if (ended || signal.aborted) return
        if (message.status === 'recognizing text') onProgress(`Распознаю текст: ${Math.round(message.progress * 100)}%`)
        else if (message.status === 'loading language traineddata') onProgress('Загружаю языки для первого распознавания…')
      },
    })
    if (ended || signal.aborted) {
      await worker.terminate()
      throw new DOMException('Распознавание остановлено.', 'AbortError')
    }
    await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO, preserve_interword_spaces: '1' })
    const { data } = await worker.recognize(canvas)
    if (!data.text.trim()) throw new Error('Текст не найден. Попробуйте более чёткое фото без бликов.')
    return data.text
  }
  try {
    signal.throwIfAborted()
    timeout = setTimeout(() => {
      rejectStop(new Error('Распознавание заняло слишком много времени. Попробуйте уменьшить фото или повторить при стабильном интернете.'))
      void worker?.terminate()
    }, 120_000)
    return await Promise.race([run(), stopped])
  } finally {
    ended = true
    clearTimeout(timeout)
    signal.removeEventListener('abort', abort)
    await worker?.terminate()
    canvas.width = canvas.height = 0
  }
}
