-- Sequential games show one question at a time; boards remain limited to 8 pairs.
-- Every existing 2..8 round remains valid. No records, privileges or policies change.
alter table public.game_runs
  drop constraint game_runs_item_count_check,
  add constraint game_runs_item_count_check check (
    (mode in ('match', 'memory') and item_count between 2 and 8)
    or (mode in ('quiz', 'truth') and item_count between 2 and 100)
  );
