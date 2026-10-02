-- Existing rounds remain valid; each new game and exact limit has its own leaderboard.
alter table public.game_runs
  drop constraint game_runs_mode_check,
  add constraint game_runs_mode_check check (mode in ('match', 'quiz', 'truth', 'memory')),
  drop constraint game_runs_time_limit_s_check,
  add constraint game_runs_time_limit_s_check check (time_limit_s between 1 and 300);
