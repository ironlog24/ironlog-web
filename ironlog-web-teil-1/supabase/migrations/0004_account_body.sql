-- ═══════════════ IRONLOG – Konto löschen, Körpergewicht ═══════════════
-- Kann gefahrlos mehrfach ausgeführt werden.

-- ── Körpergewicht (ein Eintrag pro Tag) ─────────────────────────
create table if not exists public.body_weights (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  kg numeric(5,1) not null check (kg between 20 and 400),
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.body_weights enable row level security;
drop policy if exists "body_weights_own" on public.body_weights;
create policy "body_weights_own" on public.body_weights
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.body_weights to authenticated;

-- ── Konto löschen (DSGVO) ───────────────────────────────────────
-- Löscht den eingeloggten Nutzer. Alle seine Daten hängen per
-- "on delete cascade" an auth.users und werden mitgelöscht.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Nicht eingeloggt';
  end if;
  delete from auth.users where id = uid;
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

notify pgrst, 'reload schema';
