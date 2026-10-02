-- Old rounds retain their full-list leaderboard; a selected pool has its own key.
alter table public.game_runs
  add column scope_key text not null default 'all'
  constraint game_runs_scope_key_check check (scope_key = 'all' or scope_key ~ '^[0-9a-f]{64}$');

grant insert (scope_key) on public.game_runs to authenticated;

-- Keep score ordering efficient within each selected pool, including all.
create index game_runs_scope_leaderboard_idx
  on public.game_runs(user_id, list_id, mode, item_count, time_limit_s, scope_key, score_ms, created_at desc);
drop index public.game_runs_leaderboard_idx;
