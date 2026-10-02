import Icon from './Icon'

export default function InstallGuide() {
  const installed = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  return <details className="card account-install">
    <summary><Icon name="upload" /><span>{installed ? 'Установлено на этом устройстве' : 'Добавить на главный экран'}<small>{installed ? 'Вы уже открыли веб-приложение' : 'Быстрый запуск с иконки, бесплатно'}</small></span><Icon name="chevron" /></summary>
    <div className="account-install__body">
      {installed ? <p className="muted small">Тренажёр уже запускается отдельным окном. Для занятий и сохранения ответов нужен интернет.</p> : <>
        <p className="muted small">Сайт можно открывать с иконки как приложение. Аккаунт и списки остаются теми же; занятиям нужен интернет.</p>
        <h3>На iPhone</h3><ol><li>Откройте сайт в Safari.</li><li>Нажмите «Поделиться» и выберите «На экран “Домой”».</li><li>Если есть переключатель «Открывать как веб-приложение», включите его. Нажмите «Добавить».</li></ol>
        <h3>На Android</h3><ol><li>Откройте сайт в Chrome.</li><li>В меню браузера выберите «Добавить на главный экран» или «Установить приложение».</li><li>Подтвердите установку и открывайте тренажёр с новой иконки.</li></ol>
        <p className="muted small">Во встроенном браузере Telegram или другого приложения этих пунктов может не быть. Откройте ссылку в Safari или Chrome.</p>
      </>}
    </div>
  </details>
}
