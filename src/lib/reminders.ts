import { supabase } from './supabase'

export function reminderSupport() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1)
  const installed = matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & {standalone?:boolean}).standalone
  if(ios&&!installed) return 'На iPhone или iPad откройте сайт в Safari → «Поделиться» → «На экран Домой». Затем откройте его с новой иконки и включите напоминания. Нужна iOS 16.4 или новее.'
  if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window)) return 'Этот браузер не поддерживает уведомления сайта. Попробуйте актуальный Chrome, Edge, Firefox или Safari.'
  return ''
}

export async function reminderRequest(body: Record<string,unknown>) {
  const {data,error}=await supabase.functions.invoke('learning-reminders',{body})
  if(error) {
    let message='Не удалось сохранить настройки напоминаний. Попробуйте ещё раз.'
    if(error.context instanceof Response) { try { message=(await error.context.json()).error ?? message } catch { /* Non-JSON gateway response. */ } }
    throw new Error(message)
  }
  return data as {enabled?:boolean; local_time?:string; timezone?:string; publicKey?:string}
}

export async function pushRegistration() {
  await navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'})
  return await Promise.race([navigator.serviceWorker.ready,new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('Сервис уведомлений ещё не запущен. Обновите страницу и попробуйте снова.')),12000))])
}

export function applicationServerKey(value:string): Uint8Array<ArrayBuffer> {
  const decoded=atob(value.replace(/-/g,'+').replace(/_/g,'/'))
  return Uint8Array.from(decoded,c=>c.charCodeAt(0))
}

export async function disableDeviceReminders() {
  if(!('serviceWorker' in navigator)||!('PushManager' in window))return
  const registration=await navigator.serviceWorker.getRegistration('/')
  const subscription=await registration?.pushManager.getSubscription()
  if(!subscription)return
  await reminderRequest({action:'disable',endpoint:subscription.endpoint})
  await subscription.unsubscribe()
}
