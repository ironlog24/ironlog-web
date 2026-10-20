-- IRONLOG – Avatar-Duell: Buddys sehen gegenseitig ihren Avatar (Aussehen + Level)
alter table public.profiles add column if not exists avatar jsonb;
alter table public.profiles add column if not exists avatar_stats jsonb;

-- my_buddies liefert jetzt zusätzlich Avatar + Avatar-Stand (Rückgabetyp ändert sich → neu anlegen)
drop function if exists public.my_buddies();
create function public.my_buddies()
returns table (id uuid, display_name text, share_level text, since timestamptz, avatar jsonb, avatar_stats jsonb)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.share_level, f.created_at, p.avatar, p.avatar_stats
  from public.friendships f
  join public.profiles p on p.id = case when f.user_a = auth.uid() then f.user_b else f.user_a end
  where auth.uid() in (f.user_a, f.user_b)
  order by f.created_at;
$$;
revoke all on function public.my_buddies() from public, anon;
grant execute on function public.my_buddies() to authenticated;

notify pgrst, 'reload schema';
