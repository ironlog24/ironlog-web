-- ═══════════════ IRONLOG – Ernährung / Kalorientracker ═══════════════
alter table public.profiles add column if not exists nutrition_goals jsonb;

create table if not exists public.food_entries (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  meal text not null check (meal in ('fruehstueck','mittag','abend','snacks')),
  grams numeric(7,1) not null check (grams >= 0),
  food jsonb not null,            -- Momentaufnahme: Name, Marke, Barcode, Nährwerte je 100 g
  created_at timestamptz not null default now()
);
create index if not exists food_entries_user_day_idx on public.food_entries (user_id, day);

create table if not exists public.custom_foods (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  food jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.food_entries enable row level security;
alter table public.custom_foods enable row level security;

drop policy if exists "food_entries_own" on public.food_entries;
create policy "food_entries_own" on public.food_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "custom_foods_own" on public.custom_foods;
create policy "custom_foods_own" on public.custom_foods
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
