export type Subscription = { endpoint: string; keys: { p256dh: string; auth: string } }
export function validSubscription(value: unknown): value is Subscription {
  if (!value || typeof value !== 'object') return false
  const v = value as Subscription
  try {
    const u = new URL(v.endpoint)
    const allowed = u.hostname === 'fcm.googleapis.com' || u.hostname === 'web.push.apple.com' || u.hostname.endsWith('.push.services.mozilla.com') || u.hostname.endsWith('.notify.windows.com')
    if (!allowed || u.protocol !== 'https:' || u.username || u.password || u.port || v.endpoint.length > 4096) return false
    const decode = (s: string) => atob(s.replace(/-/g,'+').replace(/_/g,'/'))
    return /^[\w-]+$/.test(v.keys.p256dh) && /^[\w-]+$/.test(v.keys.auth) && decode(v.keys.p256dh).length === 65 && decode(v.keys.auth).length === 16
  } catch { return false }
}
export function validSchedule(time: unknown, timezone: unknown): boolean {
  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || typeof timezone !== 'string' || timezone.length > 80) return false
  try { new Intl.DateTimeFormat('en', { timeZone: timezone }); return true } catch { return false }
}
