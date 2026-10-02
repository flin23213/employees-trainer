-- Administrator-only verification. Fixtures and results are fully rolled back.
begin;
do $$
declare
  owner_id uuid := gen_random_uuid();
  other_id uuid := gen_random_uuid();
  owned_list uuid := gen_random_uuid();
  run_id uuid := gen_random_uuid();
  actual_score integer;
  seconds integer;
  items integer;
begin
  insert into auth.users(id, aud, role, email) values
    (owner_id, 'authenticated', 'authenticated', owner_id::text || '@example.test'),
    (other_id, 'authenticated', 'authenticated', other_id::text || '@example.test');
  insert into public.lists(id, user_id, name) values (owned_list, owner_id, 'Game settings verification');
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  execute 'set local role authenticated';

  insert into public.game_runs(id, list_id, mode, item_count, elapsed_ms, mistakes, time_limit_s)
    values (run_id, owned_list, 'truth', 4, 7000, 1, 73) returning score_ms into actual_score;
  if actual_score <> 10000 then raise exception 'Penalty calculation failed'; end if;
  insert into public.game_runs(id, list_id, mode, item_count, elapsed_ms, mistakes, time_limit_s) values
    (gen_random_uuid(), owned_list, 'memory', 8, 5000, 0, 300),
    (gen_random_uuid(), owned_list, 'truth', 2, 100, 0, 1),
    (gen_random_uuid(), owned_list, 'match', 2, 100, 0, 60),
    (gen_random_uuid(), owned_list, 'quiz', 2, 100, 0, 120),
    (gen_random_uuid(), owned_list, 'memory', 2, 100, 0, 180);

  foreach seconds in array array[-1, 0, 301] loop
    begin
      insert into public.game_runs(id, list_id, mode, item_count, elapsed_ms, mistakes, time_limit_s)
        values (gen_random_uuid(), owned_list, 'truth', 2, 0, 0, seconds);
      raise exception 'Invalid time accepted: %', seconds;
    exception when check_violation then null; end;
  end loop;
  foreach items in array array[1, 9] loop
    begin
      insert into public.game_runs(id, list_id, mode, item_count, elapsed_ms, mistakes, time_limit_s)
        values (gen_random_uuid(), owned_list, 'memory', items, 0, 0, 73);
      raise exception 'Invalid item count accepted: %', items;
    exception when check_violation then null; end;
  end loop;
  begin
    insert into public.game_runs(id, list_id, mode, item_count, elapsed_ms, mistakes, time_limit_s)
      values (gen_random_uuid(), owned_list, 'unknown', 2, 0, 0, 73);
    raise exception 'Unknown mode accepted';
  exception when check_violation then null; end;
  begin
    insert into public.game_runs(id, list_id, mode, item_count, elapsed_ms, mistakes, time_limit_s)
      values (gen_random_uuid(), owned_list, 'truth', 2, 1001, 0, 1);
    raise exception 'Overtime round accepted';
  exception when check_violation then null; end;
  begin
    insert into public.game_runs(id, list_id, mode, item_count, elapsed_ms, mistakes, time_limit_s)
      values (run_id, owned_list, 'truth', 4, 7000, 1, 73);
    raise exception 'Duplicate run accepted';
  exception when unique_violation then null; end;

  if (select count(*) from public.game_runs where list_id = owned_list) <> 6 then raise exception 'Own result reads failed'; end if;
  perform set_config('request.jwt.claim.sub', other_id::text, true);
  if exists(select 1 from public.game_runs where list_id = owned_list) then raise exception 'Cross-account read'; end if;
  begin
    insert into public.game_runs(id, list_id, mode, item_count, elapsed_ms, mistakes, time_limit_s)
      values (gen_random_uuid(), owned_list, 'memory', 2, 100, 0, 73);
    raise exception 'Cross-account write';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
end $$;
select 'Custom seconds, four modes, bounds, penalties, idempotence and account isolation passed' as verification;
rollback;
