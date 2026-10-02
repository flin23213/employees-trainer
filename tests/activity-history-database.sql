-- Administrator-only check; all fixture accounts, staff and answers roll back.
begin;
do $$
declare
  owner_id uuid := gen_random_uuid();
  other_id uuid := gen_random_uuid();
  own_list uuid := gen_random_uuid();
  employee_id uuid := gen_random_uuid();
  answer_id uuid := gen_random_uuid();
begin
  insert into auth.users(id,aud,role,email) values
    (owner_id,'authenticated','authenticated',owner_id::text || '@example.test'),
    (other_id,'authenticated','authenticated',other_id::text || '@example.test');
  insert into public.lists(id,user_id,name) values (own_list,owner_id,'History verification');
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  execute 'set local role authenticated';
  perform public.set_active_list(own_list);
  insert into public.employees(id,full_name,job_title) values(employee_id,'History Fixture','Synthetic role');
  perform public.record_answer(employee_id,true,answer_id);
  perform public.record_answer(employee_id,true,answer_id);
  if (select count(*) from public.study_answers where user_id=owner_id and answered_at >= now()-interval '14 days') <> 1 then
    raise exception 'Confirmed answers are not shared through account history';
  end if;
  if not exists(select 1 from public.study_answers where id=answer_id and correct=true) then
    raise exception 'History outcome is incorrect';
  end if;
  perform set_config('request.jwt.claim.sub',other_id::text,true);
  if exists(select 1 from public.study_answers where user_id=owner_id) then raise exception 'Cross-account history disclosure'; end if;
  execute 'reset role';
end $$;
select 'Confirmed history, answer idempotence and account isolation passed' as verification;
rollback;
