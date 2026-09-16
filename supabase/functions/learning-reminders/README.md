# Learning reminders

Web Push runs in Supabase Edge Functions with `verify_jwt = false` because the
endpoint accepts both user JWTs (verified via Auth.getUser) and a separate cron
secret. Disabling the gateway check does not disable application authentication.

Only the public VAPID key is returned by `config`. Private VAPID keys and the cron
secret are generated on the server and stored in private.reminder_keys, accessible
only to the service role and database administrators. Never export those keys to
the client or repository. The function needs only Supabase's built-in environment.

The SQL migration creates a five-minute pg_cron job. Notifications are opt-in,
per device, at local wall-clock time using an IANA timezone. A 30-minute catch-up
window permits transient retries. No reminders are sent after any recorded study
answer that day, or if there are no new/due employees. Claims are atomic and expire
with the local date. Invalid/expired endpoints are removed; other permanent push
errors disable the subscription. Provider acceptance is not proof of OS display.

User endpoints require ownership; push destinations are allowlisted and redirects
are rejected. Test notifications are rate limited to once per minute per device.
The service worker displays only generic copy, never employee or account data.
