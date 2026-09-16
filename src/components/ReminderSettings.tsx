import { useEffect, useState } from 'react'
import { applicationServerKey, disableDeviceReminders, pushRegistration, reminderRequest, reminderSupport } from '../lib/reminders'

export default function ReminderSettings() {
  const [time,setTime]=useState('19:00')
  const [timezone,setTimezone]=useState(Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [enabled,setEnabled]=useState(false)
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const [support]=useState(reminderSupport)
  useEffect(()=>{
    let alive=true
    if(support) return
    void (async()=>{
      try {
        const registration=await navigator.serviceWorker.getRegistration('/')
        const sub=await registration?.pushManager.getSubscription()
        if(!sub)return
        const state=await reminderRequest({action:'status',endpoint:sub.endpoint})
        if(alive) { setEnabled(state.enabled===true); if(state.local_time)setTime(state.local_time.slice(0,5)); if(state.timezone)setTimezone(state.timezone) }
      } catch { if(alive)setError('Не удалось проверить настройки. Попробуйте обновить страницу.') }
      finally { if(alive)setLoading(false) }
    })()
    return ()=>{alive=false}
  },[support])
  useEffect(()=>{if(location.hash==='#reminders')document.getElementById('reminders')?.scrollIntoView()},[])
  async function save() {
    if(busy)return;setBusy(true);setError('');setMessage('')
    try {
      // Permission is requested only in direct response to this button press.
      const permission=Notification.permission==='default' ? await Notification.requestPermission() : Notification.permission
      if(permission!=='granted') throw new Error('Уведомления не разрешены. Разрешите их в настройках этого сайта в браузере и попробуйте снова.')
      const config=await reminderRequest({action:'config'})
      if(!config.publicKey)throw new Error('Сервис уведомлений ещё не готов')
      const registration=await pushRegistration()
      const subscription=await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:applicationServerKey(config.publicKey)})
      await reminderRequest({action:'subscribe',endpoint:subscription.endpoint,subscription:subscription.toJSON(),time,timezone})
      setEnabled(true);setMessage(`Напоминания включены на этом устройстве: ${time}, ${timezone}.`)
    } catch(e) { setError(e instanceof Error?e.message:'Не удалось включить уведомления') }
    finally {setBusy(false)}
  }
  async function act(test:boolean) {
    if(busy)return;setBusy(true);setError('');setMessage('')
    try {
      if(test) {
        const registration=await pushRegistration();const subscription=await registration.pushManager.getSubscription()
        if(!subscription)throw new Error('Сначала включите уведомления на этом устройстве')
        await reminderRequest({action:'test',endpoint:subscription.endpoint});setMessage('Пробное уведомление отправлено. Если его не видно, проверьте режим «Не беспокоить» и настройки уведомлений устройства.')
      } else { await disableDeviceReminders();setEnabled(false);setMessage('Напоминания на этом устройстве выключены.') }
    } catch(e) {setError(e instanceof Error?e.message:'Не удалось выполнить действие')}
    finally{setBusy(false)}
  }
  return <section id="reminders" className="card reminder-settings">
    <h2>Напоминания о занятиях</h2><p className="muted small">Одно уведомление в день, если есть новые сотрудники или подошёл срок повторения. Если сегодня уже занимались, напоминать не будем. Работает и при закрытой вкладке.</p>
    {support?<p className="muted">{support}</p>:<>
      <p className="small"><strong>{loading?'Проверяю настройки…':enabled?'Включены на этом устройстве':'Выключены на этом устройстве'}</strong></p>
      <div className="reminder-fields"><label className="label">Время<input className="input" type="time" value={time} onChange={e=>setTime(e.target.value)} /></label><label className="label">Часовой пояс<select className="input" value={timezone} onChange={e=>setTimezone(e.target.value)}>{Array.from(new Set([timezone,Intl.DateTimeFormat().resolvedOptions().timeZone,...Intl.supportedValuesOf('timeZone')])).map(zone=><option key={zone}>{zone}</option>)}</select></label></div>
      <p className="muted small">Напоминание придёт примерно в выбранное время, обычно в течение 5 минут. При поездке можно выбрать новый часовой пояс.</p>
      <div className="list-detail-actions"><button className="btn btn--primary" disabled={busy||loading||!time} onClick={()=>void save()}>{busy?'Подождите…':enabled?'Сохранить время':'Включить напоминания'}</button>{enabled&&<><button className="btn btn--ghost" disabled={busy} onClick={()=>void act(true)}>Пробное уведомление</button><button className="btn btn--ghost" disabled={busy} onClick={()=>void act(false)}>Выключить</button></>}</div>
      <p className="muted small">Включайте отдельно на телефоне и компьютере. При выходе из аккаунта напоминания на этом устройстве отключаются.</p>
    </>}
    {message&&<p role="status">{message}</p>}{error&&<p role="alert" className="answer-wrong">{error}</p>}
  </section>
}
