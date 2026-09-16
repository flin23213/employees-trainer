import test from 'node:test'
import assert from 'node:assert/strict'
import { makeDailyPlan, type LearningEmployee } from '../src/lib/dailyPlan.ts'
const now=Date.parse('2026-09-15T12:00:00Z')
function row(id:string,attempts=0,due:string|null=null):LearningEmployee {
  return {id,full_name:id,job_title:'Engineer',department:null,description:null,notes:null,list_id:'one',list_name:'Team',attempts,correct_count:0,incorrect_count:0,streak:0,last_result:null,last_reviewed_at:null,accuracy:0,status:attempts?'learning':'new',priority:0,review_step:0,review_due_at:due}
}
test('daily plan reserves two new people while prioritizing overdue reviews',()=>{
  const rows=[...Array.from({length:15},(_,i)=>row('due'+i,1,'2026-09-14T12:00:00Z')),...Array.from({length:8},(_,i)=>row('new'+i))]
  const plan=makeDailyPlan(rows,[],now)
  assert.equal(plan.cards.length,10);assert.equal(plan.cards.filter(r=>r.attempts===0).length,2)
  assert.equal(new Set(plan.cards.map(r=>r.id)).size,10)
})
test('excludes future reviews and already answered employees across lists',()=>{
  const rows=[row('a',1,'2026-09-16T12:00:00Z'),row('b'),row('c',1,'2026-09-15T12:00:00Z')]
  const plan=makeDailyPlan(rows,['b','b'],now)
  assert.deepEqual(plan.cards.map(r=>r.id),['c']);assert.equal(plan.completed,1)
})
test('resuming stops at ten unique employees, never ten repeated answers',()=>{
  const rows=Array.from({length:30},(_,i)=>row(String(i)))
  assert.equal(makeDailyPlan(rows,['0','0'],now).cards.length,9)
  assert.equal(makeDailyPlan(rows,rows.slice(0,10).map(r=>r.id),now).cards.length,0)
})
test('fills daily plan when only new or only due people exist',()=>{
  assert.equal(makeDailyPlan(Array.from({length:15},(_,i)=>row(String(i))),[],now).cards.length,10)
  assert.equal(makeDailyPlan(Array.from({length:15},(_,i)=>row(String(i),1,'2026-09-01')),[],now).cards.length,10)
  assert.equal(makeDailyPlan([],[],now).cards.length,0)
})
