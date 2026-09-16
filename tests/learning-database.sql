-- Run in an administrator transaction. All fixture users and data roll back.
begin;
insert into auth.users(id,aud,role,email) values
 ('fd459dbf-dc86-43c6-88de-e86958ac67e1','authenticated','authenticated','learning-test-one@example.test'),
 ('fd459dbf-dc86-43c6-88de-e86958ac67e2','authenticated','authenticated','learning-test-two@example.test');
select set_config('request.jwt.claim.sub','fd459dbf-dc86-43c6-88de-e86958ac67e1',true);
set local role authenticated;
select public.create_list('Database verification');
insert into public.employees(id,full_name,job_title) values('fd459dbf-dc86-43c6-88de-e86958ac6701','Тестовый Сотрудник','Проверка');
select public.record_answer('fd459dbf-dc86-43c6-88de-e86958ac6701',true,'fd459dbf-dc86-43c6-88de-e86958ac6711');
select public.record_answer('fd459dbf-dc86-43c6-88de-e86958ac6701',true,'fd459dbf-dc86-43c6-88de-e86958ac6711');
do $$ begin
 if not exists(select 1 from public.learning_queue where id='fd459dbf-dc86-43c6-88de-e86958ac6701' and attempts=1 and review_step=1 and review_due_at>now()+interval '23 hours') then raise exception 'First interval or idempotence failed'; end if;
end $$;
select public.record_answer('fd459dbf-dc86-43c6-88de-e86958ac6701',true);
do $$ begin
 if not exists(select 1 from public.learning_queue where id='fd459dbf-dc86-43c6-88de-e86958ac6701' and attempts=2 and review_step=1) then raise exception 'Early practice advanced schedule'; end if;
end $$;
update public.employee_progress set review_due_at=now()-interval '1 minute' where employee_id='fd459dbf-dc86-43c6-88de-e86958ac6701';
select public.record_answer('fd459dbf-dc86-43c6-88de-e86958ac6701',true);
do $$ begin
 if not exists(select 1 from public.learning_queue where id='fd459dbf-dc86-43c6-88de-e86958ac6701' and review_step=2 and review_due_at>now()+interval '2 days') then raise exception 'Second interval failed'; end if;
end $$;
select public.record_answer('fd459dbf-dc86-43c6-88de-e86958ac6701',false);
do $$ begin
 if not exists(select 1 from public.learning_queue where id='fd459dbf-dc86-43c6-88de-e86958ac6701' and review_step=0 and review_due_at between now()+interval '59 minutes' and now()+interval '61 minutes') then raise exception 'Wrong-answer reset failed'; end if;
end $$;
select public.reset_list_progress();
do $$ begin
 if exists(select 1 from public.study_answers) then raise exception 'Reset retained daily answers'; end if;
 if exists(select 1 from public.learning_queue where review_due_at is not null or review_step<>0) then raise exception 'Reset retained schedule'; end if;
end $$;
select set_config('request.jwt.claim.sub','fd459dbf-dc86-43c6-88de-e86958ac67e2',true);
do $$ begin
 if exists(select 1 from public.learning_queue) then raise exception 'Cross-account read'; end if;
 begin perform public.record_answer('fd459dbf-dc86-43c6-88de-e86958ac6701',true);raise exception 'Cross-account write'; exception when raise_exception then if sqlerrm='Cross-account write' then raise; end if; end;
 begin perform public.reminder_server_keys();raise exception 'Key disclosure'; exception when insufficient_privilege then null; end;
 begin perform 1 from public.push_subscriptions;raise exception 'Subscription disclosure'; exception when insufficient_privilege then null; end;
end $$;
reset role;
insert into public.push_subscriptions(user_id,endpoint,subscription,local_time,timezone) values
 ('fd459dbf-dc86-43c6-88de-e86958ac67e1','https://example.test/verification','{}',((now() at time zone 'UTC')-interval '4 minutes')::time,'UTC');
do $$ declare n integer; begin
 select count(*) into n from public.claim_learning_reminders() where user_id='fd459dbf-dc86-43c6-88de-e86958ac67e1';
 if n<>1 then raise exception 'Due reminder not claimed';end if;
 select count(*) into n from public.claim_learning_reminders() where user_id='fd459dbf-dc86-43c6-88de-e86958ac67e1';
 if n<>0 then raise exception 'Reminder claimed twice';end if;
end $$;
select 'Spaced repetition, reset, idempotence, account isolation, secret isolation and reminder claims passed' as verification;
rollback;
