-- Monthly goals: freelancing platform targets, prospecting methods, product PV, books.
alter table public.monthly_goals
  add column if not exists fiverr_target numeric(14, 2) check (fiverr_target >= 0),
  add column if not exists upwork_target numeric(14, 2) check (upwork_target >= 0),
  add column if not exists freelance_other_target numeric(14, 2) check (freelance_other_target >= 0),
  add column if not exists product_pv_target numeric(14, 2) check (product_pv_target >= 0),
  add column if not exists prospecting_methods text[] not null default '{}',
  add column if not exists prospecting_methods_other text check (length(prospecting_methods_other) <= 300),
  add column if not exists books text check (length(books) <= 1000);
