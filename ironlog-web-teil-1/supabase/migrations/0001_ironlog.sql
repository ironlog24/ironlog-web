-- ═══════════════════════════════════════════════════════════════
-- IRONLOG – Supabase-Schema inkl. Row Level Security & Storage
-- Ausführen im Supabase SQL Editor (oder `supabase db push`).
-- ═══════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── profiles ────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Athlet',
  default_rest_seconds int not null default 90 check (default_rest_seconds between 15 and 600),
  seeded boolean not null default false,
  created_at timestamptz not null default now()
);

-- Profil automatisch bei Registrierung anlegen
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── exercises ───────────────────────────────────────────────────
-- user_id NULL = globale, vorbefüllte Übung (für alle lesbar)
create table if not exists public.exercises (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users (id) on delete cascade,
  name text not null,
  muscle_group text not null check (muscle_group in ('brust','ruecken','beine','schultern','arme','core')),
  equipment text not null default '',
  image_url text,
  is_custom boolean not null default false,
  bodyweight boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists exercises_user_idx on public.exercises (user_id);

-- ── workouts ────────────────────────────────────────────────────
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default 'Training',
  template_id uuid,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text not null default ''
);
create index if not exists workouts_user_started_idx on public.workouts (user_id, started_at desc);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id text not null references public.exercises (id) on delete cascade,
  position int not null default 0
);
create index if not exists we_workout_idx on public.workout_exercises (workout_id);

create table if not exists public.sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  set_number int not null,
  weight numeric(6,2) not null default 0 check (weight >= 0),
  reps int not null default 0 check (reps >= 0),
  done boolean not null default false
);
create index if not exists sets_we_idx on public.sets (workout_exercise_id);

-- ── templates ───────────────────────────────────────────────────
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  cover_url text,
  items jsonb not null default '[]'::jsonb, -- [{exercise_id, target_sets, target_reps}]
  created_at timestamptz not null default now()
);

alter table public.workouts
  drop constraint if exists workouts_template_fk,
  add constraint workouts_template_fk foreign key (template_id) references public.templates (id) on delete set null;

-- ═══════════════════ Row Level Security ═══════════════════
alter table public.profiles          enable row level security;
alter table public.exercises         enable row level security;
alter table public.workouts          enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.sets              enable row level security;
alter table public.templates         enable row level security;

-- profiles: nur das eigene Profil
drop policy if exists "profiles_own" on public.profiles;
create policy "profiles_own" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- exercises: globale + eigene lesen, nur eigene schreiben
drop policy if exists "exercises_read" on public.exercises;
create policy "exercises_read" on public.exercises
  for select using (user_id is null or user_id = auth.uid());
drop policy if exists "exercises_write" on public.exercises;
create policy "exercises_write" on public.exercises
  for insert with check (user_id = auth.uid());
drop policy if exists "exercises_update" on public.exercises;
create policy "exercises_update" on public.exercises
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "exercises_delete" on public.exercises;
create policy "exercises_delete" on public.exercises
  for delete using (user_id = auth.uid());

-- workouts / templates: nur eigene
drop policy if exists "workouts_own" on public.workouts;
create policy "workouts_own" on public.workouts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "templates_own" on public.templates;
create policy "templates_own" on public.templates
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- workout_exercises: eigene Zeilen UND das Eltern-Workout gehört dem Nutzer
drop policy if exists "we_own" on public.workout_exercises;
create policy "we_own" on public.workout_exercises
  for all using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid())
  );

-- sets: eigene Zeilen UND die Eltern-Übung gehört dem Nutzer
drop policy if exists "sets_own" on public.sets;
create policy "sets_own" on public.sets
  for all using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.workout_exercises we where we.id = workout_exercise_id and we.user_id = auth.uid())
  );

-- ═══════════════════ Storage: eigene Übungsbilder ═══════════════════
insert into storage.buckets (id, name, public)
values ('exercise-images', 'exercise-images', true)
on conflict (id) do nothing;

-- Pfadschema: <user_id>/<ordner>/<datei>.jpg
drop policy if exists "img_read" on storage.objects;
create policy "img_read" on storage.objects
  for select using (bucket_id = 'exercise-images');
drop policy if exists "img_insert_own" on storage.objects;
create policy "img_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'exercise-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "img_update_own" on storage.objects;
create policy "img_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'exercise-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "img_delete_own" on storage.objects;
create policy "img_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'exercise-images' and (storage.foldername(name))[1] = auth.uid()::text);
