import test from 'node:test'
import assert from 'node:assert/strict'
import { validSchedule, validSubscription } from '../supabase/functions/learning-reminders/validation.ts'
const sub={endpoint:'https://fcm.googleapis.com/fcm/send/example',keys:{p256dh:Buffer.alloc(65,1).toString('base64url'),auth:Buffer.alloc(16,2).toString('base64url')}}
test('push validation allows browser providers and rejects arbitrary destinations',()=>{
  assert.equal(validSubscription(sub),true)
  for(const endpoint of ['http://fcm.googleapis.com/send','https://localhost/','https://fcm.googleapis.com.evil.example/','https://web.push.apple.com@127.0.0.1/','https://web.push.apple.com:8443/'])assert.equal(validSubscription({...sub,endpoint}),false)
  assert.equal(validSubscription({...sub,keys:{p256dh:'bad',auth:'bad'}}),false)
})
test('schedule rejects invalid hours and zones but permits late-night reminders',()=>{
  assert.equal(validSchedule('23:59','Europe/Moscow'),true)
  assert.equal(validSchedule('00:00','America/New_York'),true)
  assert.equal(validSchedule('24:00','Europe/Moscow'),false)
  assert.equal(validSchedule('19:00','Mars/Nowhere'),false)
})
