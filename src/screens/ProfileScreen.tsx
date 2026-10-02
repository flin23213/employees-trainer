// Профиль: данные аккаунта, напоминания и управление данными.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import ReminderSettings from '../components/ReminderSettings'
import Icon from '../components/Icon'
import InstallGuide from '../components/InstallGuide'
import { useAuth } from '../auth/AuthProvider'
import { resetAllProgress } from '../lib/employees'
import { clearActivity, getActivityAccount } from '../lib/activity'
import '../styles/account.css'

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function ProfileScreen() {
  const { session, signOut } = useAuth()
  const [busy, setBusy] = useState(false)
  const [info, setInfo] = useState<string | null>(null)

  const email = session?.user.email ?? '—'
  const providers: Record<string, string> = { email: 'Email и пароль', google: 'Google', github: 'GitHub', discord: 'Discord', 'custom:telegram': 'Telegram' }
  const loginMethods = session?.user.identities?.map(identity => providers[identity.provider] ?? identity.provider).join(', ') || 'Email и пароль'

  async function handleReset() {
    const ok = window.confirm(
      'Обнулить статистику по ВСЕМ сотрудникам?\n\n' +
      'Сами сотрудники останутся на месте, сбросятся только ответы, проценты и серии.'
    )
    if (!ok) return

    setBusy(true)
    setInfo(null)
    const userId = getActivityAccount()
    try {
      await resetAllProgress()
      clearActivity(userId)
      setInfo('Прогресс обнулён — можно учиться с чистого листа.')
    } catch (e) {
      setInfo(e instanceof Error ? e.message : 'Не удалось сбросить прогресс')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container fade-in account-page">
      <AppHeader title="Профиль" back />

      <section className="card account-identity" aria-labelledby="account-title">
        <span className="drawer__avatar account-avatar" aria-hidden="true">{email.charAt(0).toUpperCase()}</span>
        <div className="account-identity__body">
          <h2 id="account-title">Ваш аккаунт</h2>
          <p className="account-email">{email}</p>
          <p className="muted small">Аккаунт создан: {formatDate(session?.user.created_at)}</p>
          <p className="muted small">Способы входа: {loginMethods}</p>
        </div>
      </section>

      <ReminderSettings />
      <InstallGuide />

      <Link to="/stats" className="btn btn--block account-progress"><Icon name="chart" />Открыть прогресс обучения<Icon name="arrow" /></Link>

      <details className="card account-data">
        <summary><Icon name="settings" /><span>Управление данными</span><span className="account-data__chevron"><Icon name="chevron" /></span></summary>
        <div className="account-data__body">
          <p className="muted small">Сброс прогресса удаляет только статистику обучения. Список сотрудников не тронется.</p>
          <button className="btn btn--danger btn--block" onClick={handleReset} disabled={busy}>
            {busy ? 'Сбрасываю...' : 'Обнулить весь прогресс'}
          </button>
        </div>
      </details>

      {info && <p className="account-feedback small" role="status">{info}</p>}

      <button className="btn btn--ghost btn--block account-signout" disabled={busy}
        onClick={() => void signOut().catch(() => setInfo('Не удалось завершить выход. Проверьте соединение и попробуйте снова.'))}>
        <Icon name="logout" />Выйти из аккаунта
      </button>
    </div>
  )
}
