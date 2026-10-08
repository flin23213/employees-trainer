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
  game_mode text;
begin
  if not (select relrowsecurity from pg_class where oid = 'public.game_runs'::regclass) then
    raise exception 'Game result RLS is disabled';
  end if;
  if has_table_privilege('anon', 'public.game_runs', 'SELECT')
     or has_table_privilege('anon', 'public.game_runs', 'INSERT')
     or has_column_privilege('anon', 'public.game_runs', 'item_count', 'INSERT') then
    raise exception 'Anonymous game result access';
  end if;
  if has_table_privilege('authenticated', 'public.game_runs', 'UPDATE')
     or has_table_privilege('authenticated', 'public.game_runs', 'DELETE') then
    raise exception 'Game results are no longer immutable';
  end if;
  if not has_column_privilege('authenticated', 'public.game_runs', 'scope_key', 'INSERT') then
    raise exception 'Selected scope cannot be saved';
  end if;
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

  -- Both sequential modes accept larger rounds, including the 62-person list.
  foreach game_mode in array array['quiz', 'truth'] loop
    foreach items in array array[9, 62, 100] loop
      insert into public.game_runs(id, list_id, mode, item_count, elapsed_ms, mistakes, time_limit_s)
        values (gen_random_uuid(), owned_list, game_mode, items, 6000, 1, 73);
      if not exists (select 1 from public.game_runs where list_id = owned_list
          and mode = game_mode and item_count = items and time_limit_s = 73
          and scope_key = 'all' and elapsed_ms = 6000 and score_ms = 9000) then
        raise exception 'Large sequential round read/score failed: %, %', game_mode, items;
      end if;
    end loop;
  end loop;

  foreach seconds in array array[-1, 0, 301] loop
    begin
      insert into public.game_runs(id, list_id, mode, item_count, elapsed_ms, mistakes, time_limit_s)
        values (gen_random_uuid(), owned_list, 'truth', 2, 0, 0, seconds);
      raise exception 'Invalid time accepted: %', seconds;
    exception when check_violation then null; end;
  end loop;
  foreach game_mode in array array['match', 'memory'] loop
    foreach items in array array[1, 9, 100, 101] loop
      begin
        insert into public.game_runs(id, list_id, mode, item_count, elapsed_ms, mistakes, time_limit_s)
          values (gen_random_uuid(), owned_list, game_mode, items, 0, 0, 73);
        raise exception 'Invalid board item count accepted: %, %', game_mode, items;
      exception when check_violation then null; end;
    end loop;
  end loop;
  foreach game_mode in array array['quiz', 'truth'] loop
    foreach items in array array[1, 101] loop
      begin
        insert into public.game_runs(id, list_id, mode, item_count, elapsed_ms, mistakes, time_limit_s)
          values (gen_random_uuid(), owned_list, game_mode, items, 0, 0, 73);
        raise exception 'Invalid sequential item count accepted: %, %', game_mode, items;
      exception when check_violation then null; end;
    end loop;
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

  if (select scope_key from public.game_runs where id = run_id) <> 'all' then raise exception 'Old round scope is not all'; end if;
  insert into public.game_runs(id, list_id, mode, item_count, elapsed_ms, mistakes, time_limit_s, scope_key) values
    (gen_random_uuid(), owned_list, 'truth', 4, 8000, 0, 73, repeat('a',64)),
    (gen_random_uuid(), owned_list, 'truth', 4, 9000, 0, 73, repeat('b',64)),
    (gen_random_uuid(), owned_list, 'quiz', 62, 8000, 0, 73, repeat('a',64)),
    (gen_random_uuid(), owned_list, 'truth', 100, 9000, 0, 73, repeat('b',64));
  if (select count(*) from public.game_runs where list_id = owned_list and scope_key = 'all') <> 12 then raise exception 'Full-list records mixed with scope'; end if;
  if (select count(*) from public.game_runs where list_id = owned_list and scope_key = repeat('a',64)) <> 2 then raise exception 'Selected scope reads failed'; end if;
  if (select count(*) from public.game_runs where list_id = owned_list and mode = 'quiz' and item_count = 62 and time_limit_s = 73 and scope_key = 'all') <> 1 then raise exception 'Large general records mixed with scope'; end if;
  if (select count(*) from public.game_runs where list_id = owned_list and mode = 'quiz' and item_count = 62 and time_limit_s = 73 and scope_key = repeat('a',64)) <> 1 then raise exception 'Large selected scope reads failed'; end if;
  begin
    insert into public.game_runs(id, list_id, mode, item_count, elapsed_ms, mistakes, time_limit_s, scope_key)
      values (gen_random_uuid(), owned_list, 'truth', 4, 9000, 0, 73, 'invalid-scope');
    raise exception 'Malformed scope accepted';
  exception when check_violation then null; end;
  if (select count(*) from public.game_runs where list_id = owned_list) <> 16 then raise exception 'Own result reads failed'; end if;
  perform set_config('request.jwt.claim.sub', other_id::text, true);
  if exists(select 1 from public.game_runs where list_id = owned_list) then raise exception 'Cross-account read'; end if;
  begin
    insert into public.game_runs(id, list_id, mode, item_count, elapsed_ms, mistakes, time_limit_s)
      values (gen_random_uuid(), owned_list, 'quiz', 100, 100, 0, 73);
    raise exception 'Cross-account write';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.game_runs(id, list_id, mode, item_count, elapsed_ms, mistakes, time_limit_s, scope_key)
      values (gen_random_uuid(), owned_list, 'truth', 62, 100, 0, 73, repeat('a',64));
    raise exception 'Cross-account scoped write';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
end $$;
select 'Mode-specific item limits, custom seconds, penalties, idempotence, selected scopes, immutable results and account isolation passed' as verification;
rollback;
