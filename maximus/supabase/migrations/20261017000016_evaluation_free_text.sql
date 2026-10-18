-- Members may write their evaluation in their own words instead of the fixed questions.
alter table public.evaluations add column if not exists free_text text check (length(free_text) <= 4000);
