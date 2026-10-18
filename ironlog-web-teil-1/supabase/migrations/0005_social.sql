-- ═══════════════ IRONLOG – Buddys, Challenges, Respekt ═══════════════
-- Kann gefahrlos mehrfach ausgeführt werden.

-- ── Profil: Einladungscode + Sichtbarkeit ───────────────────────
alter table public.profiles
  add column if not exists invite_code text,
  add column if not exists share_level text not null default 'stats';

update public.profiles
  set invite_code = 'IRON-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5))
  where invite_code is null;

alter table public.profiles
  alter column invite_code set default ('IRON-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5)));

create unique index if not exists profiles_invite_code_idx on public.profiles (invite_code);

do $$ begin
  alter table public.profiles add constraint profiles_share_level_chk check (share_level in ('basic', 'stats'));
exception when duplicate_object then null; end $$;

-- ── Freundschaften (immer user_a < user_b) ──────────────────────
create table if not exists public.friendships (
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);

create or replace function public.is_buddy(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.friendships where user_a = least(a, b) and user_b = greatest(a, b));
$$;

alter table public.friendships enable row level security;
drop policy if exists "friendships_select" on public.friendships;
create policy "friendships_select" on public.friendships
  for select using (auth.uid() in (user_a, user_b));
drop policy if exists "friendships_delete" on public.friendships;
create policy "friendships_delete" on public.friendships
  for delete using (auth.uid() in (user_a, user_b));
-- Anlegen nur über accept_invite()

-- ── Trainings-Zusammenfassungen (das Einzige, was Buddys sehen) ─
create table if not exists public.workout_summaries (
  id uuid primary key,                       -- = workouts.id
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  started_at timestamptz not null,
  name text not null default 'Training',
  duration_min int,
  sets int,                                  -- null bei Sichtbarkeit "basic"
  volume numeric,                            -- null bei Sichtbarkeit "basic"
  prs jsonb not null default '[]'::jsonb,    -- [{name, weight, reps}]
  updated_at timestamptz not null default now()
);
create index if not exists workout_summaries_user_idx on public.workout_summaries (user_id, started_at desc);

alter table public.workout_summaries enable row level security;
drop policy if exists "summaries_own" on public.workout_summaries;
create policy "summaries_own" on public.workout_summaries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "summaries_buddies" on public.workout_summaries;
create policy "summaries_buddies" on public.workout_summaries
  for select using (public.is_buddy(auth.uid(), user_id));

-- ── Respekt 🔥 ──────────────────────────────────────────────────
create table if not exists public.reactions (
  workout_id uuid not null,
  from_user uuid not null default auth.uid() references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (workout_id, from_user)
);
create index if not exists reactions_to_idx on public.reactions (to_user, created_at desc);

alter table public.reactions enable row level security;
drop policy if exists "reactions_select" on public.reactions;
create policy "reactions_select" on public.reactions
  for select using (auth.uid() in (from_user, to_user));
drop policy if exists "reactions_insert" on public.reactions;
create policy "reactions_insert" on public.reactions
  for insert with check (from_user = auth.uid() and public.is_buddy(from_user, to_user));
drop policy if exists "reactions_delete" on public.reactions;
create policy "reactions_delete" on public.reactions
  for delete using (from_user = auth.uid());

-- ── Funktionen ─────────────────────────────────────────────────
-- Name zum Einladungscode (auch ohne Login, für die Einladungsseite)
create or replace function public.invite_info(code text)
returns text language sql stable security definer set search_path = public as $$
  select display_name from public.profiles where invite_code = upper(trim(code)) limit 1;
$$;

-- Einladung annehmen → Freundschaft anlegen
create or replace function public.accept_invite(code text)
returns table (id uuid, display_name text)
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  other public.profiles%rowtype;
begin
  if me is null then raise exception 'Nicht eingeloggt'; end if;
  select * into other from public.profiles p where p.invite_code = upper(trim(code)) limit 1;
  if other.id is null then raise exception 'Code nicht gefunden'; end if;
  if other.id = me then raise exception 'Das ist dein eigener Code'; end if;
  insert into public.friendships (user_a, user_b)
    values (least(me, other.id), greatest(me, other.id))
    on conflict do nothing;
  return query select other.id, other.display_name;
end $$;

-- Meine Buddys (nur Name + Sichtbarkeit, keine anderen Profildaten)
create or replace function public.my_buddies()
returns table (id uuid, display_name text, share_level text, since timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.share_level, f.created_at
  from public.friendships f
  join public.profiles p on p.id = case when f.user_a = auth.uid() then f.user_b else f.user_a end
  where auth.uid() in (f.user_a, f.user_b)
  order by f.created_at;
$$;

-- ── Rechte ─────────────────────────────────────────────────────
grant select, delete on public.friendships to authenticated;
grant select, insert, update, delete on public.workout_summaries to authenticated;
grant select, insert, delete on public.reactions to authenticated;
revoke all on function public.accept_invite(text) from public, anon;
revoke all on function public.my_buddies() from public, anon;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.my_buddies() to authenticated;
grant execute on function public.invite_info(text) to anon, authenticated;
grant execute on function public.is_buddy(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
