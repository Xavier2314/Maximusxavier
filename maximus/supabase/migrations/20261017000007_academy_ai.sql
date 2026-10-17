-- =============================================================================
-- MAXIMUS — 0007 Academy & Maximus AI
-- =============================================================================

create type public.course_category as enum (
  'getting_started', 'onboarding_academy', 'prospecting_masterclass', 'sales_follow_up',
  'leadership_development', 'team_building', 'financial_discipline', 'product_knowledge',
  'personal_development', 'recognition_success_stories'
);
create type public.course_status as enum ('draft', 'coming_soon', 'published');

create table public.courses (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9-]+$'),
  category      public.course_category not null,
  title         text not null check (length(trim(title)) between 3 and 160),
  description   text check (length(description) <= 2000),
  thumbnail_url text,
  level         text check (level in ('beginner', 'intermediate', 'advanced')),
  status        public.course_status not null default 'draft',
  sort_order    integer not null default 0,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index courses_category_idx on public.courses (category, sort_order);
create trigger courses_updated_at before update on public.courses
  for each row execute function public.set_updated_at();

create table public.lessons (
  id               uuid primary key default gen_random_uuid(),
  course_id        uuid not null references public.courses (id) on delete cascade,
  title            text not null check (length(trim(title)) between 2 and 160),
  content          text,                 -- Markdown
  video_url        text,
  resource_url     text,
  duration_minutes integer check (duration_minutes > 0),
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index lessons_course_idx on public.lessons (course_id, sort_order);
create trigger lessons_updated_at before update on public.lessons
  for each row execute function public.set_updated_at();

create table public.course_progress (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  lesson_id    uuid not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.course_progress enable row level security;

create policy courses_read on public.courses for select to authenticated
  using (status <> 'draft' or public.has_permission('manage_content'));
create policy courses_write on public.courses for all to authenticated
  using (public.has_permission('manage_content')) with check (public.has_permission('manage_content'));
create policy lessons_read on public.lessons for select to authenticated
  using (exists (select 1 from public.courses c where c.id = course_id
                 and (c.status = 'published' or public.has_permission('manage_content'))));
create policy lessons_write on public.lessons for all to authenticated
  using (public.has_permission('manage_content')) with check (public.has_permission('manage_content'));
create policy course_progress_read on public.course_progress for select to authenticated
  using (user_id = auth.uid() or public.can_view_team_data(user_id));
create policy course_progress_write on public.course_progress for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.lessons l join public.courses c on c.id = l.course_id
    where l.id = lesson_id and c.status = 'published'));
create policy course_progress_delete on public.course_progress for delete to authenticated
  using (user_id = auth.uid());

-- Starter catalogue. "Getting Started" teaches the platform itself; everything
-- else is Coming Soon until administrators upload real lessons.
insert into public.courses (slug, category, title, description, level, status, sort_order) values
  ('welcome-to-maximus', 'getting_started', 'Welcome to Maximus',
   'Learn how to use Maximus: your dashboard, attendance, goals, evaluations and team tools.', 'beginner', 'published', 1),
  ('onboarding-first-30-days', 'onboarding_academy', 'Your First 30 Days',
   'A guided path for new members: habits, expectations and quick wins.', 'beginner', 'coming_soon', 1),
  ('prospecting-masterclass', 'prospecting_masterclass', 'Prospecting Masterclass',
   'Find, approach and invite the right people with confidence.', 'intermediate', 'coming_soon', 1),
  ('sales-and-follow-up', 'sales_follow_up', 'Sales and Follow-Up Systems',
   'Turn conversations into orders with a simple, repeatable follow-up rhythm.', 'intermediate', 'coming_soon', 1),
  ('leading-from-the-front', 'leadership_development', 'Leading from the Front',
   'The habits of leaders who build accountable, motivated teams.', 'advanced', 'coming_soon', 1),
  ('team-building-blueprint', 'team_building', 'Team Building Blueprint',
   'Duplicate success: onboarding, support and recognition for your downlines.', 'intermediate', 'coming_soon', 1),
  ('financial-discipline', 'financial_discipline', 'Financial Discipline',
   'Budgeting, saving and reinvesting your earnings wisely.', 'beginner', 'coming_soon', 1),
  ('product-knowledge-essentials', 'product_knowledge', 'Product Knowledge Essentials',
   'Know what you offer, who it helps and how to explain it simply.', 'beginner', 'coming_soon', 1),
  ('personal-development', 'personal_development', 'Personal Development Foundations',
   'Mindset, time management and consistency for long-term growth.', 'beginner', 'coming_soon', 1),
  ('success-stories', 'recognition_success_stories', 'Success Stories',
   'Real journeys from Maximus members who maximised their potential.', 'beginner', 'coming_soon', 1);

insert into public.lessons (course_id, title, content, duration_minutes, sort_order)
select c.id, l.title, l.content, l.minutes, l.ord
from public.courses c
join (values
  (1, 'Your dashboard', E'Your dashboard shows the numbers that matter this month: attendance streak, goal progress, evaluation status, savings and notifications.\n\nCheck it every morning and pick one action that moves your goals forward.', 4),
  (2, 'Checking in at the office', E'Open **Attendance** and tap **Check in** when you arrive. Your browser will ask for permission to share your location — this is only used to compare your position with your office''s registered location.\n\nIf your location is unavailable or you forgot to check in, submit a **correction request** and your office manager will review it.', 5),
  (3, 'Setting monthly goals', E'Between the 10th and 15th of every month you will be reminded to set or review your goals. Fill in your targets, submit, and your sponsor will review them.\n\nProgress is calculated automatically from your evaluations, orders and confirmed savings.', 5),
  (4, 'Five-day evaluations', E'On the 1st, 5th, 10th, 15th, 20th, 25th and 30th (or the last day of shorter months) you complete a short evaluation: earnings, prospects, presentations, follow-ups, orders and the support you need.\n\nHonest evaluations help your sponsor support you better.', 5),
  (5, 'Getting help from Maximus AI', E'Maximus AI can help you plan your week, practise a prospecting conversation or prepare for a presentation. It only answers from approved Maximus materials and never sees other members'' private data.', 3)
) as l(ord, title, content, minutes) on c.slug = 'welcome-to-maximus';

-- -----------------------------------------------------------------------------
-- Maximus AI
-- -----------------------------------------------------------------------------
create table public.ai_conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  title      text not null default 'New conversation' check (length(title) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_conversations_user_idx on public.ai_conversations (user_id, updated_at desc);
create trigger ai_conversations_updated_at before update on public.ai_conversations
  for each row execute function public.set_updated_at();

create table public.ai_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  role            text not null check (role in ('user', 'assistant')),
  content         text not null check (length(content) <= 20000),
  created_at      timestamptz not null default now()
);
create index ai_messages_conversation_idx on public.ai_messages (conversation_id, created_at);

-- Opt-in personal memory (profiles.ai_memory_enabled). Members can view and delete it.
create table public.ai_memories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  content    text not null check (length(content) between 3 and 500),
  created_at timestamptz not null default now()
);
create index ai_memories_user_idx on public.ai_memories (user_id, created_at desc);

create table public.approved_knowledge (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (length(trim(title)) between 3 and 200),
  category     text not null default 'general',
  content      text not null check (length(content) between 10 and 50000),
  source       text,
  is_published boolean not null default true,
  created_by   uuid references public.profiles (id) on delete set null default auth.uid(),
  search       tsvector generated always as (
                 setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                 setweight(to_tsvector('english', coalesce(category, '')), 'B') ||
                 setweight(to_tsvector('english', coalesce(content, '')), 'C')) stored,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index approved_knowledge_search_idx on public.approved_knowledge using gin (search);
create trigger approved_knowledge_updated_at before update on public.approved_knowledge
  for each row execute function public.set_updated_at();

-- Retrieval for the assistant: full-text search over approved knowledge.
create or replace function public.search_knowledge(p_query text, p_limit integer default 5)
returns table (id uuid, title text, category text, content text, rank real)
language sql stable security invoker set search_path = public as $$
  select k.id, k.title, k.category, k.content,
         ts_rank(k.search, websearch_to_tsquery('english', p_query)) as rank
  from approved_knowledge k
  where k.is_published and k.search @@ websearch_to_tsquery('english', p_query)
  order by rank desc
  limit least(greatest(p_limit, 1), 10)
$$;

-- Turning memory off deletes stored memories.
create or replace function public.profiles_clear_ai_memory() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.ai_memory_enabled and not new.ai_memory_enabled then
    delete from ai_memories where user_id = new.id;
  end if;
  return new;
end $$;
create trigger profiles_clear_ai_memory after update of ai_memory_enabled on public.profiles
  for each row execute function public.profiles_clear_ai_memory();

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_memories enable row level security;
alter table public.approved_knowledge enable row level security;

-- Conversations and memories are strictly private to their owner — no leader or
-- admin policy exists for them.
create policy ai_conversations_own on public.ai_conversations for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ai_messages_own on public.ai_messages for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (
    select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()));
create policy ai_memories_own on public.ai_memories for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.ai_memory_enabled));

create policy approved_knowledge_read on public.approved_knowledge for select to authenticated
  using (is_published or public.has_permission('manage_content'));
create policy approved_knowledge_write on public.approved_knowledge for all to authenticated
  using (public.has_permission('manage_content')) with check (public.has_permission('manage_content'));

insert into public.approved_knowledge (title, category, content, source) values
  ('The five-day evaluation rhythm', 'platform',
   'Maximus members complete an evaluation on the 1st, 5th, 10th, 15th, 20th, 25th and 30th of every month (the last day in shorter months). Each evaluation records earnings, prospects contacted, presentations, follow-ups, orders, new team members, members supported, challenges, priorities for the next five days and support needed from the sponsor.',
   'Maximus platform guide'),
  ('Monthly goal setting', 'platform',
   'Between the 10th and the 15th of every month members set or review monthly goals: income, sales, prospecting, recruitment, product orders, personal development, savings and custom goals. Submitted goals go to the sponsor, who can comment, approve, request revisions and recommend action steps.',
   'Maximus platform guide'),
  ('Office attendance', 'platform',
   'Members check in and out using the Attendance page. With permission, the browser location is compared with the office''s registered coordinates and radius. A verified check-in means the reported location was inside the radius; it does not prove physical presence. Missed or incorrect check-ins can be corrected by submitting a correction request for manager review.',
   'Maximus platform guide'),
  ('Brand purpose', 'about',
   'Maximus exists to empower young, driven individuals committed to freelancing, self-growth and building meaningful careers on their own terms. The brand is rooted in ambition, discipline and progress. Tagline: Fulfilment in maximized potential.',
   'Maximus logo manual');
