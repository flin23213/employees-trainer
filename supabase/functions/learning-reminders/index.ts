import { createClient } from 'npm:@supabase/supabase-js@2.112.3'
import webpush from 'npm:web-push@3.6.7'
import { validSchedule, validSubscription, type Subscription } from './validation.ts'

const origin = 'https://employees-trainer.gidronic25.workers.dev'
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
const cors = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Vary': 'Origin', 'Cache-Control': 'no-store' }
const respond = (body: unknown, status = 200) => Response.json(body, {status, headers:cors})

async function keys() {
  let result = await admin.rpc('reminder_server_keys')
  if (result.error) throw result.error
  if (!result.data.vapid) result = await admin.rpc('reminder_server_keys', {p_vapid:webpush.generateVAPIDKeys()})
  if (result.error) throw result.error
  return result.data
}
async function send(subscription: Subscription, vapid: {publicKey:string; privateKey:string}, test=false) {
  if (!validSubscription(subscription)) return 400
  const request = webpush.generateRequestDetails(subscription, JSON.stringify({
    title: test ? 'Напоминания включены' : 'Пять минут для вашей команды',
    body: test ? 'Всё работает. Следующее напоминание придёт в выбранное время.' : 'Ваше короткое занятие готово. Повторим знакомые имена?',
    url:'/today', tag:test ? 'learning-test' : 'learning-daily',
  }), { TTL:1800, urgency:'normal', vapidDetails:{subject:origin, publicKey:vapid.publicKey, privateKey:vapid.privateKey} })
  const response = await fetch(request.endpoint, {method:request.method,headers:request.headers,body:request.body,redirect:'error',signal:AbortSignal.timeout(12000)})
  return response.status
}

Deno.serve(async req => {
  if (req.method==='OPTIONS') return new Response(null,{headers:cors})
  if (!['GET','POST'].includes(req.method)) return respond({error:'Метод не поддерживается'},405)
  if (req.headers.get('origin') && req.headers.get('origin')!==origin) return respond({error:'Недопустимый источник запроса'},403)
  try {
    if (Number(req.headers.get('content-length') ?? 0)>12000) return respond({error:'Слишком большой запрос'},413)
    const text=req.method==='POST' ? await req.text() : '{}'
    if(text.length>12000) return respond({error:'Слишком большой запрос'},413)
    let input: Record<string,unknown>
    try { input=JSON.parse(text) } catch { return respond({error:'Некорректный запрос'},400) }
    if(!input || typeof input!=='object') return respond({error:'Некорректный запрос'},400)
    const action=input.action ?? 'config'
    if(action==='config') { const config=await keys(); return respond({publicKey:config.vapid.publicKey}) }
    if(action==='dispatch') {
      const secret=req.headers.get('x-reminder-secret')
      if(!secret) return respond({error:'Требуется служебная авторизация'},401)
      const config=await keys()
      if(secret!==config.cron_secret) return respond({error:'Требуется служебная авторизация'},401)
      const {data:subscriptions,error}=await admin.rpc('claim_learning_reminders')
      if(error) throw error
      let sent=0, failed=0
      // Bounded concurrency prevents a large list from exhausting the function.
      for(let i=0;i<subscriptions.length;i+=10) await Promise.all(subscriptions.slice(i,i+10).map(async s=>{
        let status=503
        try { status=await send(s.subscription,config.vapid) } catch { /* Retry on the next tick within the delivery window. */ }
        if(status>=200&&status<300) { sent++;return }
        failed++
        if(status===404||status===410) await admin.from('push_subscriptions').delete().eq('id',s.id)
        else if(status===429||status>=500) await admin.from('push_subscriptions').update({last_sent_date:null}).eq('id',s.id)
        else await admin.from('push_subscriptions').update({enabled:false}).eq('id',s.id)
      }))
      return respond({sent,failed})
    }
    const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')
    if(!token) return respond({error:'Войдите в аккаунт'},401)
    const {data:{user},error:authError}=await admin.auth.getUser(token)
    if(authError||!user) return respond({error:'Войдите в аккаунт'},401)
    const endpoint=input.endpoint
    if(typeof endpoint!=='string'||endpoint.length>4096) return respond({error:'Не найдено устройство'},400)
    if(action==='status') {
      const {data,error}=await admin.from('push_subscriptions').select('enabled,local_time,timezone').eq('endpoint',endpoint).eq('user_id',user.id).maybeSingle()
      if(error) throw error
      return respond(data ?? {enabled:false})
    }
    if(action==='disable') {
      const {error}=await admin.from('push_subscriptions').delete().eq('endpoint',endpoint).eq('user_id',user.id)
      if(error) throw error
      return respond({ok:true})
    }
    if(action==='subscribe') {
      if(!validSubscription(input.subscription)||input.subscription.endpoint!==endpoint||!validSchedule(input.time,input.timezone)) return respond({error:'Проверьте время и настройки уведомлений'},400)
      const existing=await admin.from('push_subscriptions').select('user_id').eq('endpoint',endpoint).maybeSingle()
      if(existing.error) throw existing.error
      if(existing.data&&existing.data.user_id!==user.id) return respond({error:'Уведомления устройства связаны с другим аккаунтом. Отключите их в прежнем аккаунте.'},409)
      const count=await admin.from('push_subscriptions').select('id',{count:'exact',head:true}).eq('user_id',user.id)
      if(count.error) throw count.error
      if(!existing.data&&(count.count ?? 0)>=10) return respond({error:'Можно подключить не больше 10 устройств'},400)
      const {error}=await admin.from('push_subscriptions').upsert({user_id:user.id,endpoint,subscription:input.subscription,local_time:input.time,timezone:input.timezone,enabled:true},{onConflict:'endpoint'})
      if(error) throw error
      return respond({ok:true})
    }
    if(action==='test') {
      const {data,error}=await admin.from('push_subscriptions').update({last_test_at:new Date().toISOString()}).eq('endpoint',endpoint).eq('user_id',user.id).eq('enabled',true).or(`last_test_at.is.null,last_test_at.lt.${new Date(Date.now()-60000).toISOString()}`).select('subscription').maybeSingle()
      if(error) throw error
      if(!data) return respond({error:'Включите напоминания или подождите минуту перед повторной проверкой'},429)
      const config=await keys(); const status=await send(data.subscription,config.vapid,true)
      if(status<200||status>=300) {
        if(status===404||status===410) await admin.from('push_subscriptions').delete().eq('endpoint',endpoint).eq('user_id',user.id)
        return respond({error:'Уведомление не доставлено. Выключите и включите напоминания на этом устройстве.'},502)
      }
      return respond({ok:true})
    }
    return respond({error:'Неизвестное действие'},400)
  } catch { return respond({error:'Сервис напоминаний временно недоступен. Попробуйте ещё раз.'},500) }
})
