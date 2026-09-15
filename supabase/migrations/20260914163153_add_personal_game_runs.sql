create table public.game_runs (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  list_id uuid not null references public.lists(id) on delete cascade,
  mode text not null check (mode in ('match', 'quiz')),
  item_count smallint not null check (item_count between 2 and 8),
  elapsed_ms integer not null check (elapsed_ms >= 0),
  mistakes smallint not null check (mistakes between 0 and 1000),
  time_limit_s smallint not null check (time_limit_s in (60,120,180)),
  score_ms integer generated always as (elapsed_ms + mistakes * 3000) stored,
  created_at timestamptz not null default now(),
  constraint game_runs_finished_in_time check (elapsed_ms + mistakes * 3000 <= time_limit_s * 1000)
);
alter table public.game_runs enable row level security;
revoke all on public.game_runs from public, anon, authenticated;
grant select on public.game_runs to authenticated;
grant insert (id, list_id, mode, item_count, elapsed_ms, mistakes, time_limit_s) on public.game_runs to authenticated;
create policy game_runs_read_own on public.game_runs for select to authenticated
  using (user_id = (select auth.uid()));
create policy game_runs_insert_own on public.game_runs for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.lists l where l.id = game_runs.list_id and l.user_id = (select auth.uid())
  ));
create index game_runs_leaderboard_idx on public.game_runs(user_id, list_id, mode, item_count, time_limit_s, score_ms, created_at desc);
create index game_runs_list_id_idx on public.game_runs(list_id);
