-- Spaced repetition stays in the database and follows the account across devices.
alter table public.employee_progress add column review_step integer not null default 0 check (review_step between 0 and 5);
alter table public.employee_progress add column review_due_at timestamptz;
update public.employee_progress set review_step=least(streak,5), review_due_at=case when last_reviewed_at is null then null when last_result is false then last_reviewed_at+interval '1 hour' else last_reviewed_at+make_interval(days => (array[1,3,7,14,30])[greatest(1,least(streak,5))]) end;
create function public.schedule_employee_review() returns trigger language plpgsql set search_path='' as $$
begin
  if new.last_reviewed_at is null then
    new.review_step:=0; new.review_due_at:=null;
    if old.attempts>0 and new.attempts=0 then delete from public.study_answers where employee_id=new.employee_id and user_id=new.user_id; end if;
  elsif new.last_reviewed_at is distinct from old.last_reviewed_at then
    if new.last_result is false then new.review_step:=0; new.review_due_at:=new.last_reviewed_at+interval '1 hour';
    elsif old.review_due_at is null or old.review_due_at<=new.last_reviewed_at then
      new.review_step:=least(old.review_step+1,5);
      new.review_due_at:=new.last_reviewed_at+make_interval(days => (array[1,3,7,14,30])[new.review_step]);
    else new.review_step:=old.review_step; new.review_due_at:=old.review_due_at;
    end if;
  end if;
  return new;
end $$;
create trigger schedule_review before update on public.employee_progress for each row execute function public.schedule_employee_review();
create view public.learning_queue with (security_invoker=true) as
select q.*,p.review_step,p.review_due_at,l.name as list_name from public.employee_queue_all q join public.employee_progress p on p.employee_id=q.id and p.user_id=q.user_id join public.lists l on l.id=q.list_id;
grant select on public.learning_queue to authenticated;

create table public.study_answers (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 employee_id uuid not null references public.employees(id) on delete cascade,
 correct boolean not null, answered_at timestamptz not null default now()
);
create index study_answers_user_time on public.study_answers(user_id,answered_at);
alter table public.study_answers enable row level security;
grant select,insert,delete on public.study_answers to authenticated;
grant all on public.study_answers to service_role;
create policy answers_read on public.study_answers for select to authenticated using ((select auth.uid())=user_id);
create policy answers_delete on public.study_answers for delete to authenticated using ((select auth.uid())=user_id);
create policy answers_insert on public.study_answers for insert to authenticated with check ((select auth.uid())=user_id and exists(select 1 from public.employees e where e.id=employee_id and e.user_id=(select auth.uid())));
drop function public.record_answer(uuid,boolean);
create function public.record_answer(p_employee_id uuid,p_correct boolean,p_event_id uuid default gen_random_uuid()) returns void language plpgsql set search_path='' as $$
begin
 if auth.uid() is null or p_correct is null then raise exception 'Нужно войти в аккаунт и указать ответ.'; end if;
 if not exists(select 1 from public.employees where id=p_employee_id and user_id=auth.uid()) then raise exception 'Сотрудник не найден.'; end if;
 insert into public.study_answers(id,user_id,employee_id,correct) values(p_event_id,auth.uid(),p_employee_id,p_correct) on conflict do nothing;
 if not found then return; end if;
 update public.employee_progress set attempts=attempts+1,correct_count=correct_count+case when p_correct then 1 else 0 end,
 incorrect_count=incorrect_count+case when p_correct then 0 else 1 end,streak=case when p_correct then streak+1 else 0 end,
 last_result=p_correct,last_reviewed_at=clock_timestamp(),updated_at=now() where employee_id=p_employee_id and user_id=auth.uid();
 if not found then raise exception 'Не удалось сохранить прогресс.'; end if;
end $$;
revoke all on function public.record_answer(uuid,boolean,uuid) from public,anon;
grant execute on function public.record_answer(uuid,boolean,uuid) to authenticated;

-- Only the Edge Function's service role can access endpoints or signing keys.
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
grant usage on schema private to service_role;
create table private.reminder_keys(id boolean primary key default true check(id),cron_secret text not null default (gen_random_uuid()::text||gen_random_uuid()::text),vapid jsonb);
alter table private.reminder_keys enable row level security;
grant all on private.reminder_keys to service_role;
insert into private.reminder_keys(id) values(true);
create function public.reminder_server_keys(p_vapid jsonb default null) returns jsonb language plpgsql set search_path='' as $$
declare result jsonb;
begin
 if p_vapid is not null then update private.reminder_keys set vapid=coalesce(vapid,p_vapid) where id; end if;
 select jsonb_build_object('cron_secret',cron_secret,'vapid',vapid) into result from private.reminder_keys where id;
 return result;
end $$;
revoke all on function public.reminder_server_keys(jsonb) from public,anon,authenticated;
grant execute on function public.reminder_server_keys(jsonb) to service_role;
create table public.push_subscriptions (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique check(length(endpoint)<4096),subscription jsonb not null,
 local_time time not null default '19:00',timezone text not null default 'Europe/Moscow',
 enabled boolean not null default true,last_sent_date date,last_test_at timestamptz,created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon,authenticated;
grant all on public.push_subscriptions to service_role;
create index push_subscriptions_user on public.push_subscriptions(user_id);
create function public.claim_learning_reminders() returns setof public.push_subscriptions language sql set search_path='' as $$
 with due as (
   select x.id,t.target::date as delivery_date from public.push_subscriptions x
   cross join lateral (select now() at time zone x.timezone as local_now) n
   cross join lateral (select n.local_now::date+x.local_time-case when n.local_now::time<x.local_time then interval '1 day' else interval '0 days' end as target) t
   where x.enabled and (x.last_sent_date is null or x.last_sent_date<t.target::date)
   and n.local_now>=t.target and n.local_now<t.target+interval '30 minutes'
   and exists(select 1 from public.employee_progress p where p.user_id=x.user_id and (p.attempts=0 or p.review_due_at<=now()))
   and not exists(select 1 from public.study_answers a where a.user_id=x.user_id and a.answered_at>=date_trunc('day',now() at time zone x.timezone) at time zone x.timezone)
   order by x.created_at limit 200 for update of x skip locked
 ) update public.push_subscriptions s set last_sent_date=due.delivery_date from due where s.id=due.id returning s.*;
$$;
revoke all on function public.claim_learning_reminders() from public,anon,authenticated;
grant execute on function public.claim_learning_reminders() to service_role;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
select cron.schedule('learning-push-every-five-minutes','*/5 * * * *',$job$
select net.http_post(url:='https://tywvxpgudcdgauhtkofw.supabase.co/functions/v1/learning-reminders',headers:=jsonb_build_object('Content-Type','application/json','x-reminder-secret',(select cron_secret from private.reminder_keys where id)),body:='{"action":"dispatch"}'::jsonb,timeout_milliseconds:=20000);
$job$);
