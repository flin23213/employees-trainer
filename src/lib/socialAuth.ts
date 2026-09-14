import type { Provider } from '@supabase/supabase-js'
import { supabase } from './supabase'

export const SOCIAL_PROVIDERS: { id: Provider; label: string; mark: string }[] = [
  { id: 'google', label: 'Google', mark: 'G' },
  { id: 'github', label: 'GitHub', mark: 'GH' },
]

// VK ID requires a configured, verified custom provider in Supabase.
const vkProvider = import.meta.env.VITE_VK_AUTH_PROVIDER as string | undefined
if (vkProvider?.startsWith('custom:')) {
  SOCIAL_PROVIDERS.push({ id: vkProvider as Provider, label: 'ВКонтакте', mark: 'VK' })
}

export async function getEnabledSocialProviders(signal: AbortSignal): Promise<string[]> {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
    headers: { apikey: import.meta.env.VITE_SUPABASE_KEY },
    signal,
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('Не удалось проверить доступные сервисы входа.')
  const settings = await response.json() as { external?: Record<string, boolean> }
  return SOCIAL_PROVIDERS.filter(p => settings.external?.[p.id] === true).map(p => p.id)
}

export async function signInWithSocialProvider(provider: Provider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/`, skipBrowserRedirect: true },
  })
  if (error) throw error
  if (!data.url) throw new Error('Не удалось открыть сервис входа. Попробуйте ещё раз.')
  window.location.assign(data.url)
}

// Read once, before Supabase removes OAuth callback parameters from the URL.
const callback = new URLSearchParams(window.location.hash.slice(1))
const query = new URLSearchParams(window.location.search)
export const oauthCallbackError = callback.has('error') || query.has('error')
  ? 'Вход через сервис не завершён. Попробуйте снова или войдите по email.'
  : null
