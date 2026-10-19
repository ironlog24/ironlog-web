-- IRONLOG – Avatar-Aussehen im Profil speichern (gleich auf allen Geräten)
alter table public.profiles add column if not exists avatar jsonb;
notify pgrst, 'reload schema';
